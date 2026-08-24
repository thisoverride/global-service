import Docker from "dockerode";

// Réutilise le socket Docker déjà monté pour le module Logs.
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock" });

// Adresse par laquelle le NAVIGATEUR de l'utilisateur joint le serveur pour
// les services publiés sur un port (ils ne passent pas par le proxy et ne
// sont pas exposés sur internet). Vide = on n'affiche pas ces entrées
// plutôt que de fabriquer des liens qui ne mèneraient nulle part.
const LAN_HOST = process.env.APPS_LAN_HOST || "";

export interface AppEntry {
  name: string;
  url: string;
  detail: string;
  running: boolean;
}

export interface Discovered {
  byDomain: AppEntry[];
  byPort: AppEntry[];
  lanHostConfigured: boolean;
}

// Ports qu'on sait ne pas servir d'interface web : les lister produirait
// des liens morts (base de données, file de messages, VPN...).
const NON_HTTP_PORTS = new Set([
  25, 53, 465, 587, 993, 995, 1433, 3306, 5432, 5672, 6379, 27017, 51820,
]);

// Infrastructure, pas des applications : le proxy lui-même, et le service
// temps réel de Coolify dont les ports sont des WebSockets sans interface.
const SKIP = new Set(["coolify-proxy", "coolify-realtime"]);

const HOST_RULE = /Host\(`([^`]+)`\)/g;

// Coolify nomme différemment selon le type de ressource : pour une "app",
// resourceName est le bon nom (docmost, anddie-cooking) ; pour un "service"
// composé de plusieurs conteneurs, resourceName est l'identifiant de la pile
// (service-mwka0anu…) et c'est serviceName qui porte le nom lisible
// (seerr, prowlarr).
function friendlyName(labels: Record<string, string>, containerName: string): string {
  const isService = labels["coolify.type"] === "service";
  const name = isService
    ? labels["coolify.serviceName"] || labels["coolify.resourceName"]
    : labels["coolify.resourceName"] || labels["coolify.serviceName"];
  return name || containerName.replace(/-\d{6,}$/, "");
}

export async function discover(): Promise<Discovered> {
  const containers = await docker.listContainers({ all: false });
  const byDomain: AppEntry[] = [];
  const byPort: AppEntry[] = [];

  for (const c of containers) {
    const name = (c.Names[0] || c.Id).replace(/^\//, "");
    if (SKIP.has(name)) continue;

    const labels = c.Labels || {};
    const display = friendlyName(labels, name);
    const running = c.State === "running";

    // 1) Domaines déclarés au reverse proxy — ce sont les vraies apps web.
    const domains = new Set<string>();
    for (const [key, value] of Object.entries(labels)) {
      if (!key.startsWith("traefik.") || !key.endsWith(".rule")) continue;
      for (const m of value.matchAll(HOST_RULE)) domains.add(m[1]);
    }
    for (const domain of domains) {
      byDomain.push({ name: display, url: `https://${domain}`, detail: domain, running });
    }

    // 2) Ports publiés sur l'hôte, pour les services hors proxy.
    if (LAN_HOST) {
      const seen = new Set<number>();
      for (const p of c.Ports || []) {
        if (!p.PublicPort || p.Type !== "tcp") continue;
        if (NON_HTTP_PORTS.has(p.PublicPort) || seen.has(p.PublicPort)) continue;
        seen.add(p.PublicPort);
        byPort.push({
          name: display,
          url: `http://${LAN_HOST}:${p.PublicPort}`,
          detail: `port ${p.PublicPort}`,
          running,
        });
      }
    }
  }

  const sort = (a: AppEntry, b: AppEntry) => a.name.localeCompare(b.name, "fr");
  return {
    byDomain: byDomain.sort(sort),
    byPort: byPort.sort(sort),
    lanHostConfigured: Boolean(LAN_HOST),
  };
}
