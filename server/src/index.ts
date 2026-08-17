import { createApp } from './app.js';
import { env } from './env.js';
import { runMigrations } from './db/migrate.js';
import { mailer } from './lib/mailer.js';

// SÉCURITÉ : refuse de démarrer en production avec l'adaptateur e-mail de développement.
if (env.isProd && mailer.isDev) {
  console.error('[fatal] Adaptateur e-mail de développement interdit en production. Configurez un fournisseur réel.');
  process.exit(1);
}

// Applique les migrations au démarrage puis lance le serveur sur le port 8787.
const applied = runMigrations();
if (applied > 0) console.log(`[startup] ${applied} migration(s) appliquée(s).`);

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`[mon-espace-server] écoute sur http://127.0.0.1:${env.PORT} (env=${env.NODE_ENV})`);
  console.log('[mon-espace-server] backend indépendant — aucune connexion à PocketBase / :8090 / cpi-chues.com.');
});
