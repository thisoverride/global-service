import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { buildRouter } from "./routes";

// Aucune table propre : tout l'etat vit sur la machine distante (MediaMTX et
// systemd). Le module n'est qu'une facade authentifiee au-dessus.
const createSmarthinkModule: ModuleFactory = () => ({
  manifest,
  router: buildRouter(),
});

export default createSmarthinkModule;
