import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, db, newClient, newAdmin, upload, uploadAllSeven } from './util.js';
import { deleteUserCascade, tableCounts, storedFiles, foreignKeyCheck, USER_SCOPED_TABLES } from '../src/services/maintenance.js';

/**
 * Scénario E2E complet (section 4 de la checklist) — Client → Admin → Client.
 * Exécuté sur base + stockage TEMPORAIRES (setup.ts). Aucune donnée réelle touchée.
 * Couvre les 18 étapes, y compris la protection du téléchargement et le nettoyage final.
 */
describe('Parcours complet inscription → dépôt → correction → validation → VALIDE', () => {
  it('déroule les 18 étapes puis nettoie intégralement', async () => {
    // 1-3) Inscription + confirmation e-mail + connexion client (helper).
    const { a: client, userId } = await newClient('e2e-full@example.test');

    // 4) Profil complété.
    const prof = await client.patch('/api/dossier/profile')
      .send({ firstName: 'Awa', lastName: 'Diop', phone: '770000000', employer: 'Lycée', address: 'Rue 1', city: 'Dakar' });
    expect(prof.status).toBe(200);
    expect(prof.body.profile.city).toBe('Dakar');

    // 5) Dépôt des 7 pièces.
    await uploadAllSeven(client);
    const comp = await client.get('/api/dossier/completeness');
    expect(comp.body.filled).toBe(7);

    // 6) Soumission.
    const submit = await client.post('/api/dossier/submit');
    expect(submit.status).toBe(200);
    expect(submit.body.dossier.status).toBe('SOUMIS');

    // 7) Admin : demande de correction sur le relevé n°1 (slot 0).
    const { a: admin } = await newAdmin('e2e-admin@example.test');
    const dossierId = (await admin.get('/api/admin/dossiers')).body.dossiers[0].id as string;
    const findDoc = async (typeCode: string, slot: number) => {
      const full = await admin.get(`/api/admin/dossiers/${dossierId}`);
      return full.body.documents.find((d: any) => d.typeCode === typeCode && d.slotIndex === slot);
    };
    const releve0 = await findDoc('releve', 0);
    const corr = await admin.post(`/api/admin/documents/${releve0.id}/request-correction`).send({ reason: 'Relevé illisible, merci de redéposer.' });
    expect(corr.status).toBe(200);
    // Sans motif → refusé.
    const noReason = await admin.post(`/api/admin/documents/${releve0.id}/reject`).send({});
    expect(noReason.status).toBe(400);

    // 8) Client : voit le statut A_CORRIGER + le motif.
    const clientView = await client.get('/api/dossier');
    const clientReleve0 = clientView.body.documents.find((d: any) => d.typeCode === 'releve' && d.slotIndex === 0);
    expect(clientReleve0.status).toBe('A_CORRIGER');
    expect(clientReleve0.reason).toMatch(/illisible/i);

    // 9) Client : remplace le relevé (nouvelle version).
    const replace = await upload(client, 'releve', 0);
    expect(replace.status).toBe(201);
    expect(replace.body.version).toBe(2);

    // 10) L'ancienne version est conservée dans l'historique (v1 inactive, v2 active).
    const versions = db.prepare(
      'SELECT version, active FROM document_versions WHERE document_id = ? ORDER BY version',
    ).all(releve0.id) as { version: number; active: number }[];
    expect(versions.map(v => v.version)).toEqual([1, 2]);
    expect(versions.find(v => v.version === 1)!.active).toBe(0);
    expect(versions.find(v => v.version === 2)!.active).toBe(1);

    // 11-12) Admin : valide les 7 documents (le relevé remplacé + les 6 autres).
    const full = await admin.get(`/api/admin/dossiers/${dossierId}`);
    for (const d of full.body.documents) {
      const v = await admin.post(`/api/admin/documents/${d.id}/validate`);
      expect(v.status).toBe(200);
    }

    // 13) Validation globale du dossier (ADMIN uniquement).
    const global = await admin.post(`/api/admin/dossiers/${dossierId}/validate`);
    expect(global.status).toBe(200);
    expect(global.body.status).toBe('VALIDE');

    // 14) Statut final VALIDE côté client.
    const finalView = await client.get('/api/dossier');
    expect(finalView.body.dossier.status).toBe('VALIDE');

    // 15) Notifications visibles côté client.
    const notifs = await client.get('/api/notifications');
    expect(notifs.body.notifications.length).toBeGreaterThan(0);

    // 16) Historique administratif complet.
    const history = await admin.get(`/api/admin/dossiers/${dossierId}/history`);
    expect(history.body.history.length).toBeGreaterThanOrEqual(8);

    // 17) Téléchargement toujours protégé.
    const versionId = finalView.body.documents.find((d: any) => d.typeCode === 'releve' && d.slotIndex === 0).activeVersion.id as string;
    expect((await client.get(`/api/documents/${versionId}/download`)).status).toBe(200);           // propriétaire
    expect((await admin.get(`/api/documents/${versionId}/download`)).status).toBe(200);            // personnel
    expect((await request.agent(app).get(`/api/documents/${versionId}/download`)).status).toBe(401); // anonyme
    const { a: intrus, userId: intrusId } = await newClient('e2e-intrus@example.test');
    expect((await intrus.get(`/api/documents/${versionId}/download`)).status).toBe(403);           // autre client

    // 18) Nettoyage final : suppression des comptes + base + fichiers (temporaires).
    deleteUserCascade(userId);
    deleteUserCascade(intrusId);
    const adminId = (db.prepare("SELECT id FROM users WHERE email = 'e2e-admin@example.test'").get() as { id: string }).id;
    deleteUserCascade(adminId);

    const counts = tableCounts();
    expect(counts.users).toBe(0);
    for (const t of USER_SCOPED_TABLES) expect(counts[t]).toBe(0);
    expect(storedFiles()).toHaveLength(0);
    expect(foreignKeyCheck()).toHaveLength(0);
    // Config préservée.
    expect(counts.document_types).toBe(3);
  });
});
