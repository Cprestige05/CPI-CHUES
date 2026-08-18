import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import { now } from './ids.js';
import { env, SERVER_ROOT, PRIMARY_ORIGIN } from '../env.js';

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

/** Lien cliquable de l'e-mail (vérification d'adresse ou réinitialisation). */
export function mailLink(kind: SentMessage['kind'], token: string): string {
  const param = kind === 'email_verification' ? 'verify' : 'reset';
  return `${PRIMARY_ORIGIN}/?${param}=${encodeURIComponent(token)}`;
}

function emailHtml(kind: SentMessage['kind'], link: string): string {
  const isVerify = kind === 'email_verification';
  const title = isVerify ? 'Vérifiez votre adresse e-mail' : 'Réinitialisez votre mot de passe';
  const intro = isVerify
    ? "Merci pour votre inscription sur l'espace CPI × CHUES. Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail."
    : "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.";
  const cta = isVerify ? 'Vérifier mon adresse' : 'Choisir un nouveau mot de passe';
  const after = isVerify
    ? "Après vérification, votre compte sera <strong>validé par un administrateur</strong> qui vous attribuera un conseiller. Vous accéderez à votre espace dès la validation."
    : 'Ce lien expire prochainement. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail.';
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f2f2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.06)">
      <tr><td style="background:#5D1615;padding:22px 28px"><span style="color:#fff;font-weight:800;font-size:18px;letter-spacing:.5px">CPI × CHUES</span><span style="color:rgba(255,255,255,.7);font-size:13px"> · Espace client</span></td></tr>
      <tr><td style="padding:28px">
        <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
        <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 22px">${intro}</p>
        <a href="${link}" style="display:inline-block;background:#5D1615;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px">${cta}</a>
        <p style="font-size:13px;line-height:1.6;color:#777;margin:22px 0 0">${after}</p>
        <p style="font-size:12px;color:#999;margin:18px 0 0;word-break:break-all">Ou copiez ce lien : <br>${link}</p>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #eee;font-size:12px;color:#aaa">CPI Immobilier × CHUES — cet e-mail vous a été envoyé automatiquement, merci de ne pas y répondre.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}
function emailText(kind: SentMessage['kind'], link: string): string {
  const isVerify = kind === 'email_verification';
  return `${isVerify ? 'Vérifiez votre adresse e-mail' : 'Réinitialisez votre mot de passe'}\n\n${link}\n\n` +
    (isVerify ? 'Après vérification, votre compte sera validé par un administrateur avant l\'accès.' : 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail.');
}

// ─── Adaptateur SMTP (envoi RÉEL) ────────────────────────────────────────────
class SmtpMailer implements Mailer {
  readonly isDev = false;
  readonly outbox: SentMessage[] = []; // on ne stocke JAMAIS le jeton en clair en prod
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  async send(msg: Omit<SentMessage, 'at'>): Promise<void> {
    if (!msg.token) return;
    const link = mailLink(msg.kind, msg.token);
    await this.transporter.sendMail({
      from: env.MAIL_FROM, to: msg.to, subject: msg.subject,
      text: emailText(msg.kind, link), html: emailHtml(msg.kind, link),
    });
    console.info(`[mailer:smtp] e-mail envoyé (type=${msg.kind}, destinataire=${maskEmail(msg.to)}).`);
  }
}

// ─── Adaptateur de DÉVELOPPEMENT (aucun envoi réel) ──────────────────────────
const DEV_OUTBOX_FILE = resolve(SERVER_ROOT, 'data', 'dev-outbox.json');

class DevMailer implements Mailer {
  readonly isDev = true;
  readonly outbox: SentMessage[] = [];

  async send(msg: Omit<SentMessage, 'at'>): Promise<void> {
    const entry: SentMessage = { ...msg, at: now() };
    this.outbox.push(entry);
    if (!env.isProd) {
      try {
        mkdirSync(resolve(SERVER_ROOT, 'data'), { recursive: true });
        writeFileSync(DEV_OUTBOX_FILE, JSON.stringify(this.outbox.slice(-50), null, 2), { mode: 0o600 });
      } catch { /* non bloquant */ }
    }
    const hint = msg.token ? `${msg.token.slice(0, 4)}…` : '—';
    console.info(
      `[mailer:dev] message généré (type=${msg.kind}, destinataire=${maskEmail(msg.to)}, jeton=${hint}). ` +
        `Aucun e-mail réel (adaptateur de développement). Définissez SMTP_HOST pour un envoi réel.`,
    );
  }
}

// SMTP configuré → envoi réel ; sinon adaptateur de développement.
export const mailer: Mailer = env.SMTP_HOST ? new SmtpMailer() : new DevMailer();
export { DEV_OUTBOX_FILE };
