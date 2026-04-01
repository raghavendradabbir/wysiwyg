class PageTabs extends HTMLElement {
  constructor() {
    super();
    this.pages = new Map(); // Map of pageId -> page data
    this.activePageId = null;
    this.onTabChange = null; // Callback for tab changes
    this.onTabClose = null; // Callback for tab closes
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="page-tabs-container">
        <div class="page-tabs-bar" id="pageTabsBar">
          <!-- Tabs will be dynamically added here -->
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const tabsBar = this.querySelector('#pageTabsBar');
    const addPageBtn = this.querySelector('#addPageBtn');

    // Event delegation for tab clicks and close buttons
    if (tabsBar) {
      tabsBar.addEventListener('click', (e) => {
        const tab = e.target.closest('.page-tab');
        const closeBtn = e.target.closest('.tab-close-btn');
        
        if (closeBtn && tab) {
          // Close tab
          e.stopPropagation();
          const pageId = tab.dataset.pageId;
          this.closeTab(pageId);
        } else if (tab) {
          // Switch tab
          const pageId = tab.dataset.pageId;
          this.setActiveTab(pageId);
        }
      });

      // Middle-click to close tab
      tabsBar.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle mouse button
          const tab = e.target.closest('.page-tab');
          if (tab) {
            e.preventDefault();
            const pageId = tab.dataset.pageId;
            this.closeTab(pageId);
          }
        }
      });
    }

    // Add new page button (optional)
    if (addPageBtn) {
      addPageBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('add-page-requested', {
          bubbles: true
        }));
      });
    }
  }

  /**
   * Add a new tab for a page
   * @param {Object} pageData - Page data object with id, name, etc.
   */
  addTab(pageData) {
    if (!pageData || !pageData.id) return;

    this.pages.set(pageData.id, pageData);
    this.renderTabs();

    // Auto-select the new tab if it's the first one or no tab is active
    if (this.pages.size === 1 || !this.activePageId) {
      this.setActiveTab(pageData.id);
    }
  }

  /**
   * Remove a tab
   * @param {string} pageId - Page ID to remove
   */
  removeTab(pageId) {
    if (!this.pages.has(pageId)) return;

    const wasActive = this.activePageId === pageId;
    this.pages.delete(pageId);

    // If we removed the active tab, switch to another tab
    if (wasActive && this.pages.size > 0) {
      const remainingPages = Array.from(this.pages.keys());
      this.setActiveTab(remainingPages[0]);
    } else if (this.pages.size === 0) {
      this.activePageId = null;
    }

    this.renderTabs();
  }

  /**
   * Set the active tab
   * @param {string} pageId - Page ID to activate
   */
  setActiveTab(pageId) {
    if (!this.pages.has(pageId) || this.activePageId === pageId) return;

    const previousActiveId = this.activePageId;
    this.activePageId = pageId;
    
    // Optimized update: only update the active state of affected tabs
    this.updateActiveStates(previousActiveId, pageId);

    // Notify listeners about tab change
    if (this.onTabChange) {
      this.onTabChange(pageId, this.pages.get(pageId));
    }

    this.dispatchEvent(new CustomEvent('tab-changed', {
      detail: { pageId, pageData: this.pages.get(pageId) },
      bubbles: true
    }));
  }

  /**
   * Update active states for specific tabs (optimized for performance)
   * @param {string|null} previousActiveId - Previously active tab ID
   * @param {string} newActiveId - New active tab ID
   */
  updateActiveStates(previousActiveId, newActiveId) {
    const tabsBar = this.querySelector('#pageTabsBar');
    if (!tabsBar) return;

    // Remove active class from previous tab
    if (previousActiveId) {
      const previousTab = tabsBar.querySelector(`[data-page-id="${previousActiveId}"]`);
      if (previousTab) {
        previousTab.classList.remove('active');
      }
    }

    // Add active class to new tab
    const newTab = tabsBar.querySelector(`[data-page-id="${newActiveId}"]`);
    if (newTab) {
      newTab.classList.add('active');
    }
  }

  /**
   * Close a tab
   * @param {string} pageId - Page ID to close
   */
  closeTab(pageId) {
    if (!this.pages.has(pageId)) return;

    const pageData = this.pages.get(pageId);

    // Notify listeners about tab close
    if (this.onTabClose) {
      const shouldClose = this.onTabClose(pageId, pageData);
      if (shouldClose === false) return; // Allow cancellation
    }

    this.dispatchEvent(new CustomEvent('tab-close-requested', {
      detail: { pageId, pageData },
      bubbles: true
    }));

    this.removeTab(pageId);
  }

  /**
   * Update tab data (e.g., when page name changes)
   * @param {string} pageId - Page ID to update
   * @param {Object} updates - Updates to apply
   */
  updateTab(pageId, updates) {
    if (!this.pages.has(pageId)) return;

    const pageData = this.pages.get(pageId);
    Object.assign(pageData, updates);
    this.renderTabs();
  }

  /**
   * Get the currently active page ID
   * @returns {string|null} Active page ID
   */
  getActivePageId() {
    return this.activePageId;
  }

  /**
   * Get all page IDs
   * @returns {string[]} Array of page IDs
   */
  getAllPageIds() {
    return Array.from(this.pages.keys());
  }

  /**
   * Check if a page tab exists
   * @param {string} pageId - Page ID to check
   * @returns {boolean} True if tab exists
   */
  hasTab(pageId) {
    return this.pages.has(pageId);
  }

  /**
   * Render all tabs (optimized to prevent flickering)
   */
  renderTabs() {
    const tabsBar = this.querySelector('#pageTabsBar');
    if (!tabsBar) return;

    // Get existing tabs
    const existingTabs = Array.from(tabsBar.querySelectorAll('.page-tab'));
    const existingPageIds = new Set(existingTabs.map(tab => tab.dataset.pageId));
    const currentPageIds = new Set(this.pages.keys());

    // Remove tabs that no longer exist
    existingTabs.forEach(tab => {
      const pageId = tab.dataset.pageId;
      if (!currentPageIds.has(pageId)) {
        tab.remove();
      }
    });

    // Add or update tabs
    for (const [pageId, pageData] of this.pages) {
      let tab = tabsBar.querySelector(`[data-page-id="${pageId}"]`);
      
      if (!tab) {
        // Create new tab
        tab = this.createTabElement(pageId, pageData);
        tabsBar.appendChild(tab);
      } else {
        // Update existing tab
        this.updateTabElement(tab, pageId, pageData);
      }
    }
  }

  /**
   * Update an existing tab element
   * @param {HTMLElement} tab - Tab element to update
   * @param {string} pageId - Page ID
   * @param {Object} pageData - Page data
   */
  updateTabElement(tab, pageId, pageData) {
    // Update active state
    tab.className = `page-tab ${this.activePageId === pageId ? 'active' : ''}`;
    tab.title = pageData.name || pageId;

    // Update tab content
    const tabName = tab.querySelector('.tab-name');
    if (tabName) {
      tabName.textContent = pageData.name || pageId;
    }

    // Update dirty indicator
    const isDirty = pageData.dirty || false;
    let dirtyIndicator = tab.querySelector('.tab-dirty-indicator');
    
    if (isDirty && !dirtyIndicator) {
      // Add dirty indicator
      dirtyIndicator = document.createElement('span');
      dirtyIndicator.className = 'tab-dirty-indicator';
      dirtyIndicator.textContent = '*';
      tab.querySelector('.tab-content').appendChild(dirtyIndicator);
    } else if (!isDirty && dirtyIndicator) {
      // Remove dirty indicator
      dirtyIndicator.remove();
    }

    // Update close button title
    const closeBtn = tab.querySelector('.tab-close-btn');
    if (closeBtn) {
      closeBtn.title = `Close ${this.escapeHtml(pageData.name || pageId)}`;
    }
  }

  /**
   * Create a single tab element
   * @param {string} pageId - Page ID
   * @param {Object} pageData - Page data
   * @returns {HTMLElement} Tab element
   */
  createTabElement(pageId, pageData) {
    const tab = document.createElement('div');
    tab.className = `page-tab ${this.activePageId === pageId ? 'active' : ''}`;
    tab.dataset.pageId = pageId;
    tab.title = pageData.name || pageId;

    // Check if page is dirty (has unsaved changes)
    const isDirty = pageData.dirty || false;
    const dirtyIndicator = isDirty ? '<span class="tab-dirty-indicator">*</span>' : '';

    tab.innerHTML = `
      <div class="tab-content">
        <i class="fas fa-file tab-icon" aria-hidden="true"></i>
        <span class="tab-name">${this.escapeHtml(pageData.name || pageId)}</span>
        ${dirtyIndicator}
      </div>
      <button class="tab-close-btn" title="Close ${this.escapeHtml(pageData.name || pageId)}">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    `;

    return tab;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all tabs
   */
  clearTabs() {
    this.pages.clear();
    this.activePageId = null;
    this.renderTabs();
  }

  /**
   * Set callback for tab changes
   * @param {Function} callback - Callback function
   */
  setTabChangeCallback(callback) {
    this.onTabChange = callback;
  }

  /**
   * Set callback for tab closes
   * @param {Function} callback - Callback function
   */
  setTabCloseCallback(callback) {
    this.onTabClose = callback;
  }
}

// Register the custom element
customElements.define('page-tabs', PageTabs);

export { PageTabs };
