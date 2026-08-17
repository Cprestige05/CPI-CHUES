import { db } from '../db/index.js';
import { env } from '../env.js';
import { newId, now } from '../lib/ids.js';
import { hashPassword, verifyPassword } from '../lib/hash.js';
import { issueToken, hashToken } from '../lib/tokens.js';
import { mailer } from '../lib/mailer.js';
import { conflict, badRequest } from '../middleware/error.js';
import { ensureDossier } from './dossier.js';
import { notify, logActivity } from './notify.js';
import { normalizePhone } from '../validation/schemas.js';

export interface UserRow {
  id: string; email: string; phone: string | null; password_hash: string;
  role: 'CLIENT' | 'AGENT_CPI' | 'ADMIN'; email_verified: number; created_at: number; updated_at: number;
}

export const findByEmail = (email: string): UserRow | undefined =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;

/**
 * Inscription publique. Le rôle est TOUJOURS `CLIENT` — jamais lu depuis le payload.
 * Détecte les doublons e-mail et téléphone. Envoie un jeton de vérification (adaptateur dev).
 */
export async function registerClient(input: {
  firstName: string; lastName: string; email: string; phone?: string; password: string;
}): Promise<{ userId: string }> {
  const email = input.email.toLowerCase();
  const phone = input.phone ? normalizePhone(input.phone) : null;

  if (findByEmail(email)) throw conflict('Cette adresse e-mail est déjà utilisée.', 'email_taken');
  if (phone && db.prepare('SELECT 1 FROM users WHERE phone = ?').get(phone)) {
    throw conflict('Ce numéro de téléphone est déjà utilisé.', 'phone_taken');
  }

  const passwordHash = await hashPassword(input.password);
  const userId = newId('usr');
  const t = now();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, phone, password_hash, role, email_verified, created_at, updated_at)
       VALUES (?,?,?,?, 'CLIENT', 0, ?, ?)`,
    ).run(userId, email, phone, passwordHash, t, t);
    db.prepare(
      `INSERT INTO profiles (id, user_id, first_name, last_name, phone, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(newId('prf'), userId, input.firstName, input.lastName, phone ?? '', t, t);
  })();

  ensureDossier(userId);

  // Jeton de vérification d'adresse (on ne stocke QUE le hash).
  const tok = issueToken(env.EMAIL_TOKEN_TTL_HOURS);
  db.prepare(
    'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, used, created_at) VALUES (?,?,?,?,0,?)',
  ).run(newId('evt'), userId, tok.tokenHash, tok.expiresAt, now());
  await mailer.send({ to: email, subject: 'Vérifiez votre adresse', kind: 'email_verification', token: tok.token });

  logActivity({ actorId: userId, actorRole: 'CLIENT', action: 'user_registered', entityType: 'user', entityId: userId });
  return { userId };
}

/** Connexion : renvoie l'utilisateur si les identifiants sont valides, sinon null. */
export async function verifyCredentials(email: string, password: string): Promise<UserRow | null> {
  const user = findByEmail(email);
  if (!user) {
    // Vérification factice pour limiter l'oracle temporel (utilisateur inexistant).
    await verifyPassword(password, '$argon2id$v=19$m=19456,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').catch(() => false);
    return null;
  }
  const ok = await verifyPassword(password, user.password_hash);
  return ok ? user : null;
}

/** Vérifie l'adresse e-mail à partir d'un jeton. */
export function verifyEmailToken(token: string): boolean {
  const row = db.prepare(
    'SELECT id, user_id, expires_at, used FROM email_verification_tokens WHERE token_hash = ?',
  ).get(hashToken(token)) as { id: string; user_id: string; expires_at: number; used: number } | undefined;
  if (!row || row.used === 1 || row.expires_at < now()) throw badRequest('Jeton invalide ou expiré.', 'invalid_token');

  db.transaction(() => {
    db.prepare('UPDATE email_verification_tokens SET used = 1 WHERE id = ?').run(row.id);
    db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').run(now(), row.user_id);
  })();
  notify(row.user_id, 'account_confirmed', 'Compte confirmé', 'Votre adresse e-mail a été vérifiée.');
  return true;
}

/** Demande de réinitialisation — réponse toujours générique (aucune fuite d'existence). */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = findByEmail(email);
  if (!user) return; // silencieux
  const tok = issueToken(env.RESET_TOKEN_TTL_HOURS);
  db.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at) VALUES (?,?,?,?,0,?)',
  ).run(newId('prt'), user.id, tok.tokenHash, tok.expiresAt, now());
  await mailer.send({ to: user.email, subject: 'Réinitialisation du mot de passe', kind: 'password_reset', token: tok.token });
}

/** Réinitialise le mot de passe et révoque les sessions existantes. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const row = db.prepare(
    'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = ?',
  ).get(hashToken(token)) as { id: string; user_id: string; expires_at: number; used: number } | undefined;
  if (!row || row.used === 1 || row.expires_at < now()) throw badRequest('Jeton invalide ou expiré.', 'invalid_token');

  const passwordHash = await hashPassword(newPassword);
  db.transaction(() => {
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now(), row.user_id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id); // révoque tout
  })();
  logActivity({ actorId: row.user_id, action: 'password_reset', entityType: 'user', entityId: row.user_id });
}
