-- ─── Nouvelle pièce obligatoire : Justificatif de domicile (×1) ───────────────
-- Ajoute le type de document puis crée l'emplacement manquant pour les dossiers
-- déjà existants (les nouveaux dossiers reçoivent l'emplacement via ensureDossier).

INSERT OR IGNORE INTO document_types (code, label, required_count, sort) VALUES
  ('domicile', 'Justificatif de domicile', 1, 4);

-- Backfill : un emplacement 'domicile' (slot 0) pour chaque dossier qui n'en a pas.
INSERT INTO documents (id, dossier_id, type_code, slot_index, status, created_at, updated_at)
SELECT 'doc_' || lower(hex(randomblob(12))), d.id, 'domicile', 0, 'MANQUANT',
       CAST(strftime('%s','now') AS INTEGER) * 1000,
       CAST(strftime('%s','now') AS INTEGER) * 1000
FROM dossiers d
WHERE NOT EXISTS (
  SELECT 1 FROM documents x
  WHERE x.dossier_id = d.id AND x.type_code = 'domicile' AND x.slot_index = 0
);
