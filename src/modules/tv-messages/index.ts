import { ModuleFactory } from '../../core/modules/types';
import { settingsStore } from '../../core/modules/settingsStore';
import { manifest } from './manifest';
import { buildRouter } from './routes';
import { TVMessages } from './service';
const createModule: ModuleFactory = pool => ({ manifest, router: buildRouter(new TVMessages(settingsStore(pool, manifest.id))) });
export default createModule;
