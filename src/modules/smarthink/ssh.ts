import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

// La machine distante et la cle sont configurables : rien n'est code en dur
// ailleurs que dans ces valeurs par defaut.
export const HOST = process.env.SMARTHINK_HOST || "192.168.1.44";
export const USER = process.env.SMARTHINK_USER || "smarthink";
const KEY = process.env.SMARTHINK_KEY || "/opt/app/console-ssh/id_ed25519";

export class SmarthinkError extends Error {}

// BatchMode=yes : jamais d'invite de mot de passe, la commande echoue tout de
// suite plutot que de rester bloquee jusqu'au timeout du navigateur.
const SSH_OPTS = [
  "-i", KEY,
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=6",
];

export async function ssh(command: string, timeoutMs = 15000): Promise<string> {
  try {
    const { stdout } = await run("ssh", [...SSH_OPTS, `${USER}@${HOST}`, command], {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const e = error as { code?: number | string; stderr?: string; killed?: boolean };
    if (e.killed) throw new SmarthinkError(`La machine n'a pas repondu en ${timeoutMs / 1000} s.`);
    const detail = (e.stderr || "").trim().split("\n").pop() || `code ${e.code}`;
    throw new SmarthinkError(`Commande refusee par la machine : ${detail}`);
  }
}

// Capture binaire (image JPEG) : on ne peut pas passer par stdout en texte
// sans corrompre les octets, d'ou l'encodage base64 cote distant.
export async function sshBinary(command: string, timeoutMs = 20000): Promise<Buffer> {
  const out = await ssh(`${command} | base64 -w0`, timeoutMs);
  return Buffer.from(out.trim(), "base64");
}
