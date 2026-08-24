import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { buildRouter } from "./routes";

const createPlexModule: ModuleFactory = (pool) => ({
  manifest,
  router: buildRouter(pool),
});

export default createPlexModule;
