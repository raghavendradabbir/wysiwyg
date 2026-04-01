// State helpers extracted to a module
// Usage: import { updatePlaceholder, saveState } from './state.js';

export function updatePlaceholder(editor) {
  // With the new tabbed system, find the placeholder in the active canvas
  let placeholder = null;
  
  if (editor.canvas) {
    // First try to find placeholder in the active canvas
    placeholder = editor.canvas.querySelector('.canvas-placeholder');
    
    // If not found, try the legacy ID-based approach
    if (!placeholder) {
      placeholder = document.getElementById('placeholder');
    }
  } else {
    // Fallback to ID-based approach if no active canvas
    placeholder = document.getElementById('placeholder');
  }
  
  if (placeholder && editor.canvas) {
    const hasElements = editor.canvas.querySelectorAll('.editable-element').length > 0;
    placeholder.classList.toggle('hidden', hasElements);
  }
}

export function saveState(editor, options = {}) {
  // Delegate to HistoryManager if available, otherwise use legacy approach
  if (editor.historyManager) {
    editor.historyManager.saveState(options);
    return;
  }

  // Legacy approach for backward compatibility
  const { suppressDirty = false } = options;
  const tempSelected = editor.selectedElement;
  if (tempSelected) {
    tempSelected.classList.remove('selected');
  }

  const state = {
    content: editor.canvas ? editor.canvas.innerHTML : '',
    device: editor.currentDevice,
    layoutMode: editor.currentLayoutMode,
    elementCounter: editor.elementCounter || (editor.elementManager?.elementCounter),
    selectedLayerId: editor.selectedLayerId,
    zoomLevel: editor.zoomLevel
  };

  if (tempSelected) {
    tempSelected.classList.add('selected');
  }

  // Initialize history arrays if they don't exist
  if (!editor.history) editor.history = [];
  if (typeof editor.historyIndex !== 'number') editor.historyIndex = -1;

  editor.history = editor.history.slice(0, editor.historyIndex + 1);
  editor.history.push(JSON.stringify(state));
  editor.historyIndex++;

  if (editor.history.length > (editor.maxHistorySize || 50)) {
    editor.history.shift();
    editor.historyIndex--;
  }

  // Mark current page as dirty for unsaved changes (asterisk in Pages list)
  if (!suppressDirty) {
    editor.markCurrentPageDirty?.(true);
  }
}
