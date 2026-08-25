import type { Request } from "express";
import { Pool } from "pg";
import { DeviceInfo, parseUserAgent } from "./userAgent";

export interface AttemptOrigin {
  ip: string | null;
  peerIp: string | null;
  country: string | null;
  userAgent: string | null;
}

export interface LoginAttempt {
  id: number;
  username: string;
  success: boolean;
  ip: string | null;
  peerIp: string | null;
  country: string | null;
  /** Nom du pays en francais, ou le code brut s'il est inconnu d'Intl. */
  countryName: string | null;
  userAgent: string | null;
  createdAt: string;
  device: DeviceInfo;
  /** Vrai quand l'en-tete Cloudflare et le pair reel divergent sans proxy connu. */
  spoofSuspect: boolean;
}

export interface AttemptStats {
  success: number;
  failed: number;
  distinctIps: number;
  lastFailureAt: string | null;
}

// La console est servie derriere Cloudflare : l'adresse du visiteur arrive
// dans CF-Connecting-IP, tandis que req.ip designe le noeud Cloudflare.
// On garde les deux — voir le commentaire de la migration 003.
export function readOrigin(req: Request): AttemptOrigin {
  const header = (name: string): string | null => {
    const value = req.headers[name];
    const first = Array.isArray(value) ? value[0] : value;
    return first ? String(first).slice(0, 200) : null;
  };

  return {
    ip: header("cf-connecting-ip") ?? (req.ip ?? null),
    peerIp: req.ip ?? null,
    country: header("cf-ipcountry"),
    userAgent: header("user-agent"),
  };
}

// Un echec d'enregistrement ne doit jamais empecher une connexion legitime
// ni transformer un mauvais mot de passe en erreur 500 : on journalise et on
// continue.
export async function recordAttempt(
  pool: Pool,
  username: string,
  success: boolean,
  origin: AttemptOrigin,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO login_attempts (username, success, ip, peer_ip, country, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [username.slice(0, 200), success, origin.ip, origin.peerIp, origin.country, origin.userAgent],
    );
  } catch (error) {
    console.error("Tentative de connexion non journalisée :", error instanceof Error ? error.message : error);
  }
}

// Les drapeaux emoji ne s'affichent pas du tout sous Windows (la police
// systeme ne les contient pas) : on resout le nom du pays cote serveur, ce
// qui est de toute facon plus lisible que deux lettres.
const COUNTRY_NAMES = new Intl.DisplayNames(["fr"], { type: "region" });

function countryName(code: string | null): string | null {
  if (!code || !/^[A-Z]{2}$/.test(code)) return code;
  try {
    return COUNTRY_NAMES.of(code) ?? code;
  } catch {
    return code;
  }
}

interface Row {
  id: number;
  username: string;
  success: boolean;
  ip: string | null;
  peer_ip: string | null;
  country: string | null;
  user_agent: string | null;
  created_at: Date;
}

function toAttempt(row: Row): LoginAttempt {
  return {
    id: row.id,
    username: row.username,
    success: row.success,
    ip: row.ip,
    peerIp: row.peer_ip,
    country: row.country,
    countryName: countryName(row.country),
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
    device: parseUserAgent(row.user_agent),
    // Sans en-tete Cloudflare, ip et peer_ip sont egaux par construction :
    // une divergence signale une requete arrivee directement sur l'origine
    // avec un CF-Connecting-IP fourni par l'appelant.
    spoofSuspect: Boolean(row.country === null && row.ip && row.peer_ip && row.ip !== row.peer_ip),
  };
}

export async function getRecentAttempts(pool: Pool, limit = 20): Promise<LoginAttempt[]> {
  const { rows } = await pool.query<Row>(
    `SELECT id, username, success, ip, peer_ip, country, user_agent, created_at
       FROM login_attempts
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  );
  return rows.map(toAttempt);
}

export type AttemptFilter = "all" | "success" | "failed";

export interface AttemptPage {
  attempts: LoginAttempt[];
  total: number;
}

// Page d'historique, filtree et paginee. Le filtre est un litteral fige (pas
// une valeur d'URL interpolee) : l'utilisateur choisit parmi trois cas, il
// n'ecrit jamais de SQL.
export async function getAttemptPage(
  pool: Pool,
  filter: AttemptFilter,
  limit: number,
  offset: number,
): Promise<AttemptPage> {
  const where =
    filter === "success" ? "WHERE success" : filter === "failed" ? "WHERE NOT success" : "";

  const [page, count] = await Promise.all([
    pool.query<Row>(
      `SELECT id, username, success, ip, peer_ip, country, user_agent, created_at
         FROM login_attempts
         ${where}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    pool.query<{ total: string }>(`SELECT count(*)::int AS total FROM login_attempts ${where}`),
  ]);

  return { attempts: page.rows.map(toAttempt), total: Number(count.rows[0].total) || 0 };
}

export async function getStats(pool: Pool, days = 7): Promise<AttemptStats> {
  const { rows } = await pool.query<{
    success: string;
    failed: string;
    distinct_ips: string;
    last_failure_at: Date | null;
  }>(
    `SELECT count(*) FILTER (WHERE success)::int          AS success,
            count(*) FILTER (WHERE NOT success)::int      AS failed,
            count(DISTINCT ip)::int                       AS distinct_ips,
            max(created_at) FILTER (WHERE NOT success)    AS last_failure_at
       FROM login_attempts
      WHERE created_at > now() - ($1 || ' days')::interval`,
    [String(days)],
  );

  const row = rows[0];
  return {
    success: Number(row.success) || 0,
    failed: Number(row.failed) || 0,
    distinctIps: Number(row.distinct_ips) || 0,
    lastFailureAt: row.last_failure_at ? row.last_failure_at.toISOString() : null,
  };
}
