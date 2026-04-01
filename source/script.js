import {
  setupLayerManager as setupLayerManagerModule,
  updateLayersList as updateLayersListModule,
  renderLayersList as renderLayersListModule,
} from './js/layerManager.js';
import { setupDragAndDrop as setupDragAndDropModule } from './js/dnd.js';
import { setupAdorners as setupAdornersModule } from './js/adorners.js';
import { schemaReader } from './js/schema-reader.js';
import { updatePlaceholder as updatePlaceholderModule } from './js/state.js';
import { setupHierarchyManager, createInitialProject, persistProject, loadPersistedProject as loadPersistedProjectModule, renderHierarchyTree as renderHierarchyTreeModule, addPage as addPageModule, removePage as removePageModule } from './js/hierarchyManager.js';
import { CanvasManager } from './js/canvasManager.js';

// Import new managers
import { ElementManager } from './js/elementManager.js';
import { DragDropManager } from './js/dragDropManager.js';
import { ResizeManager } from './js/resizeManager.js';
import { SelectionManager } from './js/selectionManager.js';
import { PropertiesManager } from './js/propertiesManager.js';
import { HistoryManager } from './js/historyManager.js';
import { ExportManager } from './js/exportManager.js';
import { PageManager } from './js/pageManager.js';

/**
 * MyWYSIWYGEditor - Main editor class refactored with manager pattern
 */
class MyWYSIWYGEditor {
  constructor() {
    // Core DOM elements
    this.canvas = document.getElementById('canvas');
    this.placeholder = document.getElementById('placeholder');
    
    // Core state
    this.selectedElement = null;
    this.selectedElements = new Set();
    this.selectedLayerId = null;
    this.layers = []; // Initialize layers array
    this.currentLayoutMode = 'freeform';
    this.zoomLevel = 1;
    this.minZoom = 0.25;
    this.maxZoom = 3;
    this.currentDevice = 'desktop';
    
    // Schema and configuration
    this.schemaReader = schemaReader;
    this.ch5Schema = null;
    this.deviceConfig = {};
    this.persistenceMode = 'localStorage';
    
    // UI Elements - cached for performance
    this.contextMenu = null;
    this.layersList = null;
    this.propertiesPanel = null;
    this.deviceFrame = null;
    this.deviceType = null;
    
    // Hierarchical structure references
    this.currentSolution = null;
    this.currentProject = null;
    this.currentPage = null;
    this.currentPageId = null;
    
    // Canvas and page management
    this.canvasManager = null;
    this.pageTabs = null;
    
    // Initialize managers
    this.initializeManagers();
    
    // Initialize editor
    this.init();
    
    // Expose globally for cross-component actions
    try { 
      window.wysiwygEditor = this; 
    } catch (_) {}
  }

  /**
   * Initialize all manager instances
   */
  initializeManagers() {
    this.elementManager = new ElementManager(this);
    this.dragDropManager = new DragDropManager(this);
    this.resizeManager = new ResizeManager(this);
    this.selectionManager = new SelectionManager(this);
    this.propertiesManager = new PropertiesManager(this);
    this.historyManager = new HistoryManager(this);
    this.exportManager = new ExportManager(this);
    this.pageManager = new PageManager(this);
  }

  /**
   * Initialize the editor
   */
  async init() {
    // Wait for schema to load before initializing
    if (!this.schemaReader.loaded) {
      await this.schemaReader.loadSchema();
    }

    // Load external configuration first
    await this.loadConfigAndApply();

    // Initialize hierarchy manager (startup-modal component handles first-run flow)
    setupHierarchyManager(this);

    // Initialize canvas manager and page tabs first
    this.pageManager.initializePageTabs();
    this.initializeCanvasManager();

    // Initialize core modules
    setupDragAndDropModule(this);
    setupAdornersModule(this);
    setupLayerManagerModule(this);
    this.ch5Schema = this.schemaReader.schema;

    updatePlaceholderModule(this);

    // Bind utility methods for other modules to use
    this.updatePlaceholder = () => updatePlaceholderModule(this);

    // Initial state push without marking dirty
    this.historyManager.saveState({ suppressDirty: true });

    // Center canvas on initial load and when window resizes
    window.addEventListener('resize', () => this.centerCanvas());

    // Wire context-menu web component actions back to editor logic
    document.addEventListener('context-action', (evt) => {
      const { action, targetElement } = evt.detail || {};
      if (!action) return;
      if (targetElement) {
        this.elementManager.selectElement(targetElement);
      }
      this.handleContextMenuAction?.(action);
    });
  }

