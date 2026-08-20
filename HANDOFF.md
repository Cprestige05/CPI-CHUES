# Passation développeur — CPI × CHUES

État au moment de la passation. Le dépôt est **propre** (tout est commité et poussé sur `main`, HEAD = `d994d13`).

## 1. Les deux applications (à ne pas confondre)

| Application | Chemin | Rôle | Ports (dev) |
|---|---|---|---|
| **Portail « Mon espace »** (CE dépôt) | racine du projet | Espace client/agent/admin — React/Vite + backend Node/Express | **5173** (front) + **8787** (API) |
| **Site public** | `~/Desktop/cpi-platform` | Site vitrine (React/Vite) + API + PocketBase | **3000** + **3001** + **8090** |

Le portail est **indépendant** : backend Node/Express + **libsql** (SQLite, compatible Turso), aucune connexion à PocketBase.

## 2. Portail — démarrage & comptes

- Démarrer : les 2 process (front 5173, back 8787). Le back applique les migrations `server/migrations/*.sql` au boot, puis seed (admin, agents démo, **2500 parcelles**).
- Gestionnaire de paquets : **pnpm 9.15.9** (via corepack). Le dossier `server/` a son **propre lockfile** et s'installe avec `--ignore-workspace` (cf. Dockerfile).
- Comptes de test : client `awa@test.sn` / `Password123`. Admin + 10 agents CPI créés au seed/bootstrap.
- Pas de `tsc` sur le front (Vite/esbuild uniquement). Tests backend : `cd server && pnpm test` (**44 tests**, tous verts).

## 3. Portail — déploiement (Render, en ligne)

- URL : **https://cpi-chues-portail.onrender.com** (Docker mono-service : le back sert aussi le front compilé). `autoDeploy` au push sur `main` (repo `Cprestige05/CPI-CHUES`).
- Blueprint : `render.yaml` · Image : `Dockerfile`.
- **Persistance des données** : le plan gratuit a un disque **éphémère**. Pour garder comptes/dossiers entre redémarrages → renseigner `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` dans Render (base Turso gratuite). **Détails : `DEPLOYMENT.md`.** Sans ça, seuls admin + agents sont recréés au boot.
- ⚠️ Le mot de passe admin de démo (`BOOTSTRAP_ADMIN_PASSWORD`) était = l'e-mail : **à changer** dans Render → Environment.

## 4. Portail — travail récent (dashboard client)

- **Tableau de bord** : hero parcours + KPIs + section **Statistiques** (Recharts : donut des pièces par statut, barres par catégorie, montants des lots). Carte « Actions rapides » retirée.
- **Ma demande** : catalogue **grille numérotée 1→2500** (survol/clic = popover détails, clic = sélection), puis **un seul formulaire** = parcelles choisies → **Documents requis en dossiers dépliables** (chaque catégorie s'ouvre sur ses N emplacements : ex. Relevés bancaires 1/2/3) avec dépôt par emplacement, **verrouillage des pièces validées** par l'agent → envoi. Le formulaire « Projet immobilier » (montant/durée/localisation…) a été **supprimé** : la parcelle définit le projet.
- **Mon dossier** : n° de dossier, **lots choisis** (persistés : table `dossier_parcelles`, migration 004), parcours complet, suivi des pièces, historique.
- **Notifications** : badge rouge de non-lus (menu + cloche) avec effet d'alerte, rafraîchi via `GET /api/notifications`.

## 5. Backend portail — points clés

- Auth par cookie de session HttpOnly (seul le hash est stocké), garde CSRF par `Origin`, RBAC `CLIENT`/`AGENT_CPI`/`ADMIN`.
- Workflow de validation de compte : `users.approved` + `assigned_agent_id` ; l'admin valide puis attribue un agent (le moins chargé par défaut).
- Migrations notables : `002` (approbation compte), `003` (pièce **domicile**), `004` (**dossier_parcelles**).
- Maintenance : **toujours** via la connexion applicative (`server/src/services/maintenance.ts` / `pnpm maintenance:check`) — jamais de manipulation SQLite externe (FK ON + cascades gérées).

## 6. Site public — état & tâche EN COURS (test.cpi-chues.com)

Objectif demandé : `test.cpi-chues.com` doit servir **la version locale (localhost:3000)** du site public, avec le bouton **« Mon espace » → le portail**.

- Le site public (`cpi-platform`) est un **3-tiers** : `apps/web` (statique) + `apps/api` (Node, **secrets** : SMTP, superuser PocketBase, VAPID, FluentCRM, `API_SECRET_KEY`) + `apps/pocketbase` (binaire + ~20 Mo de `pb_data`). Le front appelle les backends via les **chemins relatifs** `/hcgi/platform` (PocketBase) et `/hcgi/api` (API) — donc **aucun secret dans le front**.
- ⚠️ La **version locale diffère** de ce qui est en ligne sur `cpi-chues.com` (qui utilise les sous-domaines `api.cpi-chues.com` / `pock.cpi-chues.com`).
- **Fait** : build statique produit → `cpi-platform/dist/apps/web` avec « Mon espace » → `https://cpi-chues-portail.onrender.com`. Rebuild : `cd apps/web && VITE_CLIENT_SPACE_URL=<url-portail> npm run build` (le prérendu des 30 pages fonctionne si PocketBase est joignable).
- **Reste à faire (infra du client — Cloudflare + hébergement)** :
  1. Héberger le `dist` sur un service qui **proxifie** `/hcgi/platform/*` → PocketBase et `/hcgi/api/*` → API (exactement comme le fait déjà `cpi-chues.com` ; le plus simple = réutiliser ce pipeline en ciblant le sous-domaine `test`).
  2. DNS Cloudflare : `test.cpi-chues.com` → cet hébergement.
  3. CORS : autoriser l'origine `test.cpi-chues.com` sur PocketBase/API si le proxy transmet l'`Origin`.

## 7. Contraintes respectées

- Secrets/identifiants (mots de passe, tokens, clés API) **jamais manipulés** — à saisir par un humain dans l'hébergeur.
- Manipulation des données uniquement via la connexion applicative (pas de SQLite/Python externe).
