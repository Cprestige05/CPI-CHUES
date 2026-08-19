import { describe, it, expect } from 'vitest';
import { newClient, newAdmin, upload, uploadAllRequired, db } from './util.js';

function dossierIdOf(userId: string): string {
  return (db.prepare('SELECT id FROM dossiers WHERE user_id=?').get(userId) as any).id;
}
function docIdOf(userId: string, type: string, slot: number): string {
  return (db.prepare('SELECT id FROM documents WHERE dossier_id=? AND type_code=? AND slot_index=?').get(dossierIdOf(userId), type, slot) as any).id;
}

describe('Soumission & validation administrative', () => {
  it('soumission refusée si pièces manquantes', async () => {
    const { a } = await newClient('f1@test.sn');
    await upload(a, 'cni', 0);
    const res = await a.post('/api/dossier/submit');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('documents_incomplete');
  });

  it('soumission refusée avec seulement 2 bulletins sur 3', async () => {
    const { a } = await newClient('f2@test.sn');
    await upload(a, 'cni', 0);
    await upload(a, 'bulletin', 0);
    await upload(a, 'bulletin', 1);
    for (let i = 0; i < 3; i++) await upload(a, 'releve', i);
    expect(await a.post('/api/dossier/submit').then(r => r.status)).toBe(400);
  });

  it('soumission refusée avec seulement 2 relevés sur 3', async () => {
    const { a } = await newClient('f3@test.sn');
    await upload(a, 'cni', 0);
    for (let i = 0; i < 3; i++) await upload(a, 'bulletin', i);
    await upload(a, 'releve', 0);
    await upload(a, 'releve', 1);
    expect(await a.post('/api/dossier/submit').then(r => r.status)).toBe(400);
  });

  it('soumission OK avec les 8 pièces obligatoires', async () => {
    const { a } = await newClient('f4@test.sn');
    await uploadAllRequired(a);
    const res = await a.post('/api/dossier/submit');
    expect(res.status).toBe(200);
    expect(res.body.dossier.status).toBe('SOUMIS');
  });

  it('rejet sans motif → 400 ; correction sans motif → 400', async () => {
    const client = await newClient('f5@test.sn');
    await uploadAllRequired(client.a);
    await client.a.post('/api/dossier/submit');
    const admin = await newAdmin('adm5@test.sn');
    const id = docIdOf(client.userId, 'cni', 0);
    expect(await admin.a.post(`/api/admin/documents/${id}/reject`).send({}).then(r => r.status)).toBe(400);
    expect(await admin.a.post(`/api/admin/documents/${id}/request-correction`).send({ reason: '' }).then(r => r.status)).toBe(400);
  });

  it('validation globale refusée si une pièce non validée → 409', async () => {
    const client = await newClient('f6@test.sn');
    await uploadAllRequired(client.a);
    await client.a.post('/api/dossier/submit');
    const admin = await newAdmin('adm6@test.sn');
    const res = await admin.a.post(`/api/admin/dossiers/${dossierIdOf(client.userId)}/validate`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('not_all_valid');
  });

  it('validation admin inexistant/incomplet impossible (document sans fichier) → 400', async () => {
    const client = await newClient('f9@test.sn');
    // dossier créé mais aucune pièce déposée : cni[0] est MANQUANT
    const admin = await newAdmin('adm9@test.sn');
    const id = docIdOf(client.userId, 'cni', 0);
    expect(await admin.a.post(`/api/admin/documents/${id}/validate`).then(r => r.status)).toBe(400);
  });

  it('parcours complet : valider les 8 pièces → validation globale + historique conservé', async () => {
    const client = await newClient('f7@test.sn');
    await uploadAllRequired(client.a);
    await client.a.post('/api/dossier/submit');
    const admin = await newAdmin('adm7@test.sn');
    const dossierId = dossierIdOf(client.userId);
    const docs = db.prepare('SELECT id FROM documents WHERE dossier_id=?').all(dossierId) as any[];
    for (const d of docs) {
      expect(await admin.a.post(`/api/admin/documents/${d.id}/validate`).then(r => r.status)).toBe(200);
    }
    const gv = await admin.a.post(`/api/admin/dossiers/${dossierId}/validate`);
    expect(gv.status).toBe(200);
    expect(gv.body.status).toBe('VALIDE');

    const hist = await admin.a.get(`/api/admin/dossiers/${dossierId}/history`);
    expect(hist.body.history.length).toBeGreaterThanOrEqual(docs.length + 1); // 7 validations + 1 globale
  });

  it('correction → remplacement crée une nouvelle version ; ancienne conservée (historique)', async () => {
    const client = await newClient('f8@test.sn');
    await uploadAllRequired(client.a);
    await client.a.post('/api/dossier/submit');
    const admin = await newAdmin('adm8@test.sn');
    const id = docIdOf(client.userId, 'releve', 0);
    expect(await admin.a.post(`/api/admin/documents/${id}/request-correction`).send({ reason: 'Illisible' }).then(r => r.status)).toBe(200);

    const rep = await upload(client.a, 'releve', 0);
    expect(rep.status).toBe(201);
    expect(rep.body.version).toBe(2);
    const versions = db.prepare('SELECT version, active FROM document_versions WHERE document_id=? ORDER BY version').all(id) as any[];
    expect(versions.length).toBe(2);
    expect(versions[0].active).toBe(0);
    expect((db.prepare('SELECT status FROM documents WHERE id=?').get(id) as any).status).toBe('SOUMIS');
  });
});
