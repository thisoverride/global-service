import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { buildRouter } from "./routes";

// Le journal des tentatives appartient au coeur (table login_attempts, creee
// par la migration core 003) : ce module n'est qu'une facade de lecture, il
// n'a donc ni migration ni table a lui.
const createLoginsModule: ModuleFactory = (pool) => ({
  manifest,
  router: buildRouter(pool),
});

export default createLoginsModule;
