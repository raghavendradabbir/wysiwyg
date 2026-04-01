import { renderHierarchyTree as renderHierarchyTreeModule } from './hierarchyManager.js';

/**
 * PageManager - Handles page management operations and page tabs
 */
export class PageManager {
  constructor(editor) {
    this.editor = editor;
    this.pageTabs = null;
    this.currentPageId = null;
  }

  /**
   * Initialize page tabs component
   */
  initializePageTabs() {
    this.pageTabs = document.getElementById('pageTabs');
    if (!this.pageTabs) {
      console.error('Page tabs component not found');
      return;
    }

    // Set up event listeners for tab interactions
    this.pageTabs.addEventListener('tab-changed', (e) => {
      const { pageId } = e.detail;
      this.switchToPage(pageId);
    });

    this.pageTabs.addEventListener('tab-close-requested', (e) => {
      const { pageId } = e.detail;
      this.closePage(pageId);
    });

    this.pageTabs.addEventListener('add-page-requested', () => {
      this.addNewPage();
    });
  }

  /**
   * Switch to a specific page
   */
  switchToPage(pageId) {
    if (!this.editor.canvasManager || !pageId) return;

    // Save current page state before switching
    if (this.currentPageId) {
      this.editor.canvasManager.savePageState(this.currentPageId);
    }

    // Switch canvas
    this.editor.canvasManager.switchToPage(pageId);
    this.currentPageId = pageId;
    this.editor.currentPageId = pageId;

    // Update page tabs active state
    if (this.pageTabs) {
      this.pageTabs.setActiveTab(pageId);
    }

    // Update hierarchy manager current page
    if (window.HierarchyManager) {
      window.HierarchyManager.currentPageId = pageId;
    }

    // Update layers list for the new page
    this.editor.updateLayersList?.();

    // Clear selection when switching pages
    if (this.editor.selectionManager) {
      this.editor.selectionManager.clearSelection();
    } else {
      this.editor.clearSelection?.();
    }

    // Update properties panel
    this.editor.updatePropertiesPanel?.();
  }

  /**
   * Add a new page
   */
  addNewPage() {
    // Use hierarchy manager to add a new page
    if (this.editor.addPage && this.editor.currentProject) {
      const pageId = this.editor.addPage(this.editor.currentProject.id);
      if (pageId) {
        // Page tab is automatically added by the addPage function
        // Just switch to the new page
        this.switchToPage(pageId);
      }
    }
  }

  /**
   * Close a page
   */
  closePage(pageId) {
    if (!pageId || !this.editor.canvasManager) return;

    // Check if page has unsaved changes
    const pageData = this.getPageData(pageId);
    if (pageData?.dirty) {
      const shouldClose = confirm(`Page "${pageData.name}" has unsaved changes. Close anyway?`);
      if (!shouldClose) return;
    }

    // Remove canvas and tab
    this.editor.canvasManager.removeCanvas(pageId);
    if (this.pageTabs) {
      this.pageTabs.removeTab(pageId);
    }

    // Remove from hierarchy manager
    if (this.editor.removePage) {
      this.editor.removePage(pageId);
    }

    // If this was the current page, switch to another one
    if (this.currentPageId === pageId) {
      const remainingPages = this.pageTabs?.getAllPageIds() || [];
      if (remainingPages.length > 0) {
        this.switchToPage(remainingPages[0]);
      } else {
        this.currentPageId = null;
        this.editor.currentPageId = null;
      }
    }
  }

  /**
   * Load pages for a project into tabs
   */
  loadProjectPages(project) {
    if (!project || !this.pageTabs || !this.editor.canvasManager) return;

    // Clear existing tabs and canvases
    this.pageTabs.clearTabs();
    this.editor.canvasManager.clearAllCanvases();

    // Add tabs for each page
    if (project.pages && project.pages.size > 0) {
      for (const [pageId, pageData] of project.pages) {
        this.pageTabs.addTab(pageData);
      }

      // Switch to the first page or current page
      const targetPageId = project.currentPageId || Array.from(project.pages.keys())[0];
      if (targetPageId) {
        this.switchToPage(targetPageId);
      }
    }
  }

  /**
   * Get page data helper
   */
  getPageData(pageId) {
    if (this.editor.currentProject?.pages) {
      return this.editor.currentProject.pages.get(pageId);
    }
    return null;
  }

  /**
   * Update page tab when page data changes
   */
  updatePageTab(pageId, updates) {
    if (this.pageTabs && this.pageTabs.hasTab(pageId)) {
      this.pageTabs.updateTab(pageId, updates);
    }
  }

