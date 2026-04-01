/**
 * ContextMenu Web Component
 * Handles right-click context menu functionality
 */
class ContextMenu extends HTMLElement {
  constructor() {
    super();
    this.isVisible = false;
    this.targetElement = null;
  }

  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/context-menu/context-menu.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading context-menu component:', error);
      this.innerHTML = '<div class="component-error">Error loading context menu</div>';
    }
  }

  init() {
    // Get references to key elements
    this.menu = this.querySelector('#contextMenu');
    this.menuItems = this.querySelectorAll('.context-menu-item');
    
    // Bind event listeners
    this.bindEvents();
    
    // Initially hide the menu
    this.hide();
  }

  bindEvents() {
    // Menu item clicks
    this.menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        if (action) {
          this.handleAction(action);
        }
        this.hide();
      });

      // Keyboard navigation
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          const action = item.dataset.action;
          if (action) {
            this.handleAction(action);
          }
          this.hide();
        } else if (e.key === 'Escape') {
          this.hide();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateItems(e.key === 'ArrowDown' ? 1 : -1);
        }
      });
    });

    // Hide menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.contains(e.target)) {
        this.hide();
      }
    });

    // Hide menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Prevent context menu on the context menu itself
    this.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  show(x, y, targetElement = null) {
    this.targetElement = targetElement;
    this.isVisible = true;
    
    // Position the menu
    this.style.position = 'fixed';
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
    this.style.display = 'block';
    this.style.zIndex = '10000';
    
    // Adjust position if menu would go off-screen
    this.adjustPosition();
    
    // Update menu items based on target element
    this.updateMenuItems();
    
    // Focus first menu item for keyboard navigation
    const firstItem = this.querySelector('.context-menu-item:not([disabled])');
    if (firstItem) {
      firstItem.focus();
    }
    
    // Add show class for animation
    requestAnimationFrame(() => {
      this.menu.classList.add('show');
    });
  }

  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.menu.classList.remove('show');
    
    // Hide after animation
    setTimeout(() => {
      this.style.display = 'none';
      this.targetElement = null;
    }, 200);
  }

  adjustPosition() {
    const rect = this.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = parseInt(this.style.left);
    let y = parseInt(this.style.top);
    
    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    
    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }
    
    // Ensure minimum distance from edges
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }

  updateMenuItems() {
    // Enable/disable menu items based on context
    const hasTarget = this.targetElement !== null;
    
    this.menuItems.forEach(item => {
      const action = item.dataset.action;
      let enabled = hasTarget;
      
      // Specific logic for different actions
      switch (action) {
        case 'duplicate':
        case 'delete':
        case 'resetSize':
        case 'centerAlign':
          enabled = hasTarget;
          break;
        case 'moveToFront':
        case 'moveToBack':
          enabled = hasTarget && this.canMoveElement();
          break;
        default:
          enabled = hasTarget;
      }
      
      item.classList.toggle('disabled', !enabled);
      item.setAttribute('tabindex', enabled ? '0' : '-1');
    });
  }

  canMoveElement() {
    // Check if element can be moved in z-order
    if (!this.targetElement) return false;
    
    const parent = this.targetElement.parentElement;
    if (!parent) return false;
    
    const siblings = Array.from(parent.children).filter(child => 
      child.hasAttribute('data-element-id')
    );
    
    return siblings.length > 1;
  }

  navigateItems(direction) {
    const enabledItems = Array.from(this.menuItems).filter(item => 
      !item.classList.contains('disabled')
    );
    
    const currentIndex = enabledItems.findIndex(item => 
      document.activeElement === item
    );
    
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) {
      newIndex = enabledItems.length - 1;
    } else if (newIndex >= enabledItems.length) {
      newIndex = 0;
    }
    
    if (enabledItems[newIndex]) {
      enabledItems[newIndex].focus();
    }
  }

  handleAction(action) {
    if (!this.targetElement && action !== 'paste') return;
    
    // Dispatch action event
    this.dispatchEvent(new CustomEvent('context-action', {
      detail: {
        action,
        targetElement: this.targetElement
      },
      bubbles: true
    }));
  }

  // Public API methods
  addMenuItem(config) {
    const { action, icon, label, separator = false, position = 'bottom' } = config;
    
    if (separator) {
      const separatorEl = document.createElement('div');
      separatorEl.className = 'context-menu-separator';
      this.menu.appendChild(separatorEl);
      return separatorEl;
    }
    
    const item = document.createElement('div');
    item.className = 'context-menu-item';
    item.dataset.action = action;
    item.setAttribute('tabindex', '0');
    
    if (icon) {
      const iconEl = document.createElement('i');
      iconEl.className = `fas ${icon}`;
      iconEl.setAttribute('aria-hidden', 'true');
      item.appendChild(iconEl);
      item.appendChild(document.createTextNode(` ${label}`));
    } else {
      item.textContent = label;
    }
    
    // Add event listeners
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAction(action);
      this.hide();
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleAction(action);
        this.hide();
      }
    });
    
    // Insert at appropriate position
    if (position === 'top') {
      this.menu.insertBefore(item, this.menu.firstChild);
    } else {
      this.menu.appendChild(item);
    }
    
    // Update internal reference
    this.menuItems = this.querySelectorAll('.context-menu-item');
    
    return item;
  }

  removeMenuItem(action) {
    const item = this.querySelector(`[data-action="${action}"]`);
    if (item) {
      item.remove();
      this.menuItems = this.querySelectorAll('.context-menu-item');
    }
  }

  setItemEnabled(action, enabled = true) {
    const item = this.querySelector(`[data-action="${action}"]`);
    if (item) {
      item.classList.toggle('disabled', !enabled);
      item.setAttribute('tabindex', enabled ? '0' : '-1');
    }
  }

  setItemVisible(action, visible = true) {
    const item = this.querySelector(`[data-action="${action}"]`);
    if (item) {
      item.style.display = visible ? 'flex' : 'none';
    }
  }

  isMenuVisible() {
    return this.isVisible;
  }

  getTargetElement() {
    return this.targetElement;
  }
}

// Register the custom element
customElements.define('context-menu', ContextMenu);

export default ContextMenu;
