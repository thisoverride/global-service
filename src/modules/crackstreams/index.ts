import { ModuleFactory } from '../../core/modules/types';
import { settingsStore } from '../../core/modules/settingsStore';
import { manifest } from './manifest';
import { StreamSettings } from './service';
import { Catalog } from './source';
import { buildRouter, buildDeviceRouter } from './routes';
const createModule: ModuleFactory = pool => {
  const settings = new StreamSettings(settingsStore(pool, manifest.id));
  const catalog = new Catalog();
  return { manifest, router: buildRouter(settings, catalog), deviceRouter: buildDeviceRouter(settings, catalog) };
};
export default createModule;
