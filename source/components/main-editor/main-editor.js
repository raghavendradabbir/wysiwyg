/**
 * MainEditor Web Component
 * Handles the main canvas area and device frame
 */
class MainEditor extends HTMLElement {
  constructor() {
    super();
    this.currentDevice = 'desktop';
    this.zoomLevel = 100;
    this.selectedElement = null;
    this.isDragging = false;
    this.isResizing = false;
  }

  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/main-editor/main-editor.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading main-editor component:', error);
      this.innerHTML = '<div class="component-error">Error loading main editor</div>';
    }
  }

  init() {
    // Get references to key elements
    this.canvas = this.querySelector('#canvas');
    this.deviceFrame = this.querySelector('#deviceFrame');
    this.currentContext = this.querySelector('#currentContext');
    this.deviceInfo = this.querySelector('#deviceInfo');
    
    // Bind event listeners
    this.bindEvents();
    
    // Initialize canvas
    this.setupCanvas();
  }

  bindEvents() {
    // Canvas events
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
    this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));

    // Mouse events for selection and dragging
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Resize observer for responsive canvas
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        this.updateCanvasSize();
      });
      resizeObserver.observe(this.deviceFrame);
    }
  }

  setupCanvas() {
    // Make canvas droppable
    this.canvas.setAttribute('data-droppable', 'true');
    
    // Set initial canvas properties
    this.updateCanvasSize();
    this.updateDeviceInfo();
  }

  handleCanvasClick(e) {
    e.stopPropagation();
    
    // Check if clicking on an element
    const element = e.target.closest('[data-element-id]');
    
    if (element && element !== this.canvas) {
      this.selectElement(element);
    } else {
      this.clearSelection();
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Add visual feedback
    this.canvas.classList.add('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    this.canvas.classList.remove('drag-over');
    
    // Try to get data from different sources
    let elementData = null;
    let componentType = null;
    
    // Check for JSON data (blocks/assets)
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        elementData = JSON.parse(jsonData);
        componentType = elementData.type;
      }
    } catch (err) {
      // Fallback to plain text (legacy components)
      componentType = e.dataTransfer.getData('text/plain');
    }
    
    if (!componentType) return;

    // Calculate drop position
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Create new element
    const element = this.createElement(componentType, { x, y });
    
    // Handle asset-specific data
    if (element && elementData && elementData.source === 'assets-panel') {
      this.applyAssetData(element, elementData);
    }
  }

  handleContextMenu(e) {
    e.preventDefault();
    
    const element = e.target.closest('[data-element-id]');
    if (element && element !== this.canvas) {
      this.selectElement(element);
      
      // Dispatch context menu event
      this.dispatchEvent(new CustomEvent('show-context-menu', {
        detail: {
          element,
          x: e.clientX,
          y: e.clientY
        },
        bubbles: true
      }));
    }
  }

  handleMouseDown(e) {
    const element = e.target.closest('[data-element-id]');
    
    if (element && element !== this.canvas) {
      this.selectElement(element);
      
      // Check if clicking on resize handle
      if (e.target.classList.contains('resize-handle')) {
        this.startResize(e, element);
      } else {
        this.startDrag(e, element);
      }
    }
  }

  handleMouseMove(e) {
    if (this.isDragging) {
      this.updateDrag(e);
    } else if (this.isResizing) {
      this.updateResize(e);
    }
  }

  handleMouseUp(e) {
    if (this.isDragging) {
      this.endDrag(e);
    } else if (this.isResizing) {
      this.endResize(e);
    }
  }

  handleKeyDown(e) {
    if (!this.selectedElement) return;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.deleteSelectedElement();
        break;
      case 'Escape':
        this.clearSelection();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.nudgeElement(e.key);
        }
        break;
    }
  }

  createElement(type, position) {
    const editor = window.wysiwygEditor;
    if (editor && typeof editor.createElement === 'function') {
      return editor.createElement(type, position);
    }
    
    const elementId = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let element;
    switch (type) {
      case 'heading':
        element = this.createHeadingElement(elementId);
        break;
      case 'text':
        element = this.createTextElement(elementId);
        break;
      case 'image':
        element = this.createImageElement(elementId);
        break;
      case 'button':
        element = this.createButtonElement(elementId);
        break;
      case 'container':
        element = this.createContainerElement(elementId);
        break;
      default:
        element = this.createGenericElement(elementId, type);
    }

    // Set position
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.position = 'absolute';

    // Add to canvas
    this.canvas.appendChild(element);
    
    // Select the new element
    this.selectElement(element);
    
    // Dispatch element created event
    this.dispatchEvent(new CustomEvent('element-created', {
      detail: { element, type, position },
      bubbles: true
    }));

    return element;
  }

  createHeadingElement(id) {
    const element = document.createElement('h2');
    element.setAttribute('data-element-id', id);
    element.setAttribute('data-element-type', 'heading');
    element.textContent = 'Heading';
    element.className = 'editable-element';
    element.contentEditable = true;
    return element;
  }

  createTextElement(id) {
    const element = document.createElement('p');
    element.setAttribute('data-element-id', id);
    element.setAttribute('data-element-type', 'text');
    element.textContent = 'Text content';
    element.className = 'editable-element';
    element.contentEditable = true;
    return element;
  }

  createImageElement(id) {
    const element = document.createElement('img');
    element.setAttribute('data-element-id', id);
    element.setAttribute('data-element-type', 'image');
    element.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
    element.alt = 'Placeholder image';
    element.className = 'editable-element';
    element.style.width = '200px';
    element.style.height = '150px';
    return element;
  }

  createButtonElement(id) {
    const element = document.createElement('button');
    element.setAttribute('data-element-id', id);
    element.setAttribute('data-element-type', 'button');
    element.textContent = 'Button';
    element.className = 'editable-element btn';
    return element;
  }

  createContainerElement(id) {
    const element = document.createElement('div');
    element.setAttribute('data-element-id', id);
    element.setAttribute('data-element-type', 'container');
    element.className = 'editable-element container';
    element.style.width = '200px';
    element.style.height = '100px';
    element.style.border = '2px dashed #ccc';
    element.style.display = 'flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
    element.textContent = 'Container';
    return element;
  }

  createGenericElement(id, type) {
    const element = document.createElement('div');
    element.setAttribute('data-element-id', id);
    element.setAttribute('data-element-type', type);
    element.className = 'editable-element';
    element.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    element.style.padding = '10px';
    element.style.border = '1px solid #ccc';
    return element;
  }

  selectElement(element) {
    // Clear previous selection
    this.clearSelection();
    
    this.selectedElement = element;
    element.classList.add('selected');
    
    // Add resize handles
    this.addResizeHandles(element);
    
    // Dispatch selection event
    this.dispatchEvent(new CustomEvent('element-selected', {
      detail: { element },
      bubbles: true
    }));
  }

  clearSelection() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected');
      this.removeResizeHandles(this.selectedElement);
      this.selectedElement = null;
      
      // Dispatch deselection event
      this.dispatchEvent(new CustomEvent('element-deselected', {
        bubbles: true
      }));
    }
  }

  addResizeHandles(element) {
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    
    handles.forEach(direction => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-${direction}`;
      handle.setAttribute('data-direction', direction);
      element.appendChild(handle);
    });
  }

  removeResizeHandles(element) {
    const handles = element.querySelectorAll('.resize-handle');
    handles.forEach(handle => handle.remove());
  }

  deleteSelectedElement() {
    if (this.selectedElement) {
      const element = this.selectedElement;
      this.clearSelection();
      element.remove();
      
      // Dispatch deletion event
      this.dispatchEvent(new CustomEvent('element-deleted', {
        detail: { element },
        bubbles: true
      }));
    }
  }

  startDrag(e, element) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragStartLeft = parseInt(element.style.left) || 0;
    this.dragStartTop = parseInt(element.style.top) || 0;
    
    document.body.style.cursor = 'move';
    element.classList.add('dragging');
  }

  updateDrag(e) {
    if (!this.selectedElement) return;
    
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    
    this.selectedElement.style.left = `${this.dragStartLeft + deltaX}px`;
    this.selectedElement.style.top = `${this.dragStartTop + deltaY}px`;
  }

  endDrag(e) {
    this.isDragging = false;
    document.body.style.cursor = '';
    
    if (this.selectedElement) {
      this.selectedElement.classList.remove('dragging');
      
      // Dispatch move event
      this.dispatchEvent(new CustomEvent('element-moved', {
        detail: { element: this.selectedElement },
        bubbles: true
      }));
    }
  }

  startResize(e, element) {
    this.isResizing = true;
    this.resizeDirection = e.target.dataset.direction;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    
    const rect = element.getBoundingClientRect();
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;
    this.resizeStartLeft = parseInt(element.style.left) || 0;
    this.resizeStartTop = parseInt(element.style.top) || 0;
    
    document.body.style.cursor = this.getResizeCursor(this.resizeDirection);
  }

  updateResize(e) {
    if (!this.selectedElement) return;
    
    const deltaX = e.clientX - this.resizeStartX;
    const deltaY = e.clientY - this.resizeStartY;
    
    const direction = this.resizeDirection;
    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;
    let newLeft = this.resizeStartLeft;
    let newTop = this.resizeStartTop;
    
    // Calculate new dimensions based on direction
    if (direction.includes('e')) newWidth += deltaX;
    if (direction.includes('w')) {
      newWidth -= deltaX;
      newLeft += deltaX;
    }
    if (direction.includes('s')) newHeight += deltaY;
    if (direction.includes('n')) {
      newHeight -= deltaY;
      newTop += deltaY;
    }
    
    // Apply minimum size constraints
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);
    
    // Update element
    this.selectedElement.style.width = `${newWidth}px`;
    this.selectedElement.style.height = `${newHeight}px`;
    this.selectedElement.style.left = `${newLeft}px`;
    this.selectedElement.style.top = `${newTop}px`;
  }

  endResize(e) {
    this.isResizing = false;
    document.body.style.cursor = '';
    
    if (this.selectedElement) {
      // Dispatch resize event
      this.dispatchEvent(new CustomEvent('element-resized', {
        detail: { element: this.selectedElement },
        bubbles: true
      }));
    }
  }

  getResizeCursor(direction) {
    const cursors = {
      'n': 'n-resize',
      's': 's-resize',
      'e': 'e-resize',
      'w': 'w-resize',
      'ne': 'ne-resize',
      'nw': 'nw-resize',
      'se': 'se-resize',
      'sw': 'sw-resize'
    };
    return cursors[direction] || 'default';
  }

  nudgeElement(direction) {
    if (!this.selectedElement) return;
    
    const step = 1;
    const currentLeft = parseInt(this.selectedElement.style.left) || 0;
    const currentTop = parseInt(this.selectedElement.style.top) || 0;
    
    switch (direction) {
      case 'ArrowLeft':
        this.selectedElement.style.left = `${currentLeft - step}px`;
        break;
      case 'ArrowRight':
        this.selectedElement.style.left = `${currentLeft + step}px`;
        break;
      case 'ArrowUp':
        this.selectedElement.style.top = `${currentTop - step}px`;
        break;
      case 'ArrowDown':
        this.selectedElement.style.top = `${currentTop + step}px`;
        break;
    }
  }

  // Public API methods
  setDevice(device) {
    this.currentDevice = device;
    this.deviceFrame.className = `device-frame ${device}`;
    this.updateDeviceInfo();
    this.updateCanvasSize();
  }

  setZoom(level) {
    this.zoomLevel = level;
    this.canvas.style.transform = `scale(${level / 100})`;
    this.canvas.style.transformOrigin = 'top left';
  }

  updateCanvasSize() {
    // Update canvas size based on device frame
    const rect = this.deviceFrame.getBoundingClientRect();
    this.canvas.style.minWidth = `${rect.width - 40}px`;
    this.canvas.style.minHeight = `${rect.height - 40}px`;
  }

  updateDeviceInfo() {
    if (this.deviceInfo) {
      this.deviceInfo.textContent = this.currentDevice.charAt(0).toUpperCase() + this.currentDevice.slice(1);
    }
  }

  updateContext(context) {
    if (this.currentContext) {
      this.currentContext.innerHTML = context;
    }
  }

  getSelectedElement() {
    return this.selectedElement;
  }

  getAllElements() {
    return Array.from(this.canvas.querySelectorAll('[data-element-id]'));
  }

  clearCanvas() {
    this.clearSelection();
    this.canvas.innerHTML = '';
  }

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
}

// Register the custom element
customElements.define('main-editor', MainEditor);

export default MainEditor;