  /**
   * Load configuration from config.json
   */
  async loadConfigAndApply() {
    try {
      const res = await fetch('./jsons/config.json');
      const cfg = await res.json();
      
      if (cfg.deviceConfig) this.deviceConfig = cfg.deviceConfig;
      if (cfg.zoom) {
        if (typeof cfg.zoom.defaultZoom === 'number') this.zoomLevel = cfg.zoom.defaultZoom;
        if (typeof cfg.zoom.minZoom === 'number') this.minZoom = cfg.zoom.minZoom;
        if (typeof cfg.zoom.maxZoom === 'number') this.maxZoom = cfg.zoom.maxZoom;
      }
      if (cfg.history && typeof cfg.history.maxHistorySize === 'number') {
        this.historyManager.setMaxHistorySize(cfg.history.maxHistorySize);
      }
      if (cfg.element && typeof cfg.element.defaultCounter === 'number') {
        this.elementManager.elementCounter = cfg.element.defaultCounter;
      }
      this.persistenceMode = (cfg.persistence && cfg.persistence.mode) ? cfg.persistence.mode : 'localStorage';
    } catch (e) {
      console.warn('Failed to load config.json, proceeding with defaults.', e);
      this.persistenceMode = 'localStorage';
    }
  }

  /**
   * Initialize canvas manager
   */
  initializeCanvasManager() {
    this.canvasManager = new CanvasManager(this);
  }

  /**
   * Center canvas in viewport
   */
  centerCanvas() {
    const container = this.canvas?.parentElement;
    if (!container || !this.canvas) return;

    requestAnimationFrame(() => {
      const contentWidth = this.canvas.scrollWidth;
      const contentHeight = this.canvas.scrollHeight;
      const viewWidth = container.clientWidth;
      const viewHeight = container.clientHeight;

      const newScrollLeft = Math.max(0, Math.floor((contentWidth - viewWidth) / 2));
      const newScrollTop = Math.max(0, Math.floor((contentHeight - viewHeight) / 2));

      container.scrollLeft = newScrollLeft;
      container.scrollTop = newScrollTop;
    });
  }

  // ===== DELEGATED METHODS TO MANAGERS =====

  /**
   * Create element - delegate to ElementManager
   */
  createElement(type, position) {
    return this.elementManager.createElement(type, position);
  }

  /**
   * Select element - delegate to ElementManager
   */
  selectElement(element) {
    return this.elementManager.selectElement(element);
  }

  /**
   * Apply asset data - delegate to ElementManager
   */
  applyAssetData(element, assetData) {
    return this.elementManager.applyAssetData(element, assetData);
  }

  /**
   * Update element for layout mode - delegate to ElementManager
   */
  updateElementForLayoutMode(element, layoutMode) {
    return this.elementManager.updateElementForLayoutMode(element, layoutMode);
  }

  /**
   * Handle element action - delegate to ElementManager
   */
  handleElementAction(element, action) {
    return this.elementManager.handleElementAction(element, action);
  }

  /**
   * Start drag - delegate to DragDropManager
   */
  startDrag(e) {
    return this.dragDropManager.startDrag(e);
  }

  /**
   * Perform drag - delegate to DragDropManager
   */
  performDrag(e) {
    return this.dragDropManager.performDrag(e);
  }

  /**
   * End drag - delegate to DragDropManager
   */
  endDrag() {
    return this.dragDropManager.endDrag();
  }

  /**
   * Start resize - delegate to ResizeManager
   */
  startResize(e, element, direction) {
    return this.resizeManager.startResize(e, element, direction);
  }

  /**
   * Perform resize - delegate to ResizeManager
   */
  performResize(e) {
    return this.resizeManager.performResize(e);
  }

  /**
   * End resize - delegate to ResizeManager
   */
  endResize() {
    return this.resizeManager.endResize();
  }

  /**
   * Start marquee selection - delegate to SelectionManager
   */
  startMarqueeSelection(e) {
    return this.selectionManager.startMarqueeSelection(e);
  }

