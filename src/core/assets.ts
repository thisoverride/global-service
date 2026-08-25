import { createHash } from "crypto";
import { readFileSync } from "fs";
import * as path from "path";
import { PROJECT_ROOT } from "./paths";

// Les fichiers statiques sont servis sous une URL fixe et mis en cache quatre
// heures par le navigateur ET par Cloudflare. Sans empreinte dans l'URL, un
// deploiement livre le nouveau HTML avec l'ancienne CSS encore en cache :
// les nouvelles classes ne correspondent a rien et la page s'affiche nue.
// L'empreinte du contenu change des que le fichier change, ce qui force le
// rechargement — et, a l'inverse, laisse le cache jouer pleinement quand
// rien n'a bouge.
const cache = new Map<string, string>();

function fingerprint(urlPath: string): string {
  const cached = cache.get(urlPath);
  if (cached) return cached;

  let stamp: string;
  try {
    const full = path.join(PROJECT_ROOT, "public", urlPath.replace(/^\//, ""));
    const digest = createHash("sha1").update(readFileSync(full)).digest("hex");
    stamp = digest.slice(0, 10);
  } catch {
    // Fichier introuvable : on ne casse pas le rendu pour autant, on renvoie
    // l'URL telle quelle (le navigateur affichera un 404 explicite).
    stamp = "";
  }

  cache.set(urlPath, stamp);
  return stamp;
}

export function assetUrl(urlPath: string): string {
  const stamp = fingerprint(urlPath);
  return stamp ? `${urlPath}?v=${stamp}` : urlPath;
}
