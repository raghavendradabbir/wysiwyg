// Integrated Hierarchy Manager: handles Solution > Project > Page tree structure
// Usage: import { setupHierarchyManager } from './hierarchyManager.js';

import { renderLayersList as renderLayersListModule } from './layerManager.js';
import { updatePlaceholder as updatePlaceholderModule } from './state.js';
import ProjectDataManager from './projectDataManager.js';

// Singleton-style Hierarchy Manager
class HierarchyManagerClass {
  constructor() {
    this.solutions = new Map();
    this.currentSolutionId = null;
    this.currentProjectId = null;
    this.currentPageId = null;
    this.solutionCounter = 0;
    this.editingItemId = null;
    this.editingOriginalName = null;
    this.editingType = null; // 'solution', 'project', or 'page'
    this.storageKey = 'wysiwyg_hierarchy_v1';
    this.expandedItems = new Set(); // Track expanded tree items
  }
}

const HierarchyManager = new HierarchyManagerClass();

// Helper: generate stable ID for project identification (same logic as startup-modal)
function generateStableId({ projectName, solutionName, createdOn }) {
  const base = `${projectName || ''}::${solutionName || ''}::${createdOn || ''}`;
  // Simple hash
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = ((h << 5) - h) + base.charCodeAt(i);
    h |= 0;
  }
  return `proj_${Math.abs(h)}`;
}

// Public: load project data from localStorage on demand (used by StartupModal 'Open')
export function loadPersistedProject(editor, projectId = null) {
  return loadAllData(editor, projectId);
}

// Helper: compute next globally unique page id of the form page-<n>
function getNextGlobalPageId() {
  let max = 0;
  for (const solution of HierarchyManager.solutions.values()) {
    for (const project of solution.projects.values()) {
      for (const page of project.pages.values()) {
        const m = page.id && page.id.match(/page-(\d+)/);
        if (m) max = Math.max(max, parseInt(m[1]));
      }
    }
  }
  return `page-${max + 1}`;
}

// State access functions
export function getCurrentSolutionId() {
  return HierarchyManager.currentSolutionId;
}

export function getCurrentProjectId() {
  return HierarchyManager.currentProjectId;
}

export function getCurrentPageId() {
  return HierarchyManager.currentPageId;
}

export function getCurrentSolution() {
  if (!HierarchyManager.currentSolutionId) return null;
  return HierarchyManager.solutions.get(HierarchyManager.currentSolutionId);
}

export function getCurrentProject() {
  const solution = getCurrentSolution();
  if (!solution || !HierarchyManager.currentProjectId) return null;
  return solution.projects.get(HierarchyManager.currentProjectId);
}

export function getCurrentPage() {
  const project = getCurrentProject();
  if (!project || !HierarchyManager.currentPageId) return null;
  return project.pages.get(HierarchyManager.currentPageId);
}

// Helper: check if any page across all solutions/projects is dirty
export function isAnyPageDirty() {
  for (const solution of HierarchyManager.solutions.values()) {
    for (const project of solution.projects.values()) {
      for (const page of project.pages.values()) {
        if (page.dirty) return true;
      }
    }
  }
  return false;
}