  /**
   * Clear selection - delegate to SelectionManager
   */
  clearSelection() {
    return this.selectionManager.clearSelection();
  }

  /**
   * Toggle element selection - delegate to SelectionManager
   */
  toggleElementSelection(element) {
    return this.selectionManager.toggleElementSelection(element);
  }

  /**
   * Update properties panel - delegate to PropertiesManager
   */
  updatePropertiesPanel(element) {
    return this.propertiesManager.updatePropertiesPanel(element);
  }

  /**
   * Undo - delegate to HistoryManager
   */
  undo() {
    return this.historyManager.undo();
  }

  /**
   * Redo - delegate to HistoryManager
   */
  redo() {
    return this.historyManager.redo();
  }

  /**
   * Export HTML - delegate to ExportManager
   */
  exportHTML() {
    return this.exportManager.exportHTML();
  }

  /**
   * View HTML - delegate to ExportManager
   */
  viewHTML() {
    return this.exportManager.viewHTML();
  }

  /**
   * Clear canvas - delegate to ExportManager
   */
  clearCanvas() {
    return this.exportManager.clearCanvas();
  }

  /**
   * Save to memory - delegate to ExportManager
   */
  saveToMemory() {
    return this.exportManager.saveToMemory();
  }

  /**
   * Load from memory - delegate to ExportManager
   */
  loadFromMemory() {
    return this.exportManager.loadFromMemory();
  }

  /**
   * Switch to page - delegate to PageManager
   */
  switchToPage(pageId) {
    return this.pageManager.switchToPage(pageId);
  }

  /**
   * Save current page - delegate to PageManager
   */
  saveCurrentPage() {
    return this.pageManager.saveCurrentPage();
  }

  /**
   * Save all pages - delegate to PageManager
   */
  saveAllPages() {
    return this.pageManager.saveAllPages();
  }

  /**
   * Mark page dirty - delegate to PageManager
   */
  markPageDirty(pageId) {
    return this.pageManager.markPageDirty(pageId);
  }

  /**
   * Mark page clean - delegate to PageManager
   */
  markPageClean(pageId) {
    return this.pageManager.markPageClean(pageId);
  }

  /**
   * Mark current page dirty - delegate to PageManager
   */
  markCurrentPageDirty(flag) {
    return this.pageManager.markCurrentPageDirty(flag);
  }

  // ===== LEGACY COMPATIBILITY METHODS =====

  /**
   * Show context menu - delegate to context-menu component
   */
  showContextMenu(e, element) {
    e.preventDefault();
    if (!this.contextMenu) {
      this.contextMenu = document.querySelector('context-menu');
    }
    if (this.contextMenu?.show) {
      this.contextMenu.show(e.pageX, e.pageY, element);
    }
  }

  /**
   * Handle context menu actions
   */
  handleContextMenuAction(action) {
    if (!this.selectedElement) return;

    switch (action) {
      case 'duplicate':
        this.elementManager.handleElementAction(this.selectedElement, 'duplicate');
        break;
      case 'delete':
        this.elementManager.handleElementAction(this.selectedElement, 'delete');
        break;
      case 'moveToFront':
        this.selectedElement.style.zIndex = '999';
        this.historyManager.saveState();
        break;
      case 'moveToBack':
        this.selectedElement.style.zIndex = '1';
        this.historyManager.saveState();
        break;
      case 'resetSize':
        this.elementManager.resetElementSize(this.selectedElement);
        break;
      case 'centerAlign':
        this.elementManager.centerAlignElement(this.selectedElement);
        break;
    }
  }

  /**
   * Create initial project from modal
   */
  createInitialProjectFromModal(data) {
    if (!data?.projectName) return;
    try {
      setupHierarchyManager(this);
      createInitialProject(this, data);
    } catch (e) {
      console.warn('Failed to create initial project from modal:', e);
    }
  }

  /**
   * Load persisted project
   */
  loadPersistedProject(projectId = null) {
    try {
      loadPersistedProjectModule(this, projectId);
      
      if (this.currentProject) {
        this.pageManager.loadProjectPages(this.currentProject);
      }
    } catch (e) {
      console.warn('Failed to load persisted project:', e);
    }
  }

