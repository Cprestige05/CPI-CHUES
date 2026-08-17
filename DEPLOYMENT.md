# Guide de déploiement — Portail « Mon Espace »

> **Documentation uniquement.** Ce guide ne déclenche aucun déploiement et ne crée
> aucun compte administrateur réel. Ces deux actions nécessitent une autorisation
> explicite et une exécution manuelle.
>
> Le portail est **totalement indépendant** de l'ancien système
> (`cpi-chues.com`, PocketBase, `:8090`, port 3000) : aucune connexion, aucune
> migration, aucune donnée partagée.

## 1. Architecture

| Composant | Techno | Port (dev) | Rôle |
|-----------|--------|-----------|------|
| Frontend  | React/Vite (esbuild) | 5173 | SPA « Mon Espace » |
| Backend   | Node/Express + SQLite | 8787 | API, auth, documents, revue admin |

Le frontend appelle le backend via `VITE_API_URL` (défaut `/api`, proxifié en dev
vers `http://127.0.0.1:8787`). Authentification par **cookie de session HttpOnly**
(aucun jeton stocké côté navigateur).

## 2. Prérequis

- Node.js ≥ 20
- pnpm 9.15.9 (via `corepack enable`)
- HTTPS en production (obligatoire : le cookie de session est `Secure` en prod)
- Un **adaptateur e-mail réel** (voir §5) — l'adaptateur de développement est
  refusé au démarrage si `NODE_ENV=production`.

## 3. Backend (`server/`)

### Variables d'environnement (`server/.env`, jamais committé)

```dotenv
NODE_ENV=production
PORT=8787
CLIENT_ORIGIN=https://portail.exemple.sn      # origine EXACTE du front (CORS + cookies)
DATABASE_FILE=./data/app.db                    # chemin persistant (volume)
STORAGE_DIR=./storage/documents                # chemin persistant (volume)
SESSION_COOKIE_NAME=mon_espace_sid
SESSION_TTL_HOURS=12
MAX_UPLOAD_MB=10
EMAIL_TOKEN_TTL_HOURS=24
RESET_TOKEN_TTL_HOURS=2
LOGIN_MAX_ATTEMPTS=5
LOGIN_WINDOW_MINUTES=15
```

> `CLIENT_ORIGIN` accepte plusieurs origines séparées par des virgules.
> Ne jamais utiliser `*` avec des cookies d'authentification.

### Mise en service

```bash
corepack pnpm --dir server install
corepack pnpm --dir server migrate        # applique les migrations (idempotent)
corepack pnpm --dir server start          # écoute sur $PORT
```

### Contrôles d'exploitation (connexion applicative, jamais d'accès SQLite externe)

```bash
corepack pnpm --dir server maintenance:check   # integrity_check + foreign_key_check + comptes
corepack pnpm --dir server maintenance:reset   # réinitialise données + fichiers (arrêter le backend d'abord)
```

> **Ne jamais** modifier `app.db` avec un outil externe (Python, sqlite3 CLI…) :
> les cascades FK et les fichiers ne seraient pas gérés. Toujours passer par le
> service/CLI de maintenance ou par le backend.

### Premier administrateur (⚠️ sur autorisation explicite uniquement)

Aucun compte n'est créé par défaut. La création exige e-mail **et** mot de passe
explicites :

```bash
corepack pnpm --dir server create-admin --email=… --password=…
```

## 4. Frontend

```bash
corepack pnpm install
VITE_API_URL=/api corepack pnpm build      # génère dist/
```

Servir `dist/` derrière le même domaine que l'API (ou configurer `CLIENT_ORIGIN`
en conséquence). Un reverse-proxy (Nginx/Caddy) qui route `/api` → backend :8787
et le reste → `dist/` permet des cookies **SameSite=Lax** sans CORS cross-site.

## 5. E-mails en production

L'adaptateur actuel (`DevMailer`) écrit seulement dans une outbox locale et est
**refusé si `NODE_ENV=production`**. Avant la mise en production, brancher un
fournisseur réel (SMTP/API) dans `server/src/lib/mailer.ts` pour l'envoi des
liens de vérification d'e-mail et de réinitialisation de mot de passe.

## 6. Persistance & sauvegardes

- Monter des volumes persistants pour `DATABASE_FILE` et `STORAGE_DIR`.
- Sauvegarder `app.db` **à froid** (backend arrêté) ou via l'API de sauvegarde
  SQLite ; inclure `storage/documents/`.
- Ne jamais committer `data/`, `storage/`, `.env`, ni les fichiers `-wal`/`-shm`
  (déjà couverts par `.gitignore`).

## 7. Sécurité (rappels)

- Cookies HttpOnly + Secure (prod) + SameSite=Lax ; seul le **hash** du jeton est stocké.
- Mots de passe Argon2id ; jetons e-mail/reset stockés en hash uniquement.
- CSRF : en-tête `Origin` vérifié sur toute mutation ; jamais `*` avec credentials.
- Documents : MIME reniflé (magic bytes), plafond de taille, nom interne aléatoire,
  jamais servis en statique public, téléchargement contrôlé (propriétaire ou personnel).
- RBAC : `CLIENT` / `AGENT_CPI` / `ADMIN` ; validation globale réservée à `ADMIN`.
