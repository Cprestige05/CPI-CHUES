import { db } from '../db/index.js';
import { newId, now } from './ids.js';
import { hashPassword } from './hash.js';

/** Insère un compte personnel (admin/agent), approuvé d'office. Idempotent par e-mail. */
async function createStaff(email: string, password: string, role: 'ADMIN' | 'AGENT_CPI', firstName: string, lastName: string): Promise<boolean> {
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return false;
  const id = newId('usr');
  const t = now();
  const hash = await hashPassword(password);
  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, phone, password_hash, role, email_verified, approved, created_at, updated_at)
       VALUES (?,?,?,?,?, 1, 1, ?, ?)`,
    ).run(id, email, null, hash, role, t, t);
    db.prepare('INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run(newId('prf'), id, firstName, lastName, t, t);
  })();
  return true;
}

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

  await createStaff(email, password, 'ADMIN', 'Administrateur', 'CPI');
  console.log(`[bootstrap] Administrateur créé depuis les variables d'environnement : ${email}`);

  // Agents de démonstration (optionnel) : permet de tester l'attribution et la vue
  // agent sur un déploiement sans Shell. Identifiants documentés, mot de passe fixe.
  if (process.env.BOOTSTRAP_DEMO_AGENTS === 'true') {
    const demo = [
      { email: 'agent1@cpi-chues.sn', first: 'Fatou', last: 'Sarr' },
      { email: 'agent2@cpi-chues.sn', first: 'Moussa', last: 'Diop' },
    ];
    for (const a of demo) {
      if (await createStaff(a.email, 'AgentDemo2026', 'AGENT_CPI', a.first, a.last)) {
        console.log(`[bootstrap] Agent de démo créé : ${a.email} (mot de passe : AgentDemo2026)`);
      }
    }
  }
}
