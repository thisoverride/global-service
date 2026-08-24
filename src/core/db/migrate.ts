import { promises as fs } from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  module      TEXT NOT NULL,
  filename    TEXT NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (module, filename)
);
`;

// Cree la table de suivi elle-meme, une seule fois, avant que quiconque
// (coeur ou module) ne puisse enregistrer une migration.
export async function bootstrapMigrationTracking(pool: Pool): Promise<void> {
  await pool.query(BOOTSTRAP_SQL);
}

// Applique, pour un module donne, les fichiers .sql de migrationsDir pas
// encore rejoues, dans l'ordre alphabetique (convention: 001_x.sql, 002_y.sql).
// Chaque fichier tourne dans sa propre transaction ; un fichier deja applique
// est ignore silencieusement.
export async function runModuleMigrations(pool: Pool, moduleId: string, migrationsDir: string): Promise<void> {
  let files: string[];
  try {
    files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    return; // pas de dossier migrations pour ce module : rien a faire
  }

  const { rows } = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations WHERE module = $1',
    [moduleId],
  );
  const applied = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (module, filename) VALUES ($1, $2)',
        [moduleId, file],
      );
      await client.query('COMMIT');
      console.info(`  migration ${moduleId}/${file} appliquée`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${moduleId}/${file} échouée : ${String(error)}`);
    } finally {
      client.release();
    }
  }
}
