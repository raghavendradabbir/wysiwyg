import { saveState as saveStateModule } from './state.js';

/**
 * ResizeManager - Handles element resizing operations
 */
export class ResizeManager {
  constructor(editor) {
    this.editor = editor;
    this.isResizing = false;
    this.resizeElement = null;
    this.resizeDirection = null;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.resizeStartLeft = 0;
    this.resizeStartTop = 0;
  }

  /**
   * Start resizing an element
   */
  startResize(e, element, direction) {
    e.preventDefault();
    e.stopPropagation();

    // Initialize resize state
    this.isResizing = true;
    this.resizeElement = element || e.target.closest('.editable-element');
    this.resizeDirection = direction || (e.target.classList ? 
      Array.from(e.target.classList).find(c => ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].includes(c)) : null);

    if (!this.resizeElement || this.resizeElement.hasAttribute('data-locked')) {
      this.isResizing = false;
      return;
    }

    const el = this.resizeElement;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    this.resizeStartWidth = parseInt(el.style.width) || el.offsetWidth;
    this.resizeStartHeight = parseInt(el.style.height) || el.offsetHeight;
    this.resizeStartLeft = el.offsetLeft;
    this.resizeStartTop = el.offsetTop;

    // Visual cursor hint
    document.body.style.userSelect = 'none';
    const dir = this.resizeDirection;
    const cursorMap = { 
      n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize', 
      ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize' 
    };
    document.body.style.cursor = cursorMap[dir] || 'default';
  }

  /**
   * Perform resize operation
   */
  performResize(e) {
    if (!this.isResizing || !this.resizeElement) return;

    const deltaX = e.clientX - this.resizeStartX;
    const deltaY = e.clientY - this.resizeStartY;

    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;
    let newLeft = this.resizeStartLeft;
    let newTop = this.resizeStartTop;

    // Calculate new dimensions based on resize direction
    switch (this.resizeDirection) {
      case 'e':
        newWidth = Math.max(20, this.resizeStartWidth + deltaX);
        break;
      case 'w':
        newWidth = Math.max(20, this.resizeStartWidth - deltaX);
        newLeft = this.resizeStartLeft + deltaX;
        break;
      case 's':
        newHeight = Math.max(20, this.resizeStartHeight + deltaY);
        break;
      case 'n':
        newHeight = Math.max(20, this.resizeStartHeight - deltaY);
        newTop = this.resizeStartTop + deltaY;
        break;
      case 'se':
        newWidth = Math.max(20, this.resizeStartWidth + deltaX);
        newHeight = Math.max(20, this.resizeStartHeight + deltaY);
        break;
      case 'sw':
        newWidth = Math.max(20, this.resizeStartWidth - deltaX);
        newHeight = Math.max(20, this.resizeStartHeight + deltaY);
        newLeft = this.resizeStartLeft + deltaX;
        break;
      case 'ne':
        newWidth = Math.max(20, this.resizeStartWidth + deltaX);
        newHeight = Math.max(20, this.resizeStartHeight - deltaY);
        newTop = this.resizeStartTop + deltaY;
        break;
      case 'nw':
        newWidth = Math.max(20, this.resizeStartWidth - deltaX);
        newHeight = Math.max(20, this.resizeStartHeight - deltaY);
        newLeft = this.resizeStartLeft + deltaX;
        newTop = this.resizeStartTop + deltaY;
        break;
    }

    // Apply new dimensions and position (freeform mode)
    this.resizeElement.style.width = newWidth + 'px';
    this.resizeElement.style.height = newHeight + 'px';
    
    if (this.editor.currentLayoutMode === 'freeform') {
      this.resizeElement.style.left = Math.max(0, newLeft) + 'px';
      this.resizeElement.style.top = Math.max(0, newTop) + 'px';
    }

    // Update CH5 component inner size if applicable
    this.updateCH5ComponentSize(this.resizeElement, newWidth, newHeight);

    // Keep adorners in sync - remove and re-add to ensure proper positioning
    if (this.resizeElement.classList.contains('selected')) {
      this.editor.removeAdorners(this.resizeElement);
      this.editor.addAdorners(this.resizeElement);
    }
  }

  /**
   * End resize operation
   */
  endResize() {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    this.resizeElement = null;
    this.resizeDirection = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    saveStateModule(this.editor);
  }

  /**
   * Update CH5 component size
   */
  updateCH5ComponentSize(element, width, height) {
    const type = element.getAttribute('data-type');
    if (type && type.startsWith('ch5-')) {
      const ch5Element = element.querySelector(type);
      if (ch5Element) {
        // Update CSS custom properties for CH5 components
        ch5Element.style.setProperty('--width', width + 'px');
        ch5Element.style.setProperty('--height', height + 'px');
        ch5Element.style.width = width + 'px';
        ch5Element.style.height = height + 'px';

        // Update specific CH5 component properties
        if (type === 'ch5-button') {
          ch5Element.setAttribute('customStyle', `width: ${width}px; height: ${height}px;`);
        } else if (type === 'ch5-textinput') {
          ch5Element.setAttribute('customStyle', `width: ${width}px; height: ${height}px;`);
        } else if (type === 'ch5-slider') {
          ch5Element.setAttribute('customStyle', `width: ${width}px; height: ${height}px;`);
        }
      }
    }
  }

  /**
   * Check if currently resizing
   */
  isResizingElement() {
    return this.isResizing;
  }

  /**
   * Get resize element
   */
  getResizeElement() {
    return this.resizeElement;
  }

  /**
   * Get resize direction
   */
  getResizeDirection() {
    return this.resizeDirection;
  }

  /**
   * Reset resize state
   */
  resetResizeState() {
    this.isResizing = false;
    this.resizeElement = null;
    this.resizeDirection = null;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.resizeStartLeft = 0;
    this.resizeStartTop = 0;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  /**
   * Get resize cursor for direction
   */
  getResizeCursor(direction) {
    const cursorMap = {
      n: 'n-resize',
      s: 's-resize',
      e: 'e-resize',
      w: 'w-resize',
      ne: 'ne-resize',
      nw: 'nw-resize',
      se: 'se-resize',
      sw: 'sw-resize'
    };
    return cursorMap[direction] || 'default';
  }

  /**
   * Check if resize handle is valid
   */
  isValidResizeHandle(element) {
    return element && element.classList.contains('resize-handle');
  }

  /**
   * Get resize constraints for an element
   */
  getResizeConstraints(element) {
    const canvasRect = this.editor.canvas.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    return {
      minWidth: 20,
      minHeight: 20,
      maxWidth: canvasRect.width - element.offsetLeft,
      maxHeight: canvasRect.height - element.offsetTop
    };
  }

  /**
   * Apply resize constraints to dimensions
   */
  applyResizeConstraints(dimensions, constraints) {
    return {
      width: Math.max(constraints.minWidth, Math.min(constraints.maxWidth, dimensions.width)),
      height: Math.max(constraints.minHeight, Math.min(constraints.maxHeight, dimensions.height))
    };
  }

  /**
   * Maintain aspect ratio during resize
   */
  maintainAspectRatio(newWidth, newHeight, originalWidth, originalHeight) {
    const aspectRatio = originalWidth / originalHeight;
    
    // Determine which dimension changed more
    const widthChange = Math.abs(newWidth - originalWidth);
    const heightChange = Math.abs(newHeight - originalHeight);
    
    if (widthChange > heightChange) {
      // Width changed more, adjust height
      return {
        width: newWidth,
        height: newWidth / aspectRatio
      };
    } else {
      // Height changed more, adjust width
      return {
        width: newHeight * aspectRatio,
        height: newHeight
      };
    }
  }

  /**
   * Snap resize to grid
   */
  snapResizeToGrid(dimensions, gridSize = 10) {
    return {
      width: Math.round(dimensions.width / gridSize) * gridSize,
      height: Math.round(dimensions.height / gridSize) * gridSize
    };
  }
}