// Add new items
export function addSolution(editor, customName = null) {
  // Enforce single-solution: if one exists, just return it
  if (HierarchyManager.solutions.size > 0) {
    const [existingId] = HierarchyManager.solutions.keys();
    switchToSolution(editor, existingId);
    return existingId;
  }

  HierarchyManager.solutionCounter++;
  const solutionId = `solution-${HierarchyManager.solutionCounter}`;
  const solutionName = customName || `Solution ${HierarchyManager.solutionCounter}`;

  HierarchyManager.solutions.set(solutionId, {
    id: solutionId,
    name: solutionName,
    projects: new Map(),
    currentProjectId: null,
    dirty: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Auto-expand the new solution
  HierarchyManager.expandedItems.add(solutionId);

  renderHierarchyTree(editor);
  switchToSolution(editor, solutionId);

  return solutionId;
}

// Create initial project setup from startup popup
export function createInitialProject(editor, { projectName, solutionName }) {
  // Create solution first
  const solutionId = addSolution(editor, solutionName);

  // Create project within the solution
  const projectId = addProject(editor, solutionId, projectName);

  // Create default page within the project
  const pageId = addPage(editor, projectId, 'Home');

  // Persist the initial project to storage (defaults to localStorage)
  try {
    persistProject(editor, editor?.persistenceMode || 'localStorage');
  } catch (e) {
    console.warn('Persist project failed after initial creation:', e);
  }

  return { solutionId, projectId, pageId };
}

export function addProject(editor, solutionId, customName = null) {
  const targetSolutionId = solutionId || HierarchyManager.currentSolutionId;
  if (!targetSolutionId) {
    alert('Please select a solution first');
    return;
  }

  const solution = HierarchyManager.solutions.get(targetSolutionId);
  if (!solution) return;

  // Generate project counter based on existing projects
  const existingProjects = Array.from(solution.projects.values());
  const maxCounter = existingProjects.reduce((max, p) => {
    const match = p.id.match(/project-(\d+)/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);

  const projectCounter = maxCounter + 1;
  const projectId = `project-${projectCounter}`;
  const projectName = customName || `Project ${projectCounter}`;

  const newProject = {
    id: projectId,
    name: projectName,
    pages: new Map(),
    currentPageId: null,
    dirty: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  solution.projects.set(projectId, newProject);
  solution.dirty = true;

  // Auto-expand the solution and new project
  HierarchyManager.expandedItems.add(targetSolutionId);
  HierarchyManager.expandedItems.add(projectId);

  renderHierarchyTree(editor);
  switchToProject(editor, projectId);

  return projectId;
}

export function addPage(editor, projectId, customName = null, skipValidation = false) {
  const targetProjectId = projectId || HierarchyManager.currentProjectId;
  if (!targetProjectId) {
    alert('Please select a project first');
    return;
  }

  // Get the correct project based on the targetProjectId
  let project = null;
  if (targetProjectId === HierarchyManager.currentProjectId) {
    project = getCurrentProject();
  } else {
    // Find the project in the solutions
    for (const solution of HierarchyManager.solutions.values()) {
      if (solution.projects.has(targetProjectId)) {
        project = solution.projects.get(targetProjectId);
        break;
      }
    }
  }

  if (!project) return;

  // Generate page counter based on existing pages
  const existingPages = Array.from(project.pages.values());
  const maxCounter = existingPages.reduce((max, p) => {
    const match = p.id.match(/page-(\d+)/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);

  const pageCounter = maxCounter + 1;
  const pageId = `page-${pageCounter}`;
  const pageName = customName || `Page${pageCounter}`; // Default name without space to pass validation

  // Validate page name using ProjectDataManager (skip during project loading)
  if (!skipValidation) {
    try {
      if (project.projectDataManagerId) {
        const validation = ProjectDataManager.validatePageName(pageName, project.projectDataManagerId);
        if (!validation.valid) {
          alert(validation.message);
          return;
        }
      }
    } catch (validationError) {
      alert(validationError.message);
      return;
    }
  }

  const newPage = {
    id: pageId,
    name: pageName,
    content: '',
    layers: [],
    selectedLayerId: null,
    dirty: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  project.pages.set(pageId, newPage);
  // Only mark project dirty for user-initiated page additions
  if (!skipValidation) {
    project.dirty = true;
  }

  // Sync with ProjectDataManager (skip during project loading to avoid duplicates)
  if (!skipValidation) {
    try {
      if (project.projectDataManagerId) {
        ProjectDataManager.addPageToProject(project.projectDataManagerId, pageName, '');
      }
    } catch (syncError) {
      console.warn('Failed to sync page with ProjectDataManager:', syncError.message);
      // Continue with local operation
    }
  }

  // Auto-expand the project
  HierarchyManager.expandedItems.add(targetProjectId);

  // Notify the tab system about the new page
  if (editor.pageTabs && editor.pageTabs.addTab) {
    editor.pageTabs.addTab(newPage);
  }

  renderHierarchyTree(editor);
  switchToPage(editor, pageId);

  return pageId;
}

// Remove a page from a project
export function removePage(editor, pageId) {
  if (!pageId) return false;

  // Find the project that contains this page
  let project = null;
  let solution = null;
  let pageToDelete = null;
  
  for (const sol of HierarchyManager.solutions.values()) {
    for (const proj of sol.projects.values()) {
      if (proj.pages.has(pageId)) {
        project = proj;
        solution = sol;
        pageToDelete = proj.pages.get(pageId);
        break;
      }
    }
    if (project) break;
  }

  if (!project || !project.pages.has(pageId)) {
    console.warn('Page not found:', pageId);
    return false;
  }

  // Don't allow removing the last page
  if (project.pages.size <= 1) {
    alert('Cannot remove the last page. A project must have at least one page.');
    return false;
  }

  // Sync with ProjectDataManager first
  try {
    if (project.projectDataManagerId && pageToDelete) {
      ProjectDataManager.deletePageFromProject(project.projectDataManagerId, pageToDelete.name);
    }
  } catch (syncError) {
    console.warn('Failed to sync page deletion with ProjectDataManager:', syncError.message);
    // Continue with local operation
  }

  // Remove the page
  project.pages.delete(pageId);
  project.dirty = true;

  // If this was the current page, switch to another one
  if (HierarchyManager.currentPageId === pageId) {
    const remainingPages = Array.from(project.pages.keys());
    if (remainingPages.length > 0) {
      switchToPage(editor, remainingPages[0]);
    } else {
      HierarchyManager.currentPageId = null;
      editor.currentPage = null;
    }
  }

  // Update the hierarchy tree
  renderHierarchyTree(editor);

  return true;
}

// Switch functions
export function switchToSolution(editor, solutionId) {
  if (!HierarchyManager.solutions.has(solutionId)) return;

  HierarchyManager.currentSolutionId = solutionId;
  HierarchyManager.currentProjectId = null;
  HierarchyManager.currentPageId = null;

  const solution = HierarchyManager.solutions.get(solutionId);
  editor.currentSolution = solution;
  editor.currentProject = null;
  editor.currentPage = null;

  // Clear canvas
  if (editor.canvasManager && editor.canvasManager.clearAllCanvases) {
    editor.canvasManager.clearAllCanvases();
  } else if (editor.canvas) {
    editor.canvas.innerHTML = `
      <div class="canvas-placeholder" id="placeholder">
        <div class="icon">
          <i class="fas fa-folder-open" aria-hidden="true"></i>
        </div>
        <h3>Select or create a project to start building</h3>
        <p>Projects contain multiple pages for organized development</p>
      </div>
    `;
  }

  renderHierarchyTree(editor);
  editor.updateCurrentContext?.();
}

export function switchToProject(editor, projectId) {
  const solution = getCurrentSolution();
  if (!solution || !solution.projects.has(projectId)) return;

  HierarchyManager.currentProjectId = projectId;
  HierarchyManager.currentPageId = null;

  const project = solution.projects.get(projectId);
  editor.currentProject = project;
  editor.currentPage = null;

  // Clear canvas
  if (editor.canvasManager && editor.canvasManager.clearAllCanvases) {
    editor.canvasManager.clearAllCanvases();
  } else if (editor.canvas) {
    editor.canvas.innerHTML = `
      <div class="canvas-placeholder" id="placeholder">
        <div class="icon">
          <i class="fas fa-file" aria-hidden="true"></i>
        </div>
        <h3>Select a page to start building</h3>
        <p>Choose a page from the project hierarchy</p>
      </div>
    `;
  }

  editor.updateCurrentContext?.();
}

export function switchToPage(editor, pageId) {
  let project = getCurrentProject();
  if (!project || !project.pages.has(pageId)) {
    // Find the project that owns this page and switch context
    for (const solution of HierarchyManager.solutions.values()) {
      for (const p of solution.projects.values()) {
        if (p.pages.has(pageId)) {
          HierarchyManager.currentSolutionId = solution.id;
          HierarchyManager.currentProjectId = p.id;
          project = p;
          break;
        }
      }
      if (project && project.pages.has(pageId)) break;
    }
    if (!project || !project.pages.has(pageId)) return;
  }

  HierarchyManager.currentPageId = pageId;
  const page = project.pages.get(pageId);

  // Update editor references
  editor.currentPage = page;

  // Use canvas manager if available, otherwise fall back to legacy behavior
  if (editor.canvasManager && editor.canvasManager.switchToPage) {
    editor.canvasManager.switchToPage(pageId);
  } else {
    // Legacy canvas handling
    editor.canvas.innerHTML = page.content || `
      <div class="canvas-placeholder" id="placeholder">
        <div class="icon">
          <i class="fas fa-crosshairs" aria-hidden="true"></i>
        </div>
        <h3>Drag components here to start building</h3>
        <p>Use adorners to resize and position elements</p>
      </div>
    `;
  }

  editor.layers = [...page.layers];
  editor.selectedLayerId = page.selectedLayerId;
  editor.selectedElement = null;
  editor.selectedElements.clear();

  renderLayersListModule(editor);
  updatePlaceholderModule(editor);
  // Re-render the tree to ensure reliable interactions
  renderHierarchyTree(editor);
  editor.updateCurrentContext?.();
  editor.updatePropertiesPanel?.();
}

// Inline editing functions
export function startInlineEdit(editor, itemId, itemType) {
  HierarchyManager.editingItemId = itemId;
  HierarchyManager.editingType = itemType;

  let item = null;
  if (itemType === 'solution') {
    item = HierarchyManager.solutions.get(itemId);
  } else if (itemType === 'project') {
    const solution = getCurrentSolution();
    item = solution?.projects.get(itemId);
  } else if (itemType === 'page') {
    const project = getCurrentProject();
    item = project?.pages.get(itemId);
  }

  HierarchyManager.editingOriginalName = item ? item.name : null;
  renderHierarchyTree(editor);
}

// Duplicate a project with deep copy of pages
function duplicateProject(editor, projectId) {
  const solution = findSolutionByProjectId(projectId);
  if (!solution) return null;

  const sourceProject = solution.projects.get(projectId);
  if (!sourceProject) return null;

  // Compute new project id and name
  const existingProjects = Array.from(solution.projects.values());
  const maxCounter = existingProjects.reduce((max, p) => {
    const match = p.id.match(/project-(\d+)/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  const newProjectCounter = maxCounter + 1;
  const newProjectId = `project-${newProjectCounter}`;
  const newProjectName = `${sourceProject.name} Copy`;

  const newProject = {
    id: newProjectId,
    name: newProjectName,
    pages: new Map(),
    currentPageId: null,
    dirty: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Deep copy pages with globally unique page IDs
  let firstPageId = null;
  sourceProject.pages.forEach((srcPage) => {
    const newPageId = getNextGlobalPageId();
    const newPage = {
      id: newPageId,
      name: srcPage.name, // keep same name
      content: srcPage.content || '',
      layers: Array.isArray(srcPage.layers) ? JSON.parse(JSON.stringify(srcPage.layers)) : [],
      selectedLayerId: null,
      dirty: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!firstPageId) firstPageId = newPageId;
    newProject.pages.set(newPageId, newPage);
  });

  newProject.currentPageId = firstPageId;

  // Insert new project into solution
  solution.projects.set(newProjectId, newProject);
  solution.updatedAt = new Date().toISOString();
  solution.dirty = true;

  // Expand solution and new project, and its pages group by default
  HierarchyManager.expandedItems.add(solution.id);
  HierarchyManager.expandedItems.add(newProjectId);
  HierarchyManager.expandedItems.add(`${newProjectId}::pages`);

  // Switch selection to the duplicated project and first page for immediate feedback
  if (firstPageId) {
    switchToPage(editor, firstPageId);
  } else {
    switchToProject(editor, newProjectId);
    renderHierarchyTree(editor);
  }

  return newProjectId;
}

export function commitInlineEdit(editor) {
  if (!HierarchyManager.editingItemId) return;

  const treeEl = document.getElementById('hierarchyTree');
  const input = treeEl?.querySelector('.tree-item input.item-name-input');
  const newName = input?.value.trim();

  let item = null;
  if (HierarchyManager.editingType === 'solution') {
    item = HierarchyManager.solutions.get(HierarchyManager.editingItemId);
  } else if (HierarchyManager.editingType === 'project') {
    const solution = getCurrentSolution();
    item = solution?.projects.get(HierarchyManager.editingItemId);
  } else if (HierarchyManager.editingType === 'page') {
    const project = getCurrentProject();
    item = project?.pages.get(HierarchyManager.editingItemId);
  }

  if (item) {
    if (newName) {
      // Update local hierarchy data
      item.name = newName;
      item.updatedAt = new Date().toISOString();
      item.dirty = true;

      // Sync with ProjectDataManager for startup modal consistency
      try {
        if (HierarchyManager.editingType === 'project') {
          // Find the project in ProjectDataManager and update it
          const currentProject = getCurrentProject();
          if (currentProject && currentProject.id) {
            // Convert hierarchy project ID to ProjectDataManager format
            const projectDataManagerId = currentProject.projectDataManagerId || currentProject.id;
            ProjectDataManager.updateProjectName(projectDataManagerId, newName);
          }
        } else if (HierarchyManager.editingType === 'solution') {
          // Find the project in ProjectDataManager and update solution name
          const currentProject = getCurrentProject();
          if (currentProject && currentProject.id) {
            const projectDataManagerId = currentProject.projectDataManagerId || currentProject.id;
            ProjectDataManager.updateSolutionName(projectDataManagerId, newName);
          }
        } else if (HierarchyManager.editingType === 'page') {
          // Update page name in ProjectDataManager
          const currentProject = getCurrentProject();
          if (currentProject && currentProject.projectDataManagerId) {
            ProjectDataManager.updatePageInProject(
              currentProject.projectDataManagerId, 
              HierarchyManager.editingOriginalName, 
              newName,
              item.content
            );
          }
        }
      } catch (validationError) {
        // Revert change if validation fails
        item.name = HierarchyManager.editingOriginalName;
        alert(validationError.message);
        HierarchyManager.editingItemId = null;
        HierarchyManager.editingType = null;
        HierarchyManager.editingOriginalName = null;
        renderHierarchyTree(editor);
        return;
      }

      // Persist changes to localStorage so startup modal shows updated names
      try {
        persistProject(editor, 'localStorage');
      } catch (e) {
        console.warn('Failed to persist project after name change:', e);
      }
    } else if (HierarchyManager.editingOriginalName) {
      item.name = HierarchyManager.editingOriginalName;
    }
  }

  HierarchyManager.editingItemId = null;
  HierarchyManager.editingType = null;
  HierarchyManager.editingOriginalName = null;
  renderHierarchyTree(editor);
  editor.updateCurrentContext?.();
}

export function cancelInlineEdit(editor) {
  if (HierarchyManager.editingItemId) {
    let item = null;
    if (HierarchyManager.editingType === 'solution') {
      item = HierarchyManager.solutions.get(HierarchyManager.editingItemId);
    } else if (HierarchyManager.editingType === 'project') {
      const solution = getCurrentSolution();
      item = solution?.projects.get(HierarchyManager.editingItemId);
    } else if (HierarchyManager.editingType === 'page') {
      const project = getCurrentProject();
      item = project?.pages.get(HierarchyManager.editingItemId);
    }

    if (item && HierarchyManager.editingOriginalName) {
      item.name = HierarchyManager.editingOriginalName;
    }
  }

  HierarchyManager.editingItemId = null;
  HierarchyManager.editingType = null;
  HierarchyManager.editingOriginalName = null;
  renderHierarchyTree(editor);
}

// Toggle expand/collapse
export function toggleExpanded(itemId) {
  if (HierarchyManager.expandedItems.has(itemId)) {
    HierarchyManager.expandedItems.delete(itemId);
  } else {
    HierarchyManager.expandedItems.add(itemId);
  }
}

// Render the integrated hierarchy tree
export function renderHierarchyTree(editor) {
  const treeEl = document.getElementById('hierarchyTree');
  if (!treeEl) return;

  treeEl.innerHTML = '';

  if (HierarchyManager.solutions.size === 0) {
    treeEl.innerHTML = '<div class="no-items">No solutions available. Click + to add one.</div>';
    return;
  }

  HierarchyManager.solutions.forEach(solution => {
    const solutionEl = createTreeItem(editor, solution, 'solution', 0);
    treeEl.appendChild(solutionEl);
  });

  // Handle inline editing
  if (HierarchyManager.editingItemId) {
    const input = treeEl.querySelector('.tree-item input.item-name-input');
    if (input) {
      input.focus();
      input.select();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          commitInlineEdit(editor);
        } else if (e.key === 'Escape') {
          cancelInlineEdit(editor);
        }
      });
    }
  }
}

function createTreeItem(editor, item, type, level) {
  const itemEl = document.createElement('div');
  itemEl.className = `tree-item tree-${type}`;
  // itemEl.style.paddingLeft = `${level * 16}px`;
  itemEl.dataset.itemId = item.id;
  itemEl.dataset.itemType = type;

  // Determine expanded behavior per type
  let isExpanded = HierarchyManager.expandedItems.has(item.id);
  const isActive = (type === 'solution' && item.id === HierarchyManager.currentSolutionId) ||
    (type === 'project' && item.id === HierarchyManager.currentProjectId) ||
    (type === 'page' && item.id === HierarchyManager.currentPageId);
  const isEditing = item.id === HierarchyManager.editingItemId;

  if (isActive) itemEl.classList.add('active');

  let hasChildren = false;
  let childCount = 0;

  if (type === 'solution') {
    hasChildren = item.projects.size > 0;
    childCount = item.projects.size;
    // Solutions should always appear expanded
    isExpanded = true;
  } else if (type === 'project') {
    // Project visually has one child group: Pages
    hasChildren = true;
    childCount = item.pages.size;
  } else if (type === 'pages-group') {
    // Child count equals number of pages in the associated project
    const projectIdFromGroup = item.id.split('::')[0];
    let projectForGroup = null;
    for (const solution of HierarchyManager.solutions.values()) {
      if (solution.projects.has(projectIdFromGroup)) { projectForGroup = solution.projects.get(projectIdFromGroup); break; }
    }
    hasChildren = true; // group can expand even if zero pages
    childCount = projectForGroup ? projectForGroup.pages.size : 0;
  }

  // Build expander UI rules per type
  let expanderClass = 'fa-circle';
  let expanderStyle = 'opacity: 0; display: none; cursor: default;';
  let expanderDataAttr = '';

  if (type === 'solution') {
    // Always expanded and no expander UI for solutions
    expanderClass = 'fa-circle';
    expanderStyle = 'opacity: 0; display: none; cursor: default;';
    isExpanded = true;
  } else if (type === 'project') {
    // Show expander only when the parent solution has multiple projects
    let parentSolution = null;
    for (const solution of HierarchyManager.solutions.values()) {
      if (solution.projects.has(item.id)) { parentSolution = solution; break; }
    }
    const multipleProjects = parentSolution ? parentSolution.projects.size > 1 : false;
    if (multipleProjects && hasChildren) {
      expanderClass = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
      expanderStyle = 'cursor: pointer;';
      expanderDataAttr = `data-item-id="${item.id}"`;
    } else {
      // No expander shown; keep project expanded so its pages are visible
      expanderClass = 'fa-circle';
      expanderStyle = 'opacity: 0; display: none; cursor: default;';
      isExpanded = true;
    }
  } else if (type === 'page') {
    // Pages never have children
    expanderClass = 'fa-circle';
    expanderStyle = 'opacity: 0; display: none; cursor: default;';
  } else if (type === 'pages-group') {
    // Group node for pages: always show expander (toggle) even if zero pages
    expanderClass = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
    expanderStyle = 'cursor: pointer;';
    expanderDataAttr = `data-item-id="${item.id}"`;
  }

  let icon = '';
  if (type === 'solution') icon = 'fa-briefcase';
  else if (type === 'project') icon = 'fa-folder';
  else if (type === 'page') icon = 'fa-file';
  else if (type === 'pages-group') icon = 'fa-layer-group';

  if (isEditing) {
    itemEl.innerHTML = `
      <div class="tree-item-content">
        <i class="fas ${expanderClass} tree-expander" style="${expanderStyle}" ${expanderDataAttr}></i>
        <i class="fas ${icon} tree-icon"></i>
        <input type="text" class="item-name-input" value="${item.name}" />
        <div class="tree-actions" style="opacity:1">
          <button class="tree-action-btn" data-action="commit-rename" title="Save"><i class="fas fa-check"></i></button>
          <button class="tree-action-btn" data-action="cancel-rename" title="Cancel"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `;
  } else {
    // Build action buttons conditionally
    let actionsHTML = `<button class="tree-action-btn" data-action="rename" title="Rename"><i class="fas fa-edit"></i></button>`;
    if (type === 'solution') {
      // Only allow adding projects at solution level; no duplicate/delete for single-solution model
      actionsHTML += `<button class=\"tree-action-btn\" data-action=\"add-project\" title=\"Add Project\"><i class=\"fas fa-folder-plus\"></i></button>`;
    }
    if (type === 'project') {
      // No Add Page at project level; Add Page moved to Pages group node
      actionsHTML += `<button class=\"tree-action-btn\" data-action=\"duplicate\" title=\"Duplicate\"><i class=\"fas fa-copy\"></i></button>`;
      // Only show delete when more than one project in the solution
      let parentSolution = null;
      for (const solution of HierarchyManager.solutions.values()) {
        if (solution.projects.has(item.id)) { parentSolution = solution; break; }
      }
      const canDeleteProject = parentSolution ? parentSolution.projects.size > 1 : false;
      if (canDeleteProject) {
        actionsHTML += `<button class=\"tree-action-btn\" data-action=\"delete\" title=\"Delete\"><i class=\"fas fa-trash\"></i></button>`;
      }
    }
    if (type === 'page') {
      actionsHTML += `<button class=\"tree-action-btn\" data-action=\"duplicate\" title=\"Duplicate\"><i class=\"fas fa-copy\"></i></button>`;
      // Only show delete when more than one page in the project
      let pageProject = null;
      for (const solution of HierarchyManager.solutions.values()) {
        for (const project of solution.projects.values()) {
          if (project.pages.has(item.id)) { pageProject = project; break; }
        }
        if (pageProject) break;
      }
      const canDeletePage = pageProject ? pageProject.pages.size > 1 : false;
      if (canDeletePage) {
        actionsHTML += `<button class=\"tree-action-btn\" data-action=\"delete\" title=\"Delete\"><i class=\"fas fa-trash\"></i></button>`;
      }
    }
    if (type === 'pages-group') {
      // No rename/edit/delete for the group; only Add Page button
      actionsHTML = `<button class=\"tree-action-btn\" data-action=\"add-page\" title=\"Add Page\"><i class=\"fas fa-file-circle-plus\"></i></button>`;
    }

    // Determine count badge placement: left-aligned before name
    const showCountLeft = (type === 'pages-group');
    const countHTML = showCountLeft ? `<span class=\"tree-count\">(${childCount})</span>` : '';

    // Compute dirty mark for name rendering
    const dirtyMark = (() => {
      if (type === 'page') {
        return item.dirty ? ' *' : '';
      }
      if (type === 'project') {
        try {
          const anyDirty = item.dirty || Array.from(item.pages.values()).some(p => p.dirty);
          return anyDirty ? ' *' : '';
        } catch (_) {
          return item.dirty ? ' *' : '';
        }
      }
      return '';
    })();

    itemEl.innerHTML = `
      <div class="tree-item-content">
        <i class="fas ${expanderClass} tree-expander" style="${expanderStyle}" ${expanderDataAttr}></i>
        <i class="fas ${icon} tree-icon"></i>
        <span class="tree-name">${item.name}${dirtyMark} ${countHTML}</span>
        <div class="tree-actions">
          ${actionsHTML}
        </div>
      </div>
    `;
  }

  // Add click handler for selection
  const contentEl = itemEl.querySelector('.tree-item-content');
  contentEl.addEventListener('click', (e) => {
    if (e.target.closest('.tree-expander, .tree-actions, .item-name-input')) return;

    if (type === 'solution') {
      switchToSolution(editor, item.id);
    } else if (type === 'project') {
      switchToProject(editor, item.id);
    } else if (type === 'page') {
      switchToPage(editor, item.id);
    }
  });

  // Add children if expanded
  if (isExpanded && hasChildren) {
    if (type === 'solution') {
      item.projects.forEach(project => {
        const projectEl = createTreeItem(editor, project, 'project', level + 1);
        itemEl.appendChild(projectEl);
      });
    } else if (type === 'project') {
      // Inject a synthetic Pages group node under a project
      const pagesGroupId = `${item.id}::pages`;
      let pagesGroupExpanded = HierarchyManager.expandedItems.has(pagesGroupId);
      // Default expand pages group the first time
      if (!pagesGroupExpanded) {
        HierarchyManager.expandedItems.add(pagesGroupId);
        pagesGroupExpanded = true;
      }
      const pagesGroupItem = {
        id: pagesGroupId,
        name: 'Pages',
      };
      const groupEl = createTreeItem(editor, pagesGroupItem, 'pages-group', level + 1);
      // Attach reference to project id for event handling
      groupEl.dataset.projectId = item.id;
      itemEl.appendChild(groupEl);

      // If pages group is expanded, render pages inside
      let groupExpanded = pagesGroupExpanded;
      if (groupExpanded) {
        item.pages.forEach(page => {
          const pageEl = createTreeItem(editor, page, 'page', level + 2);
          itemEl.appendChild(pageEl);
        });
      }
    }
  }

  return itemEl;
}

// Breadcrumb functionality removed - using context display instead

// Setup the integrated hierarchy manager
export function setupHierarchyManager(editor) {
  // No persistent storage: start with in-memory state only.
  // Startup popup will handle initial creation.

  // Attach methods to editor instance
  editor.addProject = (solutionId) => addProject(editor, solutionId);
  editor.addPage = (projectId) => addPage(editor, projectId);
  editor.removePage = (pageId) => removePage(editor, pageId);
  editor.switchToSolution = (solutionId) => switchToSolution(editor, solutionId);
  editor.switchToProject = (projectId) => switchToProject(editor, projectId);
  editor.switchToPage = (pageId) => switchToPage(editor, pageId);
  editor.renderHierarchyTree = () => renderHierarchyTree(editor);

  // Global Add Page button (header in Project Structure)
  const addPageGlobalBtn = document.getElementById('addPageGlobal');
  if (addPageGlobalBtn) {
    addPageGlobalBtn.addEventListener('click', () => {
      if (!HierarchyManager.currentProjectId) {
        alert('Please select a project first');
        return;
      }
      addPage(editor, HierarchyManager.currentProjectId);
    });
  }

  // Tree event delegation
  const treeEl = document.getElementById('hierarchyTree');
  if (treeEl) {
    treeEl.addEventListener('click', (e) => {
      const expander = e.target.closest('.tree-expander');
      const actionBtn = e.target.closest('.tree-action-btn');
      const treeItem = e.target.closest('.tree-item');

      if (expander && expander.dataset.itemId) {
        toggleExpanded(expander.dataset.itemId);
        renderHierarchyTree(editor);
        return;
      }

      if (actionBtn && treeItem) {
        const action = actionBtn.dataset.action;
        const itemId = getItemIdFromTreeItem(treeItem);
        const itemType = getItemTypeFromTreeItem(treeItem);
        const projectId = treeItem.dataset.projectId || null;

        handleTreeAction(editor, action, itemId, itemType, projectId);
      }
    });
  }

  editor.renderHierarchyTree?.();
}

function getItemIdFromTreeItem(treeItem) {
  return treeItem.dataset.itemId || null;
}

function getItemTypeFromTreeItem(treeItem) {
  return treeItem.dataset.itemType || null;
}

function handleTreeAction(editor, action, itemId, itemType, projectId) {
  switch (action) {
    case 'commit-rename':
      commitInlineEdit(editor);
      break;
    case 'cancel-rename':
      cancelInlineEdit(editor);
      break;
    case 'rename':
      startInlineEdit(editor, itemId, itemType);
      break;
    case 'add-project':
      addProject(editor, itemId);
      break;
    case 'add-page':
      if (itemType === 'pages-group') {
        // Use the provided projectId (attached to the group element)
        const targetProjectId = projectId || (itemId.includes('::') ? itemId.split('::')[0] : null);
        if (!targetProjectId) return;
        addPage(editor, targetProjectId);
      } else if (itemType === 'project') {
        addPage(editor, itemId);
      }
      break;
    case 'duplicate':
      if (itemType === 'project') {
        duplicateProject(editor, itemId);
      } else if (itemType === 'page') {
        // Optional: implement page duplication later
        // duplicatePage(editor, itemId);
      }
      break;
    case 'delete':
      if (itemType === 'project') {
        deleteProject(editor, itemId);
      } else if (itemType === 'page') {
        deletePage(editor, itemId);
      }
      break;
  }
}

// Helper: find solution that owns a given project id
function findSolutionByProjectId(projectId) {
  for (const solution of HierarchyManager.solutions.values()) {
    if (solution.projects.has(projectId)) return solution;
  }
  return null;
}

// Helper: find project that owns a given page id (and its parent solution)
function findProjectAndSolutionByPageId(pageId) {
  for (const solution of HierarchyManager.solutions.values()) {
    for (const project of solution.projects.values()) {
      if (project.pages.has(pageId)) return { project, solution };
    }
  }
  return { project: null, solution: null };
}

// Delete a project with guard: at least 1 project must remain in a solution
function deleteProject(editor, projectId) {
  if (confirm('Are you sure you want to delete this project?')) {

    const solution = findSolutionByProjectId(projectId);
    if (!solution) return;

    if (solution.projects.size <= 1) {
      alert('At least one project is required in a solution.');
      return;
    }

    // If deleting the current project, choose a fallback project to select after deletion
    let fallbackProjectId = null;
    for (const pid of solution.projects.keys()) {
      if (pid !== projectId) { fallbackProjectId = pid; break; }
    }

    solution.projects.delete(projectId);
    solution.updatedAt = new Date().toISOString();
    solution.dirty = true;

    // Clear expanded state for removed project and its pages-group
    HierarchyManager.expandedItems.delete(projectId);
    HierarchyManager.expandedItems.delete(`${projectId}::pages`);

    // Update current selection
    if (HierarchyManager.currentProjectId === projectId) {
      HierarchyManager.currentProjectId = fallbackProjectId;
      HierarchyManager.currentPageId = null;
      if (fallbackProjectId) {
        switchToProject(editor, fallbackProjectId);
      }
    }

    renderHierarchyTree(editor);
  }
}

// Delete a page with guard: at least 1 page must remain in a project
function deletePage(editor, pageId) {
  if (confirm('Are you sure you want to delete this page?')) {

    const { project } = findProjectAndSolutionByPageId(pageId);
    if (!project) return;

    if (project.pages.size <= 1) {
      alert('At least one page is required in a project.');
      return;
    }

    // Choose a fallback page id
    let fallbackPageId = null;
    for (const pid of project.pages.keys()) {
      if (pid !== pageId) { fallbackPageId = pid; break; }
    }

    project.pages.delete(pageId);
    project.updatedAt = new Date().toISOString();
    project.dirty = true;

    // Update current selection
    if (HierarchyManager.currentPageId === pageId) {
      HierarchyManager.currentPageId = fallbackPageId;
      if (fallbackPageId) {
        switchToPage(editor, fallbackPageId);
      }
    }

    renderHierarchyTree(editor);
  }
}

// Persistence functions
export function persistAllData() {
  // Legacy no-op. Use persistProject(editor, mode) for project-level saves
}

// Serialize the current project into projects-data.json format
function serializeCurrentProject() {
  const solution = getCurrentSolution();
  const project = getCurrentProject();
  if (!solution || !project) return null;

  const now = new Date().toISOString();
  const pages = [];
  project.pages.forEach((p) => {
    pages.push({
      name: p.name,
      // Keep elements optional if not tracked structurally yet
      elements: [],
      content: p.content || ''
    });
  });

  return {
    projectName: project.name,
    solutionName: solution.name,
    lastModified: now,
    createdOn: project.createdAt || now,
    createdVersion: '1.0.0',
    pages
  };
}

// Persist the current project either to localStorage (default) or as a downloaded JSON file
export function persistProject(editor, mode = 'localStorage') {
  const projObj = serializeCurrentProject();
  if (!projObj) {
    alert('No project selected to save.');
    return false;
  }

  if (mode === 'localStorage') {
    try {
      // Try to sync with ProjectDataManager first
      const currentProject = getCurrentProject();
      if (currentProject && currentProject.projectDataManagerId) {
        // Update existing project in ProjectDataManager
        const success = ProjectDataManager.updateProject(currentProject.projectDataManagerId, {
          projectName: projObj.projectName,
          solutionName: projObj.solutionName,
          pages: projObj.pages,
          lastModified: projObj.lastModified
        });
        
        if (success) {
          // Clear dirty flags on pages
          if (currentProject) {
            currentProject.pages.forEach((p) => { p.dirty = false; });
            currentProject.dirty = false;
          }
          editor.updateSaveButtons?.();
          return true;
        }
      } else {
        // Project doesn't exist in ProjectDataManager, create it
        try {
          const newProject = ProjectDataManager.createProject({
            projectName: projObj.projectName,
            solutionName: projObj.solutionName,
            pages: projObj.pages
          });
          
          if (newProject && currentProject) {
            // Link the hierarchy project to the ProjectDataManager project
            currentProject.projectDataManagerId = newProject.id;
            // Clear dirty flags
            currentProject.pages.forEach((p) => { p.dirty = false; });
            currentProject.dirty = false;
          }
          editor.updateSaveButtons?.();
          return true;
        } catch (createError) {
          console.warn('Failed to create project in ProjectDataManager:', createError.message);
          // Fall through to legacy storage
        }
      }

      // Fallback to legacy storage for backward compatibility
      console.log('Using legacy storage fallback');
      const payload = { projects: [projObj] };
      localStorage.setItem('wysiwyg_projects_data_v1', JSON.stringify(payload));
      
      // Clear dirty flags on pages
      const project = getCurrentProject();
      if (project) {
        project.pages.forEach((p) => { p.dirty = false; });
        project.dirty = false;
      }
      editor.updateSaveButtons?.();
      return true;
    } catch (e) {
      console.error('Failed to save to LocalStorage', e);
      alert('Failed to save to LocalStorage: ' + e.message);
      return false;
    }
  } else if (mode === 'file') {
    try {
      const payload = { projects: [projObj] };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = `${projObj.projectName}`.replace(/\s+/g, '-');
      a.href = url;
      a.download = `projects-data-${safeName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Clear dirty flags
      const project = getCurrentProject();
      if (project) {
        project.pages.forEach((p) => { p.dirty = false; });
        project.dirty = false;
      }
      editor.updateSaveButtons?.();
      return true;
    } catch (e) {
      console.error('Failed to download JSON', e);
      alert('Failed to download JSON: ' + e.message);
      return false;
    }
  }
  return false;
}

function loadAllData(editor, projectId = null) {
  try {
    // 1) Prefer ProjectDataManager as the primary source of truth
    let p = null;
    try {
      const allProjects = ProjectDataManager.getAllProjects?.() || [];
      if (allProjects.length > 0) {
        if (projectId) {
          const foundById = allProjects.find(proj => (proj.id || proj._id) === projectId);
          if (foundById) p = foundById;
        }
        if (!p) p = allProjects[0];
      }
    } catch (_) {
      // Ignore and fallback to legacy storage
    }

    // 2) Fallback to legacy localStorage if ProjectDataManager has no data
    if (!p) {
      const raw = localStorage.getItem('wysiwyg_projects_data_v1');
      if (!raw) return false;
      const data = JSON.parse(raw);
      const projects = Array.isArray(data?.projects) ? data.projects : [];
      if (projects.length === 0) return false;

      // Find the specific project by ID, or default to first project
      p = projects[0]; // Default fallback
      if (projectId) {
        const foundProject = projects.find(proj => {
          // Generate stable ID for comparison (same logic as in startup-modal.js)
          const stableId = proj.id || generateStableId({
            projectName: proj.projectName,
            solutionName: proj.solutionName,
            createdOn: proj.createdOn || proj.lastModified || ''
          });
          return stableId === projectId;
        });
        if (foundProject) {
          p = foundProject;
        }
      }
    }

    const solutionName = p.solutionName || 'Solution 1';
    const projectName = p.projectName || 'Project 1';

    // Build hierarchy
    const solutionId = addSolution(editor, solutionName);
    const newProjectId = addProject(editor, solutionId, projectName);

    // Set the project ID to match ProjectDataManager ID for proper syncing
    const solution = getCurrentSolution();
    const project = solution?.projects.get(newProjectId);
    if (project) {
      project.projectDataManagerId = p.id; // Use the ProjectDataManager ID
    }

    // Add pages and content
    const pagesArr = Array.isArray(p.pages) ? p.pages : [];
    let firstPageId = null;
    pagesArr.forEach((pg, idx) => {
      // Skip validation when loading existing pages from storage
      const pageId = addPage(editor, newProjectId, pg.name || `Page ${idx + 1}`, true);
      if (!firstPageId) firstPageId = pageId;
      // Assign content to stored page
      const solution = getCurrentSolution();
      const project = solution?.projects.get(newProjectId);
      const page = project?.pages.get(pageId);
      if (page) {
        page.content = pg.content || '';
        page.dirty = false;
      }
    });
    // Ensure project is not marked dirty after loading existing pages
    const solutionAfter = getCurrentSolution();
    const projectAfter = solutionAfter?.projects.get(newProjectId);
    if (projectAfter) {
      projectAfter.dirty = false;
    }

    // Select first page
    if (firstPageId) {
      switchToPage(editor, firstPageId);
    } else {
      switchToProject(editor, newProjectId);
    }

    // Mark initialized so startup modal won't show again
    try { localStorage.setItem('wysiwyg-editor-initialized', 'true'); } catch {}

    renderHierarchyTree(editor);
    return true;
  } catch (e) {
    console.warn('Error while loading data:', e);
    return false;
  }
}
