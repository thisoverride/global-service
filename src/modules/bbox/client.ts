import * as https from "https";
import { Pool } from "pg";
import { getSetting } from "../../core/db/moduleSettings";

const HOST = process.env.BBOX_HOST || "192.168.1.254";
// La Bbox presente un certificat pour "mabbox.bytel.fr" et refuse les
// requetes sans cet en-tete Host, meme en tapant directement son IP.
const API_HOST_HEADER = "mabbox.bytel.fr";

export class BboxError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

interface RawResponse {
  status: number;
  body: string;
  setCookie: string[];
}

// Le certificat de la box est auto-signe et emis pour un nom qui ne
// correspond pas a son IP locale : la verification TLS echouerait
// forcement. On l'accepte ici parce que la box est sur le LAN et
// identifiee par son IP de passerelle — mais ca reste une connexion non
// authentifiee cryptographiquement, a ne pas reproduire hors reseau local.
function request(
  method: string,
  path: string,
  options: { cookie?: string; form?: Record<string, string> } = {},
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const payload = options.form ? new URLSearchParams(options.form).toString() : undefined;
    const headers: Record<string, string> = { Host: API_HOST_HEADER };
    if (options.cookie) headers.Cookie = options.cookie;
    if (payload) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      headers["Content-Length"] = String(Buffer.byteLength(payload));
    }

    const req = https.request(
      { host: HOST, port: 443, path, method, headers, rejectUnauthorized: false, timeout: 10_000 },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body, setCookie: res.headers["set-cookie"] ?? [] }),
        );
      },
    );
    req.on("error", (err) => reject(new BboxError(`Box injoignable : ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new BboxError("Box injoignable : délai dépassé."));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

// Session partagee entre requetes : la box limite le nombre de sessions
// ouvertes, se reconnecter a chaque appel finirait par etre refuse.
let sessionCookie: string | null = null;

async function login(password: string): Promise<string> {
  const res = await request("POST", "/api/v1/login", { form: { password } });
  if (res.status !== 200) {
    throw new BboxError("Mot de passe de la Bbox refusé.", res.status);
  }
  const raw = res.setCookie.find((c) => c.startsWith("BBOX_ID="));
  if (!raw) throw new BboxError("La box n'a pas renvoyé de session.");
  return raw.split(";")[0];
}

async function getPassword(pool: Pool): Promise<string> {
  const password = await getSetting<string>(pool, "bbox", "password");
  if (!password) throw new BboxError("Mot de passe de la Bbox non configuré.");
  return password;
}

// Rejoue une fois apres reconnexion : la session de la box expire d'elle-meme
// au bout d'un moment, et on ne peut pas le savoir autrement qu'en essuyant
// un 401.
async function authed(pool: Pool, method: string, path: string, form?: Record<string, string>): Promise<RawResponse> {
  const password = await getPassword(pool);
  if (!sessionCookie) sessionCookie = await login(password);

  let res = await request(method, path, { cookie: sessionCookie, form });
  if (res.status === 401) {
    sessionCookie = await login(password);
    res = await request(method, path, { cookie: sessionCookie, form });
  }
  return res;
}

function parseJson<T>(res: RawResponse, what: string): T {
  if (res.status >= 400) {
    throw new BboxError(`${what} : la box a répondu ${res.status}.`, res.status);
  }
  try {
    return JSON.parse(res.body) as T;
  } catch {
    throw new BboxError(`${what} : réponse illisible de la box.`);
  }
}

export interface DeviceInfo {
  modelName: string;
  firmware: string;
  uptimeSeconds: number;
  numberOfBoots: number;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const res = await request("GET", "/api/v1/device");
  const data = parseJson<Array<{ device: Record<string, any> }>>(res, "Infos box");
  const d = data[0].device;
  return {
    modelName: d.modelname,
    firmware: d.main?.version ?? "?",
    uptimeSeconds: d.uptime ?? 0,
    numberOfBoots: d.numberofboots ?? 0,
  };
}

export interface WanInfo {
  publicIp: string;
  state: string;
  gateway: string;
}

export async function getWanInfo(): Promise<WanInfo> {
  const res = await request("GET", "/api/v1/wan/ip");
  const data = parseJson<Array<{ wan: Record<string, any> }>>(res, "Infos WAN");
  const ip = data[0].wan.ip ?? {};
  return { publicIp: ip.address ?? "?", state: ip.state ?? "?", gateway: ip.gateway ?? "?" };
}

export interface Host {
  hostname: string;
  ip: string;
  mac: string;
  active: boolean;
  linkType: string;
  firstSeen: string;
  lastSeen: string;
}

export async function listHosts(pool: Pool): Promise<Host[]> {
  const res = await authed(pool, "GET", "/api/v1/hosts");
  const data = parseJson<Array<{ hosts: { list: Array<Record<string, any>> } }>>(res, "Appareils connectés");
  const list = data[0]?.hosts?.list ?? [];
  return list
    .map((h) => ({
      hostname: h.hostname || "(sans nom)",
      ip: h.ipaddress || "",
      mac: h.macaddress || "",
      active: h.active === 1,
      linkType: h.link || "",
      firstSeen: h.firstseen || "",
      lastSeen: h.lastseen || "",
    }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.hostname.localeCompare(b.hostname));
}

export interface NatRule {
  id: number;
  enabled: boolean;
  description: string;
  protocol: string;
  externalPort: number;
  internalPort: number;
  internalIp: string;
}

export async function listNatRules(): Promise<NatRule[]> {
  const res = await request("GET", "/api/v1/nat/rules");
  const data = parseJson<Array<{ nat: { rules: Array<Record<string, any>> } }>>(res, "Redirections de ports");
  return (data[0]?.nat?.rules ?? []).map((r) => ({
    id: r.id,
    enabled: r.enable === 1,
    description: r.description || "",
    protocol: r.protocol || "",
    externalPort: r.externalport,
    internalPort: r.internalport,
    internalIp: r.internalip || "",
  }));
}

export interface NewNatRule {
  description: string;
  protocol: string;
  externalPort: number;
  internalPort: number;
  internalIp: string;
}

export async function createNatRule(pool: Pool, rule: NewNatRule): Promise<void> {
  const res = await authed(pool, "POST", "/api/v1/nat/rules", {
    enable: "1",
    description: rule.description,
    protocol: rule.protocol,
    externalport: String(rule.externalPort),
    internalport: String(rule.internalPort),
    internalip: rule.internalIp,
  });
  if (res.status >= 400) {
    throw new BboxError(`Création refusée par la box (HTTP ${res.status}).`, res.status);
  }
}

export async function deleteNatRule(pool: Pool, id: number): Promise<void> {
  const res = await authed(pool, "DELETE", `/api/v1/nat/rules/${id}`);
  if (res.status >= 400) {
    throw new BboxError(`Suppression refusée par la box (HTTP ${res.status}).`, res.status);
  }
}

// Verifie un mot de passe sans l'enregistrer — utilise par la page de
// configuration avant de stocker quoi que ce soit.
export async function checkPassword(password: string): Promise<void> {
  sessionCookie = await login(password);
}
