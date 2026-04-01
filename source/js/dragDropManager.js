import { saveState as saveStateModule } from './state.js';

/**
 * DragDropManager - Handles drag and drop operations for elements
 */
export class DragDropManager {
  constructor(editor) {
    this.editor = editor;
    this.isDragging = false;
    this.isGroupDragging = false;
    this.draggedElement = null;
    this.groupDragItems = [];
    this.startX = 0;
    this.startY = 0;
    this.startLeft = 0;
    this.startTop = 0;
  }

  /**
   * Start dragging an element
   */
  startDrag(e) {
    if (this.editor.currentLayoutMode !== 'freeform') return;
    if (e.target.classList.contains('resize-handle') || e.target.classList.contains('action-btn')) return;

    const element = e.target.classList.contains('editable-element') ?
      e.target : e.target.closest('.editable-element');

    if (!element || element.hasAttribute('data-locked')) return;

    // Handle multi-selection drag
    if ((e.ctrlKey || e.metaKey) && this.editor.selectedElements.size === 0) {
      return;
    }

    // If multiple elements are selected
    if (this.editor.selectedElements.size > 0) {
      if (!this.editor.selectedElements.has(element)) {
        // Clicked outside multi-select set: switch to single selection and drag that one
        this.editor.clearSelection();
        this.editor.elementManager.selectElement(element);
      } else {
        // Start group drag with all selected elements
        this.isDragging = true;
        this.isGroupDragging = true;
        this.draggedElement = element; // anchor

        // Use offsetLeft/offsetTop to avoid margin-induced shifts
        this.groupDragItems = Array.from(this.editor.selectedElements).map(el => {
          return {
            el,
            startLeft: el.offsetLeft,
            startTop: el.offsetTop
          };
        });
      }
    }

    if (!this.isDragging) {
      // Single selection drag
      this.editor.elementManager.selectElement(element);
      this.isDragging = true;
      this.draggedElement = element;
    }

    this.startX = e.clientX;
    this.startY = e.clientY;
    // Use offsets relative to canvas to avoid margin affecting calculations
    this.startLeft = element.offsetLeft;
    this.startTop = element.offsetTop;

    element.style.zIndex = '1000';
    document.body.style.userSelect = 'none';
  }

  /**
   * Perform drag operation
   */
  performDrag(e) {
    if (!this.isDragging || !this.draggedElement) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    if (this.isGroupDragging && this.groupDragItems.length > 0) {
      // Move all selected elements relative to their start positions
      this.groupDragItems.forEach(item => {
        const newLeft = Math.max(0, item.startLeft + deltaX);
        const newTop = Math.max(0, item.startTop + deltaY);
        item.el.style.transform = `translate(${newLeft}px, ${newTop}px)`;
        item.el.style.left = '0px';
        item.el.style.top = '0px';
        item.el.style.zIndex = '1000';
      });
      document.body.style.userSelect = 'none';
    } else {
      const newLeft = Math.max(0, this.startLeft + deltaX);
      const newTop = Math.max(0, this.startTop + deltaY);

      // Use transform for hardware acceleration instead of left/top
      this.draggedElement.style.transform = `translate(${newLeft}px, ${newTop}px)`;
      this.draggedElement.style.left = '0px';
      this.draggedElement.style.top = '0px';
    }
  }

