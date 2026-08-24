import { createWriteStream, existsSync } from "fs";
import { promises as fs } from "fs";
import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { poolDir } from "./pool";
import { qemuImg } from "./virsh";

// Catalogue restreint et verifie : images cloud officielles uniquement,
// jamais un lien fourni par l'utilisateur (surface de risque volontairement
// fermee — voir plan de la console pour la justification).
export interface BaseImage {
  id: string;
  name: string;
  url: string;
}

export const CATALOG: BaseImage[] = [
  {
    id: "debian-13",
    name: "Debian 13 (Trixie)",
    url: "https://cloud.debian.org/images/cloud/trixie/latest/debian-13-generic-amd64.qcow2",
  },
  {
    id: "ubuntu-24.04",
    name: "Ubuntu 24.04 LTS (Noble)",
    url: "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img",
  },
];

function baseImagePath(id: string): string {
  return path.join(poolDir(), "base", `${id}.qcow2`);
}

// Telecharge l'image de base une seule fois, la met en cache dans le pool.
// Les creations suivantes avec la meme image reutilisent le fichier tel quel.
export async function ensureBaseImage(id: string): Promise<string> {
  const image = CATALOG.find((i) => i.id === id);
  if (!image) throw new Error(`Image inconnue : ${id}`);

  const dest = baseImagePath(id);
  if (existsSync(dest)) return dest;

  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;

  const res = await fetch(image.url);
  if (!res.ok || !res.body) throw new Error(`Téléchargement échoué (HTTP ${res.status}) : ${image.url}`);

  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(tmp));
  await fs.rename(tmp, dest);
  return dest;
}

// Disque copy-on-write adosse a l'image de base : creation quasi instantanee,
// n'occupe que l'espace effectivement ecrit par la VM.
export async function createVmDisk(vmName: string, baseImageId: string, sizeGiB: number): Promise<string> {
  const basePath = await ensureBaseImage(baseImageId);
  const diskPath = path.join(poolDir(), `${vmName}.qcow2`);

  await qemuImg(["create", "-f", "qcow2", "-F", "qcow2", "-b", basePath, diskPath, `${sizeGiB}G`]);
  return diskPath;
}
