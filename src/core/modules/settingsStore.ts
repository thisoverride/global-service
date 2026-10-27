import { Pool } from 'pg';
import { getSetting, setSetting } from '../db/moduleSettings';

export interface SettingsStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  consume(key: string, value: unknown): Promise<boolean>;
}

export function settingsStore(pool: Pool, module: string): SettingsStore {
  return {
    get: <T>(key: string) => getSetting<T>(pool, module, key),
    set: (key, value) => setSetting(pool, module, key, value),
    async consume(key, value) {
      const result = await pool.query(
        'DELETE FROM module_settings WHERE module = $1 AND key = $2 AND value = $3::jsonb RETURNING key',
        [module, key, JSON.stringify(value)],
      );
      return result.rows.length === 1;
    },
  };
}
