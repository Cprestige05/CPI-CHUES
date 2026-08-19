import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Racine de `server/` (indépendante de l'ancien projet).
const __dirname = dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = resolve(__dirname, '..');

// Chargeur `.env` minimal (aucune dépendance). Ne journalise jamais les valeurs.
function loadDotEnv(): void {
  const envPath = resolve(SERVER_ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  PORT: num(process.env.PORT, 8787),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  DATABASE_FILE: resolve(SERVER_ROOT, process.env.DATABASE_FILE ?? './data/app.db'),
  // Base cloud persistante (Turso / libSQL). Si TURSO_DATABASE_URL est défini, la
  // base locale devient un « réplica embarqué » synchronisé avec le cloud : les
  // données survivent aux redémarrages (utile sur un hébergement à disque éphémère).
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? '',
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? '',
  STORAGE_DIR: resolve(SERVER_ROOT, process.env.STORAGE_DIR ?? './storage/documents'),
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'mon_espace_sid',
  SESSION_TTL_HOURS: num(process.env.SESSION_TTL_HOURS, 12),
  MAX_UPLOAD_MB: num(process.env.MAX_UPLOAD_MB, 10),
  EMAIL_TOKEN_TTL_HOURS: num(process.env.EMAIL_TOKEN_TTL_HOURS, 24),
  RESET_TOKEN_TTL_HOURS: num(process.env.RESET_TOKEN_TTL_HOURS, 2),
  LOGIN_MAX_ATTEMPTS: num(process.env.LOGIN_MAX_ATTEMPTS, 5),
  LOGIN_WINDOW_MINUTES: num(process.env.LOGIN_WINDOW_MINUTES, 15),

  // ─── E-mail (SMTP). Si SMTP_HOST est défini, les e-mails RÉELS sont envoyés ;
  //     sinon on retombe sur l'adaptateur de développement (aucun envoi réel). ───
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: num(process.env.SMTP_PORT, 587),
  SMTP_SECURE: (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true', // true = TLS implicite (port 465)
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  MAIL_FROM: process.env.MAIL_FROM ?? 'CPI × CHUES <no-reply@cpi-chues.sn>',

  // Déploiement mono-service : si ce dossier existe, le backend sert le frontend
  // compilé (SPA) — une seule URL pour tout. Par défaut, le `dist/` à la racine.
  FRONTEND_DIST: resolve(SERVER_ROOT, '..', process.env.FRONTEND_DIST ?? 'dist'),
  // Autorise le démarrage en production sans SMTP (démo). À NE PAS utiliser en vrai prod.
  ALLOW_DEV_MAILER: (process.env.ALLOW_DEV_MAILER ?? '').toLowerCase() === 'true',
} as const;

/** Première origine autorisée (pour construire les liens des e-mails). */
export const PRIMARY_ORIGIN = env.CLIENT_ORIGIN.split(',')[0].trim();

export const MAX_UPLOAD_BYTES = env.MAX_UPLOAD_MB * 1024 * 1024;