  /**
   * Update current context display
   */
  updateCurrentContext() {
    const contextEl = document.getElementById('currentContext');
    if (!contextEl) return;

    let contextHTML = '';

    if (this.currentSolution) {
      contextHTML += `<span class="context-solution">
        <i class="fas fa-briefcase" aria-hidden="true"></i> ${this.currentSolution.name}
      </span>`;

      if (this.currentProject) {
        contextHTML += ` <i class="fas fa-chevron-right" aria-hidden="true"></i> <span class="context-project">
          <i class="fas fa-folder" aria-hidden="true"></i> ${this.currentProject.name}
        </span>`;

        if (this.currentPage) {
          contextHTML += ` <i class="fas fa-chevron-right" aria-hidden="true"></i> <span class="context-page">
            <i class="fas fa-file" aria-hidden="true"></i> ${this.currentPage.name}
          </span>`;
        }
      }
    } else {
      contextHTML = '<span class="context-empty">No solution selected</span>';
    }

    contextEl.innerHTML = contextHTML;
  }

  /**
   * Get page data helper
   */
  getPageData(pageId) {
    return this.pageManager.getPageData(pageId);
  }

  /**
   * Update page tab
   */
  updatePageTab(pageId, updates) {
    return this.pageManager.updatePageTab(pageId, updates);
  }

  /**
   * Update save buttons
   */
  updateSaveButtons() {
    return this.pageManager.updateSaveButtons();
  }

  /**
   * Load project pages
   */
  loadProjectPages(project) {
    return this.pageManager.loadProjectPages(project);
  }

  /**
   * Add page - delegate to hierarchyManager
   */
  addPage(projectId, customName = null, skipValidation = false) {
    return addPageModule(this, projectId, customName, skipValidation);
  }

  /**
   * Remove page - delegate to hierarchyManager
   */
  removePage(pageId) {
    return removePageModule(this, pageId);
  }

  /**
   * Persist project - delegate to hierarchyManager
   */
  persistProject(mode = 'localStorage') {
    return persistProject(this, mode);
  }

  // ===== ADORNERS INTEGRATION =====

  /**
   * Add adorners to element (handled by adorners.js module)
   */
  addAdorners(element) {
    // This is handled by the adorners.js module
    // We just need to provide the interface
    if (window.addAdorners) {
      window.addAdorners(element);
    }
  }

  /**
   * Remove adorners from element (handled by adorners.js module)
   */
  removeAdorners(element) {
    // This is handled by the adorners.js module
    if (window.removeAdorners) {
      window.removeAdorners(element);
    }
  }

  /**
   * Update adorners for element (handled by adorners.js module)
   */
  updateAdorners(element) {
    // This is handled by the adorners.js module
    if (window.updateAdorners) {
      window.updateAdorners(element);
    }
  }

  // ===== LAYERS INTEGRATION =====

  /**
   * Update layers list
   */
  updateLayersList() {
    updateLayersListModule(this);
  }

  /**
   * Render layers list
   */
  renderLayersList() {
    renderLayersListModule(this);
  }

  // ===== UTILITY METHODS =====

  /**
   * Get element bounds
   */
  getElementBounds(element) {
    return this.elementManager.getElementBounds(element);
  }

  /**
   * Get element label
   */
  getElementLabel(element) {
    return this.elementManager.getElementLabel(element);
  }

  /**
   * Check if dragging
   */
  get isDragging() {
    return this.dragDropManager.isDraggingElement();
  }

  /**
   * Check if resizing
   */
  get isResizing() {
    return this.resizeManager.isResizingElement();
  }

  /**
   * Get dragged element
   */
  get draggedElement() {
    return this.dragDropManager.getDraggedElement();
  }

  /**
   * Get resize element
   */
  get resizeElement() {
    return this.resizeManager.getResizeElement();
  }

  /**
   * Save state (delegate to HistoryManager)
   */
  saveState(options) {
    return this.historyManager.saveState(options);
  }

  /**
   * Restore state (delegate to HistoryManager)
   */
  restoreState() {
    return this.historyManager.restoreState();
  }

  /**
   * Get clean HTML (delegate to ExportManager)
   */
  getCleanHTML() {
    return this.exportManager.getCleanHTML();
  }

  /**
   * Generate clean output (delegate to ExportManager)
   */
  generateCleanOutput() {
    return this.exportManager.generateCleanOutput();
  }
}

// Prevent default drag behavior
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
});

// Export the class for module usage
export { MyWYSIWYGEditor };
