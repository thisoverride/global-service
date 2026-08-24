const STORAGE_KEY = 'console.sidebar.collapsed';

export class SidebarService {
  constructor({ sidebar, toggle }) {
    this.sidebar = sidebar;
    this.toggle = toggle;
    if (!sidebar || !toggle) return;

    // L'état est restauré avant tout affichage pour éviter que la barre
    // s'affiche dépliée puis se replie sous les yeux de l'utilisateur.
    this.setCollapsed(localStorage.getItem(STORAGE_KEY) === '1', false);
    this.toggle.addEventListener('click', () => this.setCollapsed(!this.isCollapsed(), true));
  }

  isCollapsed() {
    return this.sidebar.classList.contains('is-collapsed');
  }

  setCollapsed(collapsed, persist) {
    this.sidebar.classList.toggle('is-collapsed', collapsed);
    this.toggle.setAttribute('aria-expanded', String(!collapsed));
    if (persist) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }
}
