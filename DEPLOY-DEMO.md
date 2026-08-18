# Mettre le portail en ligne pour une démo (lien à partager)

Objectif : obtenir une **URL publique stable** à envoyer à votre DG pour tester.
L'application est **mono-service** : un seul serveur sert à la fois le frontend et
l'API (une seule URL, pas de CORS). Base **SQLite** + fichiers sur un disque.

> Le déploiement se fait avec **votre** compte d'hébergement (je ne peux pas créer
> de compte ni déployer à votre place). Tout est préparé ci-dessous ; comptez ~10 min.

## Option A — Render.com (recommandé, simple)

1. **Poussez ce projet sur un dépôt GitHub** (privé ou public).
2. Sur [render.com](https://render.com) → **New → Blueprint** → sélectionnez le dépôt.
   Render lit `render.yaml` (service Docker + disque `/data`).
   - Plan **Starter** (payant, ~7 $/mois) : la base **persiste**.
   - Plan **Free** : retirez le bloc `disk` de `render.yaml` ; la base est
     **éphémère** (réinitialisée à chaque redéploiement) — acceptable pour une démo.
3. Laissez les variables par défaut (dont `ALLOW_DEV_MAILER=true` : démo sans SMTP —
   l'admin valide les comptes sans e-mail de vérification réel).
4. Une fois « Live », Render fournit une URL type `https://cpi-chues-portail.onrender.com`.
5. **Créez les comptes** via le Shell Render (onglet « Shell » du service) :
   ```bash
   pnpm --dir /app/server create-admin --email=dg@cpi-chues.sn --password='UnMotDePasseFort123'
   pnpm --dir /app/server create-agent --email=agent1@cpi-chues.sn --password='MotDePasseAgent123' --first=Fatou --last=Sarr
   ```
6. **Envoyez l'URL à votre DG.** Il se connecte en admin, valide un compte client,
   attribue un agent, etc.

## Option B — Railway.app (volume gratuit avec crédit d'essai)

1. Poussez le projet sur GitHub.
2. Railway → **New Project → Deploy from GitHub** → il détecte le `Dockerfile`.
3. Ajoutez un **Volume** monté sur `/data` (persistance).
4. Variables : `NODE_ENV=production`, `ALLOW_DEV_MAILER=true`, `DATABASE_FILE=/data/app.db`,
   `STORAGE_DIR=/data/documents`.
5. Railway expose une URL publique. Créez les comptes via le shell (comme ci-dessus).

## Vrais e-mails (optionnel)

Retirez `ALLOW_DEV_MAILER` et ajoutez les variables SMTP (`SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) — cf. `.env.example`. Les e-mails de
vérification seront alors réellement envoyés.

## Tester l'image en local (Docker)

```bash
docker build -t cpi-portail .
docker run -p 8787:8787 -v cpi_data:/data cpi-portail
# → http://localhost:8787  (créez l'admin : docker exec -it <id> pnpm --dir /app/server create-admin --email=… --password=…)
```

## Rappel — parcours de démo
1. Un client s'inscrit → (avec SMTP : reçoit l'e-mail ; sinon l'admin valide directement).
2. **Admin** → « Validation comptes » → valider + attribuer un agent (le moins chargé est proposé).
3. Le client se connecte → accès à son espace (dashboard, Ma demande, Mon dossier).
