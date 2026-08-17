import { db } from '../db/index.js';
import { newId, now } from '../lib/ids.js';

/** Crée une notification in-app (aucune URL publique ni contenu sensible). */
export function notify(userId: string, type: string, title: string, body = ''): void {
  db.prepare(
    'INSERT INTO notifications (id, user_id, type, title, body, read, created_at) VALUES (?,?,?,?,?,0,?)',
  ).run(newId('ntf'), userId, type, title, body, now());
}

export interface ActivityInput {
  actorId?: string | null;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>; // JSON NON sensible (jamais mot de passe/jeton/contenu doc)
}

/** Liste les notifications d'un utilisateur (plus récentes d'abord). */
export function listNotifications(userId: string, limit = 50) {
  return db.prepare(
    'SELECT id, type, title, body, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
  ).all(userId, limit);
}

/** Nombre de notifications non lues. */
export function unreadCount(userId: string): number {
  const r = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0').get(userId) as { n: number };
  return r.n;
}

/** Marque une notification comme lue (uniquement celles de l'utilisateur). */
export function markRead(userId: string, id: string): boolean {
  const res = db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
  return res.changes > 0;
}

/** Journalise une activité (sans mot de passe, jeton ni contenu documentaire). */
export function logActivity(a: ActivityInput): void {
  db.prepare(
    `INSERT INTO activity_logs (id, actor_id, actor_role, action, entity_type, entity_id, meta, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    newId('log'),
    a.actorId ?? null,
    a.actorRole ?? '',
    a.action,
    a.entityType ?? '',
    a.entityId ?? '',
    a.meta ? JSON.stringify(a.meta) : '',
    now(),
  );
}
