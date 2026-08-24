import { Pool } from 'pg';

// Pool partagé par le cœur ET par tous les modules : chaque module lit/écrit
// ses propres tables sur cette même connexion, sans jamais toucher aux tables
// des autres (voir schema_migrations pour l'isolation par module).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
