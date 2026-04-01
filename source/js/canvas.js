// Canvas setup extracted to a module with integrated zoom and resize functionality
// Usage: import { setupCanvas, setupResizeSystem, zoomIn, zoomOut, resetZoom, applyZoom, updateZoomDisplay } from './canvas.js';

export function setupCanvas(editor) {
  const canvas = editor.canvas;
  const placeholder = editor.placeholder;

  // Use event delegation for better performance
  canvas.addEventListener('click', (e) => {
    const target = e.target;
    
    // Clear selection when clicking empty canvas
    if (target === canvas || target === placeholder) {
      editor.clearSelection?.();
      return;
    }

    // Handle element selection
    const element = target.classList.contains('editable-element') ? target : target.closest('.editable-element');
    if (element) {
      if ((e.ctrlKey || e.metaKey || e.shiftKey) && !element.hasAttribute('data-locked')) {
        // Multi-select mode
        editor.toggleElementSelection?.(element);
      } else {
        // Single select mode
        editor.clearSelection?.();
        editor.selectElement?.(element);
      }
      e.stopPropagation();
    }
  }, { passive: false });

  // Start marquee selection when mousing down on empty canvas area
  canvas.addEventListener('mousedown', (e) => {
    // Only left button and only when not starting on an element or handle
    if (e.button !== 0) return;
    
    const target = e.target;
    const isOnElement = target.classList.contains('editable-element') || target.closest('.editable-element');
    const isOnHandleOrBtn = target.classList.contains('resize-handle') || target.classList.contains('action-btn');
    
    if (!isOnElement && !isOnHandleOrBtn) {
      editor.startMarqueeSelection?.(e);
    }
  }, { passive: false });

  // Setup zoom controls
  setupZoomControls(editor);
  
  // Setup resize system
  setupResizeSystem(editor);
}

// Zoom functionality integrated into canvas module
export function setupZoomControls(editor) {
  // Mouse wheel zoom on canvas with throttling for better performance
  if (editor.canvas) {
    let zoomThrottle = null;
    
    editor.canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Throttle zoom operations for better performance
        if (!zoomThrottle) {
          zoomThrottle = requestAnimationFrame(() => {
            if (e.deltaY < 0) {
              zoomIn(editor);
            } else {
              zoomOut(editor);
            }
            zoomThrottle = null;
          });
        }
      }
    }, { passive: false });
  }

  updateZoomDisplay(editor);
}

export function zoomIn(editor) {
  if (editor.zoomLevel < editor.maxZoom) {
    editor.zoomLevel = Math.min(editor.zoomLevel * 1.2, editor.maxZoom);
    applyZoom(editor);
  }
}

export function zoomOut(editor) {
  if (editor.zoomLevel > editor.minZoom) {
    editor.zoomLevel = Math.max(editor.zoomLevel / 1.2, editor.minZoom);
    applyZoom(editor);
  }
}

export function resetZoom(editor) {
  editor.zoomLevel = 1;
  applyZoom(editor);
  if (typeof editor.centerCanvas === 'function') {
    editor.centerCanvas();
  }
}

export function applyZoom(editor) {
  if (editor.canvas) {
    editor.canvas.style.transform = `scale(${editor.zoomLevel})`;
  }
  updateZoomDisplay(editor);

  // Update adorners for selected element if any
  if (editor.selectedElement && typeof editor.updateAdorners === 'function') {
    editor.updateAdorners(editor.selectedElement);
  }

  // Center canvas in its container when zooming
  if (typeof editor.centerCanvas === 'function') {
    editor.centerCanvas();
  }
}

export function updateZoomDisplay(editor) {
  // Cache zoom input for better performance
  if (!editor._zoomInput) {
    editor._zoomInput = document.getElementById('zoomLevel');
  }
  
  if (editor._zoomInput) {
    editor._zoomInput.value = Math.round(editor.zoomLevel * 100);
  }
}

// Resize and drag system functionality integrated into canvas module
export function setupResizeSystem(editor) {
  document.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('resize-handle')) {
      e.preventDefault();
      // Find the element being resized
      const element = e.target.closest('.editable-element');
      const direction = Array.from(e.target.classList).find(c => ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].includes(c));
      if (element && direction && editor.startResize) {
        editor.startResize(e, element, direction);
      }
    } else if (e.target.classList.contains('editable-element') || e.target.closest('.editable-element')) {
      const element = e.target.classList.contains('editable-element') ? e.target : e.target.closest('.editable-element');
      if (element && !element.hasAttribute('data-locked') && editor.startDrag) {
        editor.startDrag(e);
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (editor.isResizing && editor.performResize) {
      e.preventDefault();
      editor.performResize(e);
    } else if (editor.isDragging && editor.currentLayoutMode === 'freeform' && editor.performDrag) {
      e.preventDefault();
      editor.performDrag(e);
    }
  });

  document.addEventListener('mouseup', () => {
    if (editor.isResizing && editor.endResize) {
      editor.endResize();
    }
    if (editor.isDragging && editor.endDrag) {
      editor.endDrag();
    }
  });
}
