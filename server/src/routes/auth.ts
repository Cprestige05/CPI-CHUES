import { Router } from 'express';
import { ah, unauthorized } from '../middleware/error.js';
import { createSession, destroySession, requireAuth } from '../middleware/auth.js';
import { loginRateLimit, recordLoginFailure, resetLoginAttempts } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema, emailTokenSchema, requestResetSchema, resetPasswordSchema } from '../validation/schemas.js';
import { registerClient, verifyCredentials, verifyEmailToken, requestPasswordReset, resetPassword } from '../services/auth.js';

export const authRouter = Router();

// Inscription publique → toujours un compte CLIENT (rôle jamais lu du payload).
authRouter.post('/register', ah(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const { userId } = await registerClient(input);
  res.status(201).json({ ok: true, userId, message: 'Compte créé. Vérifiez votre adresse e-mail.' });
}));

// Vérification d'adresse e-mail.
authRouter.post('/verify-email', ah(async (req, res) => {
  const { token } = emailTokenSchema.parse(req.body);
  verifyEmailToken(token);
  res.json({ ok: true, message: 'Adresse vérifiée.' });
}));

// Connexion.
authRouter.post('/login', loginRateLimit, ah(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const ip = req.ip ?? '';
  const user = await verifyCredentials(email, password);
  if (!user) {
    recordLoginFailure(email, ip);
    throw unauthorized('E-mail ou mot de passe incorrect.');
  }
  resetLoginAttempts(email, ip);
  createSession(res, user.id, ip, String(req.headers['user-agent'] ?? ''));
  res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role, emailVerified: !!user.email_verified } });
}));

// Session courante.
authRouter.get('/session', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Déconnexion.
authRouter.post('/logout', ah(async (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
}));

// Demande de réinitialisation — réponse générique (aucune fuite d'existence).
authRouter.post('/request-reset', ah(async (req, res) => {
  const { email } = requestResetSchema.parse(req.body);
  await requestPasswordReset(email);
  res.json({ ok: true, message: 'Si un compte existe, un e-mail de réinitialisation a été généré.' });
}));

// Réinitialisation du mot de passe.
authRouter.post('/reset-password', ah(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await resetPassword(token, password);
  res.json({ ok: true, message: 'Mot de passe réinitialisé.' });
}));
