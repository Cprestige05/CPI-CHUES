import { Router } from 'express';
import { ah, notFound } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications, unreadCount, markRead } from '../services/notify.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// Liste des notifications de l'utilisateur connecté.
notificationsRouter.get('/', ah(async (req, res) => {
  res.json({ notifications: listNotifications(req.user!.id), unread: unreadCount(req.user!.id) });
}));

// Nombre de notifications non lues.
notificationsRouter.get('/unread-count', ah(async (req, res) => {
  res.json({ unread: unreadCount(req.user!.id) });
}));

// Marquer une notification comme lue.
notificationsRouter.post('/:id/read', ah(async (req, res) => {
  if (!markRead(req.user!.id, req.params.id)) throw notFound('Notification introuvable.');
  res.json({ ok: true, unread: unreadCount(req.user!.id) });
}));
