import { PanelService } from '../PanelService.js';
import { SearchService } from '../SearchService.js';

export class ServiceManager {
  constructor(config) {
    this.panel = new PanelService(config.panelElements);
    this.search = new SearchService(config.searchElements);
  }
}
