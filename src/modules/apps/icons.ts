// Attribution d'une icône à chaque application.
//
// Les applications déployées par Coolify ont un nom d'image opaque
// (uuid:sha), donc l'image ne renseigne que les logiciels tiers connus.
// D'où trois niveaux, du plus sûr au plus général :
//   1. l'image Docker, quand c'est un logiciel identifiable ;
//   2. des mots-clés dans le nom de l'application ;
//   3. à défaut, une pastille colorée avec l'initiale — au moins chaque
//      application reste distinguable d'un coup d'œil.

export interface AppIcon {
  faClass: string | null;
  color: string;
  initial: string;
}

// Logiciels tiers reconnus à leur image Docker.
const BY_IMAGE: Array<[RegExp, string, string]> = [
  [/portainer/i, "fa-cubes", "#13bef9"],
  [/rabbitmq/i, "fa-envelopes-bulk", "#ff6600"],
  [/wg-easy|wireguard/i, "fa-shield-halved", "#88171a"],
  [/prowlarr/i, "fa-magnifying-glass", "#e5a00d"],
  [/seerr|overseerr|jellyseerr/i, "fa-clapperboard", "#5b21b6"],
  [/docmost/i, "fa-book", "#1f6feb"],
  [/coolify/i, "fa-layer-group", "#8b5cf6"],
  [/traefik/i, "fa-diagram-project", "#24a1c1"],
  [/plex/i, "fa-photo-film", "#e5a00d"],
  [/postgres|mysql|mariadb|mongo/i, "fa-database", "#336791"],
  [/redis/i, "fa-bolt", "#dc382d"],
];

// Sinon, ce que le nom de l'application laisse deviner de sa nature.
const BY_NAME: Array<[RegExp, string]> = [
  [/gateway|proxy/i, "fa-diagram-project"],
  [/auth|login|sso/i, "fa-lock"],
  [/api\b|-api/i, "fa-plug"],
  [/cooking|recette|food/i, "fa-utensils"],
  [/news|redaction|blog|article/i, "fa-newspaper"],
  [/hub/i, "fa-circle-nodes"],
  [/invitation|mail|smtp/i, "fa-envelope"],
  [/communication|chat|message/i, "fa-comments"],
  [/club|team|user|member/i, "fa-users"],
  [/pwa|mobile|app\b/i, "fa-mobile-screen"],
  [/console|admin|dashboard/i, "fa-gauge"],
  [/studio|design/i, "fa-pen-ruler"],
  [/site|www|web/i, "fa-globe"],
  [/service|worker|job/i, "fa-gear"],
];

// Palette des pastilles de repli. Volontairement sombres : le texte posé
// dessus est blanc.
const PALETTE = [
  "#5c6ac4", "#16a085", "#c0392b", "#8e44ad",
  "#2980b9", "#d68910", "#2c3e50", "#c2185b",
];

// Couleur stable pour un nom donné : la même application garde sa couleur
// d'un chargement à l'autre, et deux applications voisines n'ont pas la
// même par hasard.
function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return PALETTE[hash % PALETTE.length];
}

export function iconFor(name: string, image: string): AppIcon {
  const initial = (name.trim()[0] || "?").toUpperCase();

  for (const [pattern, faClass, color] of BY_IMAGE) {
    if (pattern.test(image)) return { faClass, color, initial };
  }
  for (const [pattern, faClass] of BY_NAME) {
    if (pattern.test(name)) return { faClass, color: colorFor(name), initial };
  }
  return { faClass: null, color: colorFor(name), initial };
}
