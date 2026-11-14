import { readFileSync } from "fs";

// Le service tourne hors de Coolify (docker compose dans /opt/app/archiver) et
// rejoint le reseau « coolify » sous le nom archiver. Son jeton est depose dans
// le volume deja monte pour la cle SSH de smarthink.
const BASE = process.env.ARCHIVER_URL || "http://archiver:8080";
const TOKEN_FILE = process.env.ARCHIVER_TOKEN_FILE || "/opt/app/console-ssh/archiver-token";

export type MediaState = "local" | "archived" | "missing";

export interface MediaItem {
  key: string;
  kind: "movie" | "season";
  section: string;
  title: string;
  year: number | null;
  season?: number | null;
  episodes?: number;
  thumb: string | null;
  files: string[];
  size: number;
  addedAt?: number | null;
  state: MediaState;
  archiveId?: number;
  zipSize?: number;
  archivedAt?: string;
  job?: { id: number; action: "archive" | "restore"; status: "queued" | "running" };
}

export interface Catalog {
  sections: { id: string; title: string; type: string }[];
  items: MediaItem[];
}

export interface Job {
  id: number;
  action: "archive" | "restore";
  label: string;
  status: "queued" | "running" | "done" | "failed";
  step: string;
  progress: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface ArchiveRecord {
  id: number;
  kind: "movie" | "season";
  section: string;
  title: string;
  year: number | null;
  season: number | null;
  size: number;
  zip_name: string;
  zip_size: number;
  status: "archived" | "restored";
  archived_at: string;
  restored_at: string | null;
}

// Mise a jour de Plex : le service depose une demande que l'hote execute en
// root (unite systemd plex-update.path), puis relit son journal.
export interface PlexStatus {
  installed: string | null;
  latest: string | null;
  updateAvailable: boolean;
  state: "idle" | "pending" | "stalled" | "running" | "done" | "failed";
  since: string | null;
  error: string | null;
  log: string;
}

export class VaultError extends Error {}

function token(): string {
  try {
    return readFileSync(TOKEN_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

async function request(path: string, init: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
  try {
    return await fetch(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new VaultError(`Service d'archivage injoignable (${BASE}).`);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new VaultError(body.error || `Service d'archivage : HTTP ${res.status}`);
  return body as T;
}

export const getCatalog = (fresh = false) => call<Catalog>(`/catalog${fresh ? "?fresh=1" : ""}`);
export const getJobs = () => call<Job[]>("/jobs");
export const getArchives = () => call<ArchiveRecord[]>("/archives");
export const archive = (key: string) => call<{ job: number }>("/archive", { method: "POST", body: JSON.stringify({ key }) });
export const getPlexStatus = (fresh = false) => call<PlexStatus>(`/plex${fresh ? "?fresh=1" : ""}`);
export const updatePlex = () => call<PlexStatus>("/plex/update", { method: "POST" });
export const restore = (id: number) => call<{ job: number }>("/restore", { method: "POST", body: JSON.stringify({ id }) });

export async function poster(path: string): Promise<Response> {
  return request(path, {}, 20000);
}
