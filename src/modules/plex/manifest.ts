import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "plex",
  name: "Plex",
  description: "Serveur multimédia : version, bibliothèques, lectures",
  category: "Média",
  basePath: "/modules/plex",
  links: [
    { label: "Vue d'ensemble", path: "" },
    { label: "Bibliothèques", path: "libraries" },
    { label: "Lectures en cours", path: "sessions" },
    { label: "Jeton", path: "settings" },
  ],
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m4.5 4l4.5 6l-4.5 6h3l4.5-6l-4.5-6z'/></svg>`,
};
