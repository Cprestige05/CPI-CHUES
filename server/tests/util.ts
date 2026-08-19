import request from 'supertest';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/db/migrate.js';
import { db } from '../src/db/index.js';
import { mailer } from '../src/lib/mailer.js';
import { hashPassword } from '../src/lib/hash.js';
import { newId, now } from '../src/lib/ids.js';

runMigrations();
export const app = createApp();

export const DEFAULT_PW = 'Password123';

// ── Fichiers d'exemple (magic bytes) ─────────────────────────────────────────
export const files = {
  pdf: () => ({ buffer: Buffer.from('%PDF-1.4\nfaux contenu pdf pour test\n%%EOF'), filename: 'doc.pdf', contentType: 'application/pdf' }),
  png: () => ({ buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]), filename: 'img.png', contentType: 'image/png' }),
  jpg: () => ({ buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), filename: 'img.jpg', contentType: 'image/jpeg' }),
  txt: () => ({ buffer: Buffer.from('juste du texte, pas un vrai document'), filename: 'note.txt', contentType: 'text/plain' }),
  empty: () => ({ buffer: Buffer.alloc(0), filename: 'vide.pdf', contentType: 'application/pdf' }),
  big: () => ({ buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(11 * 1024 * 1024)]), filename: 'gros.pdf', contentType: 'application/pdf' }),
};

export function lastToken(kind: 'email_verification' | 'password_reset'): string {
  const msg = [...mailer.outbox].reverse().find(m => m.kind === kind);
  if (!msg?.token) throw new Error('Aucun jeton en outbox pour ' + kind);
  return msg.token;
}

/** Agent supertest qui conserve les cookies (session). */
export const agent = () => request.agent(app);

/**
 * Inscrit + vérifie l'e-mail + connecte un CLIENT ; renvoie l'agent et l'userId.
 * Par défaut, le compte est APPROUVÉ (comme après validation admin) pour que le
 * client puisse accéder à son dossier. Passer `approved: false` pour tester le
 * blocage « compte en attente ».
 */
export async function newClient(email: string, password = DEFAULT_PW, opts: { approved?: boolean } = {}) {
  const a = agent();
  const reg = await a.post('/api/auth/register').send({
    firstName: 'Awa', lastName: 'Diop', email, password, acceptTerms: true,
  });
  if (reg.status !== 201) throw new Error('register a échoué: ' + reg.status + ' ' + JSON.stringify(reg.body));
  await a.post('/api/auth/verify-email').send({ token: lastToken('email_verification') });
  const login = await a.post('/api/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error('login a échoué: ' + login.status);
  const userId = login.body.user.id as string;
  if (opts.approved !== false) db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(userId);
  return { a, userId };
}

/** Crée un ADMIN directement en base puis connecte un agent. */
export async function newAdmin(email: string, password = DEFAULT_PW) {
  const id = newId('usr');
  const t = now();
  const hash = await hashPassword(password);
  db.prepare(
    `INSERT INTO users (id, email, phone, password_hash, role, email_verified, approved, created_at, updated_at)
     VALUES (?,?,?,?, 'ADMIN', 1, 1, ?, ?)`,
  ).run(id, email.toLowerCase(), null, hash, t, t);
  db.prepare('INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(newId('prf'), id, 'Admin', '', t, t);
  const a = agent();
  const login = await a.post('/api/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error('login admin a échoué: ' + login.status);
  return { a, userId: id };
}

/** Crée un AGENT CPI directement en base puis connecte un agent supertest. */
export async function newAgent(email: string, password = DEFAULT_PW) {
  const id = newId('usr');
  const t = now();
  const hash = await hashPassword(password);
  db.prepare(
    `INSERT INTO users (id, email, phone, password_hash, role, email_verified, approved, created_at, updated_at)
     VALUES (?,?,?,?, 'AGENT_CPI', 1, 1, ?, ?)`,
  ).run(id, email.toLowerCase(), null, hash, t, t);
  db.prepare('INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(newId('prf'), id, 'Agent', 'CPI', t, t);
  const a = agent();
  const login = await a.post('/api/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error('login agent a échoué: ' + login.status);
  return { a, userId: id };
}

/** Dépose un fichier valide sur un emplacement. */
export function upload(a: request.Agent, typeCode: string, slotIndex: number, f = files.pdf()) {
  return a.post('/api/documents')
    .field('typeCode', typeCode)
    .field('slotIndex', String(slotIndex))
    .attach('file', f.buffer, { filename: f.filename, contentType: f.contentType });
}

/** Dépose les 8 pièces obligatoires (cni×1, bulletin×3, relevé×3, domicile×1). */
export async function uploadAllRequired(a: request.Agent) {
  await upload(a, 'cni', 0);
  for (let i = 0; i < 3; i++) await upload(a, 'bulletin', i);
  for (let i = 0; i < 3; i++) await upload(a, 'releve', i);
  await upload(a, 'domicile', 0);
}

export { db };
