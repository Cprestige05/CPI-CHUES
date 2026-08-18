import { db } from '../db/index.js';
import { newId, now } from './ids.js';
import { hashPassword } from './hash.js';

/**
 * Crée un administrateur au démarrage À PARTIR DE VARIABLES D'ENVIRONNEMENT,
 * UNIQUEMENT si `BOOTSTRAP_ADMIN_EMAIL` et `BOOTSTRAP_ADMIN_PASSWORD` sont définis
 * ET qu'aucun administrateur n'existe encore. Idempotent et sûr : aucun mot de
 * passe par défaut, jamais de doublon. Utile pour un déploiement où le Shell
 * n'est pas disponible (ex. plan gratuit Render). À retirer/vider une fois le
 * premier admin créé.
 */
export async function bootstrapAdmin(): Promise<void> {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';
  if (!email || !password) return; // pas de bootstrap demandé

  if (db.prepare("SELECT 1 FROM users WHERE role = 'ADMIN'").get()) {
    console.log('[bootstrap] Un administrateur existe déjà — bootstrap ignoré.');
    return;
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    console.log('[bootstrap] Adresse déjà utilisée — bootstrap ignoré.');
    return;
  }
  if (password.length < 8) {
    console.warn('[bootstrap] BOOTSTRAP_ADMIN_PASSWORD trop court (≥ 8 caractères requis) — bootstrap ignoré.');
    return;
  }

  const id = newId('usr');
  const t = now();
  const hash = await hashPassword(password);
  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, phone, password_hash, role, email_verified, approved, created_at, updated_at)
       VALUES (?,?,?,?, 'ADMIN', 1, 1, ?, ?)`,
    ).run(id, email, null, hash, t, t);
    db.prepare('INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run(newId('prf'), id, 'Administrateur', 'CPI', t, t);
  })();
  console.log(`[bootstrap] Administrateur créé depuis les variables d'environnement : ${email}`);
}
