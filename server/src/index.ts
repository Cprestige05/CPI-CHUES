import { createApp } from './app.js';
import { env } from './env.js';
import { runMigrations } from './db/migrate.js';
import { mailer } from './lib/mailer.js';
import { bootstrapAdmin } from './lib/bootstrap.js';
import { seedParcelles } from './lib/seedParcelles.js';

// SÉCURITÉ : refuse de démarrer en production avec l'adaptateur e-mail de développement,
// SAUF si ALLOW_DEV_MAILER=true (déploiement de DÉMONSTRATION uniquement — l'admin valide
// alors les comptes sans e-mail de vérification réel).
if (env.isProd && mailer.isDev) {
  if (!env.ALLOW_DEV_MAILER) {
    console.error('[fatal] Adaptateur e-mail de développement interdit en production. Configurez le SMTP (SMTP_HOST…) ou définissez ALLOW_DEV_MAILER=true pour une démo.');
    process.exit(1);
  }
  console.warn('[warn] DÉMO : démarrage en production SANS envoi d\'e-mail réel (ALLOW_DEV_MAILER=true). Les comptes sont validés par l\'admin.');
}

// Applique les migrations au démarrage puis lance le serveur sur le port 8787.
const applied = runMigrations();
if (applied > 0) console.log(`[startup] ${applied} migration(s) appliquée(s).`);

// Admin de démarrage optionnel (variables d'env) — utile sans accès Shell.
await bootstrapAdmin();
// Catalogue des parcelles (2500 lots / 482 îlots) si la table est vide.
seedParcelles();

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`[mon-espace-server] écoute sur http://127.0.0.1:${env.PORT} (env=${env.NODE_ENV})`);
  console.log('[mon-espace-server] backend indépendant — aucune connexion à PocketBase / :8090 / cpi-chues.com.');
});
