import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { buildSeedIso } from "./cloudInit";
import { buildDomainXml } from "./domainTemplate";
import { createVmDisk } from "./images";
import { virsh } from "./virsh";

const NAME_PATTERN = /^[a-z][a-z0-9-]{1,30}$/;

export function isValidVmName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

export interface CreateVmInput {
  name: string;
  baseImageId: string;
  vcpus: number;
  memoryMiB: number;
  diskSizeGiB: number;
  sshUsername: string;
  sshPublicKey: string;
}

export async function createVm(input: CreateVmInput): Promise<void> {
  if (!isValidVmName(input.name)) {
    throw new Error("Nom de VM invalide : lettres minuscules, chiffres et tirets uniquement.");
  }

  const diskPath = await createVmDisk(input.name, input.baseImageId, input.diskSizeGiB);
  const seedIsoPath = await buildSeedIso({
    vmName: input.name,
    username: input.sshUsername,
    sshPublicKey: input.sshPublicKey,
  });

  const xml = buildDomainXml({
    name: input.name,
    vcpus: input.vcpus,
    memoryMiB: input.memoryMiB,
    diskPath,
    seedIsoPath,
  });

  const xmlPath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "domxml-")), `${input.name}.xml`);
  await fs.writeFile(xmlPath, xml, "utf-8");

  try {
    await virsh(["define", xmlPath]);
    await virsh(["start", input.name]);
  } finally {
    await fs.rm(path.dirname(xmlPath), { recursive: true, force: true });
  }
}
