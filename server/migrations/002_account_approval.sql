-- ═══════════════════════════════════════════════════════════════════════════
-- Validation du compte client par l'ADMIN + attribution à un AGENT CPI.
-- Parcours : inscription → e-mail vérifié → l'admin VALIDE le compte et
-- ATTRIBUE un agent → le client accède. L'agent gère ensuite les validations
-- documentaires. L'admin conserve la traçabilité (activity_logs, déjà présent).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN approved           INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0,1));
ALTER TABLE users ADD COLUMN approved_at        INTEGER;
ALTER TABLE users ADD COLUMN approved_by        TEXT;      -- id de l'admin validateur
ALTER TABLE users ADD COLUMN assigned_agent_id  TEXT;      -- id de l'agent CPI attribué
ALTER TABLE users ADD COLUMN assigned_at        INTEGER;

-- Le personnel (agent/admin) est approuvé d'office (pas de validation requise).
UPDATE users SET approved = 1 WHERE role IN ('ADMIN', 'AGENT_CPI');

CREATE INDEX idx_users_approved ON users(approved);
CREATE INDEX idx_users_agent    ON users(assigned_agent_id);
