/**
 * Récupère le dernier message e-mail généré en DÉVELOPPEMENT (jeton de confirmation
 * ou de réinitialisation). Lit l'outbox dev locale — jamais exposée en HTTP.
 *
 *   pnpm dev-mail                    → dernier message
 *   pnpm dev-mail --kind=email_verification
 *
 * Indisponible en production.
 */
import { readFileSync, existsSync } from 'node:fs';
import { env } from '../env.js';
import { DEV_OUTBOX_FILE } from '../lib/mailer.js';

if (env.isProd) {
  console.error('Indisponible en production.');
  process.exit(1);
}
if (!existsSync(DEV_OUTBOX_FILE)) {
  console.error('Aucun message généré pour le moment.');
  process.exit(1);
}

const outbox = JSON.parse(readFileSync(DEV_OUTBOX_FILE, 'utf8')) as Array<{ to: string; kind: string; token?: string }>;
const kind = process.argv.find(a => a.startsWith('--kind='))?.split('=')[1];
const list = kind ? outbox.filter(m => m.kind === kind) : outbox;
const last = list[list.length - 1];

if (!last) {
  console.error('Aucun message correspondant.');
  process.exit(1);
}
console.log(JSON.stringify({ to: last.to, kind: last.kind, token: last.token ?? null }, null, 2));
