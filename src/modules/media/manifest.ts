import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "media",
  name: "Médiathèque",
  description: "Films et séries Plex : archivage sur Google Drive et récupération",
  category: "Système",
  basePath: "/modules/media",
  links: [
    { label: "Bibliothèque", path: "" },
    { label: "Historique", path: "history" },
  ],
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4z'/></svg>`,
};
