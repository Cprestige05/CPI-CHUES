import { describe, it, expect } from 'vitest';
import { newClient, uploadAllSeven } from './util.js';

describe('Notifications', () => {
  it('soumission → notification créée ; comptage non-lus ; marquer lu', async () => {
    const { a } = await newClient('n1@test.sn');
    await uploadAllSeven(a);
    await a.post('/api/dossier/submit');

    const list = await a.get('/api/notifications');
    expect(list.status).toBe(200);
    expect(list.body.notifications.length).toBeGreaterThanOrEqual(1);
    expect(list.body.unread).toBeGreaterThanOrEqual(1);

    const count = await a.get('/api/notifications/unread-count');
    expect(count.body.unread).toBe(list.body.unread);

    const first = list.body.notifications[0];
    const read = await a.post(`/api/notifications/${first.id}/read`);
    expect(read.status).toBe(200);
    expect(read.body.unread).toBe(list.body.unread - 1);
  });

  it('une notification ne contient ni jeton ni contenu de document', async () => {
    const { a } = await newClient('n2@test.sn');
    await uploadAllSeven(a);
    await a.post('/api/dossier/submit');
    const list = await a.get('/api/notifications');
    for (const n of list.body.notifications) {
      expect(n.body).not.toMatch(/token|jeton|\.pdf|argon2|password/i);
    }
  });
});

describe('Sécurité CSRF (protection Origin)', () => {
  it("une origine NON autorisée ne peut pas muter, même avec cookie de session → 403", async () => {
    const { a } = await newClient('csrf@test.sn');
    // Mutation avec cookie valide mais Origin étranger.
    const res = await a.post('/api/dossier/submit').set('Origin', 'http://evil.example.com').send({});
    expect(res.status).toBe(403);
  });

  it("l'origine autorisée (front) peut muter", async () => {
    const { a } = await newClient('csrf2@test.sn');
    const res = await a.post('/api/dossier/submit').set('Origin', 'http://localhost:5173').send({});
    // 400 (dossier incomplet) mais PAS 403 → l'origine est acceptée.
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });
});
