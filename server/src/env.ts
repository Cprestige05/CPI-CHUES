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
  STORAGE_DIR: resolve(SERVER_ROOT, process.env.STORAGE_DIR ?? './storage/documents'),
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'mon_espace_sid',
  SESSION_TTL_HOURS: num(process.env.SESSION_TTL_HOURS, 12),
  MAX_UPLOAD_MB: num(process.env.MAX_UPLOAD_MB, 10),
  EMAIL_TOKEN_TTL_HOURS: num(process.env.EMAIL_TOKEN_TTL_HOURS, 24),
  RESET_TOKEN_TTL_HOURS: num(process.env.RESET_TOKEN_TTL_HOURS, 2),
  LOGIN_MAX_ATTEMPTS: num(process.env.LOGIN_MAX_ATTEMPTS, 5),
  LOGIN_WINDOW_MINUTES: num(process.env.LOGIN_WINDOW_MINUTES, 15),
} as const;

export const MAX_UPLOAD_BYTES = env.MAX_UPLOAD_MB * 1024 * 1024;
