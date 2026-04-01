/**
 * Component Loader
 * Loads and registers all web components
 */

// Import all web components
import StartupModal from './startup-modal/startup-modal.js';
import RibbonToolbar from './ribbon-toolbar/ribbon-toolbar.js';
import LeftSidebar from './left-sidebar/left-sidebar.js';
import BlocksPanel from './blocks-panel/blocks-panel.js';
import AssetsPanel from './assets-panel/assets-panel.js';
import MainEditor from './main-editor/main-editor.js';
import RightSidebar from './right-sidebar/right-sidebar.js';
import ContextMenu from './context-menu/context-menu.js';
import { PageTabs } from './page-tabs/page-tabs.js';

/**
 * Initialize all components after DOM is loaded
 */
function initializeComponents() {
  // Small delay to ensure all components are registered
  setTimeout(() => {
    // Dispatch event to indicate components are ready
    document.dispatchEvent(new CustomEvent('components-loaded'));
  }, 100);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeComponents);
} else {
  // DOM is already loaded
  initializeComponents();
}

export {
  StartupModal,
  RibbonToolbar,
  // ActivityBar,
  LeftSidebar,
  BlocksPanel,
  AssetsPanel,
  MainEditor,
  RightSidebar,
  ContextMenu,
  PageTabs
};
