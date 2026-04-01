// Canvas Manager - Handles multiple canvases for tabbed page interface
import { setupCanvas } from './canvas.js';

class CanvasManager {
  constructor(editor) {
    this.editor = editor;
    this.canvases = new Map(); // pageId -> canvas element
    this.canvasContainer = null;
    this.activePageId = null;
    
    this.init();
  }

  init() {
    // Find the canvas container (device screen)
    this.canvasContainer = document.querySelector('.device-screen');
    if (!this.canvasContainer) {
      console.error('Canvas container (.device-screen) not found');
      return;
    }

    // Clear existing canvas
    this.canvasContainer.innerHTML = '';
  }

  /**
   * Create a new canvas for a page
   * @param {string} pageId - Page ID
   * @param {Object} pageData - Page data
   * @returns {HTMLElement} Canvas element
   */
  createCanvas(pageId, pageData) {
    if (this.canvases.has(pageId)) {
      return this.canvases.get(pageId);
    }

    // Create canvas element
    const canvas = document.createElement('div');
    canvas.className = 'canvas';
    canvas.id = `canvas-${pageId}`;
    canvas.dataset.pageId = pageId;
    canvas.style.display = 'none'; // Hidden by default

    // Add placeholder if canvas is empty
    if (!pageData.elements || pageData.elements.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'canvas-placeholder';
      placeholder.innerHTML = `
        <div class="placeholder-content">
          <i class="fas fa-mouse-pointer" aria-hidden="true"></i>
          <h3>Start Building Your Page</h3>
          <p>Drag components from the left sidebar to begin designing</p>
        </div>
      `;
      canvas.appendChild(placeholder);
    }

    // Store canvas reference
    this.canvases.set(pageId, canvas);

    // Add to container
    this.canvasContainer.appendChild(canvas);

    // Setup canvas functionality (events, zoom, etc.)
    this.setupCanvasForPage(canvas, pageId);

    return canvas;
  }

  /**
   * Setup canvas functionality for a specific page
   * @param {HTMLElement} canvas - Canvas element
   * @param {string} pageId - Page ID
   */
  setupCanvasForPage(canvas, pageId) {
    // Update editor references to point to this canvas
    this.editor.canvas = canvas;
    this.editor.placeholder = canvas.querySelector('.canvas-placeholder');
    this.editor.currentPageId = pageId;

    // Only setup canvas events if not already set up
    if (!canvas.dataset.canvasSetup) {
      setupCanvas(this.editor);
      canvas.dataset.canvasSetup = 'true';
    }

    // Load page elements if they exist
    this.loadPageElements(pageId, canvas);
  }

  /**
   * Load elements for a specific page into its canvas
   * @param {string} pageId - Page ID
   * @param {HTMLElement} canvas - Canvas element
   */
  loadPageElements(pageId, canvas) {
    // Get page data from hierarchy manager
    const pageData = this.getPageData(pageId);
    if (!pageData) return;

    // Clear existing content
    canvas.innerHTML = '';

    // Preferred: structured elements array
    if (Array.isArray(pageData.elements) && pageData.elements.length > 0) {
      pageData.elements.forEach(elementData => {
        const element = this.createElement(elementData);
        if (element) {
          canvas.appendChild(element);
        }
      });
    } else if (pageData.content && typeof pageData.content === 'string') {
      // Fallback: raw HTML content
      canvas.innerHTML = pageData.content;
      // Reattach event listeners for interactive editing
      if (this.editor && typeof this.editor.addElementEventListeners === 'function') {
        canvas.querySelectorAll('.editable-element').forEach(el => this.editor.addElementEventListeners(el));
      }
    } else {
      // If no elements or content, show placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'canvas-placeholder';
      placeholder.innerHTML = `
        <div class="placeholder-content">
          <i class="fas fa-mouse-pointer" aria-hidden="true"></i>
          <h3>Start Building Your Page</h3>
          <p>Drag components from the left sidebar to begin designing</p>
        </div>
      `;
      canvas.appendChild(placeholder);
    }
  }

