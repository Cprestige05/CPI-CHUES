import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, newClient, upload, db } from './util.js';

describe('Rôles & autorisations (anti-élévation, isolation)', () => {
  it('route admin sans session → 401', async () => {
    expect(await request(app).get('/api/admin/dossiers').then(r => r.status)).toBe(401);
  });

  it("un client ne peut pas accéder aux routes admin → 403", async () => {
    const { a } = await newClient('c@test.sn');
    expect(await a.get('/api/admin/dossiers').then(r => r.status)).toBe(403);
  });

  it("un client ne peut PAS télécharger le document d'un autre client (IDOR) → 403", async () => {
    const c1 = await newClient('c1@test.sn');
    await upload(c1.a, 'cni', 0);
    const dossierId = (db.prepare('SELECT id FROM dossiers WHERE user_id=?').get(c1.userId) as any).id;
    const ver = db
      .prepare('SELECT dv.id FROM document_versions dv JOIN documents d ON d.id = dv.document_id WHERE d.dossier_id = ?')
      .get(dossierId) as any;

    const c2 = await newClient('c2@test.sn');
    expect(await c2.a.get(`/api/documents/${ver.id}/download`).then(r => r.status)).toBe(403);

    // Le propriétaire, lui, y accède.
    expect(await c1.a.get(`/api/documents/${ver.id}/download`).then(r => r.status)).toBe(200);
  });

  it("un client ne peut pas valider un document (route admin) → 403", async () => {
    const c1 = await newClient('cx@test.sn');
    await upload(c1.a, 'cni', 0);
    const dossierId = (db.prepare('SELECT id FROM dossiers WHERE user_id=?').get(c1.userId) as any).id;
    const docId = (db.prepare("SELECT id FROM documents WHERE dossier_id=? AND type_code='cni' AND slot_index=0").get(dossierId) as any).id;
    expect(await c1.a.post(`/api/admin/documents/${docId}/validate`).then(r => r.status)).toBe(403);
  });
});
