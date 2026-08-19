import { describe, it, expect } from 'vitest';
import { app, db, newClient, newAdmin, uploadAllRequired } from './util.js';
import request from 'supertest';
import { deleteUserCascade, storedFiles, foreignKeyCheck } from '../src/services/maintenance.js';

/**
 * Test de cascade OBLIGATOIRE (section 3 de la checklist).
 * Prouve que la suppression d'un utilisateur via la connexion applicative
 * (foreign_keys = ON) efface TOUTES ses données liées + ses fichiers,
 * sans laisser d'orphelin. Exécuté sur base + stockage TEMPORAIRES (setup.ts).
 */

/** Compte les lignes liées à un utilisateur dans chaque table. */
function childCounts(userId: string) {
  const one = (sql: string) => (db.prepare(sql).get(userId) as { n: number }).n;
  return {
    users: one('SELECT COUNT(*) n FROM users WHERE id = ?'),
    profiles: one('SELECT COUNT(*) n FROM profiles WHERE user_id = ?'),
    sessions: one('SELECT COUNT(*) n FROM sessions WHERE user_id = ?'),
    dossiers: one('SELECT COUNT(*) n FROM dossiers WHERE user_id = ?'),
    documents: one('SELECT COUNT(*) n FROM documents WHERE dossier_id IN (SELECT id FROM dossiers WHERE user_id = ?)'),
    versions: one('SELECT COUNT(*) n FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE dossier_id IN (SELECT id FROM dossiers WHERE user_id = ?))'),
    reviews: one('SELECT COUNT(*) n FROM admin_reviews WHERE dossier_id IN (SELECT id FROM dossiers WHERE user_id = ?)'),
    notifications: one('SELECT COUNT(*) n FROM notifications WHERE user_id = ?'),
    emailTokens: one('SELECT COUNT(*) n FROM email_verification_tokens WHERE user_id = ?'),
  };
}

describe('Cascade de suppression utilisateur (données + fichiers)', () => {
  it('crée un utilisateur complet puis supprime tout par cascade, sans orphelin', async () => {
    // 1-2) Utilisateur client complet : compte, profil, session, dossier, 8 pièces + versions/fichiers.
    const { a: client, userId } = await newClient('cascade-client@example.test');
    await uploadAllRequired(client);
    const submit = await client.post('/api/dossier/submit');
    expect(submit.status).toBe(200);

    // Un admin prend en charge et demande une correction → crée admin_reviews + notification client + historique.
    const { a: admin } = await newAdmin('cascade-admin@example.test');
    const list = await admin.get('/api/admin/dossiers');
    const dossierId = list.body.dossiers[0].id as string;
    const full = await admin.get(`/api/admin/dossiers/${dossierId}`);
    const docId = full.body.documents[0].id as string;
    const corr = await admin.post(`/api/admin/documents/${docId}/request-correction`).send({ reason: 'Pièce illisible, à redéposer.' });
    expect(corr.status).toBe(200);

    // Vérifie que TOUTES les données liées existent bien avant suppression.
    const before = childCounts(userId);
    expect(before).toMatchObject({ users: 1, profiles: 1, dossiers: 1, documents: 8 });
    expect(before.sessions).toBeGreaterThanOrEqual(1);
    expect(before.versions).toBeGreaterThanOrEqual(7);
    expect(before.reviews).toBeGreaterThanOrEqual(1);
    expect(before.notifications).toBeGreaterThanOrEqual(1);
    expect(before.emailTokens).toBeGreaterThanOrEqual(1);
    expect(storedFiles().length).toBeGreaterThanOrEqual(7); // fichiers physiques du client

    // 3-4) Suppression via la connexion applicative (cascade FK + fichiers).
    const res = deleteUserCascade(userId);
    expect(res.filesDeleted).toBeGreaterThanOrEqual(7);

    // 5) Aucune ligne dépendante ne subsiste.
    const after = childCounts(userId);
    expect(after).toEqual({
      users: 0, profiles: 0, sessions: 0, dossiers: 0, documents: 0,
      versions: 0, reviews: 0, notifications: 0, emailTokens: 0,
    });
    // Aucune violation de contrainte d'intégrité référentielle.
    expect(foreignKeyCheck()).toHaveLength(0);

    // 6) Fichiers physiques du client supprimés (l'admin n'a rien téléversé).
    expect(storedFiles()).toHaveLength(0);

    // L'admin (non ciblé) demeure et reste fonctionnel.
    const stillAdmin = await admin.get('/api/admin/dossiers');
    expect(stillAdmin.status).toBe(200);
  });

  it('supprimer un utilisateur inexistant lève une erreur (aucune suppression silencieuse)', () => {
    expect(() => deleteUserCascade('usr_inexistant')).toThrow();
  });

  it('bloque tout accès après suppression de session (cookie invalidé)', async () => {
    const { a: client, userId } = await newClient('cascade-ephemere@example.test');
    // Session active.
    expect((await client.get('/api/dossier')).status).toBe(200);
    deleteUserCascade(userId);
    // Session supprimée en cascade → 401.
    const after = await request.agent(app).get('/api/dossier');
    expect(after.status).toBe(401);
    expect((await client.get('/api/dossier')).status).toBe(401);
  });
});
