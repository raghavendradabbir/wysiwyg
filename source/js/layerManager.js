// Layer Manager extracted to a separate module
// Usage: import { setupLayerManager, updateLayersList, renderLayersList, selectLayerById, handleLayerAction, moveLayerUp, moveLayerDown, duplicateLayer, deleteLayer } from './layerManager.js';

// Helper function to ensure canvas is available
function ensureCanvas(editor) {
  if (!editor.canvas) {
    // Try to get active canvas from canvas manager
    if (editor.canvasManager && editor.canvasManager.getActiveCanvas) {
      editor.canvas = editor.canvasManager.getActiveCanvas();
    }
  }
  return editor.canvas;
}

export function setupLayerManager(editor) {
  // Cache layer control buttons for performance
  const layerButtons = {
    up: document.getElementById('moveLayerUp'),
    down: document.getElementById('moveLayerDown'),
    duplicate: document.getElementById('duplicateLayer'),
    delete: document.getElementById('deleteLayer')
  };

  // Add event listeners with better performance
  layerButtons.up?.addEventListener('click', () => moveLayerUp(editor), { passive: true });
  layerButtons.down?.addEventListener('click', () => moveLayerDown(editor), { passive: true });
  layerButtons.duplicate?.addEventListener('click', () => duplicateLayer(editor), { passive: true });
  layerButtons.delete?.addEventListener('click', () => deleteLayer(editor), { passive: true });

  updateLayersList(editor);
}

export function updateLayersList(editor) {
  // Lazy load layers list element for better performance
  if (!editor.layersList) {
    editor.layersList = document.getElementById('layersList');
    if (!editor.layersList) {
      // Defer until sidebar DOM is ready
      return;
    }
  }

  // Ensure canvas is available (with tabbed system, it might be null initially)
  const canvas = ensureCanvas(editor);
  if (!canvas) {
    editor.layersList.innerHTML = '<div class="no-layers">No active canvas</div>';
    return;
  }

  // Use more efficient element selection and mapping
  const elements = canvas.querySelectorAll('.editable-element');
  const layersArray = [];
  
  elements.forEach((element, index) => {
    layersArray.push({
      id: element.id,
      name: getLayerName(editor, element),
      type: element.getAttribute('data-type'),
      element: element,
      visible: element.style.display !== 'none',
      locked: element.hasAttribute('data-locked'),
      zIndex: parseInt(element.style.zIndex) || (elements.length - index)
    });
  });
  
  // Sort by z-index for proper layer ordering
  editor.layers = layersArray.sort((a, b) => b.zIndex - a.zIndex);

  renderLayersList(editor);
}

export function getLayerName(editor, element) {
  const type = element.getAttribute('data-type');
  const customName = element.getAttribute('data-layer-name');
  if (customName) return customName;

  // Handle CH5 components
  if (type && type.startsWith('ch5-')) {
    const ch5Element = element.querySelector(type);
    if (ch5Element) {
      const label = ch5Element.getAttribute('label');
      if (label && type === 'ch5-button') {
        return `${type}: ${label}`;
      }
      const placeholder = ch5Element.getAttribute('placeholder');
      if (placeholder && type === 'ch5-textinput') {
        return `${type}: ${placeholder}`;
      }
    }
    return type;
  }

  switch (type) {
    case 'heading': {
      const heading = element.querySelector('.element-heading');
      return heading ? `Heading: ${heading.textContent.substring(0, 20)}...` : 'Heading';
    }
    case 'paragraph': {
      const paragraph = element.querySelector('.element-paragraph');
      return paragraph ? `Text: ${paragraph.textContent.substring(0, 20)}...` : 'Text';
    }
    case 'button': {
      const button = element.querySelector('.element-button');
      return button ? `Button: ${button.textContent}` : 'Button';
    }
    case 'image':
      return 'Image';
    case 'list':
      return 'List';
    case 'divider':
      return 'Divider';
    case 'container':
      return 'Container';
    case 'spacer':
      return 'Spacer';
    default:
      return 'Element';
  }
}

export function getLayerIcon(type) {
  switch (type) {
    case 'heading': return '<i class="fas fa-heading" aria-hidden="true"></i>';
    case 'paragraph': return '<i class="fas fa-align-left" aria-hidden="true"></i>';
    case 'button': return '<i class="fas fa-square" aria-hidden="true"></i>';
    case 'image': return '<i class="fas fa-image" aria-hidden="true"></i>';
    case 'list': return '<i class="fas fa-list" aria-hidden="true"></i>';
    case 'divider': return '<i class="fas fa-minus" aria-hidden="true"></i>';
    case 'container': return '<i class="fas fa-box" aria-hidden="true"></i>';
    case 'spacer': return '<i class="fas fa-arrows-alt-h" aria-hidden="true"></i>';
    default: return '<i class="fas fa-shapes" aria-hidden="true"></i>';
  }
}

