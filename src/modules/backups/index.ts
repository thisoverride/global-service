import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { buildRouter } from "./routes";

const createBackupsModule: ModuleFactory = () => ({
  manifest,
  router: buildRouter(),
});

export default createBackupsModule;
