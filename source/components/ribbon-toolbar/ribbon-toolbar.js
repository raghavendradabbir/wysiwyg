/**
 * RibbonToolbar Web Component
 * Handles the main toolbar with tabs and ribbon functionality
 */
import { getCurrentPageId, getCurrentProject, isAnyPageDirty } from '../../js/hierarchyManager.js';
import { showNotification } from '../../js/utils.js';

class RibbonToolbar extends HTMLElement {
  constructor() {
    super();
    this.activeTab = 'home';
    this.initialized = false;
    this.collapsed = false;
  }

  async connectedCallback() {
    try {
      // Load the HTML template
      const response = await fetch('./components/ribbon-toolbar/ribbon-toolbar.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      const html = await response.text();
      this.innerHTML = html;

      // Initialize component
      this.init();
    } catch (error) {
      console.error('Error loading ribbon-toolbar component:', error);
      this.innerHTML = '<div class="component-error">Error loading ribbon toolbar</div>';
    }
  }

  init() {
    // Get references to key elements
    this.ribbonTabs = this.querySelectorAll('.ribbon-tab');
    this.ribbonPanels = this.querySelectorAll('.ribbon-panel');
    this.container = this.querySelector('.ribbon-container');

    // Bind event listeners
    this.bindEvents();

    // Initialize state
    this.updateButtonStates();
    // Compute initial Save/Save All enabled state
    this.refreshSaveButtons();

    // Ensure app theme is initialized (default to light; restore saved choice if present)
    try {
      const savedAppTheme = localStorage.getItem('app-theme') || 'light';
      // Apply and sync the UI buttons
      this.changeAppTheme(savedAppTheme);
    } catch (_) {
      // Fallback: force light theme
      this.changeAppTheme('light');
    }

    // Initialize device controls (including expandDeviceFrame functionality)
    this.initializeDeviceControls();

    // Central handler for Ribbon actions
    document.addEventListener('ribbon-action', (e) => {
      const action = e.detail?.action;
      const data = e.detail?.data || {};

      switch (action) {
        // File
        case 'save-page': {
          const editor = window.wysiwygEditor;
          if (editor && typeof editor.saveCurrentPage === 'function') {
            try { editor.saveCurrentPage(); } catch (_) {}
            this.refreshSaveButtons();
          }
          break;
        }
        case 'save-all-pages': {
          const editor = window.wysiwygEditor;
          if (editor && typeof editor.saveAllPages === 'function') {
            try { editor.saveAllPages(); } catch (_) {}
            this.refreshSaveButtons();
          }
          break;
        }
        case 'load': {
          const startupEl = document.querySelector('startup-modal');
          if (startupEl && typeof startupEl.openManager === 'function') {
            startupEl.openManager();
          }
          break;
        }

        // Export / View HTML
        case 'view-html': {
          // Prefer the globally exposed editor instance
          const editor = window.wysiwygEditor;
          if (editor && typeof editor.viewHTML === 'function') {
            try { editor.viewHTML(); } catch (_) {}
          }
          break;
        }
        case 'export-html': {
          const editor = window.wysiwygEditor;
          if (editor && typeof editor.exportHTML === 'function') {
            try { editor.exportHTML(); } catch (_) {}
          }
          break;
        }

        // View: Zoom
        case 'zoom-in':
          import('../../js/canvas.js').then(m => m.zoomIn(this));
          break;
        case 'zoom-out':
          import('../../js/canvas.js').then(m => m.zoomOut(this));
          break;
        case 'zoom-reset':
          import('../../js/canvas.js').then(m => m.resetZoom(this));
          break;
        case 'zoom-set':
          if (typeof data.level === 'number') {
            this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, data.level / 100));
            import('../../js/canvas.js').then(m => m.applyZoom(this));
          }
          break;

        // View: Device
        case 'change-device':
          if (data.device) this.changeDevice?.(data.device);
          break;

        // Design: Themes and layout
        case 'change-ch5-theme':
          if (data.theme) {
            this.changeCH5Theme(this, data.theme);
          }
          break;
        case 'show-theme-info':
          console.log(e);
          // The button tooltip is already updated by changeCH5Theme; we can surface a toast if available
          showNotification(document.getElementById('ch5ThemeInfoBtn').title, 'info');
          break;
        case 'change-app-theme':
          this.changeAppTheme(data.theme);
          break;
        case 'change-layout-mode':
          if (data.mode) this.changeLayoutMode?.(data.mode);
          break;

        // Tabs
        case 'tab-changed':
        case 'ribbon-collapsed':
          // No-op for now; reserved hooks
          break;
      }
    });

