import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, newClient, lastToken, db, DEFAULT_PW } from './util.js';

const base = { firstName: 'Awa', lastName: 'Diop', acceptTerms: true as const };

describe('Authentification & inscription', () => {
  it('inscription publique force le rôle CLIENT (rôle du payload ignoré)', async () => {
    const email = 'a1@test.sn';
    const res = await request(app).post('/api/auth/register').send({ ...base, email, password: DEFAULT_PW, role: 'ADMIN' });
    expect(res.status).toBe(201);
    const u = db.prepare('SELECT role FROM users WHERE email=?').get(email) as any;
    expect(u.role).toBe('CLIENT');
  });

  it('mot de passe stocké haché en Argon2id, jamais en clair', async () => {
    const email = 'a2@test.sn';
    await request(app).post('/api/auth/register').send({ ...base, email, password: DEFAULT_PW });
    const u = db.prepare('SELECT password_hash FROM users WHERE email=?').get(email) as any;
    expect(u.password_hash).toMatch(/^\$argon2id\$/);
    expect(u.password_hash).not.toContain(DEFAULT_PW);
  });

  it('doublon e-mail (insensible à la casse) rejeté', async () => {
    await request(app).post('/api/auth/register').send({ ...base, email: 'dup@test.sn', password: DEFAULT_PW });
    const res = await request(app).post('/api/auth/register').send({ ...base, email: 'DUP@test.sn', password: DEFAULT_PW });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email_taken');
  });

  it('doublon téléphone rejeté (après normalisation)', async () => {
    await request(app).post('/api/auth/register').send({ ...base, email: 'p1@test.sn', phone: '77 123 45 67', password: DEFAULT_PW });
    const res = await request(app).post('/api/auth/register').send({ ...base, email: 'p2@test.sn', phone: '771234567', password: DEFAULT_PW });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('phone_taken');
  });

  it('CGU non acceptées → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...base, acceptTerms: false, email: 'cgu@test.sn', password: DEFAULT_PW });
    expect(res.status).toBe(400);
  });

  it('mot de passe trop faible → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...base, email: 'weak@test.sn', password: 'court' });
    expect(res.status).toBe(400);
  });

  it("vérification d'adresse via jeton", async () => {
    const email = 'v@test.sn';
    await request(app).post('/api/auth/register').send({ ...base, email, password: DEFAULT_PW });
    expect((db.prepare('SELECT email_verified FROM users WHERE email=?').get(email) as any).email_verified).toBe(0);
    const res = await request(app).post('/api/auth/verify-email').send({ token: lastToken('email_verification') });
    expect(res.status).toBe(200);
    expect((db.prepare('SELECT email_verified FROM users WHERE email=?').get(email) as any).email_verified).toBe(1);
  });

  it('connexion valide → session → déconnexion', async () => {
    const email = 's@test.sn';
    const { a } = await newClient(email);
    const ses = await a.get('/api/auth/session');
    expect(ses.status).toBe(200);
    expect(ses.body.user.email).toBe(email);
    expect(ses.body.user.role).toBe('CLIENT');
    expect(await a.post('/api/auth/logout').then(r => r.status)).toBe(200);
    expect(await a.get('/api/auth/session').then(r => r.status)).toBe(401);
  });

  it('connexion invalide → 401', async () => {
    const email = 'bad@test.sn';
    await request(app).post('/api/auth/register').send({ ...base, email, password: DEFAULT_PW });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass999' });
    expect(res.status).toBe(401);
  });

  it('session expirée → 401', async () => {
    const { a, userId } = await newClient('exp@test.sn');
    db.prepare('UPDATE sessions SET expires_at = ? WHERE user_id = ?').run(Date.now() - 1000, userId);
    expect(await a.get('/api/auth/session').then(r => r.status)).toBe(401);
  });

  it('réinitialisation du mot de passe (ancien KO, nouveau OK)', async () => {
    const email = 'r@test.sn';
    await request(app).post('/api/auth/register').send({ ...base, email, password: DEFAULT_PW });
    await request(app).post('/api/auth/request-reset').send({ email });
    const res = await request(app).post('/api/auth/reset-password').send({ token: lastToken('password_reset'), password: 'NewPass1234' });
    expect(res.status).toBe(200);
    expect(await request(app).post('/api/auth/login').send({ email, password: DEFAULT_PW }).then(r => r.status)).toBe(401);
    expect(await request(app).post('/api/auth/login').send({ email, password: 'NewPass1234' }).then(r => r.status)).toBe(200);
  });

  it('demande de réinitialisation générique même si e-mail inconnu', async () => {
    const res = await request(app).post('/api/auth/request-reset').send({ email: 'inconnu@test.sn' });
    expect(res.status).toBe(200);
  });

  it('limitation des tentatives de connexion → 429 après N échecs', async () => {
    const email = 'rl@test.sn';
    await request(app).post('/api/auth/register').send({ ...base, email, password: DEFAULT_PW });
    let last = 0;
    for (let i = 0; i < 6; i++) last = await request(app).post('/api/auth/login').send({ email, password: 'nope' }).then(r => r.status);
    expect(last).toBe(429);
  });
});
