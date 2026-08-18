# ─── Portail « Mon Espace » CPI × CHUES — image mono-service ──────────────────
# Le backend Node/Express sert AUSSI le frontend compilé (une seule URL).
# Base SQLite + fichiers sur un disque monté en /data (persistant).
FROM node:20-bookworm

# Outils natifs pour compiler better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# 1) Frontend : dépendances puis build → /app/dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 2) Backend : dépendances (compile better-sqlite3)
WORKDIR /app/server
RUN pnpm install --frozen-lockfile

# Configuration de production (démo). Montez un disque sur /data pour la persistance.
ENV NODE_ENV=production \
    PORT=8787 \
    DATABASE_FILE=/data/app.db \
    STORAGE_DIR=/data/documents \
    ALLOW_DEV_MAILER=true
RUN mkdir -p /data

EXPOSE 8787
# tsx est inclus (dépendance) ; « pnpm start » lance src/index.ts qui applique les
# migrations puis écoute sur $PORT et sert le frontend + l'API.
CMD ["pnpm", "start"]