export function renderLayersList(editor) {
  // Lazily resolve layersList and bail if still unavailable
  if (!editor.layersList) {
    editor.layersList = document.getElementById('layersList');
    if (!editor.layersList) return;
  }

  // Initialize layers array if it doesn't exist
  if (!editor.layers) {
    editor.layers = [];
  }

  if (editor.layers.length === 0) {
    editor.layersList.innerHTML = '<div class="no-layers">No layers available</div>';
    return;
  }

  const layersHTML = editor.layers.map(layer => `
      <div class="layer-item ${layer.id === editor.selectedLayerId ? 'selected' : ''} ${!layer.visible ? 'hidden' : ''}" 
           data-layer-id="${layer.id}">
        <div class="layer-icon">${getLayerIcon(layer.type)}</div>
        <div class="layer-name">${layer.name}</div>
        <div class="layer-actions">
          <button class="layer-action-btn visibility" data-action="toggle-visibility" title="${layer.visible ? 'Hide' : 'Show'}">
            ${layer.visible ? '<i class="fas fa-eye" aria-hidden="true"></i>' : '<i class="fas fa-eye-slash" aria-hidden="true"></i>'}
          </button>
          <button class="layer-action-btn lock" data-action="toggle-lock" title="${layer.locked ? 'Unlock' : 'Lock'}">
            ${layer.locked ? '<i class="fas fa-lock" aria-hidden="true"></i>' : '<i class="fas fa-unlock" aria-hidden="true"></i>'}
          </button>
          <button class="layer-action-btn delete" data-action="delete" title="Delete"><i class="fas fa-trash" aria-hidden="true"></i></button>
        </div>
      </div>
    `).join('');

  editor.layersList.innerHTML = layersHTML;

  // Add event listeners
  editor.layersList.querySelectorAll('.layer-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('layer-action-btn')) {
        const layerId = item.dataset.layerId;
        selectLayerById(editor, layerId);
      }
    });
  });

  // Schema-driven CH5 attribute inputs
  const ch5SchemaPropInputs = document.querySelectorAll('.ch5-schema-prop');
  ch5SchemaPropInputs.forEach(input => {
    const handler = (e) => {
      const attr = e.target.getAttribute('data-attr');
      const type = editor.selectedElement?.getAttribute('data-type');
      const ch5Element = editor.selectedElement?.querySelector(type);
      if (!ch5Element || !attr) return;
      if (e.target.type === 'checkbox') {
        ch5Element.setAttribute(attr, e.target.checked ? 'true' : 'false');
      } else {
        ch5Element.setAttribute(attr, e.target.value);
      }
      editor.saveState?.();
    };
    input.addEventListener('change', handler);
    input.addEventListener('input', handler);
  });

  editor.layersList.querySelectorAll('.layer-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layerItem = e.target.closest('.layer-item');
      const actionBtn = e.target.closest('.layer-action-btn');
      const layerId = layerItem?.dataset.layerId;
      const action = actionBtn?.dataset.action;
      if (layerId && action) {
        handleLayerAction(editor, layerId, action);
      }
    });
  });
}

export function selectLayerById(editor, layerId) {
  const element = document.getElementById(layerId);
  if (element) {
    editor.clearSelection?.();
    editor.selectElement?.(element);
    editor.selectedLayerId = layerId;
    renderLayersList(editor);
  }
}

export function handleLayerAction(editor, layerId, action) {
  const layer = editor.layers.find(l => l.id === layerId);
  if (!layer) return;

  switch (action) {
    case 'toggle-visibility':
      layer.element.style.display = layer.visible ? 'none' : '';
      break;
    case 'toggle-lock':
      if (layer.locked) {
        layer.element.removeAttribute('data-locked');
      } else {
        layer.element.setAttribute('data-locked', 'true');
      }
      break;
    case 'delete':
      if (confirm('Delete this layer?')) {
        layer.element.remove();
        if (editor.selectedElement === layer.element) {
          editor.selectedElement = null;
          editor.selectedLayerId = null;
          editor.updatePropertiesPanel?.();
        }
        editor.updatePlaceholder?.();
      }
      break;
  }

  updateLayersList(editor);
  editor.saveState?.();
}

export function moveLayerUp(editor) {
  if (!editor.selectedLayerId) return;

  const layer = editor.layers.find(l => l.id === editor.selectedLayerId);
  if (!layer) return;

  const currentZ = parseInt(layer.element.style.zIndex) || 0;
  layer.element.style.zIndex = currentZ + 1;

  updateLayersList(editor);
  editor.saveState?.();
}

export function moveLayerDown(editor) {
  if (!editor.selectedLayerId) return;

  const layer = editor.layers.find(l => l.id === editor.selectedLayerId);
  if (!layer) return;

  const currentZ = parseInt(layer.element.style.zIndex) || 0;
  layer.element.style.zIndex = Math.max(0, currentZ - 1);

  updateLayersList(editor);
  editor.saveState?.();
}

export function duplicateLayer(editor) {
  if (!editor.selectedLayerId) return;

  const layer = editor.layers.find(l => l.id === editor.selectedLayerId);
  if (!layer) return;

  editor.handleElementAction?.(layer.element, 'duplicate');
  updateLayersList(editor);
}

export function deleteLayer(editor) {
  if (!editor.selectedLayerId) return;

  if (confirm('Delete the selected layer?')) {
    const layer = editor.layers.find(l => l.id === editor.selectedLayerId);
    if (layer) {
      editor.handleElementAction?.(layer.element, 'delete');
      editor.selectedLayerId = null;
      updateLayersList(editor);
    }
  }
}
