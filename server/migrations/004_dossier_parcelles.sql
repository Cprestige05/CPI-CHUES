-- ─── Lots (parcelles) choisis rattachés au dossier du client ──────────────────
-- Snapshot des lots sélectionnés dans « Ma demande » (référence, surface, prix)
-- afin de les afficher dans « Mon dossier » même si le catalogue évolue.
-- ON DELETE CASCADE depuis dossiers → purge automatique avec l'utilisateur.

CREATE TABLE dossier_parcelles (
  id          TEXT PRIMARY KEY,
  dossier_id  TEXT NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  parcelle_id TEXT NOT NULL REFERENCES parcelles(id),
  reference   TEXT NOT NULL,
  ilot        TEXT NOT NULL,
  numero_lot  TEXT NOT NULL,
  surface     TEXT NOT NULL,
  prix        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE (dossier_id, parcelle_id)
);
CREATE INDEX idx_dossier_parcelles_dossier ON dossier_parcelles(dossier_id);
