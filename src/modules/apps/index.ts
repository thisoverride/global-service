import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { buildRouter } from "./routes";

const createAppsModule: ModuleFactory = () => ({
  manifest,
  router: buildRouter(),
});

export default createAppsModule;
