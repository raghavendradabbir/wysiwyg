/**
 * RightSidebar Web Component
 * Handles the right sidebar with styles and properties panels
 */
class RightSidebar extends HTMLElement {
  constructor() {
    super();
    this.activeTab = 'styles';
    this.selectedElement = null;
    this.isCollapsed = false;
  }

  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/right-sidebar/right-sidebar.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading right-sidebar component:', error);
      this.innerHTML = '<div class="component-error">Error loading right sidebar</div>';
    }
  }

  init() {
    // Get references to key elements
    this.sidebar = this.querySelector('#rightSidebar');
    this.tabs = this.querySelectorAll('.right-tab');
    this.tabContents = this.querySelectorAll('.right-tab-content');
    this.stylesPanel = this.querySelector('#stylesPanel');
    this.propertiesPanel = this.querySelector('#propertiesPanel');
    this.sectionToggles = this.querySelectorAll('.section-toggle');
    this.collapseBtn = this.querySelector('#rightCollapseBtn');
    this.floatingToggle = this.querySelector('#rightSidebarToggle');
    
    // Bind event listeners
    this.bindEvents();
    
    // Initialize sections
    this.initializeSections();

    // Ensure initial chevron state reflects collapsed flag
    this.setCollapsed(this.isCollapsed);

    // Header reopen button (static in index.html)
    this.headerReopenBtn = document.getElementById('reopenRightSidebarBtn');
    if (this.headerReopenBtn && !this.headerReopenBtn._bound) {
      this.headerReopenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setCollapsed(false);
      });
      this.headerReopenBtn._bound = true;
    }
    if (this.headerReopenBtn) {
      this.headerReopenBtn.style.display = this.isCollapsed ? 'inline-flex' : 'none';
    }
  }

  bindEvents() {
    // Tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Section toggles
    this.sectionToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        this.toggleSection(toggle);
      });
    });

    // Style inputs
    const styleInputs = this.querySelectorAll('.style-input');
    styleInputs.forEach(input => {
      input.addEventListener('change', () => {
        this.handleStyleChange(input);
      });
      
      input.addEventListener('input', () => {
        if (input.type === 'color' || input.classList.contains('color-text')) {
          this.handleStyleChange(input);
        }
      });
    });

    // Property inputs
    const propertyInputs = this.querySelectorAll('.property-input');
    propertyInputs.forEach(input => {
      input.addEventListener('change', () => {
        this.handlePropertyChange(input);
      });
      
      input.addEventListener('input', () => {
        if (input.dataset.content === 'text') {
          this.handlePropertyChange(input);
        }
      });
    });

    // Color picker synchronization
    const colorPickers = this.querySelectorAll('.color-picker');
    colorPickers.forEach(picker => {
      picker.addEventListener('input', () => {
        const textInput = picker.parentElement.querySelector('.color-text');
        if (textInput) {
          textInput.value = picker.value;
        }
      });
    });

    const colorTexts = this.querySelectorAll('.color-text');
    colorTexts.forEach(text => {
      text.addEventListener('input', () => {
        const picker = text.parentElement.querySelector('.color-picker');
        if (picker && this.isValidColor(text.value)) {
          picker.value = text.value;
        }
      });
    });

    // Collapse/Expand via header chevron
    this.collapseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapse();
    });

    // Collapse/Expand via floating toggle
    this.floatingToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapse();
    });
  }

  initializeSections() {
    // Initialize all sections as expanded
    this.sectionToggles.forEach(toggle => {
      const section = toggle.closest('.style-section, .property-section');
      const content = section?.querySelector('.style-section-content, .property-section-content');
      
      if (content) {
        content.style.display = 'block';
        toggle.classList.add('expanded');
      }
    });
  }

  switchTab(tabName) {
    if (this.activeTab === tabName) return;

    // Update tab buttons
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    this.tabContents.forEach(content => {
      const isActive = content.id === `${tabName}Tab`;
      content.classList.toggle('active', isActive);
    });

    this.activeTab = tabName;
    
    // Dispatch tab change event
    this.dispatchEvent(new CustomEvent('sidebar-tab-changed', {
      detail: { tab: tabName },
      bubbles: true
    }));
  }

  toggleSection(toggle) {
    const section = toggle.closest('.style-section, .property-section');
    const content = section?.querySelector('.style-section-content, .property-section-content');
    const icon = toggle.querySelector('i');
    
    if (!content) return;

    const isExpanded = toggle.classList.contains('expanded');
    
    if (isExpanded) {
      // Collapse
      toggle.classList.remove('expanded');
      icon.style.transform = 'rotate(-90deg)';
      content.style.display = 'none';
    } else {
      // Expand
      toggle.classList.add('expanded');
      icon.style.transform = 'rotate(0deg)';
      content.style.display = 'block';
    }
  }

  handleStyleChange(input) {
    if (!this.selectedElement) return;

    const property = input.dataset.property;
    const value = input.value;

    if (property && value !== undefined) {
      // Apply style to selected element
      this.selectedElement.style[property] = value;
      
      // Dispatch style change event
      this.dispatchEvent(new CustomEvent('element-style-changed', {
        detail: {
          element: this.selectedElement,
          property,
          value
        },
        bubbles: true
      }));
    }
  }

  handlePropertyChange(input) {
    if (!this.selectedElement) return;

    const attribute = input.dataset.attribute;
    const content = input.dataset.content;
    const value = input.value;

    if (attribute) {
      // Set attribute on selected element
      if (value) {
        this.selectedElement.setAttribute(attribute, value);
      } else {
        this.selectedElement.removeAttribute(attribute);
      }
    } else if (content === 'text') {
      // Set text content
      if (this.selectedElement.contentEditable === 'true' || 
          this.selectedElement.tagName === 'P' || 
          this.selectedElement.tagName.startsWith('H')) {
        this.selectedElement.textContent = value;
      }
    }

    // Dispatch property change event
    this.dispatchEvent(new CustomEvent('element-property-changed', {
      detail: {
        element: this.selectedElement,
        attribute: attribute || content,
        value
      },
      bubbles: true
    }));
  }

  showPanelMenu(event) {
    event.stopPropagation();
    
    // Dispatch panel menu event
    this.dispatchEvent(new CustomEvent('show-sidebar-menu', {
      detail: { 
        x: event.clientX, 
        y: event.clientY,
        tab: this.activeTab
      },
      bubbles: true
    }));
  }

  isValidColor(color) {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
  }

  // Public API methods
  setSelectedElement(element) {
    this.selectedElement = element;
    
    if (element) {
      this.showElementPanels();
      this.populateStyles(element);
      this.populateProperties(element);
    } else {
      this.hideElementPanels();
    }
  }

  showElementPanels() {
    const noSelectionStyles = this.stylesPanel.querySelector('.no-selection');
    const stylesContent = this.stylesPanel.querySelector('.styles-content');
    const noSelectionProperties = this.propertiesPanel.querySelector('.no-selection');
    const propertiesContent = this.propertiesPanel.querySelector('.properties-content');

    if (noSelectionStyles) noSelectionStyles.style.display = 'none';
    if (stylesContent) stylesContent.style.display = 'block';
    if (noSelectionProperties) noSelectionProperties.style.display = 'none';
    if (propertiesContent) propertiesContent.style.display = 'block';
  }

  hideElementPanels() {
    const noSelectionStyles = this.stylesPanel.querySelector('.no-selection');
    const stylesContent = this.stylesPanel.querySelector('.styles-content');
    const noSelectionProperties = this.propertiesPanel.querySelector('.no-selection');
    const propertiesContent = this.propertiesPanel.querySelector('.properties-content');

    if (noSelectionStyles) noSelectionStyles.style.display = 'block';
    if (stylesContent) stylesContent.style.display = 'none';
    if (noSelectionProperties) noSelectionProperties.style.display = 'block';
    if (propertiesContent) propertiesContent.style.display = 'none';
  }

  populateStyles(element) {
    const computedStyles = window.getComputedStyle(element);
    
    // Populate style inputs with current values
    const styleInputs = this.querySelectorAll('.style-input');
    styleInputs.forEach(input => {
      const property = input.dataset.property;
      if (property) {
        const value = element.style[property] || computedStyles[property];
        
        if (input.type === 'color') {
          input.value = this.rgbToHex(value) || '#000000';
        } else if (input.classList.contains('color-text')) {
          input.value = this.rgbToHex(value) || value || '';
        } else {
          input.value = value || '';
        }
      }
    });
  }

  populateProperties(element) {
    // Populate property inputs with current values
    const propertyInputs = this.querySelectorAll('.property-input');
    propertyInputs.forEach(input => {
      const attribute = input.dataset.attribute;
      const content = input.dataset.content;
      
      if (attribute) {
        input.value = element.getAttribute(attribute) || '';
      } else if (content === 'text') {
        input.value = element.textContent || '';
      }
    });
  }

  rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return '';
    
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    return rgb.startsWith('#') ? rgb : '';
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebar.classList.toggle('collapsed', this.isCollapsed);
    // Reflect state on floating toggle position/style
    this.floatingToggle?.classList.toggle('collapsed', this.isCollapsed);
    // Update chevron directions: when collapsed, show chevron-left to indicate expand
    const setChevron = (btn, collapsed) => {
      if (!btn) return;
      const icon = btn.querySelector('i');
      if (!icon) return;
      icon.classList.remove('fa-chevron-left', 'fa-chevron-right');
      icon.classList.add(collapsed ? 'fa-chevron-left' : 'fa-chevron-right');
    };
    setChevron(this.collapseBtn, this.isCollapsed);
    setChevron(this.floatingToggle, this.isCollapsed);

    // Header button visibility
    if (this.headerReopenBtn) {
      this.headerReopenBtn.style.display = this.isCollapsed ? 'inline-flex' : 'none';
    }

    // Dispatch collapse event
    this.dispatchEvent(new CustomEvent('sidebar-toggled', {
      detail: { collapsed: this.isCollapsed },
      bubbles: true
    }));
  }

  setCollapsed(collapsed) {
    this.isCollapsed = collapsed;
    this.sidebar.classList.toggle('collapsed', collapsed);
    this.floatingToggle?.classList.toggle('collapsed', collapsed);
    const updateChev = (btn) => {
      if (!btn) return;
      const icon = btn.querySelector('i');
      if (!icon) return;
      icon.classList.remove('fa-chevron-left', 'fa-chevron-right');
      icon.classList.add(collapsed ? 'fa-chevron-left' : 'fa-chevron-right');
    };
    updateChev(this.collapseBtn);
    updateChev(this.floatingToggle);
    if (this.headerReopenBtn) {
      this.headerReopenBtn.style.display = collapsed ? 'inline-flex' : 'none';
    }
  }

  getActiveTab() {
    return this.activeTab;
  }

  getSelectedElement() {
    return this.selectedElement;
  }

  isCollapsedState() {
    return this.isCollapsed;
  }

  addStyleSection(config) {
    const { title, properties } = config;
    
    const section = document.createElement('div');
    section.className = 'style-section';
    
    section.innerHTML = `
      <div class="style-section-header">
        <h4>${title}</h4>
        <button class="section-toggle expanded">
          <i class="fas fa-chevron-down" aria-hidden="true"></i>
        </button>
      </div>
      <div class="style-section-content">
        ${properties.map(prop => this.createStyleProperty(prop)).join('')}
      </div>
    `;
    
    const stylesContent = this.querySelector('.styles-content');
    if (stylesContent) {
      stylesContent.appendChild(section);
      
      // Bind events for new section
      const toggle = section.querySelector('.section-toggle');
      toggle?.addEventListener('click', () => this.toggleSection(toggle));
      
      const inputs = section.querySelectorAll('.style-input');
      inputs.forEach(input => {
        input.addEventListener('change', () => this.handleStyleChange(input));
      });
    }
    
    return section;
  }

  createStyleProperty(prop) {
    const { label, property, type = 'text', options = [] } = prop;
    
    if (type === 'select') {
      return `
        <div class="style-group">
          <label>${label}</label>
          <select class="style-input" data-property="${property}">
            ${options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
          </select>
        </div>
      `;
    } else if (type === 'color') {
      return `
        <div class="style-group">
          <label>${label}</label>
          <div class="color-input-wrapper">
            <input type="color" class="style-input color-picker" data-property="${property}">
            <input type="text" class="style-input color-text" data-property="${property}" placeholder="#000000">
          </div>
        </div>
      `;
    } else {
      return `
        <div class="style-group">
          <label>${label}</label>
          <input type="${type}" class="style-input" data-property="${property}" placeholder="${prop.placeholder || ''}">
        </div>
      `;
    }
  }

  refreshStyles() {
    if (this.selectedElement) {
      this.populateStyles(this.selectedElement);
    }
  }

  refreshProperties() {
    if (this.selectedElement) {
      this.populateProperties(this.selectedElement);
    }
  }
}

// Register the custom element
customElements.define('right-sidebar', RightSidebar);

export default RightSidebar;
