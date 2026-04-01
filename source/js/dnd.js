// Drag-and-drop logic extracted into a module
// Usage: import { setupDragAndDrop } from './dnd.js';

export function setupDragAndDrop(editor) {
  // With the new tabbed system, canvas might not be available initially
  // We'll set up event delegation on the canvas container instead
  const canvasContainer = document.querySelector('.device-screen');
  if (!canvasContainer) {
    console.warn('Canvas container not found, skipping drag and drop setup');
    return;
  }

  // Helper function to get the currently active canvas
  const getActiveCanvas = () => {
    // First try to get from editor if available
    if (editor.canvas && editor.canvas.style.display !== 'none') {
      return editor.canvas;
    }
    
    // Try to get from canvas manager if available
    if (editor.canvasManager && editor.canvasManager.getActiveCanvas) {
      return editor.canvasManager.getActiveCanvas();
    }
    
    // Otherwise find the visible canvas in the container
    const canvases = canvasContainer.querySelectorAll('.canvas');
    for (const canvas of canvases) {
      if (canvas.style.display !== 'none') {
        return canvas;
      }
    }
    
    // If no canvas has explicit display style, return the first one
    return canvases[0] || null;
  };
  
  // Define whitelist of allowed component types for better security
  const allowedTypes = new Set([
    // Basic components
    'heading', 'paragraph', 'text', 'image', 'button', 'list', 'divider', 'container', 'spacer'
    // CH5 components are validated with startsWith('ch5-') check
  ]);
  
  // Cache drag items for better performance
  let dragItems = null;
  const getDragItems = () => {
    if (!dragItems) {
      dragItems = document.querySelectorAll('.drag-item');
    }
    return dragItems;
  };

  // Setup drag handlers for sidebar items with event delegation for better performance
  const setupDragHandlers = () => {
    getDragItems().forEach(item => {
      if (!item.hasAttribute('data-drag-setup')) {
        item.addEventListener('dragstart', handleDragStart, { passive: false });
        item.addEventListener('dragend', handleDragEnd, { passive: true });
        item.setAttribute('data-drag-setup', 'true');
      }
    });
  };
  
  const handleDragStart = (e) => {
    const type = e.target.dataset.type;
    if (!type) return;
    
    // Mark this drag as originating from our sidebar
    e.dataTransfer.setData('application/x-wysiwyg-source', 'sidebar');
    e.dataTransfer.setData('application/x-wysiwyg-type', type);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
    e.target.classList.add('dragging');
  };
  
  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };
  
  // Initial setup
  setupDragHandlers();
  
  // Re-setup when new items are added (for dynamic components)
  const observer = new MutationObserver(() => {
    setupDragHandlers();
  });
  
  const leftSidebar = document.querySelector('left-sidebar');
  if (leftSidebar) {
    observer.observe(leftSidebar, { childList: true, subtree: true });
  }

  // Canvas drag target with throttled drop indicator for better performance
  let dropIndicatorThrottle = null;
  
  canvasContainer.addEventListener('dragover', (e) => {
    // Check if a sidebar item is currently being dragged
    const draggingEl = document.querySelector('.drag-item.dragging');
    if (draggingEl) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      
      // Find the active canvas within the container
      const activeCanvas = getActiveCanvas();
      if (activeCanvas) {
        activeCanvas.classList.add('drag-over');
      }
      
      // Throttle drop indicator updates for better performance
      if (!dropIndicatorThrottle) {
        dropIndicatorThrottle = requestAnimationFrame(() => {
          showDropIndicator(editor, e);
          dropIndicatorThrottle = null;
        });
      }
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }, { passive: false });

  canvasContainer.addEventListener('dragleave', (e) => {
    const activeCanvas = getActiveCanvas();
    if (activeCanvas && !activeCanvas.contains(e.relatedTarget)) {
      activeCanvas.classList.remove('drag-over');
      hideDropIndicators();
    }
  });

  canvasContainer.addEventListener('drop', (e) => {
    const source = e.dataTransfer.getData('application/x-wysiwyg-source');
    let elementType = e.dataTransfer.getData('application/x-wysiwyg-type') || e.dataTransfer.getData('text/plain');
    const draggingEl = document.querySelector('.drag-item.dragging');

    // Fallback: if dataTransfer doesn't carry type on drop, read it from the dragging element
    if (!elementType && draggingEl) {
      elementType = draggingEl.dataset.type;
    }

    // Accept only if originated from our sidebar (or active draggingEl) and type is allowed
    if ((source === 'sidebar' || draggingEl) && elementType && (allowedTypes.has(elementType) || elementType.startsWith('ch5-'))) {
      e.preventDefault();
      
      // Find the active canvas and remove drag-over class
      const activeCanvas = getActiveCanvas();
      if (activeCanvas) {
        activeCanvas.classList.remove('drag-over');
        // Update editor.canvas reference to the active canvas
        editor.canvas = activeCanvas;
      }
      
      hideDropIndicators();

      if (activeCanvas) {
        const rect = activeCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        editor.createElement?.(elementType, { x, y });
      }
    } else {
      // Otherwise, ignore drop
      const activeCanvas = getActiveCanvas();
      if (activeCanvas) {
        activeCanvas.classList.remove('drag-over');
      }
      hideDropIndicators();
    }
  });
}

function showDropIndicator(editor, e) {
  const canvas = editor.canvas;
  if (!canvas) return; // No active canvas
  
  hideDropIndicators();

  if (editor.currentLayoutMode === 'responsive') {
    const elements = canvas.querySelectorAll('.editable-element');
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;

    let insertIndex = elements.length;

    // More efficient loop without creating array
    for (let i = 0; i < elements.length; i++) {
      const elementRect = elements[i].getBoundingClientRect();
      const elementMiddle = elementRect.top - rect.top + elementRect.height / 2;

      if (y < elementMiddle) {
        insertIndex = i;
        break;
      }
    }

    // Create indicator more efficiently
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator horizontal active';
    indicator.id = 'drop-indicator';

    if (insertIndex < elements.length) {
      elements[insertIndex].parentNode.insertBefore(indicator, elements[insertIndex]);
    } else {
      canvas.appendChild(indicator);
    }
  }
}

function hideDropIndicators() {
  // More efficient removal
  const indicators = document.querySelectorAll('.drop-indicator');
  for (const indicator of indicators) {
    indicator.remove();
  }
}
