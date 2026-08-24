import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "logs",
  name: "Logs",
  description: "Logs des conteneurs en cours d'exécution",
  category: "Système",
  basePath: "/modules/logs",
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m1 2v12h14V6zm2 2h2v2H7zm4 0h6v2h-6zm-4 4h2v2H7zm4 0h6v2h-6z'/></svg>`,
};
