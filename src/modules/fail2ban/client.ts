import { execFile } from "child_process";
import * as path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Le relais Python est copié à côté du JS compilé (voir le script build).
const HELPER = path.join(__dirname, "f2b.py");

export interface Jail {
  name: string;
  currentlyFailed: number;
  totalFailed: number;
  currentlyBanned: number;
  totalBanned: number;
  bannedIps: string[];
  watching: string[];
}

export interface Overview {
  version: string;
  jails: Jail[];
}

export class Fail2banError extends Error {}

// Toujours execFile avec des arguments en tableau : jamais d'interpolation
// dans une chaîne shell, donc pas d'injection possible via une IP ou un
// nom de jail.
async function call<T>(args: string[]): Promise<T> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("python3", [HELPER, ...args], { timeout: 15_000 }));
  } catch (error) {
    const err = error as { message?: string };
    throw new Fail2banError(`Relais fail2ban injoignable : ${err.message ?? "erreur inconnue"}`);
  }

  let parsed: { ok: boolean; error?: string } & Record<string, unknown>;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Fail2banError("Réponse illisible du relais fail2ban.");
  }
  if (!parsed.ok) throw new Fail2banError(parsed.error || "Erreur fail2ban.");
  return parsed as unknown as T;
}

export async function getOverview(): Promise<Overview> {
  const res = await call<{ version: string; jails: Jail[] }>(["overview"]);
  return { version: res.version, jails: res.jails };
}

export async function getJail(name: string): Promise<Jail> {
  const res = await call<{ jail: Jail }>(["jail", name]);
  return res.jail;
}

export async function banIp(jail: string, ip: string): Promise<void> {
  await call(["ban", jail, ip]);
}

export async function unbanIp(jail: string, ip: string): Promise<void> {
  await call(["unban", jail, ip]);
}
