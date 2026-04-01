/**
 * Unified Project Data Manager
 * Single source of truth for all project and solution data
 * Replaces scattered data management across components
 */

class ProjectDataManagerClass {
  constructor() {
    this.storageKey = 'wysiwyg_projects_data_v1';
    this.initializationKey = 'wysiwyg-editor-initialized';
    this.listeners = new Set();
    this._cache = null;
    this._cacheTimestamp = 0;
    this.CACHE_DURATION = 1000; // 1 second cache
  }

  // Event system for data changes
  addEventListener(listener) {
    this.listeners.add(listener);
  }

  removeEventListener(listener) {
    this.listeners.delete(listener);
  }

  _notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.warn('Error in ProjectDataManager listener:', e);
      }
    });
  }

  // Storage operations with caching
  _readStorage() {
    try {
      const now = Date.now();
      if (this._cache && (now - this._cacheTimestamp) < this.CACHE_DURATION) {
        return this._cache;
      }

      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this._cache = { projects: [], meta: { version: '1.0.0', lastUpdated: new Date().toISOString() } };
      } else {
        const data = JSON.parse(raw);
        this._cache = data && typeof data === 'object' ? data : { projects: [], meta: {} };
      }

      this._cacheTimestamp = now;
      return this._cache;
    } catch (e) {
      console.warn('Error reading project storage:', e);
      return { projects: [], meta: {} };
    }
  }

  _writeStorage(data) {
    try {
      const dataToStore = {
        ...data,
        meta: {
          ...data.meta,
          lastUpdated: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
      this._cache = dataToStore;
      this._cacheTimestamp = Date.now();

      this._notifyListeners({
        type: 'data-updated',
        data: dataToStore
      });

      return true;
    } catch (e) {
      console.warn('Error writing project storage:', e);
      return false;
    }
  }

  // Initialization management
  isInitialized() {
    try {
      return !!localStorage.getItem(this.initializationKey);
    } catch {
      return false;
    }
  }

  markInitialized() {
    try {
      localStorage.setItem(this.initializationKey, 'true');
      return true;
    } catch {
      return false;
    }
  }

  // Project CRUD operations
  getAllProjects() {
    const store = this._readStorage();
    return Array.isArray(store.projects) ? store.projects : [];
  }

  getProjectById(projectId) {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === projectId || this._generateStableId(p) === projectId);
  }

  createProject({ projectName, solutionName, pages = null }) {
    // Validate project and solution names
    const validation = this.validateProjectAndSolution(projectName, solutionName);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const store = this._readStorage();
    const now = new Date().toISOString();
    const id = this._generateStableId({ projectName, solutionName, createdOn: now });

    const newProject = {
      id,
      projectName,
      solutionName,
      createdOn: now,
      lastModified: now,
      createdVersion: '1.0.0',
      pages: pages || [
        {
          name: 'Home',
          elements: [],
          content: ''
        }
      ]
    };

    const projects = Array.isArray(store.projects) ? store.projects : [];
    projects.unshift(newProject);

    const success = this._writeStorage({ ...store, projects });

    if (success) {
      this._notifyListeners({
        type: 'project-created',
        project: newProject
      });
    }

    return success ? newProject : null;
  }

  updateProject(projectId, updates) {
    const store = this._readStorage();
    const projects = Array.isArray(store.projects) ? store.projects : [];
    const projectIndex = projects.findIndex(p =>
      p.id === projectId || this._generateStableId(p) === projectId
    );

    if (projectIndex === -1) {
      console.warn('Project not found for update:', projectId);
      return false;
    }

    const updatedProject = {
      ...projects[projectIndex],
      ...updates,
      lastModified: new Date().toISOString()
    };

    projects[projectIndex] = updatedProject;

    const success = this._writeStorage({ ...store, projects });

    if (success) {
      this._notifyListeners({
        type: 'project-updated',
        project: updatedProject,
        updates
      });
    }

    return success;
  }

  deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    const store = this._readStorage();
    const projects = Array.isArray(store.projects) ? store.projects : [];
    const projectIndex = projects.findIndex(p =>
      p.id === projectId || this._generateStableId(p) === projectId
    );

    if (projectIndex === -1) {
      console.warn('Project not found for deletion:', projectId);
      return false;
    }

    const deletedProject = projects[projectIndex];
    projects.splice(projectIndex, 1);

    const success = this._writeStorage({ ...store, projects });

    if (success) {
      this._notifyListeners({
        type: 'project-deleted',
        project: deletedProject
      });
    }

    return success;
  }

  // Project name operations
  updateProjectName(projectId, newName) {
    const validation = this.validateProjectName(newName, projectId);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    return this.updateProject(projectId, { projectName: newName });
  }

  updateSolutionName(projectId, newName) {
    const validation = this.validateSolutionName(newName);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    return this.updateProject(projectId, { solutionName: newName });
  }

  // Validation helpers
  validateProjectName(projectName, excludeProjectId = null) {
    const name = projectName;

    // Basic validation
    if (!name) {
      return { valid: false, message: 'Project name is required' };
    }

    if (name.includes(' ')) {
      return { valid: false, message: 'No spaces allowed in project name' };
    }

    if (!/^[A-Za-z]/.test(name)) {
      return { valid: false, message: 'Project name must start with a letter' };
    }

    // Minimum length 3 characters
    if (name.length < 3) {
      return { valid: false, message: 'Project name must be at least 3 characters long' };
    }

    // Multiple characters: start with letter, end with letter/number, middle can have letters/numbers/hyphens/underscores
    if (!/^[A-Za-z][A-Za-z0-9_-]*[A-Za-z0-9]$/.test(name)) {
      return { valid: false, message: 'Must start with letter, end with letter or number, and contain only letters, numbers, hyphens, and underscores' };
    }

    // Duplicate check
    if (this.isProjectNameDuplicate(name, excludeProjectId)) {
      return { valid: false, message: 'A project with this name already exists' };
    }

    return { valid: true, message: '' };
  }

  validateSolutionName(solutionName) {
    const name = (solutionName || '').trim();

    // Basic validation
    if (!name) {
      return { valid: false, message: 'Solution name is required' };
    }

    if (name.includes(' ')) {
      return { valid: false, message: 'No spaces allowed in solution name' };
    }

    if (!/^[A-Za-z]/.test(name)) {
      return { valid: false, message: 'Solution name must start with a letter' };
    }

    // Minimum length 3 characters
    if (name.length < 3) {
      return { valid: false, message: 'Solution name must be at least 3 characters long' };
    }

    // Regex validation: start with letter, allow letters/numbers/hyphens/underscores in middle (>=1), end with letter/number
    if (!/^[A-Za-z][A-Za-z0-9_-]{1,}[A-Za-z0-9]$/.test(name)) {
      return { valid: false, message: 'Must start with a letter, end with a letter or number, and contain only letters, numbers, hyphens, and underscores' };
    }

    return { valid: true, message: '' };
  }

  validatePageName(pageName, projectId = null, excludePageName = null) {
    const name = (pageName || '').trim();

    // Basic validation - same rules as project names
    if (!name) {
      return { valid: false, message: 'Page name is required' };
    }

    if (name.includes(' ')) {
      return { valid: false, message: 'No spaces allowed in page name' };
    }

    if (!/^[A-Za-z]/.test(name)) {
      return { valid: false, message: 'Page name must start with a letter' };
    }

    // Minimum length 3 characters
    if (name.length < 3) {
      return { valid: false, message: 'Page name must be at least 3 characters long' };
    }

    // Multiple characters: start with letter, end with letter/number, middle can have letters/numbers/hyphens/underscores
    if (!/^[A-Za-z][A-Za-z0-9_-]*[A-Za-z0-9]$/.test(name)) {
      return { valid: false, message: 'Must start with letter, end with letter or number, and contain only letters, numbers, hyphens, and underscores' };
    }

    // Duplicate check within the project
    if (projectId && this.isPageNameDuplicate(projectId, name, excludePageName)) {
      return { valid: false, message: 'A page with this name already exists in this project' };
    }

    return { valid: true, message: '' };
  }

  validateProjectAndSolution(projectName, solutionName, excludeProjectId = null) {
    const projectValidation = this.validateProjectName(projectName, excludeProjectId);
    const solutionValidation = this.validateSolutionName(solutionName);

    if (!projectValidation.valid) {
      return { valid: false, field: 'project', message: projectValidation.message };
    }

    if (!solutionValidation.valid) {
      return { valid: false, field: 'solution', message: solutionValidation.message };
    }

    return { valid: true, message: '' };
  }

  isProjectNameDuplicate(projectName, excludeProjectId = null) {
    const projects = this.getAllProjects();
    const targetName = (projectName || '').trim().toLowerCase();

    return projects.some(p => {
      if (excludeProjectId && (p.id === excludeProjectId || this._generateStableId(p) === excludeProjectId)) {
        return false;
      }
      return (p.projectName || '').trim().toLowerCase() === targetName;
    });
  }

  isPageNameDuplicate(projectId, pageName, excludePageName = null) {
    const project = this.getProjectById(projectId);
    if (!project || !Array.isArray(project.pages)) {
      return false;
    }

    const targetName = (pageName || '').trim().toLowerCase();
    const excludeName = (excludePageName || '').trim().toLowerCase();

    return project.pages.some(page => {
      const currentName = (page.name || '').trim().toLowerCase();
      if (excludeName && currentName === excludeName) {
        return false;
      }
      return currentName === targetName;
    });
  }

  // Page management methods
  addPageToProject(projectId, pageName, pageContent = '') {
    const validation = this.validatePageName(pageName, projectId);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const store = this._readStorage();
    const projects = Array.isArray(store.projects) ? store.projects : [];
    const projectIndex = projects.findIndex(p =>
      p.id === projectId || this._generateStableId(p) === projectId
    );

    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    const project = projects[projectIndex];
    if (!Array.isArray(project.pages)) {
      project.pages = [];
    }

    const newPage = {
      name: pageName,
      elements: [],
      content: pageContent
    };

    project.pages.push(newPage);
    project.lastModified = new Date().toISOString();

    const success = this._writeStorage({ ...store, projects });

    if (success) {
      this._notifyListeners({
        type: 'page-added',
        projectId,
        page: newPage
      });
    }

    return success ? newPage : null;
  }

  updatePageInProject(projectId, oldPageName, newPageName, pageContent = null) {
    const validation = this.validatePageName(newPageName, projectId, oldPageName);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const store = this._readStorage();
    const projects = Array.isArray(store.projects) ? store.projects : [];
    const projectIndex = projects.findIndex(p =>
      p.id === projectId || this._generateStableId(p) === projectId
    );

    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    const project = projects[projectIndex];
    if (!Array.isArray(project.pages)) {
      return false;
    }

    const pageIndex = project.pages.findIndex(page => 
      (page.name || '').trim().toLowerCase() === (oldPageName || '').trim().toLowerCase()
    );

    if (pageIndex === -1) {
      throw new Error('Page not found');
    }

    const page = project.pages[pageIndex];
    page.name = newPageName;
    if (pageContent !== null) {
      page.content = pageContent;
    }
    project.lastModified = new Date().toISOString();

    const success = this._writeStorage({ ...store, projects });

    if (success) {
      this._notifyListeners({
        type: 'page-updated',
        projectId,
        page: page
      });
    }

    return success;
  }

  deletePageFromProject(projectId, pageName) {
    const store = this._readStorage();
    const projects = Array.isArray(store.projects) ? store.projects : [];
    const projectIndex = projects.findIndex(p =>
      p.id === projectId || this._generateStableId(p) === projectId
    );

    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    const project = projects[projectIndex];
    if (!Array.isArray(project.pages)) {
      return false;
    }

    const pageIndex = project.pages.findIndex(page => 
      (page.name || '').trim().toLowerCase() === (pageName || '').trim().toLowerCase()
    );

    if (pageIndex === -1) {
      throw new Error('Page not found');
    }

    const deletedPage = project.pages[pageIndex];
    project.pages.splice(pageIndex, 1);
    project.lastModified = new Date().toISOString();

    const success = this._writeStorage({ ...store, projects });

    if (success) {
      this._notifyListeners({
        type: 'page-deleted',
        projectId,
        page: deletedPage
      });
    }

    return success;
  }

  // Search and filter operations
  searchProjects(searchTerm) {
    const projects = this.getAllProjects();
    const term = (searchTerm || '').trim().toLowerCase();

    if (!term) return projects;

    return projects.filter(p =>
      (p.projectName || '').toLowerCase().includes(term) ||
      (p.solutionName || '').toLowerCase().includes(term)
    );
  }

  getProjectsBySolution(solutionName) {
    const projects = this.getAllProjects();
    return projects.filter(p => p.solutionName === solutionName);
  }

  getAllSolutions() {
    const projects = this.getAllProjects();
    const solutions = new Set();
    projects.forEach(p => {
      if (p.solutionName) {
        solutions.add(p.solutionName);
      }
    });
    return Array.from(solutions).sort();
  }

  // Data migration and compatibility
  migrateFromHierarchyManager(hierarchyData) {
    try {
      const projects = [];

      if (hierarchyData && hierarchyData.solutions) {
        for (const [solutionId, solution] of hierarchyData.solutions) {
          for (const [projectId, project] of solution.projects) {
            const pages = [];
            if (project.pages) {
              for (const [pageId, page] of project.pages) {
                pages.push({
                  name: page.name || 'Page',
                  elements: page.elements || [],
                  content: page.content || ''
                });
              }
            }

            projects.push({
              id: this._generateStableId({
                projectName: project.name,
                solutionName: solution.name,
                createdOn: project.createdAt || new Date().toISOString()
              }),
              projectName: project.name,
              solutionName: solution.name,
              createdOn: project.createdAt || new Date().toISOString(),
              lastModified: project.updatedAt || new Date().toISOString(),
              createdVersion: '1.0.0',
              pages
            });
          }
        }
      }

      if (projects.length > 0) {
        const store = this._readStorage();
        return this._writeStorage({ ...store, projects });
      }

      return true;
    } catch (e) {
      console.warn('Error migrating from hierarchy manager:', e);
      return false;
    }
  }

  // Utility functions
  _generateStableId({ projectName, solutionName, createdOn }) {
    const base = `${projectName || ''}::${solutionName || ''}::${createdOn || ''}`;
    let h = 0;
    for (let i = 0; i < base.length; i++) {
      h = ((h << 5) - h) + base.charCodeAt(i);
      h |= 0;
    }
    return `proj_${Math.abs(h)}`;
  }

  formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mmm}-${yyyy} ${hh}:${mi}`;
  }

  // Debug and maintenance
  clearAllData() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.initializationKey);
      localStorage.removeItem('wysiwyg-hierarchy'); // Clean up old data
      this._cache = null;
      this._cacheTimestamp = 0;

      this._notifyListeners({
        type: 'data-cleared'
      });

      return true;
    } catch {
      return false;
    }
  }

  getStorageInfo() {
    const store = this._readStorage();
    return {
      projectCount: store.projects?.length || 0,
      solutionCount: this.getAllSolutions().length,
      lastUpdated: store.meta?.lastUpdated,
      version: store.meta?.version,
      storageSize: new Blob([JSON.stringify(store)]).size
    };
  }
}

// Create singleton instance
const ProjectDataManager = new ProjectDataManagerClass();

// Export both the instance and the class for flexibility
export default ProjectDataManager;
export { ProjectDataManagerClass };
