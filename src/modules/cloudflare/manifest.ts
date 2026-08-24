import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "cloudflare",
  name: "Cloudflare",
  description: "Zones et enregistrements DNS",
  category: "Réseau",
  basePath: "/modules/cloudflare",
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path fill='currentColor' d='M21.113 19.617c.19-.652.116-1.248-.202-1.688c-.29-.402-.78-.633-1.372-.652l-11.19-.145a.196.196 0 0 1-.163-.087a.212.212 0 0 1-.023-.188a.253.253 0 0 1 .209-.166l11.294-.145c1.34-.062 2.799-1.153 3.31-2.484l.645-1.688a.322.322 0 0 0 .015-.202a6.925 6.925 0 0 0-13.353-.751a3.15 3.15 0 0 0-4.993 2.4a3.15 3.15 0 0 0 .082.826a4.978 4.978 0 0 0-4.362 4.94a5.06 5.06 0 0 0 .05.696a.205.205 0 0 0 .202.174h19.516a.253.253 0 0 0 .243-.185z'/></svg>`,
};
