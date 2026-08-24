import { ServiceManager } from './services/ServiceManager.js'
import { SidebarService } from './SidebarService.js'

document.addEventListener('DOMContentLoaded', () => {
  const config = {
    panelElements: {
      button: document.getElementById('servicesButton'),
      panel: document.getElementById('servicesPanel'),
    },
    searchElements: {
      input: document.getElementById('searchInput'),
      container: document.getElementById('searchSuggestions')
    }
  };
  new ServiceManager(config);

  new SidebarService({
    sidebar: document.getElementById('sidebar'),
    toggle: document.getElementById('sidebarToggle'),
  });
});
