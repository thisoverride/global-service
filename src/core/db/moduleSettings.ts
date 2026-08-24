import { Pool } from 'pg';

// Petit magasin cle/valeur partage par tous les modules (table module_settings).
// Chaque module l'utilise avec son propre id : getSetting(pool, 'cloudflare', 'apiToken').
export async function getSetting<T = unknown>(pool: Pool, moduleId: string, key: string): Promise<T | null> {
  const { rows } = await pool.query<{ value: T }>(
    'SELECT value FROM module_settings WHERE module = $1 AND key = $2',
    [moduleId, key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(pool: Pool, moduleId: string, key: string, value: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO module_settings (module, key, value, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (module, key) DO UPDATE SET value = $3, updated_at = now()`,
    [moduleId, key, JSON.stringify(value)],
  );
}
