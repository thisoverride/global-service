import { ssh, SmarthinkError } from "./ssh";

export interface MachineStatus {
  reachable: boolean;
  hostname: string;
  os: string;
  kernel: string;
  uptime: string;
  load: string;
  cpuPercent: number | null;
  memUsed: string;
  memTotal: string;
  diskUsed: string;
  diskTotal: string;
  diskPercent: number;
  temperature: string | null;
  serviceActive: boolean;
  problem: string | null;
}

// Tout est lu en une seule session SSH : cinq connexions separees couteraient
// plusieurs secondes sur une machine de 2009.
const PROBE = [
  "hostname",
  ". /etc/os-release && echo $PRETTY_NAME",
  "uname -r",
  "uptime -p",
  "cut -d' ' -f1-3 /proc/loadavg",
  // Deux lectures de /proc/stat espacees : la seule facon d'obtenir un
  // pourcentage instantane sans dependre de top et de sa sortie localisee.
  "a=$(head -1 /proc/stat); sleep 1; b=$(head -1 /proc/stat); echo \"$a|$b\"",
  "LC_ALL=C free -m | awk '/^Mem:/{print $3\"|\"$2}'",
  "LC_ALL=C df -BG --output=used,size,pcent / | tail -1 | tr -s ' '",
  "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo ''",
  "systemctl is-active mediamtx 2>/dev/null || echo inactive",
].join(" && echo '---' && ");

function cpuFromProcStat(pair: string): number | null {
  const [a, b] = pair.split("|");
  if (!a || !b) return null;
  const parse = (line: string) => line.trim().split(/\s+/).slice(1).map(Number);
  const x = parse(a);
  const y = parse(b);
  if (x.length < 4 || y.length < 4) return null;
  const totalA = x.reduce((s, n) => s + n, 0);
  const totalB = y.reduce((s, n) => s + n, 0);
  const idleA = x[3] + (x[4] ?? 0);
  const idleB = y[3] + (y[4] ?? 0);
  const dTotal = totalB - totalA;
  if (dTotal <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((1 - (idleB - idleA) / dTotal) * 100)));
}

export async function getStatus(): Promise<MachineStatus> {
  const empty: MachineStatus = {
    reachable: false, hostname: "", os: "", kernel: "", uptime: "", load: "",
    cpuPercent: null, memUsed: "", memTotal: "", diskUsed: "", diskTotal: "",
    diskPercent: 0, temperature: null, serviceActive: false, problem: null,
  };

  let raw: string;
  try {
    raw = await ssh(PROBE, 20000);
  } catch (error) {
    return { ...empty, problem: error instanceof SmarthinkError ? error.message : String(error) };
  }

  const p = raw.split("---").map((s) => s.trim());
  const disk = (p[7] || "").split(" ");
  const millideg = Number(p[8]);

  return {
    reachable: true,
    hostname: p[0] || "?",
    os: p[1] || "?",
    kernel: p[2] || "?",
    uptime: p[3] || "?",
    load: p[4] || "?",
    cpuPercent: cpuFromProcStat(p[5] || ""),
    memUsed: p[6]?.split("|")[0] ? `${p[6].split("|")[0]} Mo` : "?",
    memTotal: p[6]?.split("|")[1] ? `${p[6].split("|")[1]} Mo` : "?",
    diskUsed: disk[0] || "?",
    diskTotal: disk[1] || "?",
    diskPercent: Number((disk[2] || "0").replace("%", "")) || 0,
    // Le capteur expose des milli-degres ; absent sur certaines machines.
    temperature: Number.isFinite(millideg) && millideg > 0 ? `${Math.round(millideg / 1000)} °C` : null,
    serviceActive: (p[9] || "").trim() === "active",
    problem: null,
  };
}

export async function serviceAction(action: "start" | "stop" | "restart"): Promise<void> {
  await ssh(`sudo -n systemctl ${action} mediamtx`, 25000);
}

// reboot et poweroff coupent la connexion avant de rendre la main : SSH
// renverrait une erreur alors que la commande a bien ete prise en compte.
export async function powerAction(action: "reboot" | "poweroff"): Promise<void> {
  try {
    await ssh(`sudo -n /usr/sbin/${action}`, 8000);
  } catch {
    /* coupure attendue */
  }
}
