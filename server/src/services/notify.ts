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
