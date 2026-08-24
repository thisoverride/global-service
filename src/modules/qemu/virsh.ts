import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const CONNECT_URI = process.env.LIBVIRT_URI || "qemu:///system";

// Force une sortie en anglais quelle que soit la locale du systeme : sur cet
// hote (locale fr_FR), `virsh domstate` renvoie "fermé" au lieu de "shut off"
// sans ca — invisible en dev, silencieusement casse en prod si le conteneur a
// une autre locale. Applique a tous les appels virsh/qemu-img.
const C_LOCALE_ENV = { ...process.env, LC_ALL: "C", LANG: "C" };

export class VirshError extends Error {}

// Toujours execFile (jamais exec/un template shell) : les arguments (noms de
// VM, chemins) passent en tableau, jamais interpoles dans une chaine — aucune
// injection de commande possible meme avec un nom de VM malveillant.
export async function virsh(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("virsh", ["-c", CONNECT_URI, ...args], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      env: C_LOCALE_ENV,
    });
    return stdout;
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new VirshError(err.stderr?.trim() || err.message || "Erreur virsh");
  }
}

export async function qemuImg(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("qemu-img", args, { timeout: 60_000, env: C_LOCALE_ENV });
    return stdout;
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new VirshError(err.stderr?.trim() || err.message || "Erreur qemu-img");
  }
}

export async function genisoimage(args: string[]): Promise<void> {
  try {
    await execFileAsync("genisoimage", args, { timeout: 30_000 });
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new VirshError(err.stderr?.trim() || err.message || "Erreur genisoimage");
  }
}
