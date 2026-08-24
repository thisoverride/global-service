import amqp from "amqplib";

// Pont vers la chaine Eustass, cote serveur uniquement : le navigateur ne voit
// jamais les identifiants RabbitMQ, il ne parle qu'a ce module.
//
// La console publie un job d'import comme le ferait Eustass depuis Snapchat.
// La difference : replyTo vaut 'console'. Le worker importe quand meme les
// recettes dans anddie-cooking ; seule la reponse Snapchat, qui n'a pas de
// salon 'console' ou aller, est ignoree cote Eustass. L'effet reel — les
// recettes ajoutees — se constate via le compteur anddie-cooking.

const JOB_QUEUE = process.env.AMQ_JOB_QUEUE || "eustass.jobs";

// Domaines que le worker de recettes sait traiter. Duplique a dessein : la
// console refuse une URL non couverte sans deranger la chaine.
export const SUPPORTED_DOMAINS = ["ricardocuisine.com", "delscookingtwist.com", "cuisineaz.com", "ptitchef.com"];

function isSupported(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SUPPORTED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

// Une connexion par operation, courte : la console publie rarement, ouvrir
// puis fermer evite de gerer les reconnexions d'une connexion longue.
async function withChannel<T>(fn: (ch: amqp.Channel) => Promise<T>): Promise<T> {
  const server = process.env.AMQ_SERVER;
  if (!server) throw new Error("AMQ_SERVER non configuré.");

  const connection = await amqp.connect(server);
  try {
    const channel = await connection.createChannel();
    await channel.assertQueue(JOB_QUEUE, { durable: true });
    const result = await fn(channel);
    await channel.close();
    return result;
  } finally {
    await connection.close().catch(() => {});
  }
}

export interface ImportResult {
  queued: number;
  rejected: string[];
  jobId?: string;
}

export async function publishImport(urls: string[]): Promise<ImportResult> {
  const supported = urls.filter(isSupported);
  const rejected = urls.filter((u) => !supported.includes(u));
  if (supported.length === 0) {
    return { queued: 0, rejected };
  }

  const job = {
    id: `recipes.import-console-${Date.now().toString(36)}`,
    type: "recipes.import",
    replyTo: "console",
    args: supported,
    createdAt: new Date().toISOString(),
  };

  await withChannel((ch) => {
    ch.sendToQueue(JOB_QUEUE, Buffer.from(JSON.stringify(job)), { persistent: true });
    return Promise.resolve();
  });
  return { queued: supported.length, rejected, jobId: job.id };
}

// Profondeur de la file : combien de jobs attendent encore un worker.
export async function queueDepth(): Promise<number | null> {
  try {
    return await withChannel(async (ch) => (await ch.checkQueue(JOB_QUEUE)).messageCount);
  } catch {
    return null;
  }
}

export async function recipeCount(): Promise<number | null> {
  try {
    const anddieUrl = process.env.ANDDIE_URL || "https://anddiecooking.dalency.com";
    const res = await fetch(`${anddieUrl}/api/recipes`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    const body = (await res.json()) as { count?: number; recipes?: unknown[] };
    return body.count ?? body.recipes?.length ?? null;
  } catch {
    return null;
  }
}
