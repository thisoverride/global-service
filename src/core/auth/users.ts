import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

interface User {
  id: number;
  username: string;
  passwordHash: string;
}

// Au tout premier demarrage (table users vide), cree le compte admin a
// partir des variables d'environnement. N'ecrit jamais le mot de passe en
// clair : seul le hash est stocke. Ne fait rien si un compte existe deja,
// meme si les variables d'environnement changent ensuite.
export async function bootstrapAdminUser(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ count: string }>('SELECT count(*)::int AS count FROM users');
  if (Number(rows[0].count) > 0) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn('⚠️  Aucun compte admin : définissez ADMIN_USERNAME et ADMIN_PASSWORD.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
    [username, passwordHash],
  );
  console.info(`🔐 Compte admin créé : ${username}`);
}

export async function verifyCredentials(pool: Pool, username: string, password: string): Promise<User | null> {
  const { rows } = await pool.query<{ id: number; username: string; password_hash: string }>(
    'SELECT id, username, password_hash FROM users WHERE username = $1',
    [username],
  );
  const row = rows[0];
  if (!row) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;

  return { id: row.id, username: row.username, passwordHash: row.password_hash };
}
