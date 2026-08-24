import { Pool } from "pg";
import { getSetting } from "../../core/db/moduleSettings";

const PLEX_URL = process.env.PLEX_URL || "http://192.168.1.149:32400";
const VERSION_FEED = "https://plex.tv/api/downloads/5.json";

export class PlexError extends Error {}

// Plex répond en XML par défaut ; cet en-tête bascule tout en JSON.
async function plexGet<T>(path: string, token?: string): Promise<T> {
  const url = new URL(path, PLEX_URL);
  if (token) url.searchParams.set("X-Plex-Token", token);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new PlexError(`Plex injoignable (${PLEX_URL}) : ${(error as Error).message}`);
  }
  if (res.status === 401) throw new PlexError("Jeton Plex absent ou refusé.");
  if (!res.ok) throw new PlexError(`Plex a répondu ${res.status}.`);
  return (await res.json()) as T;
}

async function token(pool: Pool): Promise<string> {
  const t = await getSetting<string>(pool, "plex", "token");
  if (!t) throw new PlexError("Jeton Plex non configuré.");
  return t;
}

export interface ServerInfo {
  version: string;
  machineIdentifier: string;
  latestVersion: string | null;
  updateAvailable: boolean;
}

export async function getServerInfo(): Promise<ServerInfo> {
  const data = await plexGet<{ MediaContainer: Record<string, string> }>("/identity");
  const version = data.MediaContainer.version || "?";

  // Le flux officiel peut être indisponible : ça ne doit pas empêcher
  // d'afficher la version installée.
  let latestVersion: string | null = null;
  try {
    const feed = await fetch(VERSION_FEED, { signal: AbortSignal.timeout(8000) });
    const json = (await feed.json()) as { computer: { Linux: { version: string } } };
    latestVersion = json.computer.Linux.version;
  } catch {
    latestVersion = null;
  }

  return {
    version,
    machineIdentifier: data.MediaContainer.machineIdentifier || "?",
    latestVersion,
    updateAvailable: Boolean(latestVersion) && latestVersion !== version,
  };
}

export interface Library {
  key: string;
  title: string;
  type: string;
  updatedAt: string | null;
}

export async function getLibraries(pool: Pool): Promise<Library[]> {
  const t = await token(pool);
  const data = await plexGet<{ MediaContainer: { Directory?: Array<Record<string, unknown>> } }>(
    "/library/sections",
    t,
  );
  return (data.MediaContainer.Directory ?? []).map((d) => ({
    key: String(d.key ?? ""),
    title: String(d.title ?? ""),
    type: String(d.type ?? ""),
    updatedAt: d.updatedAt ? new Date(Number(d.updatedAt) * 1000).toISOString() : null,
  }));
}

export interface Session {
  title: string;
  user: string;
  player: string;
  state: string;
  progress: number;
}

export async function getSessions(pool: Pool): Promise<Session[]> {
  const t = await token(pool);
  const data = await plexGet<{ MediaContainer: { Metadata?: Array<Record<string, any>> } }>(
    "/status/sessions",
    t,
  );
  return (data.MediaContainer.Metadata ?? []).map((m) => {
    const duration = Number(m.duration) || 0;
    const viewOffset = Number(m.viewOffset) || 0;
    return {
      title: [m.grandparentTitle, m.title].filter(Boolean).join(" — ") || "?",
      user: m.User?.title ?? "?",
      player: [m.Player?.product, m.Player?.title].filter(Boolean).join(" / ") || "?",
      state: m.Player?.state ?? "?",
      progress: duration > 0 ? Math.round((viewOffset / duration) * 100) : 0,
    };
  });
}

// Vérifie un jeton avant de l'enregistrer : évite de stocker une valeur
// fausse qu'on ne découvrirait qu'à la première consultation.
export async function checkToken(candidate: string): Promise<void> {
  await plexGet("/library/sections", candidate);
}