  /**
   * Mark page as dirty (has unsaved changes)
   */
  markPageDirty(pageId = null) {
    const targetPageId = pageId || this.currentPageId;
    if (!targetPageId) return;

    const pageData = this.getPageData(targetPageId);
    if (pageData) {
      pageData.dirty = true;
      pageData.updatedAt = new Date().toISOString();
      this.updatePageTab(targetPageId, { dirty: true });
      this.refreshRibbonSaveButtons();
      
      // Also mark project dirty and refresh hierarchy tree
      if (this.editor.currentProject) {
        this.editor.currentProject.dirty = true;
      }
      try { 
        renderHierarchyTreeModule(this.editor); 
      } catch (_) {}
    }
  }

  /**
   * Mark page as clean (saved)
   */
  markPageClean(pageId = null) {
    const targetPageId = pageId || this.currentPageId;
    if (!targetPageId) return;

    const pageData = this.getPageData(targetPageId);
    if (pageData) {
      pageData.dirty = false;
      this.updatePageTab(targetPageId, { dirty: false });
      this.refreshRibbonSaveButtons();
      
      // If no pages are dirty, clear project dirty
      if (this.editor.currentProject) {
        const anyDirty = Array.from(this.editor.currentProject.pages.values()).some(p => p.dirty);
        this.editor.currentProject.dirty = anyDirty ? true : false;
      }
      try { 
        renderHierarchyTreeModule(this.editor); 
      } catch (_) {}
    }
  }

  /**
   * Mark current page as dirty/clean
   */
  markCurrentPageDirty(flag = true) {
    if (flag) {
      this.markPageDirty(this.currentPageId);
    } else {
      this.markPageClean(this.currentPageId);
    }
  }

  /**
   * Save current page content
   */
  saveCurrentPage() {
    const pageId = this.currentPageId;
    if (!pageId || !this.editor.currentProject) return;

    // 1) Serialize active canvas HTML into page.content
    const pageData = this.getPageData(pageId);
    if (pageData && this.editor.canvas) {
      pageData.content = this.editor.canvas.innerHTML;
    }

    // 2) Let CanvasManager capture structured elements/styles for this page
    if (this.editor.canvasManager && this.editor.canvasManager.savePageState) {
      this.editor.canvasManager.savePageState(pageId);
    }

    // 3) Persist project (this updates ProjectDataManager via hierarchyManager)
    try {
      if (this.editor.persistProject) {
        this.editor.persistProject(this.editor, this.editor.persistenceMode);
      }
      // 4) Mark page clean and refresh UI
      this.markPageClean(pageId);
      this.refreshRibbonSaveButtons();
    } catch (e) {
      console.warn('Failed to persist current page:', e);
    }
  }

  /**
   * Save all pages
   */
  saveAllPages() {
    if (!this.editor.currentProject) return;

    // 1) For each page, if its canvas exists, serialize; otherwise leave as-is
    const pageIds = Array.from(this.editor.currentProject.pages.keys());
    pageIds.forEach(pid => {
      const canvas = this.editor.canvasManager?.getActiveCanvas && this.currentPageId === pid ? this.editor.canvas : null;
      const pageData = this.getPageData(pid);
      if (pageData && (canvas || pid === this.currentPageId)) {
        // Update content for active page
        if (this.editor.canvas && pid === this.currentPageId) {
          pageData.content = this.editor.canvas.innerHTML;
        }
      }
      // Capture structured state for any loaded canvas
      if (this.editor.canvasManager && this.editor.canvasManager.savePageState) {
        this.editor.canvasManager.savePageState(pid);
      }
    });

    // 2) Persist entire project
    try {
      if (this.editor.persistProject) {
        this.editor.persistProject(this.editor, this.editor.persistenceMode);
      }
      // 3) Mark all pages clean and refresh UI
      pageIds.forEach(pid => this.markPageClean(pid));
      this.refreshRibbonSaveButtons();
    } catch (e) {
      console.warn('Failed to persist all pages:', e);
    }
  }

  /**
   * Duplicate a page
   */
  duplicatePage(pageId) {
    const pageData = this.getPageData(pageId);
    if (!pageData) return null;

    // Create new page data
    const newPageData = {
      ...pageData,
      id: `page-${Date.now()}`,
      name: `${pageData.name} Copy`,
      createdAt: new Date().toISOString(),
      dirty: true
    };

    // Add to project
    if (this.editor.currentProject?.pages) {
      this.editor.currentProject.pages.set(newPageData.id, newPageData);
    }

    // Add tab
    if (this.pageTabs) {
      this.pageTabs.addTab(newPageData);
    }

    // Switch to new page
    this.switchToPage(newPageData.id);

    return newPageData.id;
  }

