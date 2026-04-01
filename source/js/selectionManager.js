import { updateLayersList as updateLayersListModule } from './layerManager.js';

/**
 * SelectionManager - Handles marquee selection and multi-selection operations
 */
export class SelectionManager {
  constructor(editor) {
    this.editor = editor;
    this.isMarqueeSelecting = false;
    this.marqueeStartX = 0;
    this.marqueeStartY = 0;
    this.marqueeBox = null;
    this._onMarqueeMove = null;
    this._onMarqueeUp = null;
  }

  /**
   * Start marquee selection
   */
  startMarqueeSelection(e) {
    const canvasRect = this.editor.canvas.getBoundingClientRect();
    this.isMarqueeSelecting = true;
    this.marqueeStartX = e.clientX;
    this.marqueeStartY = e.clientY;

    // Create marquee box
    this.marqueeBox = document.createElement('div');
    this.marqueeBox.className = 'selection-marquee';
    this.editor.canvas.appendChild(this.marqueeBox);

    // Position initial
    const x = this.marqueeStartX - canvasRect.left + this.editor.canvas.scrollLeft;
    const y = this.marqueeStartY - canvasRect.top + this.editor.canvas.scrollTop;
    Object.assign(this.marqueeBox.style, {
      left: x + 'px',
      top: y + 'px',
      width: '0px',
      height: '0px'
    });

    // Bind move/up
    this._onMarqueeMove = this.performMarqueeSelection.bind(this);
    this._onMarqueeUp = this.endMarqueeSelection.bind(this);
    document.addEventListener('mousemove', this._onMarqueeMove);
    document.addEventListener('mouseup', this._onMarqueeUp, { once: true });
  }

  /**
   * Perform marquee selection (updates rectangle and selects overlapped elements)
   */
  performMarqueeSelection(e) {
    if (!this.isMarqueeSelecting || !this.marqueeBox) return;

    const canvasRect = this.editor.canvas.getBoundingClientRect();

    // Starting point relative to canvas
    const startX = this.marqueeStartX - canvasRect.left + this.editor.canvas.scrollLeft;
    const startY = this.marqueeStartY - canvasRect.top + this.editor.canvas.scrollTop;

    // Current point relative to canvas
    const currX = e.clientX - canvasRect.left + this.editor.canvas.scrollLeft;
    const currY = e.clientY - canvasRect.top + this.editor.canvas.scrollTop;

    const left = Math.min(startX, currX);
    const top = Math.min(startY, currY);
    const width = Math.abs(currX - startX);
    const height = Math.abs(currY - startY);

    Object.assign(this.marqueeBox.style, {
      left: left + 'px',
      top: top + 'px',
      width: width + 'px',
      height: height + 'px'
    });

    // Update selection based on overlap with editable elements
    const boxRight = left + width;
    const boxBottom = top + height;

    // Build selection set fresh each move for simplicity
    this.clearSelection();

    const elements = this.editor.canvas.querySelectorAll('.editable-element');
    elements.forEach(el => {
      // Use offsets since editable elements are positioned inside canvas
      const elLeft = el.offsetLeft;
      const elTop = el.offsetTop;
      const elRight = elLeft + el.offsetWidth;
      const elBottom = elTop + el.offsetHeight;

      const overlaps = !(elLeft > boxRight || elRight < left || elTop > boxBottom || elBottom < top);
      if (overlaps) {
        // Add to multi-selection
        this.editor.selectedElements.add(el);
        el.classList.add('multi-selected');
      }
    });
  }

  /**
   * End marquee selection
   */
  endMarqueeSelection() {
    // Remove listeners
    if (this._onMarqueeMove) {
      document.removeEventListener('mousemove', this._onMarqueeMove);
      this._onMarqueeMove = null;
    }

    this.isMarqueeSelecting = false;

    // Remove marquee box
    if (this.marqueeBox && this.marqueeBox.parentNode) {
      this.marqueeBox.parentNode.removeChild(this.marqueeBox);
      this.marqueeBox = null;
    }

    // Update layers/properties to reflect final selection
    renderLayersListModule(this.editor);
    this.editor.updatePropertiesPanel();
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    // Clear single selection
    if (this.editor.selectedElement) {
      this.editor.selectedElement.classList.remove('selected');
      this.editor.removeAdorners(this.editor.selectedElement);
      this.editor.selectedElement = null;
      this.editor.selectedLayerId = null;
    }

    // Clear multi-selection
    this.editor.selectedElements.forEach(element => {
      element.classList.remove('multi-selected');
      this.editor.removeAdorners(element);
    });
    this.editor.selectedElements.clear();

    updateLayersListModule(this.editor);
    this.editor.updatePropertiesPanel();
  }

