/**
 * Blocks Panel Web Component
 * Provides a library of draggable components similar to GrapesJS
 */

class BlocksPanel extends HTMLElement {
  constructor() {
    super();
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.initialized = false;
  }

  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/blocks-panel/blocks-panel.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading blocks-panel component:', error);
      this.innerHTML = '<div class="component-error">Error loading blocks panel</div>';
    }
  }

  init() {
    // Get references to key elements
    this.searchInput = this.querySelector('#blocksSearch');
    this.categoryButtons = this.querySelectorAll('.category-btn');
    this.blocksContent = this.querySelector('#blocksContent');
    this.emptyState = this.querySelector('#emptyState');
    
    // Initialize empty collections
    this.blocks = new Map();
    this.categories = new Set(['all']);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize category display
    this.showCategory('all');
    
    // Update empty state
    this.updateEmptyState();
    
    this.initialized = true;
    
    // Debug log
    console.log('🔧 Blocks panel initialized:', this.id || 'blocks-panel');
    
    // Add some default blocks immediately for testing
    this.addDefaultBlocks();
    
    // Force update display after initialization
    setTimeout(() => {
      this.setActiveCategory('all');
      this.updateEmptyState();
      console.log('📦 Blocks panel post-init - Blocks count:', this.blocks.size);
      
      // Debug: Show all block items
      const blockItems = this.querySelectorAll('.block-item');
      console.log('📋 Block items in DOM:', blockItems.length);
      blockItems.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.dataset.type} (${item.dataset.category}) - ${item.classList.contains('hidden') ? 'HIDDEN' : 'VISIBLE'}`);
      });
    }, 100);
  }
  
  addDefaultBlocks() {
    // Layout-focused blocks only
    
    // Single Column Layout
    this.add({
      id: '1-column',
      label: '1 Column',
      category: 'layout',
      content: '<div class="layout-block single-column"><div class="column">Single Column Content</div></div>',
      attributes: {
        title: 'Single column layout',
        icon: 'fas fa-square'
      }
    });
    
    // Two Column Layouts
    this.add({
      id: '2-columns-equal',
      label: '2 Columns (50/50)',
      category: 'layout',
      content: '<div class="layout-block two-columns equal"><div class="column">Column 1</div><div class="column">Column 2</div></div>',
      attributes: {
        title: '2 equal columns (50% + 50%)',
        icon: 'fas fa-columns'
      }
    });
    
    this.add({
      id: '2-columns-sidebar-left',
      label: '2 Columns (25/75)',
      category: 'layout',
      content: '<div class="layout-block two-columns sidebar-left"><div class="column sidebar">Sidebar</div><div class="column main">Main Content</div></div>',
      attributes: {
        title: 'Left sidebar layout (25% + 75%)',
        icon: 'fas fa-layout-sidebar'
      }
    });
    
    this.add({
      id: '2-columns-sidebar-right',
      label: '2 Columns (75/25)',
      category: 'layout',
      content: '<div class="layout-block two-columns sidebar-right"><div class="column main">Main Content</div><div class="column sidebar">Sidebar</div></div>',
      attributes: {
        title: 'Right sidebar layout (75% + 25%)',
        icon: 'fas fa-layout-sidebar-reverse'
      }
    });
    
    // Three Column Layouts
    this.add({
      id: '3-columns-equal',
      label: '3 Columns (33/33/33)',
      category: 'layout',
      content: '<div class="layout-block three-columns equal"><div class="column">Column 1</div><div class="column">Column 2</div><div class="column">Column 3</div></div>',
      attributes: {
        title: '3 equal columns (33% each)',
        icon: 'fas fa-th-large'
      }
    });
    
    this.add({
      id: '3-columns-center-focus',
      label: '3 Columns (25/50/25)',
      category: 'layout',
      content: '<div class="layout-block three-columns center-focus"><div class="column side">Side</div><div class="column center">Main Content</div><div class="column side">Side</div></div>',
      attributes: {
        title: 'Center-focused layout (25% + 50% + 25%)',
        icon: 'fas fa-grip-lines-vertical'
      }
    });
    
    // Four Column Layout
    this.add({
      id: '4-columns-equal',
      label: '4 Columns (25/25/25/25)',
      category: 'layout',
      content: '<div class="layout-block four-columns equal"><div class="column">Col 1</div><div class="column">Col 2</div><div class="column">Col 3</div><div class="column">Col 4</div></div>',
      attributes: {
        title: '4 equal columns (25% each)',
        icon: 'fas fa-th'
      }
    });
    
    // Complex Layouts
    this.add({
      id: 'hero-section',
      label: 'Hero Section',
      category: 'layout',
      content: '<div class="layout-block hero-section"><div class="hero-content"><h1>Hero Title</h1><p>Hero description</p></div></div>',
      attributes: {
        title: 'Hero section layout',
        icon: 'fas fa-star'
      }
    });
    
    this.add({
      id: 'card-grid',
      label: 'Card Grid (2x2)',
      category: 'layout',
      content: '<div class="layout-block card-grid"><div class="card">Card 1</div><div class="card">Card 2</div><div class="card">Card 3</div><div class="card">Card 4</div></div>',
      attributes: {
        title: '2x2 card grid layout',
        icon: 'fas fa-grip'
      }
    });
    
    console.log('📦 Added layout blocks:', this.blocks.size);
  }

  setupEventListeners() {
    // Search functionality
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterBlocks();
    });

    // Category filtering
    this.categoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        this.setActiveCategory(category);
      });
    });
  }

  setActiveCategory(category) {
    this.activeCategory = category;
    
    // Update category buttons
    this.categoryButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    // Show/hide categories
    this.showCategory(category);
    
    // Re-apply search filter
    this.filterBlocks();
  }

  showCategory(category) {
    const blockCategories = this.querySelectorAll('.block-category');
    blockCategories.forEach(categoryEl => {
      if (category === 'all') {
        // Show all categories when 'all' is selected
        categoryEl.classList.remove('filtered-out');
      } else {
        // Hide categories that don't match the selected category
        const shouldShow = categoryEl.dataset.category === category;
        categoryEl.classList.toggle('filtered-out', !shouldShow);
      }
    });
  }

  filterBlocks() {
    const blockItems = this.querySelectorAll('.block-item');
    blockItems.forEach(item => {
      const title = item.querySelector('.block-title')?.textContent.toLowerCase() || '';
      const description = item.querySelector('.block-description')?.textContent.toLowerCase() || '';
      const category = item.dataset.category;
      
      const matchesSearch = !this.searchQuery || 
                           title.includes(this.searchQuery) || 
                           description.includes(this.searchQuery);
      
      const matchesCategory = this.activeCategory === 'all' || 
                             category === this.activeCategory;
      
      const shouldShow = matchesSearch && matchesCategory;
      item.classList.toggle('hidden', !shouldShow);
    });
  }

  handleDragStart(e) {
    const blockItem = e.target.closest('.block-item');
    if (!blockItem) return;

    blockItem.classList.add('dragging');
    
    const blockType = blockItem.dataset.type;
    const blockData = {
      type: blockType,
      category: blockItem.dataset.category,
      source: 'blocks-panel'
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(blockData));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Dispatch custom event for other components to listen
    this.dispatchEvent(new CustomEvent('block-drag-start', {
      detail: { blockType, blockData },
      bubbles: true
    }));
  }

  handleDragEnd(e) {
    const blockItem = e.target.closest('.block-item');
    if (!blockItem) return;

    blockItem.classList.remove('dragging');
    
    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('block-drag-end', {
      detail: { blockType: blockItem.dataset.type },
      bubbles: true
    }));
  }

  addBlockToCanvas(blockItem) {
    if (!blockItem) return;
    
    const blockType = blockItem.dataset.type;
    const editor = window.wysiwygEditor;
    
    if (editor && typeof editor.createElement === 'function') {
      // Add element to center of canvas
      const canvasRect = editor.canvas.getBoundingClientRect();
      const position = {
        x: canvasRect.width / 2 - 100, // Center horizontally
        y: canvasRect.height / 2 - 50  // Center vertically
      };
      
      editor.createElement(blockType, position);
      
      // Dispatch event
      this.dispatchEvent(new CustomEvent('block-added', {
        detail: { blockType, position },
        bubbles: true
      }));
    }
  }

  // Public API methods
  getActiveCategory() {
    return this.activeCategory;
  }

  getSearchQuery() {
    return this.searchQuery;
  }

  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.filterBlocks();
    }
  }

  // GrapesJS-like API for adding blocks
  add(blockConfig) {
    const { id, label, category = 'basic', content, media, attributes = {} } = blockConfig;
    
    console.log('🔍 Adding block:', id, 'category:', category, 'label:', label);
    
    if (!id) {
      console.warn('Block must have an id');
      return null;
    }
    
    // Store block configuration
    this.blocks.set(id, blockConfig);
    this.categories.add(category);
    
    console.log('📋 Blocks map now has:', this.blocks.size, 'blocks');
    
    // Find or create category container
    let categoryEl = this.querySelector(`[data-category="${category}"]`);
    if (!categoryEl) {
      console.log('📁 Creating new category container for:', category);
      categoryEl = this.createCategoryContainer(category);
    } else {
      console.log('📁 Using existing category container for:', category);
    }
    
    // Create block item
    const blockItem = this.createBlockElement(blockConfig);
    console.log('🏠 Created block item:', blockItem);
    
    categoryEl.appendChild(blockItem);
    console.log('🔗 Appended block item to category');
    
    // Update category button if needed
    this.updateCategoryButtons();
    
    // Update empty state
    this.updateEmptyState();
    
    return blockItem;
  }
  
  createCategoryContainer(category) {
    const categoryEl = document.createElement('div');
    categoryEl.className = 'block-category';
    categoryEl.dataset.category = category;
    this.blocksContent.appendChild(categoryEl);
    return categoryEl;
  }
  
  createBlockElement(blockConfig) {
    const { id, label, category, media, attributes = {} } = blockConfig;
    
    const blockItem = document.createElement('div');
    blockItem.className = 'block-item';
    blockItem.dataset.type = id;
    blockItem.dataset.category = category;
    blockItem.draggable = true;
    
    // Use media for preview or fallback to icon
    const preview = media ? 
      `<img src="${media}" alt="${label}" style="width: 100%; height: 100%; object-fit: cover;">` :
      `<i class="${attributes.icon || 'fas fa-cube'}"></i>`;
    
    blockItem.innerHTML = `
      <div class="block-preview">
        ${preview}
      </div>
      <div class="block-info">
        <span class="block-title">${label}</span>
        <span class="block-description">${attributes.title || ''}</span>
      </div>
    `;
    
    // Add event listeners
    this.setupBlockItemEvents(blockItem);
    
    return blockItem;
  }
  
  setupBlockItemEvents(blockItem) {
    blockItem.addEventListener('dragstart', (e) => this.handleDragStart(e));
    blockItem.addEventListener('dragend', (e) => this.handleDragEnd(e));
    blockItem.addEventListener('dblclick', (e) => this.addBlockToCanvas(e.target.closest('.block-item')));
  }
  
  updateCategoryButtons() {
    const categoriesContainer = this.querySelector('.blocks-categories');
    
    // Remove existing category buttons (except 'all')
    const existingBtns = categoriesContainer.querySelectorAll('[data-category]:not([data-category="all"])');
    existingBtns.forEach(btn => btn.remove());
    
    // Add buttons for each category
    this.categories.forEach(category => {
      if (category === 'all') return;
      
      const categoryBtn = document.createElement('button');
      categoryBtn.className = 'category-btn';
      categoryBtn.dataset.category = category;
      categoryBtn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      
      categoriesContainer.appendChild(categoryBtn);
      categoryBtn.addEventListener('click', (e) => {
        this.setActiveCategory(e.target.dataset.category);
      });
    });
  }
  
  updateEmptyState() {
    const hasBlocks = this.blocks.size > 0;
    const visibleBlocks = this.querySelectorAll('.block-item:not(.hidden)');
    const hasVisibleBlocks = visibleBlocks.length > 0;
    
    this.blocksContent.classList.toggle('has-blocks', hasBlocks);
    
    // Debug: Check visible blocks
    console.log('📊 Blocks status - Total:', this.blocks.size, 'Visible:', visibleBlocks.length, 'Active category:', this.activeCategory);
    
    // Force show/hide empty state
    if (this.emptyState) {
      const shouldShowEmpty = !hasBlocks || !hasVisibleBlocks;
      this.emptyState.style.display = shouldShowEmpty ? 'flex' : 'none';
      console.log('📋 Empty state display:', shouldShowEmpty ? 'VISIBLE' : 'HIDDEN');
    }
    
    // Ensure blocks content is visible when we have blocks
    if (this.blocksContent && hasVisibleBlocks) {
      this.blocksContent.style.display = 'block';
    }
  }
  
  // Method to force show all blocks (for debugging)
  forceShowAllBlocks() {
    console.log('🔄 Forcing all blocks to be visible...');
    
    // Remove hidden class from all blocks
    const hiddenBlocks = this.querySelectorAll('.block-item.hidden');
    hiddenBlocks.forEach(block => {
      block.classList.remove('hidden');
      console.log('👁️ Showing block:', block.dataset.type);
    });
    
    // Show all categories
    const categories = this.querySelectorAll('.block-category.filtered-out');
    categories.forEach(cat => {
      cat.classList.remove('filtered-out');
      console.log('👁️ Showing category:', cat.dataset.category);
    });
    
    // Set active category to 'all'
    this.setActiveCategory('all');
    
    // Update empty state
    this.updateEmptyState();
    
    console.log('✅ All blocks should now be visible');
    return this.querySelectorAll('.block-item:not(.hidden)').length;
  }
  
  // GrapesJS-like API methods
  remove(id) {
    if (this.blocks.has(id)) {
      this.blocks.delete(id);
      const blockItem = this.querySelector(`[data-type="${id}"]`);
      if (blockItem) {
        blockItem.remove();
      }
      this.updateEmptyState();
      return true;
    }
    return false;
  }
  
  get(id) {
    return this.blocks.get(id);
  }
  
  getAll() {
    return Array.from(this.blocks.values());
  }
  
  clear() {
    this.blocks.clear();
    this.categories.clear();
    this.categories.add('all');
    
    // Remove all block items
    const blockCategories = this.querySelectorAll('.block-category');
    blockCategories.forEach(cat => cat.remove());
    
    // Reset category buttons
    this.updateCategoryButtons();
    this.updateEmptyState();
  }

  // Legacy method for backward compatibility
  addCustomBlock(blockConfig) {
    const { type, category, title, description, icon, preview } = blockConfig;
    
    return this.add({
      id: type,
      label: title,
      category: category || 'basic',
      media: preview,
      attributes: {
        title: description,
        icon: icon
      }
    });
  }
  
  removeBlock(type) {
    return this.remove(type);
  }

  refresh() {
    this.filterBlocks();
  }
}

// Register the custom element
customElements.define('blocks-panel', BlocksPanel);

// Global debugging functions
window.debugBlocksPanel = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    console.log('🔍 === BLOCKS PANEL DEBUG ===');
    console.log('Initialized:', blocksPanel.initialized);
    console.log('Blocks count:', blocksPanel.blocks.size);
    console.log('Active category:', blocksPanel.activeCategory);
    
    const blockItems = blocksPanel.querySelectorAll('.block-item');
    const visibleBlocks = blocksPanel.querySelectorAll('.block-item:not(.hidden)');
    
    console.log('Total block items:', blockItems.length);
    console.log('Visible blocks:', visibleBlocks.length);
    
    // Show details of first few blocks
    blockItems.forEach((block, i) => {
      if (i < 5) {
        console.log(`Block ${i + 1}: ${block.dataset.type} (${block.dataset.category}) - ${block.classList.contains('hidden') ? 'HIDDEN' : 'VISIBLE'}`);
      }
    });
    
    return blocksPanel;
  } else {
    console.error('Blocks panel not found');
    return null;
  }
};

window.fixBlocksVisibility = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel && blocksPanel.forceShowAllBlocks) {
    return blocksPanel.forceShowAllBlocks();
  } else {
    console.error('Blocks panel or forceShowAllBlocks method not found');
    return false;
  }
};

window.switchToBlocksPanel = function() {
  const leftSidebar = document.querySelector('left-sidebar');
  if (leftSidebar && leftSidebar.switchToPanel) {
    leftSidebar.switchToPanel('blocks');
    console.log('✅ Switched to blocks panel');
    
    // Also fix visibility
    setTimeout(() => {
      window.fixBlocksVisibility();
    }, 200);
    
    return true;
  } else {
    console.error('Left sidebar or switchToPanel method not found');
    return false;
  }
};

export default BlocksPanel;
