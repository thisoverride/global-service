import Docker from "dockerode";
import { PassThrough, Readable } from "stream";

// Le socket Docker de l'hote est monte tel quel (voir volumes Coolify) — ce
// client ne fait jamais de creation/arret/suppression, uniquement lister et
// lire des logs (voir routes.ts). Le socket lui-meme reste un acces complet
// a l'hote ; restreindre le CODE aux operations de lecture limite ce qu'une
// faille dans ce module precis pourrait faire, meme si le socket sous-jacent
// ne le garantit pas au niveau systeme.
export const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock" });

export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string;
}

export async function listContainers(all: boolean): Promise<ContainerSummary[]> {
  const containers = await docker.listContainers({ all });
  return containers
    .map((c) => ({
      id: c.Id,
      name: (c.Names[0] || c.Id).replace(/^\//, ""),
      image: c.Image,
      state: c.State,
      status: c.Status,
      createdAt: new Date(c.Created * 1000).toISOString(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ContainerDetail extends ContainerSummary {
  tty: boolean;
}

export async function getContainerDetail(id: string): Promise<ContainerDetail | null> {
  try {
    const info = await docker.getContainer(id).inspect();
    return {
      id: info.Id,
      name: info.Name.replace(/^\//, ""),
      image: info.Config.Image,
      state: info.State.Status,
      status: info.State.Status,
      createdAt: info.Created,
      tty: Boolean(info.Config.Tty),
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number };
    if (err.statusCode === 404) return null;
    throw error;
  }
}

// Beaucoup d'apps colorent leurs logs pour un terminal (ex: morgan en mode
// "dev") — ces codes ANSI n'ont aucun sens dans un <pre> HTML, ils
// s'afficheraient comme des caracteres de controle visibles.
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

// Les logs d'un conteneur sans TTY sont multiplexes par Docker : chaque trame
// commence par 8 octets d'en-tete (type de flux + taille) avant les donnees.
// Un conteneur avec un TTY (rare ici) n'a pas cet en-tete, c'est du texte brut.
function demuxBuffer(buf: Buffer): string {
  const parts: string[] = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > buf.length) break;
    parts.push(buf.subarray(start, end).toString("utf8"));
    offset = end;
  }
  return parts.join("");
}

export async function fetchRecentLogs(id: string, tail: number): Promise<string> {
  const container = docker.getContainer(id);
  const info = await container.inspect();
  const buf = (await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
    follow: false,
  })) as unknown as Buffer;

  return stripAnsi(info.Config.Tty ? buf.toString("utf8") : demuxBuffer(buf));
}

// Flux de lignes en direct (docker logs -f). L'appelant recoit du texte deja
// demultiplexe, ligne par ligne — reste a le renvoyer au navigateur (SSE,
// voir routes.ts). tail:0 volontaire : la page a deja rendu l'historique via
// fetchRecentLogs au chargement, ce flux ne doit apporter que les nouvelles
// lignes, sinon les dernieres lignes apparaissent en double a la connexion.
export async function streamLogs(id: string): Promise<Readable> {
  const container = docker.getContainer(id);
  const info = await container.inspect();
  const rawStream = (await container.logs({
    stdout: true,
    stderr: true,
    tail: 0,
    timestamps: true,
    follow: true,
  })) as unknown as NodeJS.ReadableStream;

  if (info.Config.Tty) {
    return rawStream as Readable;
  }

  const sink = new PassThrough();
  // Une seule destination pour stdout ET stderr : preserve l'ordre reel
  // d'emission plutot que de separer les deux flux, plus lisible pour un
  // simple visualiseur de logs.
  (container as unknown as { modem: { demuxStream: (s: unknown, o: unknown, e: unknown) => void } }).modem.demuxStream(
    rawStream,
    sink,
    sink,
  );
  rawStream.on("end", () => sink.end());
  return sink;
}
