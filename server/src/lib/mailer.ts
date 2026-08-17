import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { now } from './ids.js';
import { env, SERVER_ROOT } from '../env.js';

export interface SentMessage {
  to: string;
  subject: string;
  kind: 'email_verification' | 'password_reset';
  token?: string; // conservé UNIQUEMENT en dev (outbox mémoire + fichier) pour tester
  at: number;
}

export interface Mailer {
  readonly isDev: boolean;
  readonly outbox: SentMessage[];
  send(msg: Omit<SentMessage, 'at'>): Promise<void>;
}

function maskEmail(email: string): string {
  const [u, d] = email.split('@');
  if (!d) return '***';
  return `${u.slice(0, 2)}***@${d}`;
}

// Fichier outbox de DÉVELOPPEMENT (jamais en production). Gitignoré. Ce n'est PAS un
// endpoint : il permet à une CLI/un test de récupérer le dernier lien de confirmation.
const DEV_OUTBOX_FILE = resolve(SERVER_ROOT, 'data', 'dev-outbox.json');

/**
 * Adaptateur e-mail de DÉVELOPPEMENT.
 * - Console : journalise seulement qu'un message a été généré (jeton tronqué, jamais entier).
 * - N'envoie AUCUN e-mail réel et ne le prétend pas.
 * - Interdit en production (le serveur refuse de démarrer, cf. index.ts).
 */
class DevMailer implements Mailer {
  readonly isDev = true;
  readonly outbox: SentMessage[] = [];

  async send(msg: Omit<SentMessage, 'at'>): Promise<void> {
    const entry: SentMessage = { ...msg, at: now() };
    this.outbox.push(entry);

    // Persistance dev-only (jamais en production) pour la CLI `dev-mail`.
    if (!env.isProd) {
      try {
        mkdirSync(resolve(SERVER_ROOT, 'data'), { recursive: true });
        writeFileSync(DEV_OUTBOX_FILE, JSON.stringify(this.outbox.slice(-50), null, 2), { mode: 0o600 });
      } catch { /* non bloquant */ }
    }

    const hint = msg.token ? `${msg.token.slice(0, 4)}…` : '—';
    console.info(
      `[mailer:dev] message généré (type=${msg.kind}, destinataire=${maskEmail(msg.to)}, jeton=${hint}). ` +
        `Aucun e-mail réel envoyé (adaptateur de développement).`,
    );
  }
}

export const mailer: Mailer = new DevMailer();
export { DEV_OUTBOX_FILE };