  /**
   * End drag operation
   */
  endDrag() {
    if (this.isDragging && this.draggedElement) {
      if (this.isGroupDragging && this.groupDragItems.length > 0) {
        // Commit positions for all group items
        this.groupDragItems.forEach(item => {
          const transform = item.el.style.transform;
          if (transform) {
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
              const left = parseFloat(match[1]);
              const top = parseFloat(match[2]);
              item.el.style.left = left + 'px';
              item.el.style.top = top + 'px';
              item.el.style.transform = '';
            }
          }
          item.el.style.zIndex = '';
        });
        
        // Update adorners for all group items before clearing the array
        this.groupDragItems.forEach(item => {
          if (item.el.classList.contains('selected')) {
            this.editor.removeAdorners(item.el);
            this.editor.addAdorners(item.el);
          }
        });
        
        this.groupDragItems = [];
        this.isGroupDragging = false;
        saveStateModule(this.editor);
      } else {
        // Single element commit
        const transform = this.draggedElement.style.transform;
        if (transform) {
          const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (match) {
            const left = parseFloat(match[1]);
            const top = parseFloat(match[2]);
            this.draggedElement.style.left = left + 'px';
            this.draggedElement.style.top = top + 'px';
            this.draggedElement.style.transform = '';
          }
        }
        this.draggedElement.style.zIndex = '';
        
        // Update adorners for single element
        if (this.draggedElement.classList.contains('selected')) {
          this.editor.removeAdorners(this.draggedElement);
          this.editor.addAdorners(this.draggedElement);
        }
        saveStateModule(this.editor);
      }
    }

    this.isDragging = false;
    this.draggedElement = null;
    document.body.style.userSelect = '';
  }

  /**
   * Check if currently dragging
   */
  isDraggingElement() {
    return this.isDragging;
  }

  /**
   * Check if group dragging
   */
  isGroupDraggingElements() {
    return this.isGroupDragging;
  }

  /**
   * Get dragged element
   */
  getDraggedElement() {
    return this.draggedElement;
  }

  /**
   * Get group drag items
   */
  getGroupDragItems() {
    return this.groupDragItems;
  }

  /**
   * Reset drag state
   */
  resetDragState() {
    this.isDragging = false;
    this.isGroupDragging = false;
    this.draggedElement = null;
    this.groupDragItems = [];
    this.startX = 0;
    this.startY = 0;
    this.startLeft = 0;
    this.startTop = 0;
    document.body.style.userSelect = '';
  }

  /**
   * Handle drag start for external elements (from blocks panel, etc.)
   */
  handleExternalDragStart(elementData) {
    // This can be extended to handle drag from blocks panel or assets panel
    // Currently handled by the existing dnd.js module
    console.log('External drag start:', elementData);
  }

  /**
   * Handle drop of external elements
   */
  handleExternalDrop(e, elementData) {
    if (!elementData) return;

    const canvasRect = this.editor.canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left + this.editor.canvas.scrollLeft;
    const y = e.clientY - canvasRect.top + this.editor.canvas.scrollTop;

    // Create element at drop position
    const element = this.editor.elementManager.createElement(elementData.type, { x, y });

    // Apply asset-specific data if available
    if (element && elementData.source === 'assets-panel') {
      this.editor.elementManager.applyAssetData(element, elementData);
    }

    return element;
  }

  /**
   * Get drop position relative to canvas
   */
  getDropPosition(e) {
    const canvasRect = this.editor.canvas.getBoundingClientRect();
    return {
      x: e.clientX - canvasRect.left + this.editor.canvas.scrollLeft,
      y: e.clientY - canvasRect.top + this.editor.canvas.scrollTop
    };
  }

  /**
   * Check if position is within canvas bounds
   */
  isWithinCanvasBounds(position) {
    const canvasRect = this.editor.canvas.getBoundingClientRect();
    return position.x >= 0 && 
           position.y >= 0 && 
           position.x <= canvasRect.width && 
           position.y <= canvasRect.height;
  }

  /**
   * Snap position to grid (if grid snapping is enabled)
   */
  snapToGrid(position, gridSize = 10) {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  }

  /**
   * Get drag constraints for an element
   */
  getDragConstraints(element) {
    const canvasRect = this.editor.canvas.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    return {
      minX: 0,
      minY: 0,
      maxX: canvasRect.width - elementRect.width,
      maxY: canvasRect.height - elementRect.height
    };
  }

  /**
   * Apply drag constraints to position
   */
  applyDragConstraints(position, constraints) {
    return {
      x: Math.max(constraints.minX, Math.min(constraints.maxX, position.x)),
      y: Math.max(constraints.minY, Math.min(constraints.maxY, position.y))
    };
  }
}
