import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "backups",
  name: "Sauvegardes",
  description: "État de la dernière sauvegarde du serveur et journaux",
  category: "Système",
  basePath: "/modules/backups",
  links: [
    { label: "État", path: "" },
    { label: "Journaux", path: "logs" },
  ],
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M12 3a9 9 0 0 1 9 9a9 9 0 0 1-9 9a9 9 0 0 1-9-9h2a7 7 0 0 0 7 7a7 7 0 0 0 7-7a7 7 0 0 0-7-7c-1.93 0-3.68.78-4.95 2.05L9 10H3V4l2.05 2.05A8.98 8.98 0 0 1 12 3m2.5 5.5l-3 3V15h1.5v-2.88l2.56-2.56z'/></svg>`,
};
