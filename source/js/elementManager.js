import { updatePlaceholder as updatePlaceholderModule, saveState as saveStateModule } from './state.js';
import { updateLayersList as updateLayersListModule, renderLayersList as renderLayersListModule } from './layerManager.js';

/**
 * ElementManager - Handles element creation, selection, and basic manipulation
 */
export class ElementManager {
  constructor(editor) {
    this.editor = editor;
    this.elementCounter = 0;
  }

  /**
   * Create a new element of the specified type
   */
  createElement(type, position) {
    this.elementCounter++;
    const element = document.createElement('div');
    element.className = 'editable-element';
    element.id = `element-${this.elementCounter}`;
    element.setAttribute('data-type', type);

    const { content, contentEditable } = this.createSpecificComponent(type);
    element.innerHTML = content;
    element.contentEditable = contentEditable;

    // Set initial dimensions
    this.setElementDimensions(element, type);

    // Position element
    this.positionElement(element, position);

    this.addElementEventListeners(element);
    this.editor.canvas.appendChild(element);

    updatePlaceholderModule(this.editor);
    this.selectElement(element);
    updateLayersListModule(this.editor);
    saveStateModule(this.editor);

    return element;
  }

  /**
   * Set initial dimensions for different element types
   */
  setElementDimensions(element, type) {
    const dimensions = {
      'button': { width: '120px', height: '40px' },
      'image': { width: '200px', height: '150px' },
      'heading': { width: '200px', height: '50px' },
      'paragraph': { width: '250px', height: '80px' },
      'container': { width: '400px', height: '200px' },
      'row': { width: '100%', height: '80px' },
      'column': { width: '200px', height: '120px' },
      'input': { width: '250px', height: '40px' },
      'textarea': { width: '250px', height: '100px' },
      'select': { width: '250px', height: '40px' },
      'video': { width: '300px', height: '200px' }
    };

    if (type.includes('columns')) {
      element.style.width = '100%';
      element.style.height = '150px';
    } else if (type.startsWith('ch5-')) {
      this.setCH5ComponentDimensions(element, type);
    } else if (dimensions[type]) {
      element.style.width = dimensions[type].width;
      element.style.height = dimensions[type].height;
    }
  }

  /**
   * Position element based on layout mode
   */
  positionElement(element, position) {
    if (this.editor.currentLayoutMode === 'freeform') {
      element.style.position = 'absolute';
      element.style.left = (position.x || 50) + 'px';
      element.style.top = (position.y || 50) + 'px';
      this.editor.addAdorners(element);
    } else {
      element.style.position = 'relative';
      element.style.display = 'block';
      element.style.margin = '10px 0';
    }
  }

  /**
   * Create specific component content based on type
   */
  createSpecificComponent(type) {
    const componentId = `${type}-${this.elementCounter}-${Date.now()}`;
    let content = '';
    let contentEditable = true;

    // Handle CH5 components
    if (type.startsWith('ch5-') && this.editor.schemaReader?.loaded) {
      return this.createCH5Component(type, componentId);
    }

    // Handle standard components
    switch (type) {
      case 'heading':
        content = '<h2 class="element-heading h2">Your Heading Here</h2>';
        break;
      case 'paragraph':
        content = '<p class="element-paragraph">Click to edit this paragraph. You can add your own text here and format it however you like.</p>';
        break;
      case 'image':
        content = '<img src="https://via.placeholder.com/300x200/667eea/ffffff?text=Click+to+Change" alt="Placeholder" class="element-image" onclick="this.src = prompt(\'Enter image URL:\') || this.src">';
        contentEditable = false;
        break;
      case 'button':
        content = '<button class="element-button">Click Me</button>';
        contentEditable = false;
        break;
      case 'list':
        content = '<ul class="element-list"><li>First item</li><li>Second item</li><li>Third item</li></ul>';
        break;
      case 'divider':
        content = '<hr class="element-divider">';
        contentEditable = false;
        break;
      case 'container':
        content = '<div class="container" style="padding: 20px; border: 2px dashed #ccc; min-height: 100px; background: rgba(102, 126, 234, 0.05);">Container - Drop elements here</div>';
        contentEditable = false;
        break;
      case 'row':
        content = '<div class="row" style="display: flex; min-height: 60px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.03);">Row - Add columns here</div>';
        contentEditable = false;
        break;
      case 'column':
        content = '<div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; min-height: 80px; background: rgba(102, 126, 234, 0.02);">Column</div>';
        contentEditable = false;
        break;
      case 'input':
        content = '<input type="text" placeholder="Enter text..." class="element-input" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">';
        contentEditable = false;
        break;
      case 'textarea':
        content = '<textarea placeholder="Enter text..." class="element-textarea" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px; resize: vertical;"></textarea>';
        contentEditable = false;
        break;
      case 'select':
        content = '<select class="element-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"><option>Option 1</option><option>Option 2</option><option>Option 3</option></select>';
        contentEditable = false;
        break;
      case 'video':
        content = '<video controls class="element-video" style="width: 100%; height: 200px; background: #f0f0f0;"><source src="" type="video/mp4">Your browser does not support the video tag.</video>';
        contentEditable = false;
        break;
      case 'spacer':
        content = '<div style="height: 50px; background: repeating-linear-gradient(45deg, #f8f9fa, #f8f9fa 10px, #e9ecef 10px, #e9ecef 20px);"></div>';
        contentEditable = false;
        break;
      default:
        // Handle multi-column layouts
        if (type.includes('columns')) {
          content = this.createColumnLayout(type);
          contentEditable = false;
        } else {
          content = '<p class="element-paragraph">New Element</p>';
        }
    }

    return { content, contentEditable };
  }

