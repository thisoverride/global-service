import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "logins",
  name: "Connexions",
  description: "Historique des tentatives de connexion à la console",
  category: "Système",
  basePath: "/modules/logins",
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3m0 9a2 2 0 0 0-1 3.73V18h2v-1.27A2 2 0 0 0 12 13'/></svg>`,
};
