/**
 * Création du PREMIER administrateur.
 *
 * SÉCURITÉ : aucun mot de passe par défaut. L'adresse ET le mot de passe doivent être
 * fournis EXPLICITEMENT au moment de l'exécution, via arguments ou variables d'env :
 *
 *   pnpm create-admin --email=admin@exemple.sn --password='MotDePasseFort123'
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm create-admin
 *
 * Ne PAS exécuter automatiquement (ni dans les tests, ni au démarrage).
 */
import { db } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { newId, now } from '../lib/ids.js';
import { hashPassword } from '../lib/hash.js';
import { emailField_parse, strongPassword_parse } from './_validate.js';

function argOf(name: string): string | undefined {
  const pref = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}

async function main() {
  const email = (argOf('email') ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = argOf('password') ?? process.env.ADMIN_PASSWORD ?? '';

  if (!email || !password) {
    console.error('Erreur : --email et --password sont obligatoires (aucune valeur par défaut).');
    process.exit(1);
  }
  const emailErr = emailField_parse(email);
  if (emailErr) { console.error('Erreur : ' + emailErr); process.exit(1); }
  const pwErr = strongPassword_parse(password);
  if (pwErr) { console.error('Erreur : ' + pwErr); process.exit(1); }

  runMigrations();

  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    console.error('Erreur : un utilisateur avec cette adresse existe déjà.');
    process.exit(1);
  }

  const id = newId('usr');
  const t = now();
  const hash = await hashPassword(password);
  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, phone, password_hash, role, email_verified, created_at, updated_at)
       VALUES (?,?,?,?, 'ADMIN', 1, ?, ?)`,
    ).run(id, email, null, hash, t, t);
    db.prepare(
      'INSERT INTO profiles (id, user_id, first_name, last_name, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run(newId('prf'), id, 'Admin', '', t, t);
  })();

  console.log(`Administrateur créé : ${email}`);
}

main().catch(err => { console.error('Échec :', (err as Error).message); process.exit(1); });