  /**
   * Create an element from data
   * @param {Object} elementData - Element data
   * @returns {HTMLElement} Created element
   */
  createElement(elementData) {
    const element = document.createElement('div');
    element.className = 'editable-element';
    element.dataset.elementType = elementData.type || 'div';
    element.dataset.elementId = elementData.id || `element-${Date.now()}`;

    // Apply styles
    if (elementData.styles) {
      Object.assign(element.style, elementData.styles);
    }

    // Set content
    if (elementData.content) {
      element.innerHTML = elementData.content;
    }

    // Set attributes
    if (elementData.attributes) {
      Object.entries(elementData.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    return element;
  }

  /**
   * Switch to a specific page canvas
   * @param {string} pageId - Page ID to switch to
   */
  switchToPage(pageId) {
    if (this.activePageId === pageId) return;

    // Hide current canvas
    if (this.activePageId && this.canvases.has(this.activePageId)) {
      const currentCanvas = this.canvases.get(this.activePageId);
      currentCanvas.style.display = 'none';
    }

    // Show new canvas
    if (this.canvases.has(pageId)) {
      const newCanvas = this.canvases.get(pageId);
      newCanvas.style.display = 'block';
      
      // Update editor references
      this.editor.canvas = newCanvas;
      this.editor.placeholder = newCanvas.querySelector('.canvas-placeholder');
      this.editor.currentPageId = pageId;
      
      this.activePageId = pageId;
    } else {
      // Create canvas if it doesn't exist
      const pageData = this.getPageData(pageId);
      if (pageData) {
        const canvas = this.createCanvas(pageId, pageData);
        canvas.style.display = 'block';
        
        this.editor.canvas = canvas;
        this.editor.placeholder = canvas.querySelector('.canvas-placeholder');
        this.editor.currentPageId = pageId;
        
        this.activePageId = pageId;
      }
    }

    // Clear current selection when switching pages
    if (this.editor.clearSelection) {
      this.editor.clearSelection();
    }

    // Update layers list for new page
    if (this.editor.updateLayersList) {
      this.editor.updateLayersList();
    }

    // Trigger page switch event
    this.editor.dispatchEvent?.(new CustomEvent('page-switched', {
      detail: { pageId, canvas: this.canvases.get(pageId) }
    }));
  }

  /**
   * Remove a canvas for a page
   * @param {string} pageId - Page ID
   */
  removeCanvas(pageId) {
    if (!this.canvases.has(pageId)) return;

    const canvas = this.canvases.get(pageId);
    
    // If this was the active canvas, switch to another one
    if (this.activePageId === pageId) {
      const remainingPages = Array.from(this.canvases.keys()).filter(id => id !== pageId);
      if (remainingPages.length > 0) {
        this.switchToPage(remainingPages[0]);
      } else {
        this.activePageId = null;
        this.editor.canvas = null;
        this.editor.placeholder = null;
        this.editor.currentPageId = null;
      }
    }

    // Remove from DOM and map
    canvas.remove();
    this.canvases.delete(pageId);
  }

  /**
   * Save current page state
   * @param {string} pageId - Page ID (optional, defaults to active page)
   */
  savePageState(pageId = null) {
    const targetPageId = pageId || this.activePageId;
    if (!targetPageId || !this.canvases.has(targetPageId)) return;

    const canvas = this.canvases.get(targetPageId);
    const elements = Array.from(canvas.querySelectorAll('.editable-element'));
    
    const pageData = {
      id: targetPageId,
      elements: elements.map(el => ({
        id: el.dataset.elementId,
        type: el.dataset.elementType,
        content: el.innerHTML,
        styles: this.getElementStyles(el),
        attributes: this.getElementAttributes(el)
      }))
    };

    // Update page data in hierarchy manager
    this.updatePageData(targetPageId, pageData);
  }

  /**
   * Get element styles as object
   * @param {HTMLElement} element - Element
   * @returns {Object} Styles object
   */
  getElementStyles(element) {
    const styles = {};
    const computedStyle = window.getComputedStyle(element);
    
    // Get relevant style properties
    const relevantProps = [
      'position', 'top', 'left', 'width', 'height',
      'background', 'backgroundColor', 'color', 'fontSize',
      'fontFamily', 'fontWeight', 'textAlign', 'padding',
      'margin', 'border', 'borderRadius', 'zIndex'
    ];

    relevantProps.forEach(prop => {
      const value = element.style[prop] || computedStyle[prop];
      if (value && value !== 'auto' && value !== 'initial') {
        styles[prop] = value;
      }
    });

    return styles;
  }

  /**
   * Get element attributes as object
   * @param {HTMLElement} element - Element
   * @returns {Object} Attributes object
   */
  getElementAttributes(element) {
    const attributes = {};
    Array.from(element.attributes).forEach(attr => {
      if (!attr.name.startsWith('data-') && attr.name !== 'class' && attr.name !== 'style') {
        attributes[attr.name] = attr.value;
      }
    });
    return attributes;
  }

  /**
   * Get page data from hierarchy manager
   * @param {string} pageId - Page ID
   * @returns {Object|null} Page data
   */
  getPageData(pageId) {
    // Interface with the hierarchy manager
    if (this.editor.currentProject?.pages) {
      return this.editor.currentProject.pages.get(pageId);
    }
    
    // Fallback to global hierarchy manager
    if (window.getCurrentProject) {
      const project = window.getCurrentProject();
      return project?.pages.get(pageId);
    }
    
    return null;
  }

  /**
   * Update page data in hierarchy manager
   * @param {string} pageId - Page ID
   * @param {Object} pageData - Page data
   */
  updatePageData(pageId, pageData) {
    // Update in editor's current project
    if (this.editor.currentProject?.pages) {
      const existingPage = this.editor.currentProject.pages.get(pageId);
      if (existingPage) {
        Object.assign(existingPage, pageData);
        existingPage.dirty = true;
        existingPage.updatedAt = new Date().toISOString();
        
        // Mark page as dirty in the tab
        this.editor.markPageDirty?.(pageId);
      }
    }
    
    // Also update in global hierarchy manager if available
    if (window.getCurrentProject) {
      const project = window.getCurrentProject();
      const existingPage = project?.pages.get(pageId);
      if (existingPage) {
        Object.assign(existingPage, pageData);
        existingPage.dirty = true;
        existingPage.updatedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Get all canvas elements
   * @returns {Map} Map of pageId -> canvas element
   */
  getAllCanvases() {
    return new Map(this.canvases);
  }

  /**
   * Get active canvas
   * @returns {HTMLElement|null} Active canvas element
   */
  getActiveCanvas() {
    return this.activePageId ? this.canvases.get(this.activePageId) : null;
  }

  /**
   * Check if a canvas exists for a page
   * @param {string} pageId - Page ID
   * @returns {boolean} True if canvas exists
   */
  hasCanvas(pageId) {
    return this.canvases.has(pageId);
  }

  /**
   * Clear all canvases
   */
  clearAllCanvases() {
    this.canvases.forEach(canvas => canvas.remove());
    this.canvases.clear();
    this.activePageId = null;
    this.editor.canvas = null;
    this.editor.placeholder = null;
    this.editor.currentPageId = null;
  }
}

export { CanvasManager };
