import Database from 'libsql';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../env.js';

// Assure l'existence du dossier de la base (server/data ou /data en prod).
mkdirSync(dirname(env.DATABASE_FILE), { recursive: true });

// Deux modes :
//  • Turso configuré  → réplica embarqué synchronisé avec la base cloud
//    (le fichier local peut être éphémère : sync() le reconstruit au démarrage).
//  • sinon            → simple fichier SQLite local (développement / hors-ligne).
const useTurso = env.TURSO_DATABASE_URL !== '';

export const db = useTurso
  ? new Database(env.DATABASE_FILE, {
      syncUrl: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    })
  : new Database(env.DATABASE_FILE);

// Récupère l'état cloud AVANT les migrations, pour que `_migrations` et les
// données existantes soient présents localement (migrations idempotentes).
if (useTurso) {
  try {
    db.sync();
    console.log('[db] réplica Turso synchronisé depuis le cloud.');
  } catch (e) {
    console.error('[db] échec de la synchronisation Turso initiale :', (e as Error).message);
  }
}

// Clés étrangères ACTIVÉES. Le mode de journalisation n'est réglé qu'en local
// (un réplica embarqué gère lui-même sa journalisation).
db.exec('PRAGMA foreign_keys = ON');
if (!useTurso) db.exec(env.isProd ? 'PRAGMA journal_mode = DELETE' : 'PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');

export type DB = typeof db;
