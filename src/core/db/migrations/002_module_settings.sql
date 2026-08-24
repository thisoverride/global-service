-- Reglages persistants par module (ex: token API Cloudflare, chemin du pool
-- de stockage QEMU). Chaque module lit/ecrit uniquement les lignes portant
-- son propre id de module, jamais celles des autres.
CREATE TABLE IF NOT EXISTS module_settings (
  module      TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (module, key)
);
