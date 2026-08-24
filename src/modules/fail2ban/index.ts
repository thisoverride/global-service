import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { buildRouter } from "./routes";

const createFail2banModule: ModuleFactory = () => ({
  manifest,
  router: buildRouter(),
});

export default createFail2banModule;
