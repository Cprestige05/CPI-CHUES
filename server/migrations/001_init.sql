-- ═══════════════════════════════════════════════════════════════════════════
-- Mon Espace — schéma initial (backend indépendant, SQLite)
-- Timestamps : INTEGER (epoch millisecondes). IDs : TEXT (aléatoires générés côté app).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Utilisateurs & profils ────────────────────────────────────────────────
CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,              -- normalisé en minuscules
  phone          TEXT UNIQUE,                       -- normalisé (E.164-ish)
  password_hash  TEXT NOT NULL,                     -- Argon2id
  role           TEXT NOT NULL CHECK (role IN ('CLIENT','AGENT_CPI','ADMIN')),
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE profiles (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name   TEXT NOT NULL DEFAULT '',
  last_name    TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  employer     TEXT NOT NULL DEFAULT '',
  address      TEXT NOT NULL DEFAULT '',
  city         TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

-- ─── Sessions (jeton opaque en cookie HttpOnly ; on ne stocke QUE le hash) ──
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,                 -- sha-256 du jeton de session
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  ip          TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ─── Dossiers (un par client) ──────────────────────────────────────────────
CREATE TABLE dossiers (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'BROUILLON'
                CHECK (status IN ('BROUILLON','SOUMIS','EN_VERIFICATION','VALIDE','A_CORRIGER','REJETE')),
  submitted_at  INTEGER,
  decided_at    INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- ─── Types de documents requis (config) ────────────────────────────────────
CREATE TABLE document_types (
  code           TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  required_count INTEGER NOT NULL DEFAULT 1,
  sort           INTEGER NOT NULL DEFAULT 0
);

-- ─── Documents = un emplacement requis (type + index d'ordre/période) ──────
CREATE TABLE documents (
  id                 TEXT PRIMARY KEY,
  dossier_id         TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  type_code          TEXT NOT NULL REFERENCES document_types(code),
  slot_index         INTEGER NOT NULL DEFAULT 0,     -- 0..(required_count-1)
  status             TEXT NOT NULL DEFAULT 'MANQUANT'
                     CHECK (status IN ('MANQUANT','BROUILLON','SOUMIS','EN_VERIFICATION','VALIDE','A_CORRIGER','REJETE','REMPLACE')),
  current_version_id TEXT,                            -- FK logique vers document_versions
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (dossier_id, type_code, slot_index)
);
CREATE INDEX idx_documents_dossier ON documents(dossier_id);

-- ─── Versions de documents (chaque dépôt/remplacement = 1 version) ─────────
CREATE TABLE document_versions (
  id           TEXT PRIMARY KEY,
  document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  stored_name  TEXT NOT NULL UNIQUE,                 -- nom interne aléatoire sur disque
  mime         TEXT NOT NULL,
  size         INTEGER NOT NULL,
  sha256       TEXT NOT NULL,
  period       TEXT NOT NULL DEFAULT '',             -- ex. « 2026-06 » (ordre/période)
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  uploaded_by  TEXT NOT NULL REFERENCES users(id),
  uploaded_at  INTEGER NOT NULL
);
CREATE INDEX idx_versions_document ON document_versions(document_id);

-- ─── Contrôles administratifs (traçabilité des décisions) ──────────────────
CREATE TABLE admin_reviews (
  id           TEXT PRIMARY KEY,
  dossier_id   TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  document_id  TEXT REFERENCES documents(id) ON DELETE CASCADE,
  reviewer_id  TEXT NOT NULL REFERENCES users(id),
  action       TEXT NOT NULL
               CHECK (action IN ('TAKE_CHARGE','VALIDATE','REQUEST_CORRECTION','REJECT','GLOBAL_VALIDATE')),
  from_status  TEXT NOT NULL DEFAULT '',
  to_status    TEXT NOT NULL DEFAULT '',
  reason       TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_reviews_dossier ON admin_reviews(dossier_id);

-- ─── Notifications (aucune URL publique ni contenu sensible) ───────────────
CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  read        INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0,1)),
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ─── Journal d'activité (sans mot de passe, jeton ni contenu documentaire) ─
CREATE TABLE activity_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT,
  actor_role  TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  meta        TEXT NOT NULL DEFAULT '',              -- JSON non sensible
  created_at  INTEGER NOT NULL
);

-- ─── Jetons (on ne stocke QUE le hash) ─────────────────────────────────────
CREATE TABLE email_verification_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0,1)),
  created_at  INTEGER NOT NULL
);

CREATE TABLE password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  INTEGER NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0,1)),
  created_at  INTEGER NOT NULL
);

-- ─── Parcelles (structure VIDE — aucune donnée recopiée de l'ancien projet) ─
CREATE TABLE parcelles (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL DEFAULT '',
  ilot        TEXT NOT NULL DEFAULT '',
  numero_lot  TEXT NOT NULL DEFAULT '',
  surface     TEXT NOT NULL DEFAULT '',
  prix        INTEGER NOT NULL DEFAULT 0,
  statut      TEXT NOT NULL DEFAULT 'disponible'
              CHECK (statut IN ('disponible','reserve','vendu')),
  created_at  INTEGER NOT NULL
);

-- ─── Seed des types de documents obligatoires (CNI×1, bulletins×3, relevés×3) ─
INSERT INTO document_types (code, label, required_count, sort) VALUES
  ('cni',       'Carte nationale d''identité (CNI)', 1, 1),
  ('bulletin',  'Bulletin de salaire récent',        3, 2),
  ('releve',    'Relevé bancaire récent',            3, 3);
