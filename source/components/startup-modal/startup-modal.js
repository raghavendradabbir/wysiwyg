import ProjectDataManager from '../../js/projectDataManager.js';

/**
 * StartupModal Web Component
 * Handles project creation and management startup flow
 */
class StartupModal extends HTMLElement {
  constructor() {
    super();
    this.isVisible = false;
    this.initialized = false;
    this.ProjectDataManager = ProjectDataManager;
    this._projectsAll = [];
  }

  // Open the modal directly on the Projects Manager view
  openManager() {
    if (!this.initialized) return;
    this.show();
    this.showProjectManagerView();
    // Refresh list from storage each time it's opened
    this.loadProjects();
  }

  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/startup-modal/startup-modal.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading startup-modal component:', error);
      this.innerHTML = '<div class="component-error">Error loading startup modal</div>';
    }
  }

  init() {
    // Get references to key elements
    this.modal = this.querySelector('#startupModal');
    this.projectManagerView = this.querySelector('#projectManagerView');
    this.createProjectView = this.querySelector('#createProjectView');
    this.startupForm = this.querySelector('#startupForm');

    // Setup event listeners
    this.setupEventListeners();

    // Load existing projects
    this.loadProjects();

    // Mark as initialized
    this.initialized = true;
  }

  setupEventListeners() {
    // Create new project button
    const createNewBtn = this.querySelector('#createNewProjectBtn');
    createNewBtn?.addEventListener('click', () => this.showCreateProjectView());

    // Back to projects button
    const backBtn = this.querySelector('#backToProjectsBtn');
    backBtn?.addEventListener('click', () => this.showProjectManagerView());

    // Form submission
    this.startupForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Same names checkbox
    const sameNamesCheckbox = this.querySelector('#useSameName');
    sameNamesCheckbox?.addEventListener('change', () => this.toggleSolutionField());

    // Validation
    const projectNameInput = this.querySelector('#projectName');
    const solutionNameInput = this.querySelector('#solutionName');

    projectNameInput?.addEventListener('input', () => this.validateCreateProjectForm());
    projectNameInput?.addEventListener('blur', () => this.validateCreateProjectForm());
    solutionNameInput?.addEventListener('input', () => this.validateCreateProjectForm());
    solutionNameInput?.addEventListener('blur', () => this.validateCreateProjectForm());

    // Ensure Enter submits the form
    this.startupForm?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // simulate submit
        this.startupForm?.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    // Initialize submit state
    this._updateSubmitDisabled();

    // Project search
    const searchInput = this.querySelector('#projectSearch');
    searchInput?.addEventListener('input', (e) => this.renderProjects());

    // Group by solution checkbox
    const groupBySolution = this.querySelector('#groupBySolution');
    groupBySolution?.addEventListener('change', (e) => this.renderProjects());

    // Make popup strictly modal: disable overlay/Escape close
    // const overlay = this.querySelector('.startup-modal-overlay');
    // overlay?.addEventListener('click', () => {});
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        // Ignore ESC to enforce modal behavior
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  validateCreateProjectForm() {
    const formData = new FormData(this.startupForm);
    const projectName = formData.get('projectName')?.trim();
    const sameNames = formData.get('useSameName') === 'on';
    const solutionName = sameNames ? projectName : formData.get('solutionName')?.trim();
    const projectNameInput = this.querySelector('#projectName');
    const solutionNameInput = this.querySelector('#solutionName');

    const projectNameError = this.querySelector('#projectNameError');
    const validateProjectName = this.ProjectDataManager.validateProjectName(projectName);
    if (!validateProjectName.valid) {
      projectNameError.textContent = validateProjectName.message;
      projectNameError.style.display = 'block';
      if (!projectNameInput.classList.contains('invalid')) {
        projectNameInput.classList.add('invalid');
      }
    } else {
      projectNameInput.classList.remove('invalid');
      projectNameError.textContent = '';
      projectNameError.style.display = 'none';
    }

    const solutionNameError = this.querySelector('#solutionNameError');
    if (!sameNames) {
      const validateSolutionName = this.ProjectDataManager.validateSolutionName(solutionName);
      if (!validateSolutionName.valid) {
        solutionNameError.textContent = validateSolutionName.message;
        solutionNameError.style.display = 'block';
        if (!solutionNameInput.classList.contains('invalid')) {
          solutionNameInput.classList.add('invalid');
        }
      } else {
        solutionNameError.textContent = '';
        solutionNameError.style.display = 'none';
        solutionNameInput.classList.remove('invalid');
      }
    } else {
      solutionNameError.textContent = '';
      solutionNameError.style.display = 'none';
    }

    if (projectNameError.textContent !== '' || solutionNameError.textContent !== '') {
      this._updateSubmitDisabled();
      return false;
    } else {
      this._updateSubmitEnabled();
      return true;
    }
  }

  show() {
    // Check if component is initialized
    if (!this.initialized || !this.modal) {
      console.warn('StartupModal: Component not yet initialized, waiting...');
      // Wait for initialization and try again
      setTimeout(() => this.show(), 100);
      return;
    }

    this.isVisible = true;
    this.modal.style.display = 'flex';
    this.modal.classList.add('show');
  }

  hide() {
    if (!this.initialized || !this.modal) {
      console.warn('StartupModal: Component not initialized, cannot hide');
      return;
    }

    this.isVisible = false;
    this.modal.classList.remove('show');
    setTimeout(() => {
      if (this.modal) {
        this.modal.style.display = 'none';
      }
    }, 300);
  }

  showCreateProjectView() {
    this.projectManagerView.style.display = 'none';
    this.createProjectView.style.display = 'block';

    // Focus on project name input
    const projectNameInput = this.querySelector('#projectName');
    if (projectNameInput) {
      setTimeout(() => projectNameInput.focus(), 100);
    }
  }

  toggleSolutionField() {
    const sameNamesCheckbox = this.querySelector('#useSameName');
    const solutionGroup = this.querySelector('#solutionNameGroup');
    const solutionNameInput = this.querySelector('#solutionName');
    const solutionError = this.querySelector('#solutionNameError');

    if (!solutionGroup) return;

    const isChecked = sameNamesCheckbox?.checked;

    if (isChecked) {
      // Hide solution field
      solutionGroup.style.display = 'none';
      solutionNameInput?.removeAttribute('required');
      if (solutionNameInput) {
        const projectNameInput = this.querySelector('#projectName');
        solutionNameInput.value = projectNameInput?.value || '';
        solutionNameInput.classList.remove('invalid', 'valid');
      }
      if (solutionError) {
        solutionError.textContent = '';
        solutionError.style.display = 'none';
      }
    } else {
      // Show solution field
      solutionGroup.style.display = 'block';
      solutionNameInput?.setAttribute('required', '');
      // Focus immediately
      solutionNameInput?.focus();
    }
    this._updateSubmitDisabled();
  }

  showProjectManagerView() {
    this.createProjectView.style.display = 'none';
    this.projectManagerView.style.display = 'block';

    // Clear form
    this.startupForm?.reset();
    this._clearValidationErrors();
    // Ensure solution group is hidden if checkbox is on
    this.toggleSolutionField();
    // Refresh table when returning
    this.loadProjects();
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.validateCreateProjectForm()) return;
    try {
      const formData = new FormData(this.startupForm);
      const projectName = formData.get('projectName')?.trim();
      const sameNames = formData.get('useSameName') === 'on';
      const solutionName = sameNames ? projectName : formData.get('solutionName')?.trim();

      await this.ProjectDataManager.createProject({ projectName, solutionName });
      // Hide modal so the editor can show the newly opened project
      this.hide();
      // Also refresh list in background for next time it's opened
      await this.loadProjects();
      // Dispatch custom event for external listeners
      this.dispatchEvent(new CustomEvent('project-created', {
        detail: { projectName, solutionName },
        bubbles: true
      }));
    } catch (error) {
      console.error('Error creating project:', error);
      // Show error inline or via notification system
      alert('Failed to create project. Please try again.');
    }
  }

  _clearValidationErrors() {
    const errorElements = this.querySelectorAll('.form-error');
    errorElements.forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
    // Also reset input validation classes
    const inputs = this.querySelectorAll('#projectName, #solutionName');
    inputs.forEach(inp => inp.classList.remove('invalid', 'valid'));
  }

  _validateName(value) {
    return this.ProjectDataManager.validateProjectName(value);
  }

  _updateSubmitDisabled() {
    const submitBtn = this.querySelector('#startupForm button[type="submit"]');
    submitBtn.disabled = true;
  }

  _updateSubmitEnabled() {
    const submitBtn = this.querySelector('#startupForm button[type="submit"]');
    submitBtn.disabled = false;
  }

  async loadProjects() {
    const loadingState = this.querySelector('#projectsLoading');
    const emptyState = this.querySelector('#projectsEmpty');
    const projectsTable = this.querySelector('#projectsTable');
    const controls = this.querySelector('.project-controls');

    try {
      const projects = await this.ProjectDataManager.getAllProjects();
      this._projectsAll = projects;

      loadingState.style.display = 'none';

      if (projects.length === 0) {
        emptyState.style.display = 'block';
        projectsTable.style.display = 'none';
        if (controls) controls.style.display = 'none';
      } else {
        emptyState.style.display = 'none';
        projectsTable.style.display = 'table';
        if (controls) controls.style.display = 'block';
        this.renderProjects();
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      loadingState.style.display = 'none';
      emptyState.style.display = 'block';
    }
  }

  renderProjects() {
    const projects = this._applyFilters(this._projectsAll);
    const tbody = this.querySelector('#projectsTableBody');
    if (!tbody) return;

    const groupBySolution = this.querySelector('#groupBySolution');
    const groupBySolutionValue = !!groupBySolution?.checked;
    if (groupBySolutionValue) {
      // Group by solution
      const groups = projects.reduce((acc, p) => {
        acc[p.solutionName] = acc[p.solutionName] || [];
        acc[p.solutionName].push(p);
        return acc;
      }, {});
      const solutions = Object.keys(groups).sort((a, b) => a.localeCompare(b));
      const html = solutions.map(sol => {
        const rows = groups[sol].map(project => `
          <tr class="project-row grouped" data-id="${project.id}">
            <td class="project-name"><i class="fas fa-diagram-project" aria-hidden="true"></i>${project.projectName}</td>
            <td class="solution-name">${project.solutionName}</td>
            <td class="last-modified">${this.ProjectDataManager.formatDate(project.lastModified)}</td>
            <td class="version">${project.createdVersion}</td>
            <td class="actions">
              <button class="btn btn-sm btn-primary" data-action="open" data-id="${project.id}">
                <i class="fas fa-folder-open" aria-hidden="true"></i> Open
              </button>
              <button class="btn btn-sm btn-secondary" data-action="delete" data-id="${project.id}">
                <i class="fas fa-trash" aria-hidden="true"></i> Delete
              </button>
            </td>
          </tr>
        `).join('');
        return `
          <tr class="solution-header-row">
            <td colspan="5" class="solution-header"><i class="fas fa-layer-group" aria-hidden="true"></i>${sol}</td>
          </tr>
          ${rows}
        `;
      }).join('');
      tbody.innerHTML = html;
    } else {
      // Flat list
      tbody.innerHTML = projects.map(project => `
        <tr class="project-row" data-id="${project.id}">
          <td class="project-name"><i class="fas fa-diagram-project" aria-hidden="true"></i>${project.projectName}</td>
          <td class="solution-name">${project.solutionName}</td>
          <td class="last-modified">${this.ProjectDataManager.formatDate(project.lastModified)}</td>
          <td class="version">${project.createdVersion}</td>
          <td class="actions">
            <button class="btn btn-sm btn-primary" data-action="open" data-id="${project.id}">
              <i class="fas fa-folder-open" aria-hidden="true"></i> Open
            </button>
            <button class="btn btn-sm btn-secondary" data-action="delete" data-id="${project.id}">
              <i class="fas fa-trash" aria-hidden="true"></i> Delete
            </button>
          </td>
        </tr>
      `).join('');
    }

    // Delegate open/delete actions
    tbody.querySelectorAll('button[data-action]')?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'open') {
          // For now, simply close modal; the app loads last project automatically.
          // Future: dispatch event with selected project if multiple are supported.
          this.hide();
          this.dispatchEvent(new CustomEvent('project-open-requested', { detail: { id }, bubbles: true }));
        } else if (action === 'delete') {
          this.ProjectDataManager.deleteProject(id);
          this.loadProjects();
        }
      });
    });
  }

  // Public API methods
  shouldShow() {
    // Check if this is a first-time user or if they want to manage projects
    return !localStorage.getItem('wysiwyg-editor-initialized');
  }

  isReady() {
    return this.initialized && this.modal;
  }

  async waitForReady() {
    return new Promise((resolve) => {
      if (this.isReady()) {
        resolve();
        return;
      }

      const checkReady = () => {
        if (this.isReady()) {
          resolve();
        } else {
          setTimeout(checkReady, 50);
        }
      };

      checkReady();
    });
  }

  _applyFilters(projects) {
    const searchInput = this.querySelector('#projectSearch');
    const term = searchInput?.value?.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(p =>
      p.name.toLowerCase().includes(term)
    );
  }

}

// Register the custom element
customElements.define('startup-modal', StartupModal);

export default StartupModal;
