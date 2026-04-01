/**
 * Assets Panel Web Component
 * Provides asset management similar to GrapesJS
 */

class AssetsPanel extends HTMLElement {
  constructor() {
    super();
    this.activeTab = 'images';
    this.searchQuery = '';
    this.assets = {
      images: [],
      icons: [],
      media: []
    };
    this.initialized = false;
  }

  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/assets-panel/assets-panel.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading assets-panel component:', error);
      this.innerHTML = '<div class="component-error">Error loading assets panel</div>';
    }
  }

  init() {
    // Get references to key elements
    this.searchInput = this.querySelector('#assetsSearch');
    this.tabButtons = this.querySelectorAll('.asset-tab');
    this.tabContents = this.querySelectorAll('.asset-tab-content');
    this.uploadBtn = this.querySelector('#uploadAssetBtn');
    this.refreshBtn = this.querySelector('#refreshAssetsBtn');
    
    // Upload zones and inputs
    this.imageUploadZone = this.querySelector('#imageUploadZone');
    this.imageFileInput = this.querySelector('#imageFileInput');
    this.mediaUploadZone = this.querySelector('#mediaUploadZone');
    this.mediaFileInput = this.querySelector('#mediaFileInput');
    
    // Asset grids
    this.imagesGrid = this.querySelector('#imagesGrid');
    this.iconsGrid = this.querySelector('#iconsGrid');
    this.mediaGrid = this.querySelector('#mediaGrid');
    
    // Icon category buttons
    this.iconCategoryButtons = this.querySelectorAll('.icon-category-btn');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize with default assets
    this.loadDefaultAssets();
    
    this.initialized = true;
  }

  setupEventListeners() {
    // Search functionality
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterAssets();
    });

    // Tab switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.closest('.asset-tab').dataset.tab;
        this.switchTab(tab);
      });
    });

    // Upload button
    this.uploadBtn?.addEventListener('click', () => {
      this.triggerUpload();
    });

    // Refresh button
    this.refreshBtn?.addEventListener('click', () => {
      this.refreshAssets();
    });

    // Upload zones
    this.setupUploadZone(this.imageUploadZone, this.imageFileInput, 'image');
    this.setupUploadZone(this.mediaUploadZone, this.mediaFileInput, 'media');

    // Icon categories
    this.iconCategoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = e.target.dataset.category;
        this.setActiveIconCategory(category);
      });
    });

    // Asset drag and drop
    this.setupAssetDragAndDrop();
  }

  setupUploadZone(zone, input, type) {
    if (!zone || !input) return;

    // Click to upload
    zone.addEventListener('click', () => {
      input.click();
    });

    // File input change
    input.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files, type);
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      this.handleFileUpload(e.dataTransfer.files, type);
    });
  }

  setupAssetDragAndDrop() {
    // Setup drag for existing assets
    this.querySelectorAll('.asset-item').forEach(item => {
      this.setupAssetItemEvents(item);
    });
  }

  setupAssetItemEvents(item) {
    // Drag start
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      
      const assetData = {
        type: item.dataset.type,
        src: item.dataset.src,
        icon: item.dataset.icon,
        name: item.querySelector('.asset-name')?.textContent,
        source: 'assets-panel'
      };
      
      e.dataTransfer.setData('application/json', JSON.stringify(assetData));
      e.dataTransfer.effectAllowed = 'copy';
      
      this.dispatchEvent(new CustomEvent('asset-drag-start', {
        detail: { assetData },
        bubbles: true
      }));
    });

    // Drag end
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
      
      this.dispatchEvent(new CustomEvent('asset-drag-end', {
        detail: { assetData: { type: item.dataset.type } },
        bubbles: true
      }));
    });

    // Double-click to add
    item.addEventListener('dblclick', (e) => {
      this.addAssetToCanvas(item);
    });

    // Asset actions
    const useBtn = item.querySelector('.asset-action[title="Use Asset"]');
    const deleteBtn = item.querySelector('.asset-action[title="Delete Asset"]');
    
    useBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.addAssetToCanvas(item);
    });
    
    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteAsset(item);
    });
  }

  switchTab(tab) {
    this.activeTab = tab;
    
    // Update tab buttons
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update tab content
    this.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tab}Tab`);
    });
    
    // Filter assets for current tab
    this.filterAssets();
  }

  setActiveIconCategory(category) {
    // Update category buttons
    this.iconCategoryButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    // Filter icons
    const iconItems = this.iconsGrid.querySelectorAll('.icon-item');
    iconItems.forEach(item => {
      const itemCategory = item.dataset.category;
      const shouldShow = category === 'all' || itemCategory === category;
      item.classList.toggle('hidden', !shouldShow);
    });
  }

  handleFileUpload(files, type) {
    Array.from(files).forEach(file => {
      if (this.validateFile(file, type)) {
        this.processFile(file, type);
      }
    });
  }

  validateFile(file, type) {
    const validTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
      media: ['video/mp4', 'video/webm', 'audio/mp3', 'audio/wav']
    };
    
    return validTypes[type]?.includes(file.type);
  }

  processFile(file, type) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const asset = {
        id: Date.now() + Math.random(),
        name: file.name,
        type: type,
        src: e.target.result,
        size: this.formatFileSize(file.size),
        dimensions: null
      };
      
      if (type === 'image') {
        this.getImageDimensions(e.target.result).then(dimensions => {
          asset.dimensions = dimensions;
          this.addAssetToGrid(asset);
        });
      } else {
        this.addAssetToGrid(asset);
      }
    };
    
    reader.readAsDataURL(file);
  }

  getImageDimensions(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(`${img.width}x${img.height}`);
      };
      img.src = src;
    });
  }

  addAssetToGrid(asset) {
    const grid = asset.type === 'image' ? this.imagesGrid : this.mediaGrid;
    if (!grid) return;
    
    const assetItem = this.createAssetItem(asset);
    grid.appendChild(assetItem);
    
    // Store asset
    this.assets[asset.type + 's'].push(asset);
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('asset-added', {
      detail: { asset },
      bubbles: true
    }));
  }

  createAssetItem(asset) {
    const item = document.createElement('div');
    item.className = 'asset-item';
    item.dataset.type = asset.type;
    item.dataset.src = asset.src;
    item.draggable = true;
    
    let previewContent = '';
    if (asset.type === 'image') {
      previewContent = `<img src="${asset.src}" alt="${asset.name}">`;
    } else if (asset.type === 'video') {
      previewContent = `<i class="fas fa-play-circle"></i>`;
    } else if (asset.type === 'audio') {
      previewContent = `<i class="fas fa-music"></i>`;
    }
    
    item.innerHTML = `
      <div class="asset-preview">
        ${previewContent}
        <div class="asset-overlay">
          <button class="asset-action" title="Use Asset">
            <i class="fas fa-plus"></i>
          </button>
          <button class="asset-action" title="Delete Asset">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="asset-info">
        <span class="asset-name">${asset.name}</span>
        ${asset.dimensions ? `<span class="asset-size">${asset.dimensions}</span>` : ''}
      </div>
    `;
    
    this.setupAssetItemEvents(item);
    return item;
  }

  addAssetToCanvas(assetItem) {
    const editor = window.wysiwygEditor;
    if (!editor) return;
    
    const assetType = assetItem.dataset.type;
    const assetSrc = assetItem.dataset.src;
    const assetIcon = assetItem.dataset.icon;
    
    // Get canvas center position
    const canvasRect = editor.canvas.getBoundingClientRect();
    const position = {
      x: canvasRect.width / 2 - 100,
      y: canvasRect.height / 2 - 50
    };
    
    let element;
    if (assetType === 'image') {
      element = editor.createElement('image', position);
      if (element && assetSrc) {
        const img = element.querySelector('img') || element;
        img.src = assetSrc;
      }
    } else if (assetType === 'icon') {
      element = editor.createElement('icon', position);
      if (element && assetIcon) {
        const iconEl = element.querySelector('i') || element;
        iconEl.className = assetIcon;
      }
    } else if (assetType === 'video') {
      element = editor.createElement('video', position);
      if (element && assetSrc) {
        const video = element.querySelector('video') || element;
        video.src = assetSrc;
      }
    }
    
    this.dispatchEvent(new CustomEvent('asset-used', {
      detail: { assetType, assetSrc, assetIcon, element },
      bubbles: true
    }));
  }

  deleteAsset(assetItem) {
    if (confirm('Are you sure you want to delete this asset?')) {
      const assetType = assetItem.dataset.type;
      const assetSrc = assetItem.dataset.src;
      
      // Remove from DOM
      assetItem.remove();
      
      // Remove from assets array
      const assetsArray = this.assets[assetType + 's'];
      const index = assetsArray.findIndex(asset => asset.src === assetSrc);
      if (index > -1) {
        assetsArray.splice(index, 1);
      }
      
      this.dispatchEvent(new CustomEvent('asset-deleted', {
        detail: { assetType, assetSrc },
        bubbles: true
      }));
    }
  }

  filterAssets() {
    const currentGrid = this.querySelector(`#${this.activeTab}Grid`);
    if (!currentGrid) return;
    
    const items = currentGrid.querySelectorAll('.asset-item');
    items.forEach(item => {
      const name = item.querySelector('.asset-name')?.textContent.toLowerCase() || '';
      const matchesSearch = !this.searchQuery || name.includes(this.searchQuery);
      item.classList.toggle('hidden', !matchesSearch);
    });
  }

  triggerUpload() {
    if (this.activeTab === 'images') {
      this.imageFileInput?.click();
    } else if (this.activeTab === 'media') {
      this.mediaFileInput?.click();
    }
  }

  refreshAssets() {
    // Reload assets from storage or server
    this.loadDefaultAssets();
    
    this.dispatchEvent(new CustomEvent('assets-refreshed', {
      bubbles: true
    }));
  }

  loadDefaultAssets() {
    // This would typically load from a server or local storage
    // For now, the default assets are in the HTML template
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Public API methods
  getAssets(type = null) {
    return type ? this.assets[type + 's'] : this.assets;
  }

  addAsset(asset) {
    this.addAssetToGrid(asset);
  }

  removeAsset(id) {
    const item = this.querySelector(`[data-id="${id}"]`);
    if (item) {
      this.deleteAsset(item);
    }
  }

  clearAssets(type = null) {
    if (type) {
      this.assets[type + 's'] = [];
      const grid = this.querySelector(`#${type}sGrid`);
      if (grid) {
        grid.innerHTML = '';
      }
    } else {
      this.assets = { images: [], icons: [], media: [] };
      this.querySelectorAll('.assets-grid').forEach(grid => {
        grid.innerHTML = '';
      });
    }
  }
}

// Register the custom element
customElements.define('assets-panel', AssetsPanel);

export default AssetsPanel;
