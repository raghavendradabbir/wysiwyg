/**
 * LeftSidebar Web Component
 * Handles the left sidebar with multiple panels (Explorer, Components, Layers)
 * Includes toggle functionality, hierarchical structure, and activity bar integration
 */
class LeftSidebar extends HTMLElement {
  constructor() {
    super();
    this.activePanel = 'explorer';
    this.isCollapsed = false;
    this.hierarchyData = null;
  }

  // #region Lifecycle & Initialization
  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/left-sidebar/left-sidebar.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading left-sidebar component:', error);
      this.innerHTML = '<div class="component-error">Error loading left sidebar</div>';
    }
  }

  init() {
    // Get references to key elements
    this.sidebar = this.querySelector('#leftSidebar');
    this.sections = this.querySelectorAll('.sidebar-section');
    this.dragItems = this.querySelectorAll('.drag-item');
    this.activityBar = this.querySelector('#activityBar');
    this.leftSidebarContent = this.querySelector('#leftSidebarContent');

    // Bind event listeners
    this.bindEvents();

    // Initialize drag and drop
    this.setupDragAndDrop();

    // Initialize activity bar
    this.initializeActivityBar();

    // Setup toggle functionality
    this.setupToggleFunctionality();
    
    // Set default active panel
    setTimeout(() => {
      this.switchToPanel('explorer');
    }, 100);

    // Load hierarchy data from localStorage
    this.loadHierarchyData();

    // Show default section on load
    this.showSection(this.activePanel || 'explorer');

    // Initialize layer controls visibility
    this.updateLayerControlsVisibility();
    
    // Make this instance globally accessible for debugging
    window.leftSidebar = this;
    console.log('🔧 Left sidebar initialized');
  }

  bindEvents() {
    // Layer management buttons
    const moveUpBtn = this.querySelector('#moveLayerUp');
    const moveDownBtn = this.querySelector('#moveLayerDown');
    const duplicateBtn = this.querySelector('#duplicateLayer');
    const deleteBtn = this.querySelector('#deleteLayer');

    moveUpBtn?.addEventListener('click', () => this.dispatchLayerAction('move-up'));
    moveDownBtn?.addEventListener('click', () => this.dispatchLayerAction('move-down'));
    duplicateBtn?.addEventListener('click', () => this.dispatchLayerAction('duplicate'));
    deleteBtn?.addEventListener('click', () => this.dispatchLayerAction('delete'));

    // Hierarchy tree event delegation
    const hierarchyTree = this.querySelector('#hierarchyTree');
    if (hierarchyTree) {
      hierarchyTree.addEventListener('click', (e) => {
        this.handleHierarchyClick(e);
      });
    }
  }

  setupDragAndDrop() {
    this.dragItems.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        const componentType = item.dataset.type;
        e.dataTransfer.setData('text/plain', componentType);
        e.dataTransfer.effectAllowed = 'copy';

        // Add visual feedback
        item.classList.add('dragging');

        // Dispatch drag start event
        this.dispatchEvent(new CustomEvent('component-drag-start', {
          detail: { componentType, element: item },
          bubbles: true
        }));
      });

      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');

        // Dispatch drag end event
        this.dispatchEvent(new CustomEvent('component-drag-end', {
          detail: { componentType: item.dataset.type, element: item },
          bubbles: true
        }));
      });

      // Keyboard accessibility for drag items
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.dispatchEvent(new CustomEvent('component-selected', {
            detail: { componentType: item.dataset.type, element: item },
            bubbles: true
          }));
        }
      });
    });
  }

  dispatchLayerAction(action) {
    this.dispatchEvent(new CustomEvent('layer-action', {
      detail: { action },
      bubbles: true
    }));
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebar.classList.toggle('collapsed', this.isCollapsed);

    // Dispatch collapse event
    this.dispatchEvent(new CustomEvent('sidebar-toggled', {
      detail: { collapsed: this.isCollapsed },
      bubbles: true
    }));
  }

  setCollapsed(collapsed) {
    this.isCollapsed = collapsed;
    this.sidebar.classList.toggle('collapsed', collapsed);
  }

  addComponent(config) {
    const { type, icon, label, category = 'basic' } = config;

    const dragItem = document.createElement('div');
    dragItem.className = 'drag-item';
    dragItem.draggable = true;
    dragItem.dataset.type = type;
    dragItem.setAttribute('tabindex', '0');

    const iconElement = document.createElement('i');
    iconElement.className = `fas ${icon}`;
    iconElement.setAttribute('aria-hidden', 'true');

    dragItem.appendChild(iconElement);
    dragItem.appendChild(document.createTextNode(` ${label}`));

    // Add to appropriate category
    const categoryContent = category === 'ch5'
      ? this.querySelector('#ch5-components-content .drag-items')
      : this.querySelector('#basic-components-content .drag-items');

    if (categoryContent) {
      categoryContent.appendChild(dragItem);

      // Setup drag and drop for new item
      this.setupDragAndDropForItem(dragItem);
    }

    return dragItem;
  }

  setupDragAndDropForItem(item) {
    item.addEventListener('dragstart', (e) => {
      const componentType = item.dataset.type;
      e.dataTransfer.setData('text/plain', componentType);
      e.dataTransfer.effectAllowed = 'copy';
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('component-selected', {
          detail: { componentType: item.dataset.type, element: item },
          bubbles: true
        }));
      }
    });
  }

  removeComponent(type) {
    const item = this.querySelector(`[data-type="${type}"]`);
    if (item) {
      item.remove();
    }
  }

  updateLayersList(layers) {
    const layersList = this.querySelector('#layersList');
    const layerControls = this.querySelector('.layer-controls');
    if (!layersList) return;

    // Check if there are layers and if any are selected
    const hasLayers = layers && layers.length > 0;
    const hasSelectedLayer = hasLayers && layers.some(layer => layer.selected);

    // Show/hide layer controls based on selection
    if (layerControls) {
      layerControls.style.display = hasSelectedLayer ? 'flex' : 'none';
    }

    if (!hasLayers) {
      layersList.innerHTML = '<div class="no-layers">No layers available</div>';
      return;
    }

    layersList.innerHTML = layers.map(layer => `
      <div class="layer-item ${layer.selected ? 'selected' : ''}" data-layer-id="${layer.id}">
        <div class="layer-visibility">
          <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}" aria-hidden="true"></i>
        </div>
        <div class="layer-info">
          <div class="layer-name">${layer.name}</div>
          <div class="layer-type">${layer.type}</div>
        </div>
        <div class="layer-actions">
          <button class="layer-action-btn" title="Layer Options">
            <i class="fas fa-ellipsis-h" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners to layer items
    const layerItems = layersList.querySelectorAll('.layer-item');
    layerItems.forEach(item => {
      item.addEventListener('click', () => {
        this.selectLayer(item.dataset.layerId);
      });

      const visibilityBtn = item.querySelector('.layer-visibility');
      visibilityBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLayerVisibility(item.dataset.layerId);
      });

      const actionBtn = item.querySelector('.layer-action-btn');
      actionBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showLayerMenu(e, item.dataset.layerId);
      });
    });
  }

  selectLayer(layerId) {
    // Update visual selection
    const layerItems = this.querySelectorAll('.layer-item');
    layerItems.forEach(item => {
      item.classList.toggle('selected', item.dataset.layerId === layerId);
    });

    // Update layer controls visibility based on selection
    this.updateLayerControlsVisibility();

    // Dispatch layer selection event
    this.dispatchEvent(new CustomEvent('layer-selected', {
      detail: { layerId },
      bubbles: true
    }));
  }

  updateLayerControlsVisibility() {
    const layerControls = this.querySelector('.layer-controls');
    const selectedLayer = this.querySelector('.layer-item.selected');
    
    if (layerControls) {
      layerControls.style.display = selectedLayer ? 'flex' : 'none';
    }
  }

  toggleLayerVisibility(layerId) {
    this.dispatchEvent(new CustomEvent('layer-visibility-toggled', {
      detail: { layerId },
      bubbles: true
    }));
  }

  showLayerMenu(event, layerId) {
    this.dispatchEvent(new CustomEvent('show-layer-menu', {
      detail: {
        layerId,
        x: event.clientX,
        y: event.clientY
      },
      bubbles: true
    }));
  }
  // #endregion Layers Tab

  // #region Shared Utilities
  getNodeIcon(type) {
    const icons = {
      'solution': 'fa-briefcase',
      'project': 'fa-folder',
      'page': 'fa-file-alt'
    };
    return icons[type] || 'fa-file';
  }
  // #endregion Shared Utilities

  // #region Activity Bar & Panel Switching
  // Activity Bar Integration
  initializeActivityBar() {
    const activityItems = this.querySelectorAll('.activity-item');
    // const selectedActivity = activityItems.find(item => item.classList.contains('active'));
    activityItems.forEach(item => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        const isAlreadyActive = item.classList.contains('active');
        if (isAlreadyActive) {
          this.toggleLeftSidebar();
          // Clear active state source-of-truth
          this.activePanel = null;

          // Remove active from all activity items
          const activityItems2 = this.querySelectorAll('.activity-item');
          activityItems2.forEach(i => i.classList.remove('active'));
        } else {
          this.switchToPanel(panel);
          // Update active state
          activityItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });
  }

  toggleLeftSidebar() {
    this.leftSidebarContent.classList.toggle('collapsed');
  }

  switchToPanel(panelId) {
    this.showSection(panelId);
    this.activePanel = panelId;

    // Dispatch panel switch event
    this.dispatchEvent(new CustomEvent('panel-switched', {
      detail: { panel: panelId },
      bubbles: true
    }));
  }

  showSection(panelId) {
    console.log('🔄 Switching to panel:', panelId);
    
    if (!this.sections || this.sections.length === 0) {
      console.warn('⚠️ No sections found');
      return;
    }

    // Hide all sections and show only the selected one
    this.sections.forEach(sec => {
      const match = sec.dataset.section === panelId;
      sec.classList.toggle('active', match);
      console.log(`📝 Section ${sec.dataset.section}: ${match ? 'active' : 'inactive'}`);
    });

    // Update activity bar active state
    const items = this.querySelectorAll('.activity-item');
    if (this.leftSidebarContent.classList.contains('collapsed')) {
      this.toggleLeftSidebar();
    }
    items.forEach(i => i.classList.toggle('active', i.dataset.panel === panelId));
  }
  // #endregion Activity Bar & Panel Switching

  // #region Sidebar Toggle Wiring
  // Toggle Functionality
  setupToggleFunctionality() {
    // Listen for toggle events from parent
    this.addEventListener('toggle-sidebar', () => {
      this.toggleCollapse();
    });
  }
  // #endregion Sidebar Toggle Wiring

  // #region Explorer/Hierarchy Tab
  // Hierarchy Management
  loadHierarchyData() {
    try {
      const savedData = localStorage.getItem('wysiwyg-hierarchy');
      if (savedData) {
        this.hierarchyData = JSON.parse(savedData);
        this.renderHierarchyTree(this.hierarchyData);
      }
    } catch (error) {
      console.error('Error loading hierarchy data:', error);
    }
  }

  handleHierarchyClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const nodeId = target.closest('[data-node-id]')?.dataset.nodeId;
    const nodeType = target.closest('[data-node-type]')?.dataset.nodeType;

    switch (action) {
      case 'toggle':
        this.toggleHierarchyNode(nodeId);
        break;
      case 'select':
        this.selectHierarchyNode(nodeId, nodeType);
        break;
      case 'add-solution':
        this.dispatchHierarchyAction('add-solution');
        break;
      case 'add-project':
        this.dispatchHierarchyAction('add-project', { solutionId: nodeId });
        break;
      case 'add-page':
        this.dispatchHierarchyAction('add-page', { projectId: nodeId });
        break;
      case 'rename':
        this.dispatchHierarchyAction('rename', { nodeId, nodeType });
        break;
      case 'duplicate':
        this.dispatchHierarchyAction('duplicate', { nodeId, nodeType });
        break;
      case 'delete':
        this.dispatchHierarchyAction('delete', { nodeId, nodeType });
        break;
    }
  }

  toggleHierarchyNode(nodeId) {
    if (!this.hierarchyData) return;

    const toggleNode = (nodes) => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          node.expanded = !node.expanded;
          return true;
        }
        if (node.children && toggleNode(node.children)) {
          return true;
        }
      }
      return false;
    };

    if (toggleNode(this.hierarchyData.solutions || [])) {
      this.renderHierarchyTree(this.hierarchyData);
      this.saveHierarchyData();
    }
  }

  selectHierarchyNode(nodeId, nodeType) {
    this.dispatchEvent(new CustomEvent('hierarchy-node-selected', {
      detail: { nodeId, nodeType },
      bubbles: true
    }));
  }

  dispatchHierarchyAction(action, data = {}) {
    this.dispatchEvent(new CustomEvent('hierarchy-action', {
      detail: { action, ...data },
      bubbles: true
    }));
  }

  saveHierarchyData() {
    try {
      localStorage.setItem('wysiwyg-hierarchy', JSON.stringify(this.hierarchyData));
    } catch (error) {
      console.error('Error saving hierarchy data:', error);
    }
  }

  updateHierarchyData(newData) {
    this.hierarchyData = newData;
    this.renderHierarchyTree(newData);
    this.saveHierarchyData();
  }

  // Enhanced hierarchy rendering with actions
  renderHierarchyTree(hierarchyData = null) {
    const hierarchyTree = this.querySelector('#hierarchyTree');
    if (!hierarchyTree) return;

    // TODO - for the below, popup must be shown as screen will never have a create solution
    if (!hierarchyData || !hierarchyData.solutions || hierarchyData.solutions.length === 0) {
      hierarchyTree.innerHTML = `
        <div class="no-hierarchy">
          <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <p>No solutions available</p>
            <button class="btn btn-primary" data-action="add-solution">
              <i class="fas fa-plus"></i> Create Solution
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Render the hierarchical structure
    hierarchyTree.innerHTML = hierarchyData.solutions.map(solution =>
      this.renderHierarchyNode(solution)
    ).join('');
  }

  renderHierarchyNode(node) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = node.expanded || false;

    return `
      <div class="hierarchy-node" data-node-id="${node.id}" data-node-type="${node.type}">
        <div class="hierarchy-item ${node.active ? 'active' : ''}" data-action="select">
          ${hasChildren ? `
            <button class="hierarchy-toggle ${isExpanded ? 'expanded' : ''}" data-action="toggle">
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          ` : '<span class="hierarchy-spacer"></span>'}
          <i class="hierarchy-icon fas ${this.getNodeIcon(node.type)}" aria-hidden="true"></i>
          <span class="hierarchy-label">${node.name}</span>
          <div class="hierarchy-actions">
            ${this.getNodeActions(node.type)}
          </div>
        </div>
        ${hasChildren && isExpanded ? `
          <div class="hierarchy-children">
            ${node.children.map(child => this.renderHierarchyNode(child)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  getNodeActions(type) {
    const actions = {
      'solution': [
        { action: 'add-project', icon: 'fa-plus', title: 'Add Project' },
        { action: 'rename', icon: 'fa-edit', title: 'Rename' },
        { action: 'duplicate', icon: 'fa-copy', title: 'Duplicate' },
        { action: 'delete', icon: 'fa-trash', title: 'Delete' }
      ],
      'project': [
        { action: 'add-page', icon: 'fa-plus', title: 'Add Page' },
        { action: 'rename', icon: 'fa-edit', title: 'Rename' },
        { action: 'duplicate', icon: 'fa-copy', title: 'Duplicate' },
        { action: 'delete', icon: 'fa-trash', title: 'Delete' }
      ],
      'page': [
        { action: 'rename', icon: 'fa-edit', title: 'Rename' },
        { action: 'duplicate', icon: 'fa-copy', title: 'Duplicate' },
        { action: 'delete', icon: 'fa-trash', title: 'Delete' }
      ]
    };

    return (actions[type] || []).map(action =>
      `<button class="hierarchy-action-btn" data-action="${action.action}" title="${action.title}">
        <i class="fas ${action.icon}" aria-hidden="true"></i>
      </button>`
    ).join('');
  }
  // #endregion Explorer/Hierarchy Tab

}

// Register the custom element
customElements.define('left-sidebar', LeftSidebar);

export default LeftSidebar;