    // Mark as initialized
    this.initialized = true;
  }

  initializeDeviceControls() {
    // Wait for editor to be available, then setup device controls
    const checkEditor = () => {
      const editor = window.wysiwygEditor;
      if (editor) {
        this.setupDeviceControls(editor);
      } else {
        // Retry after a short delay
        setTimeout(checkEditor, 100);
      }
    };
    checkEditor();
  }

  bindEvents() {
    // Tab switching and minimize-on-active-tab click
    this.ribbonTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        if (tabName === this.activeTab) {
          this.toggleCollapse();
        } else {
          // ensure expanded when switching to another tab
          if (this.collapsed) this.setCollapsed(false);
          this.switchTab(tabName);
        }
      });
    });

    // Home tab buttons
    this.bindHomeTabEvents();

    // Design tab buttons
    this.bindDesignTabEvents();

    // View tab buttons
    this.bindViewTabEvents();
  }

  bindHomeTabEvents() {
    // Clipboard actions
    const undoBtn = this.querySelector('#undo');
    const redoBtn = this.querySelector('#redo');

    undoBtn?.addEventListener('click', () => this.dispatchAction('undo'));
    redoBtn?.addEventListener('click', () => this.dispatchAction('redo'));

    // File actions
    const saveBtn = this.querySelector('#savePage');
    const saveAllBtn = this.querySelector('#saveAllPages');
    const loadBtn = this.querySelector('#load');

    saveBtn?.addEventListener('click', () => this.dispatchAction('save-page'));
    saveAllBtn?.addEventListener('click', () => this.dispatchAction('save-all-pages'));
    loadBtn?.addEventListener('click', () => this.dispatchAction('load'));

    // Export actions
    const viewHTMLBtn = this.querySelector('#viewHTML');
    const exportHTMLBtn = this.querySelector('#exportHTML');

    viewHTMLBtn?.addEventListener('click', () => this.dispatchAction('view-html'));
    exportHTMLBtn?.addEventListener('click', () => this.dispatchAction('export-html'));
  }

  bindDesignTabEvents() {
    // CH5 Theme selector
    const ch5ThemeSelect = this.querySelector('#ch5Theme');
    ch5ThemeSelect?.addEventListener('change', (e) => {
      this.dispatchAction('change-ch5-theme', { theme: e.target.value });
    });

    // CH5 Theme info button
    const ch5ThemeInfoBtn = this.querySelector('#ch5ThemeInfoBtn');
    ch5ThemeInfoBtn?.addEventListener('click', () => {
      this.dispatchAction('show-theme-info');
    });

    // App theme buttons
    const appThemeLightBtn = this.querySelector('#appThemeLight');
    const appThemeDarkBtn = this.querySelector('#appThemeDark');

    appThemeLightBtn?.addEventListener('click', () => {
      this.dispatchAction('change-app-theme', { theme: 'light' });
    });
    appThemeDarkBtn?.addEventListener('click', () => {
      this.dispatchAction('change-app-theme', { theme: 'dark' });
    });

    // Layout mode selector
    const layoutModeSelect = this.querySelector('#layoutMode');
    layoutModeSelect?.addEventListener('change', (e) => {
      this.dispatchAction('change-layout-mode', { mode: e.target.value });
    });
  }

  bindViewTabEvents() {
    // Zoom controls
    const zoomOutBtn = this.querySelector('#zoomOut');
    const zoomInBtn = this.querySelector('#zoomIn');
    const zoomResetBtn = this.querySelector('#zoomReset');
    const zoomLevelInput = this.querySelector('#zoomLevel');

    zoomOutBtn?.addEventListener('click', () => this.dispatchAction('zoom-out'));
    zoomInBtn?.addEventListener('click', () => this.dispatchAction('zoom-in'));
    zoomResetBtn?.addEventListener('click', () => this.dispatchAction('zoom-reset'));

    zoomLevelInput?.addEventListener('change', (e) => {
      this.dispatchAction('zoom-set', { level: parseInt(e.target.value) });
    });

    // Device selector
    const deviceTypeSelect = this.querySelector('#deviceType');
    deviceTypeSelect?.addEventListener('change', (e) => {
      this.dispatchAction('change-device', { device: e.target.value });
    });

    // Help group
    const viewHelpBtn = this.querySelector('#viewHelp');
    const checkUpdatesBtn = this.querySelector('#checkUpdates');

    viewHelpBtn?.addEventListener('click', () => this.openHelpModal());
    checkUpdatesBtn?.addEventListener('click', () => this.openUpdatesModal());
  }

  // --- Simple modal helpers ---
  openHelpModal() {
    const modal = this._createModal({
      title: 'Help',
      body: `
        <div style="line-height:1.6">
          <p><strong>Help File:</strong> <code>docs/help.md</code></p>
          <p>This editor lets you design pages visually. Use the left sidebar to drag components, the canvas to arrange them, and the ribbon to manage themes, layout, and devices.</p>
          <ul style="margin:8px 0 0 18px">
            <li><strong>Save:</strong> Home → File → Save / Save All</li>
            <li><strong>View HTML:</strong> Home → Export → View HTML</li>
            <li><strong>Themes:</strong> Design → CH5 Themes / App Theme</li>
            <li><strong>Zoom & Device:</strong> View → Zoom / Device</li>
          </ul>
        </div>
      `,
      primaryText: 'Close'
    });
    document.body.appendChild(modal.overlay);
  }

  openUpdatesModal() {
    const currentVersion = '1.0.0'; // fallback; could be wired to package.json at build time
    const modal = this._createModal({
      title: 'Check for Updates',
      body: `
        <div id="updateStatus" style="line-height:1.6">
          <p>Current version: <strong>${currentVersion}</strong></p>
          <p>Checking for updates...</p>
        </div>
      `,
      primaryText: 'Close'
    });
    document.body.appendChild(modal.overlay);

    // Simulate update check
    setTimeout(() => {
      const status = modal.overlay.querySelector('#updateStatus');
      if (!status) return;
      // Simple simulation: no new updates
      status.innerHTML = `
        <p>Current version: <strong>${currentVersion}</strong></p>
        <p>No updates available at this time.</p>
        <p style="color: var(--color-text-muted)">Last checked: ${new Date().toLocaleString()}</p>
      `;
    }, 700);
  }

  _createModal({ title, body, primaryText = 'OK' }) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const modal = document.createElement('div');
    modal.style.background = 'var(--color-surface)';
    modal.style.color = 'var(--color-text)';
    modal.style.border = '1px solid var(--color-border)';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = 'var(--shadow-md)';
    modal.style.width = 'min(520px, 92vw)';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'auto';

    modal.innerHTML = `
      <div style="padding: 14px 16px; border-bottom: 1px solid var(--color-border)">
        <h3 style="margin:0; font-size:16px">${title}</h3>
      </div>
      <div style="padding: 14px 16px">${body}</div>
      <div style="padding: 10px 16px; border-top: 1px solid var(--color-border); display:flex; gap:8px; justify-content:flex-end">
        <button type="button" class="modal-close-btn" style="padding:6px 12px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); border-radius:6px">${primaryText}</button>
      </div>
    `;

    const close = () => overlay.remove();
    modal.querySelector('.modal-close-btn')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.appendChild(modal);
    return { overlay, modal };
  }

  switchTab(tabName) {
    if (this.activeTab === tabName) return;

    // Update tab buttons
    this.ribbonTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update panels
    this.ribbonPanels.forEach(panel => {
      const panelId = `${tabName}-panel`;
      panel.classList.toggle('active', panel.id === panelId);
    });

    this.activeTab = tabName;

    // Dispatch tab change event
    this.dispatchAction('tab-changed', { tab: tabName });
  }

  changeDevice(deviceType) {
    this.currentDevice = deviceType;
    const config = this.deviceConfig[deviceType];

    if (this.deviceFrame) {
      this.deviceFrame.className = 'device-frame';
      this.deviceFrame.classList.add(deviceType);
      if (config.type !== 'desktop') {
        this.deviceFrame.classList.add(config.type);
      }
    }

    this.updateDeviceInfo(this);
    // Recenter after device frame size changes
    if (typeof this.centerCanvas === 'function') {
      this.centerCanvas();
    }
  }

  changeLayoutMode(layoutMode) {
    // Get editor instance
    const editor = window.wysiwygEditor;
    if (!editor) return;
    
    // Update editor's layout mode
    editor.currentLayoutMode = layoutMode;
    
    // Update canvas classes
    if (editor.canvas) {
      editor.canvas.classList.toggle('freeform', layoutMode === 'freeform');
      editor.canvas.classList.toggle('responsive', layoutMode === 'responsive');
      
      // Update all existing elements for the new layout mode
      editor.canvas.querySelectorAll('.editable-element').forEach(element => {
        if (typeof editor.updateElementForLayoutMode === 'function') {
          editor.updateElementForLayoutMode(element, layoutMode);
        }
      });
    }
    
    // Update ribbon UI
    this.setActiveLayoutMode(layoutMode);
    this.updateLayoutInfo(editor);
  }

  // Collapse/expand controls
  toggleCollapse() {
    this.setCollapsed(!this.collapsed);
  }

  setCollapsed(state) {
    this.collapsed = !!state;
    if (this.container) {
      this.container.classList.toggle('collapsed', this.collapsed);
    }
    this.dispatchAction('ribbon-collapsed', { collapsed: this.collapsed });
  }

  isCollapsed() {
    return this.collapsed;
  }

  dispatchAction(action, data = {}) {
    this.dispatchEvent(new CustomEvent('ribbon-action', {
      detail: { action, data },
      bubbles: true
    }));
  }

  // Public API methods
  updateButtonStates(states = {}) {
    // Update button enabled/disabled states
    const {
      canUndo = false,
      canRedo = false,
      canSave = false,
      canSaveAll = false,
      zoomLevel = 100
    } = states;

    const undoBtn = this.querySelector('#undo');
    const redoBtn = this.querySelector('#redo');
    const saveBtn = this.querySelector('#savePage');
    const saveAllBtn = this.querySelector('#saveAllPages');
    const zoomInput = this.querySelector('#zoomLevel');

    if (undoBtn) undoBtn.disabled = !canUndo;
    if (redoBtn) redoBtn.disabled = !canRedo;
    if (saveBtn) saveBtn.disabled = !canSave;
    if (saveAllBtn) saveAllBtn.disabled = !canSaveAll;
    if (zoomInput) zoomInput.value = zoomLevel;
  }

  // Recompute Save/Save All states from hierarchy and update buttons
  refreshSaveButtons() {
    try {
      const currentDirty = this._isCurrentDirty();
      const anyDirty = isAnyPageDirty();
      this.updateButtonStates({ canSave: currentDirty, canSaveAll: anyDirty });
    } catch (_) {
      // Hierarchy not ready; ignore
    }
  }

  _isCurrentDirty() {
    const id = getCurrentPageId();
    if (!id) return false;
    const project = getCurrentProject();
    if (!project) return false;
    const page = project.pages.get(id);
    return !!(page && page.dirty);
  }

  setActiveTheme(theme) {
    const ch5ThemeSelect = this.querySelector('#ch5Theme');
    if (ch5ThemeSelect) {
      ch5ThemeSelect.value = theme;
    }
  }

  setActiveAppTheme(theme) {
    const lightBtn = this.querySelector('#appThemeLight');
    const darkBtn = this.querySelector('#appThemeDark');

    if (lightBtn) lightBtn.classList.toggle('active', theme === 'light');
    if (darkBtn) darkBtn.classList.toggle('active', theme === 'dark');
  }

  setActiveLayoutMode(mode) {
    const layoutSelect = this.querySelector('#layoutMode');
    if (layoutSelect) {
      layoutSelect.value = mode;
    }
  }

  setActiveDevice(device) {
    const deviceSelect = this.querySelector('#deviceType');
    if (deviceSelect) {
      deviceSelect.value = device;
    }
  }

  setZoomLevel(level) {
    const zoomInput = this.querySelector('#zoomLevel');
    if (zoomInput) {
      zoomInput.value = level;
    }
  }

  getActiveTab() {
    return this.activeTab;
  }

  setupDeviceControls(editor) {
    // Ribbon component will dispatch actions for device/layout/theme.
    // Here we keep only passive UI updaters and fullscreen toggle.

    this.updateDeviceInfo(editor);
    this.updateLayoutInfo(editor);
    
    // Fullscreen toggle for device frame
    const expandHost = document.getElementById('expandDeviceFrame');
    const fullscreenTarget = document.querySelector('.main-editor') || editor.deviceFrame;
    if (expandHost && fullscreenTarget) {
      // Render a toggle button if host is empty
      if (expandHost.children.length === 0) {
        const btn = document.createElement('button');
        btn.id = 'fullscreenToggle';
        btn.className = 'toolbar-btn';
        btn.title = 'Maximize';
        btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = '<i class="fas fa-expand" aria-hidden="true"></i>';
        expandHost.appendChild(btn);
      }

      const fsButton = expandHost.querySelector('#fullscreenToggle') || expandHost;

      const isFullscreenActive = () => {
        return !!(document.fullscreenElement && document.fullscreenElement === fullscreenTarget);
      };

      const updateFSUI = () => {
        const active = isFullscreenActive() || fullscreenTarget.classList.contains('fullscreen-fallback');
        if (fsButton instanceof HTMLElement) {
          fsButton.title = active ? 'Minimize' : 'Maximize';
          fsButton.setAttribute('aria-pressed', active ? 'true' : 'false');
          if (fsButton.querySelector('i')) {
            fsButton.querySelector('i').className = active ? 'fas fa-compress' : 'fas fa-expand';
          }
        }
        editor.centerCanvas?.();
      };

      const enterFullscreen = async () => {
        try {
          if (fullscreenTarget.requestFullscreen) {
            await fullscreenTarget.requestFullscreen();
          } else {
            // Fallback CSS fullscreen
            fullscreenTarget.classList.add('fullscreen-fallback');
            document.body.classList.add('no-scroll');
          }
        } catch (_) {
          // Fallback CSS fullscreen on error
          fullscreenTarget.classList.add('fullscreen-fallback');
          document.body.classList.add('no-scroll');
        }
        updateFSUI();
      };

      const exitFullscreen = async () => {
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
          } else {
            fullscreenTarget.classList.remove('fullscreen-fallback');
            document.body.classList.remove('no-scroll');
          }
        } catch (_) {
          fullscreenTarget.classList.remove('fullscreen-fallback');
          document.body.classList.remove('no-scroll');
        }
        updateFSUI();
      };

      const toggleFullscreen = async () => {
        if (isFullscreenActive() || fullscreenTarget.classList.contains('fullscreen-fallback')) {
          await exitFullscreen();
        } else {
          await enterFullscreen();
        }
      };

      if (fsButton instanceof HTMLElement) {
        fsButton.addEventListener('click', toggleFullscreen);
      }

      document.addEventListener('fullscreenchange', () => {
        // Ensure UI stays in sync if user exits with ESC
        if (!document.fullscreenElement) {
          fullscreenTarget.classList.remove('fullscreen-fallback');
          document.body.classList.remove('no-scroll');
        }
        updateFSUI();
      });

      updateFSUI();
    }
  }

  changeAppTheme(theme) {
    const root = document.body;
    root.classList.remove('app-theme-light', 'app-theme-dark');
    root.classList.add(`app-theme-${theme}`);
    // Also set a data attribute so component-scoped [data-theme] CSS variables apply
    try { root.setAttribute('data-theme', theme); } catch {}

    const lightBtn = document.getElementById('appThemeLight');
    const darkBtn = document.getElementById('appThemeDark');
    if (lightBtn && darkBtn) {
      lightBtn.classList.toggle('active', theme === 'light');
      darkBtn.classList.toggle('active', theme === 'dark');
      lightBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
      darkBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }

    // Persist the user's choice
    try { localStorage.setItem('app-theme', theme); } catch {}

    this.updateAppThemeInfo(theme);
  }

  changeCH5Theme(editor, theme) {
    const targets = [];
    if (document.documentElement) targets.push(document.documentElement);
    if (document.body) targets.push(document.body);
    if (editor.deviceFrame) targets.push(editor.deviceFrame);
    const deviceScreen = editor.deviceFrame?.querySelector('.device-screen');
    if (deviceScreen) targets.push(deviceScreen);
    if (editor.canvas) targets.push(editor.canvas);

    const themes = ['light', 'dark', 'high-contrast', 'zoom-light', 'zoom-dark'];
    const classVariantsFor = (t) => [
      `${t}-theme`,
      `ch5-${t}-theme`,
      `ch5-theme-${t}`,
    ];

    targets.forEach(node => {
      // Remove all known variants
      themes.forEach(t => classVariantsFor(t).forEach(cls => node.classList.remove(cls)));
      // Add all variants for the selected theme to maximize compatibility
      classVariantsFor(theme).forEach(cls => node.classList.add(cls));
      // Also set data attributes some styles might look for
      node.setAttribute('data-ch5-theme', theme);
      node.setAttribute('data-theme', theme);
    });

    this.updateThemeInfo(theme);

    // Update CH5 Theme icon + tooltip in the ribbon
    const infoBtn = document.getElementById('ch5ThemeInfoBtn');

    const iconFor = (t) => ({
      'light': '☀️',
      'dark': '🌙',
      'high-contrast': '⚡',
      'zoom-light': '🔆',
      'zoom-dark': '🌑'
    })[t] || '🎨';

    const labelFor = (t) => ({
      'light': 'Light theme',
      'dark': 'Dark theme',
      'high-contrast': 'High Contrast theme',
      'zoom-light': 'Zoom Light theme',
      'zoom-dark': 'Zoom Dark theme'
    })[t] || 'Custom theme';

    if (infoBtn) {
      infoBtn.title = `${labelFor(theme)}`;
    }
  }

  updateDeviceInfo(editor) {
    const info = document.getElementById('deviceInfo');
    if (!info) return;
    const config = editor.deviceConfig?.[editor.currentDevice];
    if (config) info.textContent = `${config.name} - ${config.resolution}`;
  }

  updateLayoutInfo(editor) {
    const layoutInfo = document.getElementById('layoutInfo');
    if (layoutInfo) {
      if (editor.currentLayoutMode === 'freeform') {
        layoutInfo.textContent = 'Freeform: Drag and resize elements freely with adorners';
      } else {
        layoutInfo.textContent = 'Responsive: Elements stack vertically and adapt to screen size';
      }
    }
  }

  updateThemeInfo(theme = null) {
    const themeInfo = document.getElementById('themeInfo');
    const currentTheme = theme || document.getElementById('ch5Theme')?.value || 'light';

    if (themeInfo) {
      const themeDescriptions = {
        'light': 'Light theme with dark text on light backgrounds',
        'dark': 'Dark theme with light text on dark backgrounds',
        'high-contrast': 'High contrast theme for better accessibility',
        'zoom-light': 'Light theme optimized for Zoom projects',
        'zoom-dark': 'Dark theme optimized for Zoom projects'
      };
      themeInfo.textContent = themeDescriptions[currentTheme] || 'Custom theme selected';
    }
  }

  updateAppThemeInfo(theme) {
    const appThemeInfo = document.getElementById('appThemeInfo');
    if (appThemeInfo) {
      const current = theme || document.getElementById('appTheme')?.value || 'light';
      appThemeInfo.textContent = current === 'dark'
        ? 'Editor UI dark theme (canvas theme independent)'
        : 'Editor UI light theme (canvas theme independent)';
    }
  }
}

// Register the custom element
customElements.define('ribbon-toolbar', RibbonToolbar);

export default RibbonToolbar;
