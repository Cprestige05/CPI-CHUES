import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../env.js';

// Assure l'existence du dossier de la base (server/data).
mkdirSync(dirname(env.DATABASE_FILE), { recursive: true });

export const db = new Database(env.DATABASE_FILE);

// Clés étrangères ACTIVÉES + mode WAL en développement.
db.pragma('foreign_keys = ON');
db.pragma(env.isProd ? 'journal_mode = DELETE' : 'journal_mode = WAL');
db.pragma('busy_timeout = 5000');

export type DB = typeof db;
