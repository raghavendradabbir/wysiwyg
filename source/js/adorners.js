// Adorners module: adds resize handles, action buttons, and label to editable elements
// Usage: import { setupAdorners } from './adorners.js';

export function addAdorners(editor, element) {
  removeAdorners(editor, element);

  const adorner = document.createElement('div');
  adorner.className = 'element-adorner';

  // Add resize handles more efficiently
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const fragment = document.createDocumentFragment();
  
  handles.forEach(direction => {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${direction}`;
    handle.addEventListener('mousedown', (e) => editor.startResize(e, element, direction), { passive: false });
    fragment.appendChild(handle);
  });
  
  adorner.appendChild(fragment);

  // Add action buttons more efficiently
  const actions = document.createElement('div');
  actions.className = 'element-actions';
  
  // Create buttons programmatically for better performance
  const duplicateBtn = document.createElement('button');
  duplicateBtn.className = 'action-btn duplicate';
  duplicateBtn.dataset.action = 'duplicate';
  duplicateBtn.title = 'Duplicate';
  duplicateBtn.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i>';
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn delete';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.title = 'Delete';
  deleteBtn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
  
  actions.appendChild(duplicateBtn);
  actions.appendChild(deleteBtn);
  adorner.appendChild(actions);

  // Add element label
  const label = document.createElement('div');
  label.className = 'element-label';
  label.textContent = editor.getElementLabel(element);
  adorner.appendChild(label);

  // Add event listeners for actions with better performance
  actions.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target.closest('.action-btn');
    const action = btn?.dataset.action;
    if (action) {
      editor.handleElementAction(element, action);
    }
  }, { passive: false });

  element.appendChild(adorner);
  updateAdorners(editor, element);
}

export function removeAdorners(editor, element) {
  const adorner = element.querySelector('.element-adorner');
  if (adorner) {
    adorner.remove();
  }
}

export function updateAdorners(editor, element) {
  const adorner = element.querySelector('.element-adorner');
  if (!adorner) return;

  // Ensure adorner covers the entire element
  adorner.style.position = 'absolute';
  adorner.style.top = '0';
  adorner.style.left = '0';
  adorner.style.right = '0';
  adorner.style.bottom = '0';
  adorner.style.pointerEvents = 'none';
  adorner.style.zIndex = '100';

  // Enable pointer events for interactive elements more efficiently
  const handles = adorner.querySelectorAll('.resize-handle');
  const actions = adorner.querySelector('.element-actions');
  const label = adorner.querySelector('.element-label');

  // Use for...of for better performance
  for (const handle of handles) {
    handle.style.pointerEvents = 'auto';
  }
  
  if (actions) actions.style.pointerEvents = 'auto';
  if (label) label.style.pointerEvents = 'auto';
}

export function setupAdorners(editor) {
  // Attach methods onto the editor instance for seamless usage
  editor.addAdorners = (element) => addAdorners(editor, element);
  editor.removeAdorners = (element) => removeAdorners(editor, element);
  editor.updateAdorners = (element) => updateAdorners(editor, element);
}
