import { promises as fs } from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";
import { virsh, VirshError } from "./virsh";
import { poolDir } from "./pool";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export type DomainState = "running" | "paused" | "shutoff" | "other";

export interface VmSummary {
  name: string;
  state: DomainState;
  rawState: string;
  vcpus: number;
  memoryMiB: number;
  diskPath: string | null;
}

// virsh domstate renvoie un unique token stable, quelle que soit la locale du
// systeme (contrairement a `virsh list --all`/`dominfo`, verifies localises
// en francais sur cet hote — d'ou ce choix plutot que de parser leur sortie).
function normalizeState(raw: string): DomainState {
  const s = raw.trim().toLowerCase();
  if (s === "running") return "running";
  if (s === "paused") return "paused";
  if (s === "shut off") return "shutoff";
  return "other";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

async function parseDomainXml(name: string): Promise<{ vcpus: number; memoryMiB: number; diskPath: string | null }> {
  const xml = await virsh(["dumpxml", name]);
  const doc = xmlParser.parse(xml);
  const domain = doc.domain ?? {};

  const vcpus = Number(domain.vcpu?.["#text"] ?? domain.vcpu ?? 1);
  const memoryKiB = Number(domain.currentMemory?.["#text"] ?? domain.memory?.["#text"] ?? domain.memory ?? 0);

  const disks = asArray(domain.devices?.disk).filter((d: any) => d?.["@_device"] === "disk");
  const diskPath = disks[0]?.source?.["@_file"] ?? null;

  return { vcpus, memoryMiB: Math.round(memoryKiB / 1024), diskPath };
}

export async function listDomains(): Promise<VmSummary[]> {
  const raw = await virsh(["list", "--all", "--name"]);
  const names = raw.split("\n").map((n) => n.trim()).filter(Boolean);

  return Promise.all(
    names.map(async (name) => {
      const [rawState, xmlInfo] = await Promise.all([virsh(["domstate", name]), parseDomainXml(name)]);
      return {
        name,
        state: normalizeState(rawState),
        rawState: rawState.trim(),
        ...xmlInfo,
      };
    }),
  );
}

export async function getDomain(name: string): Promise<VmSummary | null> {
  try {
    const [rawState, xmlInfo] = await Promise.all([virsh(["domstate", name]), parseDomainXml(name)]);
    return { name, state: normalizeState(rawState), rawState: rawState.trim(), ...xmlInfo };
  } catch (error) {
    if (error instanceof VirshError && /failed to get domain/i.test(error.message)) return null;
    throw error;
  }
}

export async function start(name: string): Promise<void> {
  await virsh(["start", name]);
}

export async function shutdown(name: string): Promise<void> {
  await virsh(["shutdown", name]);
}

export async function forceOff(name: string): Promise<void> {
  await virsh(["destroy", name]);
}

export async function reboot(name: string): Promise<void> {
  await virsh(["reboot", name]);
}

// Le disque et l'ISO cloud-init sont crees directement par qemu-img/genisoimage
// (voir images.ts/cloudInit.ts), pas via l'API volume de libvirt — le pool ne
// les connait donc que s'il a ete rafraichi depuis, ce qui rend `vol-delete`
// peu fiable juste apres une creation. On supprime les fichiers directement :
// on maitrise deja leurs deux chemins (diskPath vient du XML, l'ISO suit une
// convention de nommage fixe qu'on choisit nous-memes).
export async function remove(name: string, diskPath: string | null): Promise<void> {
  await virsh(["destroy", name]).catch(() => {}); // no-op si deja arretee
  await virsh(["undefine", name, "--nvram"]);

  const seedIsoPath = path.join(poolDir(), `${name}-seed.iso`);
  await Promise.all([
    diskPath ? fs.unlink(diskPath).catch(() => {}) : Promise.resolve(),
    fs.unlink(seedIsoPath).catch(() => {}),
  ]);
}

// Adresse VNC (host:port) a utiliser avec un client externe via tunnel SSH —
// pas de client noVNC embarque dans cette version (voir plan).
export async function vncDisplay(name: string): Promise<string | null> {
  try {
    const out = (await virsh(["vncdisplay", name])).trim();
    return out || null;
  } catch {
    return null;
  }
}
