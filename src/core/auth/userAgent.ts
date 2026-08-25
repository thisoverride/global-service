// Lecture d'un User-Agent, sans dependance : le tableau de bord a besoin de
// "Chrome sur Windows", pas d'une analyse exhaustive. Un UA inconnu retombe
// sur "Inconnu" plutot que sur une valeur inventee.

export interface DeviceInfo {
  browser: string;
  os: string;
  kind: "Ordinateur" | "Mobile" | "Robot" | "Inconnu";
}

// L'ordre compte : Edge et Opera annoncent aussi "Chrome" dans leur UA, et
// Chrome annonce "Safari". Le premier motif qui correspond gagne, donc les
// navigateurs les plus specifiques doivent etre testes en premier.
const BROWSERS: Array<[RegExp, string]> = [
  [/Edg[ea]?\//i, "Edge"],
  [/OPR\/|Opera/i, "Opera"],
  [/SamsungBrowser/i, "Samsung Internet"],
  [/Firefox\/|FxiOS/i, "Firefox"],
  [/Chrome\/|CriOS/i, "Chrome"],
  [/Safari\//i, "Safari"],
  [/curl\//i, "curl"],
  [/Wget\//i, "wget"],
  [/python-requests|urllib/i, "script Python"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows NT 10|Windows NT 11/i, "Windows"],
  [/Windows/i, "Windows"],
  [/iPhone|iPad|iPod/i, "iOS"],
  [/Android/i, "Android"],
  [/Mac OS X|Macintosh/i, "macOS"],
  [/CrOS/i, "ChromeOS"],
  [/Linux/i, "Linux"],
];

const BOT = /bot|crawler|spider|scanner|nikto|nmap|masscan|zgrab|curl\/|Wget\/|python-requests/i;
const MOBILE = /Mobile|Android|iPhone|iPad|iPod/i;

function firstMatch(patterns: Array<[RegExp, string]>, value: string): string | null {
  for (const [pattern, label] of patterns) {
    if (pattern.test(value)) return label;
  }
  return null;
}

export function parseUserAgent(raw: string | undefined | null): DeviceInfo {
  const ua = (raw ?? "").trim();
  if (!ua) return { browser: "Inconnu", os: "Inconnu", kind: "Inconnu" };

  const browser = firstMatch(BROWSERS, ua) ?? "Inconnu";
  const os = firstMatch(SYSTEMS, ua) ?? "Inconnu";

  let kind: DeviceInfo["kind"] = "Ordinateur";
  if (BOT.test(ua)) kind = "Robot";
  else if (MOBILE.test(ua)) kind = "Mobile";

  return { browser, os, kind };
}
