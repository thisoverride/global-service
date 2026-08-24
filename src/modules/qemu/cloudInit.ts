import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { poolDir } from "./pool";
import { genisoimage } from "./virsh";

export interface CloudInitInput {
  vmName: string;
  username: string;
  sshPublicKey: string;
}

function userData({ username, sshPublicKey }: CloudInitInput): string {
  return [
    "#cloud-config",
    "users:",
    `  - name: ${username}`,
    "    sudo: ALL=(ALL) NOPASSWD:ALL",
    "    groups: sudo",
    "    shell: /bin/bash",
    "    ssh_authorized_keys:",
    `      - ${sshPublicKey}`,
    "ssh_pwauth: false",
    "chpasswd:",
    "  expire: false",
    "",
  ].join("\n");
}

function metaData({ vmName }: CloudInitInput): string {
  return [`instance-id: ${vmName}`, `local-hostname: ${vmName}`, ""].join("\n");
}

// Genere l'ISO NoCloud (cidata) que cloud-init lit au premier demarrage pour
// creer l'utilisateur et installer sa cle SSH — c'est le seul moyen de se
// connecter a la VM, aucun mot de passe n'est jamais defini.
export async function buildSeedIso(input: CloudInitInput): Promise<string> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "cloudinit-"));
  try {
    await fs.writeFile(path.join(workDir, "user-data"), userData(input), "utf-8");
    await fs.writeFile(path.join(workDir, "meta-data"), metaData(input), "utf-8");

    const isoPath = path.join(poolDir(), `${input.vmName}-seed.iso`);
    await genisoimage(["-output", isoPath, "-volid", "cidata", "-joliet", "-rock", workDir]);
    return isoPath;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
