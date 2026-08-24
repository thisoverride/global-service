import { promises as fs } from "fs";

// Fichier écrit par /opt/app/automator/backup.sh à chaque exécution (voir le
// trap EXIT du script). Monté en lecture seule dans le conteneur.
const STATUS_FILE = process.env.BACKUP_STATUS_FILE || "/opt/app/automator/last-backup-status.json";

// Le cron tourne tous les jours à 03:00. Au-delà de 36 h sans sauvegarde
// réussie, une exécution a forcément été manquée : c'est exactement la
// situation des 21-22 août 2026, restée invisible faute d'alerte.
const STALE_AFTER_HOURS = 36;

export interface BackupStatus {
  ok: boolean;
  exitCode: number;
  finishedAt: string;
  destination: string;
  size: string;
  log: string;
  dryRun: boolean;
  failures: string[];
}

export type Health = "ok" | "failed" | "stale" | "unknown";

export interface BackupReport {
  status: BackupStatus | null;
  health: Health;
  ageHours: number | null;
  /** Renseigné quand le fichier d'état est absent ou illisible. */
  problem: string | null;
}

export async function getReport(): Promise<BackupReport> {
  let raw: string;
  try {
    raw = await fs.readFile(STATUS_FILE, "utf-8");
  } catch {
    return {
      status: null,
      health: "unknown",
      ageHours: null,
      problem:
        "Aucun état de sauvegarde trouvé. Le fichier est écrit à la fin de chaque " +
        "exécution du script ; il apparaîtra après le prochain passage (03:00).",
    };
  }

  let status: BackupStatus;
  try {
    status = JSON.parse(raw) as BackupStatus;
  } catch {
    return { status: null, health: "unknown", ageHours: null, problem: "État de sauvegarde illisible." };
  }

  const finished = new Date(status.finishedAt);
  const ageHours = Number.isNaN(finished.getTime())
    ? null
    : (Date.now() - finished.getTime()) / 3_600_000;

  // Une sauvegarde ancienne mais réussie reste un problème : le script n'a
  // pas tourné depuis. On le distingue d'un échec franc.
  let health: Health = status.ok ? "ok" : "failed";
  if (status.ok && ageHours !== null && ageHours > STALE_AFTER_HOURS) health = "stale";

  return { status, health, ageHours, problem: null };
}

export { STALE_AFTER_HOURS };
