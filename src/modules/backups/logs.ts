import { promises as fs } from "fs";
import * as path from "path";

// Repertoire des journaux ecrits par backup.sh (LOG_DIR du script), monte en
// lecture seule dans le conteneur. Les fichiers sont en 0644 root:root : la
// console les lit, ne les modifie jamais.
const LOG_DIR = process.env.BACKUP_LOG_DIR || "/var/log/automator";

// Le nom est repris tel quel de l'URL : il doit correspondre exactement au
// motif ecrit par le script, sinon ".." ou un chemin absolu permettrait de
// lire n'importe quel fichier du conteneur.
const NAME_PATTERN = /^backup-\d{4}-\d{2}-\d{2}\.log$/;

// Un journal de sauvegarde fait quelques kilo-octets ; une lecture plafonnee
// evite qu'un fichier anormalement gros (boucle d'erreur) sature la page.
const MAX_BYTES = 512 * 1024;

export interface LogFile {
  name: string;
  date: string;
  size: number;
  modifiedAt: string;
}

export function isValidLogName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

export async function listLogs(): Promise<LogFile[]> {
  let names: string[];
  try {
    names = await fs.readdir(LOG_DIR);
  } catch {
    return [];
  }

  const files: LogFile[] = [];
  for (const name of names) {
    if (!isValidLogName(name)) continue;
    try {
      const stat = await fs.stat(path.join(LOG_DIR, name));
      files.push({
        name,
        date: name.slice("backup-".length, -".log".length),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    } catch {
      // fichier disparu entre readdir et stat : on l'ignore
    }
  }

  return files.sort((a, b) => b.name.localeCompare(a.name));
}

export interface LogContent {
  name: string;
  content: string;
  truncated: boolean;
}

export async function readLog(name: string): Promise<LogContent | null> {
  if (!isValidLogName(name)) return null;

  const full = path.join(LOG_DIR, name);
  let handle;
  try {
    handle = await fs.open(full, "r");
  } catch {
    return null;
  }

  try {
    const { size } = await handle.stat();
    // On garde la FIN du fichier : c'est la ou se trouvent le bilan et, en cas
    // de probleme, le message d'arret.
    const start = Math.max(0, size - MAX_BYTES);
    const buffer = Buffer.alloc(Math.min(size, MAX_BYTES));
    await handle.read(buffer, 0, buffer.length, start);
    return { name, content: buffer.toString("utf-8"), truncated: start > 0 };
  } finally {
    await handle.close();
  }
}

export { LOG_DIR };
