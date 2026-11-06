import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { buildRouter } from "./routes";

// Aucune table propre : le catalogue vient de Plex et le registre des archives
// vit dans le service d'archivage (/opt/app/archiver), seul a toucher aux
// fichiers et a Drive. Le module n'en est que la facade authentifiee.
const createMediaModule: ModuleFactory = () => ({
  manifest,
  router: buildRouter(),
});

export default createMediaModule;
