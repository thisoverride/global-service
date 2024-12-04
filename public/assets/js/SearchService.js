export class SearchService {
  constructor({ input, container }) {
    this.initializeElements(input, container);
    if (this.elementsExist) {
      this.suggestions = [];
      this.fetchSuggestions().then(() => this.setupEventListeners());
    }
  }

  initializeElements(input, container) {
    this.input = input;
    this.container = container;
    this.elementsExist = input && container;

    if (!this.elementsExist) {
      console.warn('Required elements for SearchService not found');
    }
  }

  async fetchSuggestions() {
    try {
      const response = await fetch('/api/suggestions');
      const data = await response.json();
      this.suggestions = data.suggestions;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      this.suggestions = [];
    }
  }

  highlightText(text, searchText) {
    if (!searchText) return text;
    const regex = new RegExp(`(${searchText})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  showSuggestions(searchText) {
    this.container.innerHTML = '';
    const filteredSuggestions = this.filterSuggestions(searchText);

    if (filteredSuggestions.length > 0) {
      this.renderSuggestions(filteredSuggestions, searchText);
      this.container.classList.add('active');
    } else {
      this.container.classList.remove('active');
    }
  }

  filterSuggestions(searchText) {
    return this.suggestions.filter(suggestion =>
      suggestion.title.toLowerCase().includes(searchText.toLowerCase()) ||
      suggestion.description.toLowerCase().includes(searchText.toLowerCase())
    );
  }

  renderSuggestions(suggestions, searchText) {
    suggestions.forEach(suggestion => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.innerHTML = this.getSuggestionHTML(suggestion, searchText);
      div.addEventListener('click', () => this.handleSuggestionClick(suggestion));
      this.container.appendChild(div);
    });
  }

  getSuggestionHTML(suggestion, searchText) {
    return `
      <i class="fas ${suggestion.icon} suggestion-icon"></i>
      <div class="suggestion-content">
        <div class="suggestion-title">${this.highlightText(suggestion.title, searchText)}</div>
        <div class="suggestion-description">${this.highlightText(suggestion.description, searchText)}</div>
      </div>
      <span class="suggestion-category">${suggestion.category}</span>
    `;
  }

  handleSuggestionClick(suggestion) {
    this.input.value = suggestion.title;
    this.container.classList.remove('active');
    window.location.href = suggestion.path || `/${suggestion.title.toLowerCase().replace(/\s+/g, '')}`;
  }

  setupEventListeners() {
    this.input.addEventListener('input', (e) => {
      const searchText = e.target.value.trim();
      if (searchText.length > 0) {
        this.showSuggestions(searchText);
      } else {
        this.container.classList.remove('active');
      }
    });

    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.container.contains(e.target)) {
        this.container.classList.remove('active');
      }
    });
  }
}
