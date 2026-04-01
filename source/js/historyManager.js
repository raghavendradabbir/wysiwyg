import { updatePlaceholder as updatePlaceholderModule } from './state.js';
import { updateLayersList as updateLayersListModule } from './layerManager.js';

/**
 * HistoryManager - Handles undo/redo functionality and state management
 */
export class HistoryManager {
  constructor(editor) {
    this.editor = editor;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50;
  }

  /**
   * Save current state to history
   */
  saveState(options = {}) {
    const { suppressDirty = false } = options;

    // Create state snapshot
    const state = {
      content: this.editor.canvas ? this.editor.canvas.innerHTML : '',
      elementCounter: this.editor.elementManager?.elementCounter || this.editor.elementCounter || 0,
      timestamp: new Date().toISOString(),
      layoutMode: this.editor.currentLayoutMode,
      device: this.editor.currentDevice,
      zoomLevel: this.editor.zoomLevel
    };

    // Remove any states after current index (when undoing and then making new changes)
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Add new state
    this.history.push(JSON.stringify(state));
    this.historyIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }

    // Mark page as dirty unless suppressed
    if (!suppressDirty && this.editor.markCurrentPageDirty) {
      this.editor.markCurrentPageDirty(true);
    }
  }

  /**
   * Undo last action
   */
  undo() {
    if (this.canUndo()) {
      this.historyIndex--;
      this.restoreState();
      return true;
    }
    return false;
  }

  /**
   * Redo last undone action
   */
  redo() {
    if (this.canRedo()) {
      this.historyIndex++;
      this.restoreState();
      return true;
    }
    return false;
  }

  /**
   * Check if undo is possible
   */
  canUndo() {
    return this.historyIndex > 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Restore state from history
   */
  restoreState() {
    if (this.historyIndex < 0 || this.historyIndex >= this.history.length) {
      return;
    }

    try {
      const state = JSON.parse(this.history[this.historyIndex]);
      
      // Restore canvas content
      if (this.editor.canvas) {
        this.editor.canvas.innerHTML = state.content;
      }
      
      // Restore editor state
      if (this.editor.elementManager) {
        this.editor.elementManager.elementCounter = state.elementCounter || 0;
      } else {
        this.editor.elementCounter = state.elementCounter || 0;
      }
      
      // Clear selection
      this.editor.selectedElement = null;
      this.editor.selectedLayerId = null;
      this.editor.selectedElements?.clear();

      // Restore layout mode if different
      if (state.layoutMode && state.layoutMode !== this.editor.currentLayoutMode) {
        this.editor.currentLayoutMode = state.layoutMode;
        this.updateLayoutModeUI(state.layoutMode);
      }

      // Restore device if different
      if (state.device && state.device !== this.editor.currentDevice) {
        this.editor.currentDevice = state.device;
        this.updateDeviceUI(state.device);
      }

      // Restore zoom level if different
      if (state.zoomLevel && state.zoomLevel !== this.editor.zoomLevel) {
        this.editor.zoomLevel = state.zoomLevel;
        this.updateZoomUI(state.zoomLevel);
      }

      // Update UI
      updatePlaceholderModule(this.editor);
      this.reattachEventListeners();
      updateLayersListModule(this.editor);

      // Update properties panel
      this.editor.updatePropertiesPanel?.();

    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  /**
   * Reattach event listeners after state restoration
   */
  reattachEventListeners() {
    if (!this.editor.canvas) return;
    
    const elements = this.editor.canvas.querySelectorAll('.editable-element');
    elements.forEach(element => {
      // Remove existing listeners to avoid duplicates
      this.removeElementEventListeners(element);
      
      // Add event listeners
      if (this.editor.elementManager) {
        this.editor.elementManager.addElementEventListeners(element);
      } else {
        this.editor.addElementEventListeners?.(element);
      }

      // Add adorners for freeform mode
      if (this.editor.currentLayoutMode === 'freeform' && !element.querySelector('.element-adorner')) {
        this.editor.addAdorners?.(element);
      }
    });
  }

  /**
   * Remove event listeners from element
   */
  removeElementEventListeners(element) {
    // Clone element to remove all event listeners
    const newElement = element.cloneNode(true);
    element.parentNode?.replaceChild(newElement, element);
    return newElement;
  }

  /**
   * Update layout mode UI
   */
  updateLayoutModeUI(layoutMode) {
    // Update ribbon toolbar if present
    const ribbon = document.querySelector('ribbon-toolbar');
    if (ribbon?.updateLayoutMode) {
      ribbon.updateLayoutMode(layoutMode);
    }

    // Update canvas class
    if (layoutMode === 'responsive') {
      this.editor.canvas.classList.add('responsive');
      this.editor.canvas.classList.remove('freeform');
    } else {
      this.editor.canvas.classList.add('freeform');
      this.editor.canvas.classList.remove('responsive');
    }
  }

  /**
   * Update device UI
   */
  updateDeviceUI(device) {
    // Update ribbon toolbar if present
    const ribbon = document.querySelector('ribbon-toolbar');
    if (ribbon?.updateDevice) {
      ribbon.updateDevice(device);
    }
  }

  /**
   * Update zoom UI
   */
  updateZoomUI(zoomLevel) {
    // Update canvas zoom
    if (this.editor.canvas) {
      this.editor.canvas.style.transform = `scale(${zoomLevel})`;
    }

    // Update ribbon toolbar if present
    const ribbon = document.querySelector('ribbon-toolbar');
    if (ribbon?.updateZoom) {
      ribbon.updateZoom(zoomLevel);
    }
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * Get current history state
   */
  getCurrentState() {
    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      return JSON.parse(this.history[this.historyIndex]);
    }
    return null;
  }

  /**
   * Get history info
   */
  getHistoryInfo() {
    return {
      currentIndex: this.historyIndex,
      totalStates: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      maxSize: this.maxHistorySize
    };
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size) {
    this.maxHistorySize = Math.max(1, size);
    
    // Trim history if it exceeds new limit
    if (this.history.length > this.maxHistorySize) {
      const excess = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(excess);
      this.historyIndex = Math.max(0, this.historyIndex - excess);
    }
  }

  /**
   * Get state at specific index
   */
  getStateAtIndex(index) {
    if (index >= 0 && index < this.history.length) {
      return JSON.parse(this.history[index]);
    }
    return null;
  }

  /**
   * Jump to specific state
   */
  jumpToState(index) {
    if (index >= 0 && index < this.history.length) {
      this.historyIndex = index;
      this.restoreState();
      return true;
    }
    return false;
  }

  /**
   * Create checkpoint (named state)
   */
  createCheckpoint(name) {
    const currentState = this.getCurrentState();
    if (currentState) {
      currentState.checkpoint = name;
      currentState.checkpointTime = new Date().toISOString();
      this.history[this.historyIndex] = JSON.stringify(currentState);
    }
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints() {
    return this.history
      .map((stateStr, index) => {
        try {
          const state = JSON.parse(stateStr);
          if (state.checkpoint) {
            return {
              index,
              name: state.checkpoint,
              timestamp: state.checkpointTime || state.timestamp
            };
          }
        } catch (e) {
          // Ignore invalid states
        }
        return null;
      })
      .filter(Boolean);
  }

  /**
   * Export history
   */
  exportHistory() {
    return {
      history: this.history,
      currentIndex: this.historyIndex,
      maxSize: this.maxHistorySize,
      exportTime: new Date().toISOString()
    };
  }

  /**
   * Import history
   */
  importHistory(historyData) {
    try {
      if (historyData.history && Array.isArray(historyData.history)) {
        this.history = historyData.history;
        this.historyIndex = historyData.currentIndex || -1;
        this.maxHistorySize = historyData.maxSize || 50;
        
        // Validate history index
        if (this.historyIndex >= this.history.length) {
          this.historyIndex = this.history.length - 1;
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to import history:', error);
    }
    return false;
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage() {
    const totalSize = this.history.reduce((sum, state) => sum + state.length, 0);
    return {
      totalStates: this.history.length,
      totalSizeBytes: totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      averageStateSize: Math.round(totalSize / this.history.length) || 0
    };
  }
}
