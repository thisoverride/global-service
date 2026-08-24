import { ModuleFactory } from "../../core/modules/types";
import { manifest } from "./manifest";
import { ensureDefaultNetwork, ensurePool } from "./pool";
import { buildRouter } from "./routes";

const createQemuModule: ModuleFactory = async () => {
  await ensurePool();
  await ensureDefaultNetwork();

  return {
    manifest,
    router: buildRouter(),
  };
};

export default createQemuModule;
