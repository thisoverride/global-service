import { HOST } from "./ssh";

const API = `http://${HOST}:9997`;
const HLS = `http://${HOST}:8888`;
const PLAYBACK = `http://${HOST}:9996`;
const PATH_NAME = "webcam";

export class StreamError extends Error {}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, signal: AbortSignal.timeout(8000) });
  } catch (error) {
    throw new StreamError(`MediaMTX injoignable sur ${HOST}:9997 — le service tourne-t-il ?`);
  }
  if (!res.ok) throw new StreamError(`MediaMTX a repondu ${res.status}.`);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export interface StreamState {
  live: boolean;
  readers: number;
  recording: boolean;
  bytesReceived: number;
  tracks: string[];
  problem: string | null;
}

export async function getState(): Promise<StreamState> {
  const empty: StreamState = { live: false, readers: 0, recording: false, bytesReceived: 0, tracks: [], problem: null };
  try {
    const p = await api<{ ready: boolean; readers: unknown[]; tracks: string[]; bytesReceived: number }>(
      `/v3/paths/get/${PATH_NAME}`,
    );
    // L'etat d'enregistrement vit dans la configuration du chemin, pas dans
    // son etat d'execution : deux appels distincts sont necessaires.
    const conf = await api<{ record?: boolean }>(`/v3/config/paths/get/${PATH_NAME}`);
    return {
      live: Boolean(p.ready),
      readers: Array.isArray(p.readers) ? p.readers.length : 0,
      recording: Boolean(conf.record),
      bytesReceived: Number(p.bytesReceived) || 0,
      tracks: Array.isArray(p.tracks) ? p.tracks : [],
      problem: null,
    };
  } catch (error) {
    return { ...empty, problem: error instanceof Error ? error.message : String(error) };
  }
}

export async function setRecording(on: boolean): Promise<void> {
  await api(`/v3/config/paths/patch/${PATH_NAME}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: on }),
  });
}

export interface Recording {
  start: string;
  duration: number;
  url: string;
}

export async function listRecordings(): Promise<Recording[]> {
  try {
    const d = await api<{ segments?: Array<{ start: string; duration: number }> }>(
      `/v3/recordings/get/${PATH_NAME}`,
    );
    return (d.segments ?? [])
      .map((s) => ({
        start: s.start,
        duration: Number(s.duration) || 0,
        url: `/modules/smarthink/recording?start=${encodeURIComponent(s.start)}`,
      }))
      .sort((a, b) => b.start.localeCompare(a.start));
  } catch {
    return [];
  }
}

export const HLS_BASE = HLS;
export const PLAYBACK_BASE = PLAYBACK;
export const STREAM_PATH = PATH_NAME;
