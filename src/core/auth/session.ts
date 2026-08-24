import session, { SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

declare module 'express-session' {
  interface SessionData {
    userId: number;
    username: string;
  }
}

// Sessions stockees en base (table `session`, creee par la migration core) :
// elles survivent aux redemarrages/redeploiements du conteneur, contrairement
// au MemoryStore par defaut d'express-session.
export function createSessionMiddleware(pool: Pool) {
  const PgSession = connectPgSimple(session);
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET manquant : requis pour signer les cookies de session.');
  }

  const options: SessionOptions = {
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: false }),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    },
  };

  return session(options);
}
