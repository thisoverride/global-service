-- Journal des tentatives de connexion a la console, reussies comme echouees.
-- Sert au tableau de bord : qui a essaye de se connecter, depuis ou, avec quoi.
CREATE TABLE IF NOT EXISTS login_attempts (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL,
  success     BOOLEAN NOT NULL,
  -- Adresse annoncee par Cloudflare (CF-Connecting-IP) quand la requete passe
  -- par le proxy, sinon celle vue par Express. TEXT et non INET : on stocke
  -- exactement ce qu'on a recu, y compris une valeur inattendue.
  ip          TEXT,
  -- Adresse du pair reel vue par Express. Identique a `ip` en acces direct,
  -- differente (= une IP Cloudflare) en acces proxifie : l'ecart permet de
  -- reperer une en-tete CF-Connecting-IP forgee en tapant l'origine.
  peer_ip     TEXT,
  country     TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_created_at_idx
  ON login_attempts (created_at DESC);
