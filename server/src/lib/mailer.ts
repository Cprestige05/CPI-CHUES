import { now } from './ids.js';

export interface SentMessage {
  to: string;
  subject: string;
  kind: 'email_verification' | 'password_reset';
  token?: string; // conservé UNIQUEMENT en mémoire (outbox) pour dev/tests
  at: number;
}

export interface Mailer {
  send(msg: Omit<SentMessage, 'at'>): Promise<void>;
  readonly outbox: SentMessage[];
}

function maskEmail(email: string): string {
  const [u, d] = email.split('@');
  if (!d) return '***';
  return `${u.slice(0, 2)}***@${d}`;
}

/**
 * Adaptateur e-mail de DÉVELOPPEMENT.
 * - Journalise UNIQUEMENT qu'un message a été généré (jamais le jeton complet).
 * - N'envoie AUCUN e-mail réel et ne prétend pas l'avoir fait (aucun fournisseur configuré).
 * - `outbox` (mémoire seulement) permet aux tests de récupérer le jeton sans le journaliser.
 */
class DevMailer implements Mailer {
  readonly outbox: SentMessage[] = [];

  async send(msg: Omit<SentMessage, 'at'>): Promise<void> {
    this.outbox.push({ ...msg, at: now() });
    const hint = msg.token ? `${msg.token.slice(0, 4)}…` : '—';
    // NB : jeton volontairement tronqué — jamais affiché en entier.
    console.info(
      `[mailer:dev] message généré (type=${msg.kind}, destinataire=${maskEmail(msg.to)}, jeton=${hint}). ` +
        `Aucun e-mail réel envoyé (adaptateur de développement).`,
    );
  }
}

export const mailer: Mailer = new DevMailer();
