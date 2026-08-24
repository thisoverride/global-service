import { promises as fs } from "fs";
import { virsh } from "./virsh";

export const POOL_NAME = "console-vms";

// IMPORTANT : libvirtd tourne sur l'HOTE, pas dans ce conteneur — tous les
// chemins qu'on lui passe (pool, disques, ISO) sont resolus par lui cote
// hote. Le volume doit donc etre monte au MEME chemin des deux cotes (comme
// pour le socket libvirt), sinon le pool pointe vers un repertoire qui n'a
// aucun sens pour le daemon.
export function poolDir(): string {
  return process.env.QEMU_POOL_DIR || "/opt/app/volumes/console/vm-images";
}

async function activeNames(listArgs: string[]): Promise<string[]> {
  // `--name` (sans --all) ne liste que les elements ACTIFS, sous forme de
  // noms bruts — contrairement a `pool-info`/`net-info`, ce format n'est
  // jamais localise, donc fiable quelle que soit la locale du systeme (voir
  // le commentaire de C_LOCALE_ENV dans virsh.ts : certaines erreurs
  // renvoyees par libvirtd restent traduites meme avec LC_ALL=C cote client).
  const out = await virsh(listArgs);
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

// Definit (une fois) puis demarre le pool de stockage dedie a la console —
// evite le pool par defaut /var/lib/libvirt/images, souvent root-only et
// partage avec d'autres usages de l'hote.
export async function ensurePool(): Promise<void> {
  const dir = poolDir();
  await fs.mkdir(dir, { recursive: true });

  const definedExists = await virsh(["pool-info", POOL_NAME]).then(() => true).catch(() => false);
  if (!definedExists) {
    await virsh(["pool-define-as", POOL_NAME, "dir", "--target", dir]);
  }

  await virsh(["pool-autostart", POOL_NAME]).catch(() => {});

  if (!(await activeNames(["pool-list", "--name"])).includes(POOL_NAME)) {
    await virsh(["pool-start", POOL_NAME]);
  }
  await virsh(["pool-refresh", POOL_NAME]).catch(() => {});
}

// Le reseau NAT "default" fourni par libvirt-daemon-config-network existe
// mais n'est pas demarre automatiquement sur une install fraiche.
export async function ensureDefaultNetwork(): Promise<void> {
  const exists = await virsh(["net-info", "default"]).then(() => true).catch(() => false);
  if (!exists) return; // rien a faire si le paquet de reseau par defaut n'est pas installe

  await virsh(["net-autostart", "default"]).catch(() => {});

  if (!(await activeNames(["net-list", "--name"])).includes("default")) {
    await virsh(["net-start", "default"]);
  }
}