  /**
   * Rename a page
   */
  renamePage(pageId, newName) {
    const pageData = this.getPageData(pageId);
    if (!pageData) return false;

    pageData.name = newName;
    pageData.updatedAt = new Date().toISOString();
    pageData.dirty = true;

    // Update tab
    this.updatePageTab(pageId, { name: newName, dirty: true });

    // Update hierarchy tree
    try { 
      renderHierarchyTreeModule(this.editor); 
    } catch (_) {}

    return true;
  }

  /**
   * Get all page IDs
   */
  getAllPageIds() {
    if (this.pageTabs) {
      return this.pageTabs.getAllPageIds();
    }
    return [];
  }

  /**
   * Get current page ID
   */
  getCurrentPageId() {
    return this.currentPageId;
  }

  /**
   * Check if page exists
   */
  hasPage(pageId) {
    return this.editor.currentProject?.pages?.has(pageId) || false;
  }

  /**
   * Get page count
   */
  getPageCount() {
    return this.editor.currentProject?.pages?.size || 0;
  }

  /**
   * Get pages with unsaved changes
   */
  getDirtyPages() {
    if (!this.editor.currentProject?.pages) return [];
    
    return Array.from(this.editor.currentProject.pages.entries())
      .filter(([_, pageData]) => pageData.dirty)
      .map(([pageId, pageData]) => ({ id: pageId, name: pageData.name }));
  }

  /**
   * Check if any pages have unsaved changes
   */
  hasUnsavedChanges() {
    return this.getDirtyPages().length > 0;
  }

  /**
   * Helper to ask ribbon to recompute Save/Save All enablement
   */
  refreshRibbonSaveButtons() {
    const ribbon = document.querySelector('ribbon-toolbar');
    if (ribbon?.refreshSaveButtons) {
      ribbon.refreshSaveButtons();
    }
  }

  /**
   * Update save buttons (called by hierarchyManager.persistProject)
   */
  updateSaveButtons() {
    this.refreshRibbonSaveButtons();
  }

  /**
   * Clear all pages
   */
  clearAllPages() {
    if (this.pageTabs) {
      this.pageTabs.clearTabs();
    }
    if (this.editor.canvasManager) {
      this.editor.canvasManager.clearAllCanvases();
    }
    this.currentPageId = null;
    this.editor.currentPageId = null;
  }

  /**
   * Export page as standalone HTML
   */
  exportPage(pageId = null) {
    const targetPageId = pageId || this.currentPageId;
    if (!targetPageId) return;

    const pageData = this.getPageData(targetPageId);
    if (!pageData) return;

    // Switch to page if not current
    const wasCurrentPage = targetPageId === this.currentPageId;
    if (!wasCurrentPage) {
      this.switchToPage(targetPageId);
    }

    // Export using export manager
    if (this.editor.exportManager) {
      this.editor.exportManager.exportHTML();
    }

    // Switch back if needed
    if (!wasCurrentPage && this.currentPageId) {
      this.switchToPage(this.currentPageId);
    }
  }

  /**
   * Get page statistics
   */
  getPageStats(pageId = null) {
    const targetPageId = pageId || this.currentPageId;
    if (!targetPageId) return null;

    const pageData = this.getPageData(targetPageId);
    if (!pageData) return null;

    // Switch to page temporarily to get stats
    const wasCurrentPage = targetPageId === this.currentPageId;
    if (!wasCurrentPage) {
      this.switchToPage(targetPageId);
    }

    const elements = this.editor.canvas.querySelectorAll('.editable-element');
    const elementTypes = {};
    
    elements.forEach(el => {
      const type = el.getAttribute('data-type') || 'unknown';
      elementTypes[type] = (elementTypes[type] || 0) + 1;
    });

    const stats = {
      id: targetPageId,
      name: pageData.name,
      elementCount: elements.length,
      elementTypes,
      isDirty: pageData.dirty,
      createdAt: pageData.createdAt,
      updatedAt: pageData.updatedAt
    };

    // Switch back if needed
    if (!wasCurrentPage && this.currentPageId) {
      this.switchToPage(this.currentPageId);
    }

    return stats;
  }
}
