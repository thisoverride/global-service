import { ServiceManager } from './services/ServiceManager.js'

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
});