  /**
   * Create CH5 component content
   */
  createCH5Component(type, componentId) {
    const snippets = this.editor.schemaReader.getComponentSnippets(type) || [];
    let chosen = snippets.find(s => typeof s.prefix === 'string' && s.prefix.startsWith(`${type}:blank`))
      || snippets.find(s => typeof s.prefix === 'string' && s.prefix.startsWith(`${type}:default`))
      || null;

    let content = '';
    if (chosen && Array.isArray(chosen.body)) {
      // Join snippet body and strip VS Code placeholders
      let html = chosen.body.join('\n')
        .replace(/\$\{\d+:[^}]*\}/g, '')
        .replace(/\$\d+/g, '');

      // Ensure opening tag exists and inject id if missing
      const openTagRegex = new RegExp(`<${type}\\b`);
      if (!openTagRegex.test(html)) {
        html = `<${type}></${type}>`;
      }
      if (!/\sid=/.test(html)) {
        html = html.replace(`<${type}`, `<${type} id="${componentId}"`);
      }
      content = html;
    } else {
      content = `<${type} id="${componentId}"></${type}>`;
    }

    return { content, contentEditable: false };
  }

  /**
   * Create column layout content
   */
  createColumnLayout(type) {
    const layouts = {
      '2-columns': '<div class="row" style="display: flex; gap: 10px; min-height: 120px;"><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Column 1</div><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Column 2</div></div>',
      '3-columns': '<div class="row" style="display: flex; gap: 10px; min-height: 120px;"><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Column 1</div><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Column 2</div><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Column 3</div></div>',
      '4-columns': '<div class="row" style="display: flex; gap: 10px; min-height: 120px;"><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Col 1</div><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Col 2</div><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Col 3</div><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Col 4</div></div>',
      '2-columns-sidebar': '<div class="row" style="display: flex; gap: 10px; min-height: 120px;"><div class="col" style="flex: 0 0 25%; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Sidebar (25%)</div><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Content (75%)</div></div>',
      '2-columns-content': '<div class="row" style="display: flex; gap: 10px; min-height: 120px;"><div class="col" style="flex: 1; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Content (75%)</div><div class="col" style="flex: 0 0 25%; padding: 15px; border: 1px dashed #ddd; background: rgba(102, 126, 234, 0.02);">Sidebar (25%)</div></div>'
    };

    return layouts[type] || '<div class="row">Layout</div>';
  }

  /**
   * Set dimensions for CH5 components
   */
  setCH5ComponentDimensions(element, type) {
    const checkAndSetDimensions = () => {
      const ch5Element = element.querySelector(type);
      if (ch5Element) {
        const observer = new ResizeObserver((entries) => {
          for (let entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              element.style.width = width + 'px';
              element.style.height = height + 'px';
              observer.disconnect();
              break;
            }
          }
        });

        observer.observe(ch5Element);

        // Fallback timeout
        setTimeout(() => {
          observer.disconnect();
          if (!element.style.width || element.style.width === '0px') {
            this.setDefaultCH5Dimensions(element, type);
          }
        }, 1000);
      } else {
        setTimeout(() => {
          const retryElement = element.querySelector(type);
          if (retryElement) {
            checkAndSetDimensions();
          } else {
            this.setDefaultCH5Dimensions(element, type);
          }
        }, 100);
      }
    };

    checkAndSetDimensions();
  }

  /**
   * Set default dimensions for CH5 components
   */
  setDefaultCH5Dimensions(element, type) {
    const defaultDimensions = {
      'ch5-background': { width: '300px', height: '200px' },
      'ch5-button': { width: '120px', height: '40px' },
      'ch5-color-picker': { width: '100px', height: '40px' },
      'ch5-datetime': { width: '200px', height: '40px' },
      'ch5-dpad': { width: '120px', height: '120px' },
      'ch5-form': { width: '250px', height: '200px' },
      'ch5-image': { width: '200px', height: '150px' },
      'ch5-import-htmlsnippet': { width: '200px', height: '100px' },
      'ch5-label': { width: '120px', height: '30px' },
      'ch5-keypad': { width: '200px', height: '250px' },
      'ch5-list': { width: '200px', height: '150px' },
      'ch5-button-list': { width: '220px', height: '100px' },
      'ch5-modal-dialog': { width: '300px', height: '200px' },
      'ch5-overlay-panel': { width: '250px', height: '180px' },
      'ch5-select': { width: '150px', height: '35px' },
      'ch5-color-chip': { width: '40px', height: '40px' },
      'ch5-signal-level-gauge': { width: '150px', height: '100px' },
      'ch5-wifi-signal-gauge': { width: '150px', height: '60px' },
      'ch5-slider': { width: '200px', height: '40px' },
      'ch5-spinner': { width: '50px', height: '50px' },
      'ch5-subpage-reference-list': { width: '200px', height: '150px' },
      'ch5-template': { width: '200px', height: '100px' },
      'ch5-animation': { width: '240px', height: '80px' },
      'ch5-textinput': { width: '200px', height: '35px' },
      'ch5-toggle': { width: '60px', height: '30px' },
      'ch5-triggerview': { width: '200px', height: '100px' },
      'ch5-video': { width: '300px', height: '200px' }
    };

    const dimensions = defaultDimensions[type] || { width: '150px', height: '50px' };
    element.style.width = dimensions.width;
    element.style.height = dimensions.height;
  }

  /**
   * Add event listeners to an element
   */
  addElementEventListeners(element) {
    element.addEventListener('click', (e) => {
      if (!e.target.classList.contains('resize-handle') && !e.target.classList.contains('action-btn')) {
        e.stopPropagation();
        if ((e.ctrlKey || e.metaKey || e.shiftKey) && !element.hasAttribute('data-locked')) {
          this.editor.toggleElementSelection(element);
        } else {
          this.editor.clearSelection();
          this.selectElement(element);
        }
      }
    });

    element.addEventListener('input', () => {
      updateLayersListModule(this.editor);
      saveStateModule(this.editor);
    });

    element.addEventListener('blur', () => {
      updateLayersListModule(this.editor);
      saveStateModule(this.editor);
    });

    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.editor.showContextMenu(e, element);
    });

    element.addEventListener('dblclick', (e) => {
      if (element.contentEditable === 'true') {
        element.focus();
        if (window.getSelection && document.createRange) {
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    });
  }

  /**
   * Select an element
   */
  selectElement(element) {
    // Clear multi-selection state when switching to single selection
    this.editor.selectedElements.forEach(el => {
      el.classList.remove('multi-selected');
      this.editor.removeAdorners(el);
    });
    this.editor.selectedElements.clear();

    // Remove selection from all elements
    const allCanvases = this.editor.canvasManager ? 
      this.editor.canvasManager.getAllCanvases() : 
      new Map([[null, this.editor.canvas]]);
    
    allCanvases.forEach(canvas => {
      if (canvas) {
        canvas.querySelectorAll('.editable-element').forEach(el => {
          el.classList.remove('selected');
          this.editor.removeAdorners(el);
        });
      }
    });

    // Select the new element
    element.classList.add('selected');
    this.editor.selectedElement = element;
    this.editor.selectedLayerId = element.id;

    // Update adorners for the selected element
    if (this.editor.currentLayoutMode === 'freeform') {
      this.editor.addAdorners(element);
    }

    // Update properties panel
    this.editor.updatePropertiesPanel(element);
    renderLayersListModule(this.editor);
  }

  /**
   * Apply asset data to an element
   */
  applyAssetData(element, assetData) {
    if (!element || !assetData) return;
    
    switch (assetData.type) {
      case 'image':
        const img = element.querySelector('img') || element;
        if (img && assetData.src) {
          img.src = assetData.src;
          img.alt = assetData.name || 'Image';
        }
        break;
        
      case 'icon':
        const icon = element.querySelector('i') || element;
        if (icon && assetData.icon) {
          icon.className = assetData.icon;
        }
        break;
        
      case 'video':
        const video = element.querySelector('video') || element;
        if (video && assetData.src) {
          video.src = assetData.src;
        }
        break;
    }
  }

  /**
   * Get element bounds for CH5 components
   */
  getElementBounds(element) {
    const type = element.getAttribute('data-type');
    if (type && type.startsWith('ch5-')) {
      const ch5Element = element.querySelector(type);
      if (ch5Element) {
        const rect = ch5Element.getBoundingClientRect();
        return {
          width: Math.max(rect.width, parseInt(element.style.width) || 150),
          height: Math.max(rect.height, parseInt(element.style.height) || 50)
        };
      }
    }

    return {
      width: parseInt(element.style.width) || element.offsetWidth || 150,
      height: parseInt(element.style.height) || element.offsetHeight || 50
    };
  }

  /**
   * Get element label for display
   */
  getElementLabel(element) {
    const type = element.getAttribute('data-type');
    if (type && type.startsWith('ch5-')) {
      return type.replace('ch5-', 'CH5 ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    const labels = {
      'heading': 'Heading',
      'paragraph': 'Text',
      'image': 'Image',
      'button': 'Button',
      'list': 'List',
      'divider': 'Divider',
      'container': 'Container',
      'spacer': 'Spacer'
    };

    return labels[type] || 'Element';
  }

  /**
   * Update element for layout mode changes
   */
  updateElementForLayoutMode(element, layoutMode) {
    if (layoutMode === 'freeform') {
      element.style.position = 'absolute';
      this.editor.addAdorners(element);
    } else {
      element.style.position = 'relative';
      element.style.left = 'auto';
      element.style.top = 'auto';
      this.editor.removeAdorners(element);
    }
  }

  /**
   * Handle element actions (duplicate, delete, etc.)
   */
  handleElementAction(element, action) {
    switch (action) {
      case 'duplicate':
        const actualElement = element.children[0];
        const tagName = actualElement.tagName.toLowerCase();
        const currentLeft = parseInt(element.style.left) || 0;
        const currentTop = parseInt(element.style.top) || 0;
        const currentHeight = parseInt(element.style.height) || 0;
        this.createElement(tagName, { 
          x: currentLeft, 
          y: currentTop + currentHeight + 20 
        });
        break;
        
      case 'delete':
        const toDelete = new Set();
        if (this.editor.selectedElements && this.editor.selectedElements.size > 0) {
          this.editor.selectedElements.forEach(el => toDelete.add(el));
        }
        if (element) toDelete.add(element);

        // Remove each element safely
        toDelete.forEach(el => {
          this.editor.removeAdorners(el);
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });

        // Clear selection state
        this.editor.selectedElements.forEach(el => el.classList.remove('multi-selected'));
        this.editor.selectedElements.clear();
        this.editor.selectedElement = null;
        this.editor.selectedLayerId = null;

        // Update UI/state
        updatePlaceholderModule(this.editor);
        updateLayersListModule(this.editor);
        saveStateModule(this.editor);
        break;
    }
  }

  /**
   * Reset element to default size
   */
  resetElementSize(element) {
    const type = element.getAttribute('data-type');
    if (type.startsWith('ch5-')) {
      const defaults = {
        'ch5-button': { width: '120px', height: '40px' },
        'ch5-textinput': { width: '200px', height: '35px' },
        'ch5-slider': { width: '200px', height: '40px' }
      };
      const dimensions = defaults[type] || { width: '150px', height: '50px' };
      element.style.width = dimensions.width;
      element.style.height = dimensions.height;
    }
    this.editor.updateAdorners(element);
    saveStateModule(this.editor);
  }

  /**
   * Center align element
   */
  centerAlignElement(element) {
    if (this.editor.currentLayoutMode === 'freeform') {
      const canvasRect = this.editor.canvas.getBoundingClientRect();
      const elementWidth = parseInt(element.style.width) || element.offsetWidth;
      const elementHeight = parseInt(element.style.height) || element.offsetHeight;

      element.style.left = ((canvasRect.width - elementWidth) / 2) + 'px';
      element.style.top = ((canvasRect.height - elementHeight) / 2) + 'px';

      this.editor.updateAdorners(element);
      saveStateModule(this.editor);
    }
  }
}
