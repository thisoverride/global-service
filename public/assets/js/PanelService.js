export class PanelService {
  constructor({ button, panel }) {
    this.initializeElements(button, panel);
    if (this.elementsExist) {
      this.setupEventListeners();
    }
  }

  initializeElements(button, panel) {
    this.button = button;
    this.panel = panel;
    this.elementsExist = button && panel
    
    if (!this.elementsExist) {
      console.warn('Required elements for PanelService not found');
    }
  }

  setupEventListeners() {
    this.button.addEventListener('click', this.handleButtonClick.bind(this));
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  handleButtonClick(e) {
    e.stopPropagation();
    this.panel.classList.toggle('active');
  }

  handleDocumentClick(e) {
    if (!this.elementsExist) return;
    
    const clickedOutside = this.panel.classList.contains('active') &&
      !this.panel.contains(e.target) &&
      !this.button.contains(e.target);

    if (clickedOutside) {
      this.panel.classList.remove('active');
    }
  }
}