  /**
   * Toggle element selection (for Ctrl+click)
   */
  toggleElementSelection(element) {
    // If we currently have a single selected element and no multi-selection yet,
    // promote that selection into the multi-select set so both are included.
    if (this.editor.selectedElement && this.editor.selectedElements.size === 0) {
      this.editor.selectedElements.add(this.editor.selectedElement);
      this.editor.selectedElement.classList.remove('selected');
      this.editor.selectedElement.classList.add('multi-selected');
    }

    if (this.editor.selectedElements.has(element)) {
      // Remove from selection
      this.editor.selectedElements.delete(element);
      element.classList.remove('multi-selected');
    } else {
      // Add to selection
      this.editor.selectedElements.add(element);
      element.classList.add('multi-selected');
    }
    
    // Keep a primary selectedElement reference to the last interacted element
    this.editor.selectedElement = element;
    this.editor.selectedLayerId = element.id;

    this.editor.updatePropertiesPanel();
  }

  /**
   * Select all elements
   */
  selectAll() {
    this.clearSelection();
    
    const elements = this.editor.canvas.querySelectorAll('.editable-element');
    elements.forEach(element => {
      this.editor.selectedElements.add(element);
      element.classList.add('multi-selected');
    });

    if (elements.length > 0) {
      this.editor.selectedElement = elements[elements.length - 1];
      this.editor.selectedLayerId = this.editor.selectedElement.id;
    }

    renderLayersListModule(this.editor);
    this.editor.updatePropertiesPanel();
  }

  /**
   * Select elements by type
   */
  selectByType(elementType) {
    this.clearSelection();
    
    const elements = this.editor.canvas.querySelectorAll(`.editable-element[data-type="${elementType}"]`);
    elements.forEach(element => {
      this.editor.selectedElements.add(element);
      element.classList.add('multi-selected');
    });

    if (elements.length > 0) {
      this.editor.selectedElement = elements[elements.length - 1];
      this.editor.selectedLayerId = this.editor.selectedElement.id;
    }

    renderLayersListModule(this.editor);
    this.editor.updatePropertiesPanel();
  }

  /**
   * Select elements within bounds
   */
  selectWithinBounds(bounds) {
    this.clearSelection();
    
    const elements = this.editor.canvas.querySelectorAll('.editable-element');
    elements.forEach(element => {
      const elLeft = element.offsetLeft;
      const elTop = element.offsetTop;
      const elRight = elLeft + element.offsetWidth;
      const elBottom = elTop + element.offsetHeight;

      const withinBounds = elLeft >= bounds.left && 
                          elTop >= bounds.top && 
                          elRight <= bounds.right && 
                          elBottom <= bounds.bottom;

      if (withinBounds) {
        this.editor.selectedElements.add(element);
        element.classList.add('multi-selected');
      }
    });

    if (this.editor.selectedElements.size > 0) {
      this.editor.selectedElement = Array.from(this.editor.selectedElements)[this.editor.selectedElements.size - 1];
      this.editor.selectedLayerId = this.editor.selectedElement.id;
    }

    renderLayersListModule(this.editor);
    this.editor.updatePropertiesPanel();
  }

  /**
   * Get selected elements count
   */
  getSelectedCount() {
    return this.editor.selectedElements.size + (this.editor.selectedElement && this.editor.selectedElements.size === 0 ? 1 : 0);
  }

  /**
   * Get all selected elements as array
   */
  getAllSelectedElements() {
    if (this.editor.selectedElements.size > 0) {
      return Array.from(this.editor.selectedElements);
    } else if (this.editor.selectedElement) {
      return [this.editor.selectedElement];
    }
    return [];
  }

  /**
   * Check if element is selected
   */
  isElementSelected(element) {
    return element === this.editor.selectedElement || this.editor.selectedElements.has(element);
  }

  /**
   * Check if marquee selection is active
   */
  isMarqueeActive() {
    return this.isMarqueeSelecting;
  }

  /**
   * Get marquee bounds
   */
  getMarqueeBounds() {
    if (!this.marqueeBox) return null;
    
    return {
      left: parseInt(this.marqueeBox.style.left),
      top: parseInt(this.marqueeBox.style.top),
      width: parseInt(this.marqueeBox.style.width),
      height: parseInt(this.marqueeBox.style.height)
    };
  }

  /**
   * Reset selection state
   */
  resetSelectionState() {
    this.endMarqueeSelection();
    this.clearSelection();
  }

  /**
   * Invert selection
   */
  invertSelection() {
    const allElements = this.editor.canvas.querySelectorAll('.editable-element');
    const currentlySelected = this.getAllSelectedElements();
    
    this.clearSelection();
    
    allElements.forEach(element => {
      if (!currentlySelected.includes(element)) {
        this.editor.selectedElements.add(element);
        element.classList.add('multi-selected');
      }
    });

    if (this.editor.selectedElements.size > 0) {
      this.editor.selectedElement = Array.from(this.editor.selectedElements)[0];
      this.editor.selectedLayerId = this.editor.selectedElement.id;
    }

    renderLayersListModule(this.editor);
    this.editor.updatePropertiesPanel();
  }
}
