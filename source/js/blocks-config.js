/**
 * Blocks Configuration - GrapesJS Style
 * This file demonstrates how to add blocks to the editor programmatically
 */

// Wait for the blocks panel to be ready
function initializeBlocks() {
  const blocksPanel = document.querySelector('blocks-panel');
  
  if (blocksPanel && blocksPanel.initialized) {
    // Add some basic blocks similar to GrapesJS
    addBasicBlocks(blocksPanel);
  } else {
    // Retry after a short delay
    setTimeout(initializeBlocks, 100);
  }
}

// Try multiple initialization methods
document.addEventListener('components-loaded', initializeBlocks);
document.addEventListener('DOMContentLoaded', initializeBlocks);

setTimeout(initializeBlocks, 500);
setTimeout(initializeBlocks, 1000);
setTimeout(initializeBlocks, 2000);

function addBasicBlocks(blocksPanel) {
  // Layout-focused blocks configuration
  const DEFAULT_BLOCKS = [
    // Single Column Layouts
    {
      id: '1-column',
      label: '1 Column',
      category: 'layout',
      content: '<div class="layout-block single-column"><div class="column">Single Column Content</div></div>',
      attributes: {
        icon: 'fas fa-square',
        title: 'Single column layout'
      }
    },
    
    // Two Column Layouts
    {
      id: '2-columns-equal',
      label: '2 Columns (50/50)',
      category: 'layout',
      content: '<div class="layout-block two-columns equal"><div class="column">Column 1</div><div class="column">Column 2</div></div>',
      attributes: {
        icon: 'fas fa-columns',
        title: '2 equal columns (50% + 50%)'
      }
    },
    {
      id: '2-columns-sidebar-left',
      label: '2 Columns (25/75)',
      category: 'layout',
      content: '<div class="layout-block two-columns sidebar-left"><div class="column sidebar">Sidebar</div><div class="column main">Main Content</div></div>',
      attributes: {
        icon: 'fas fa-layout-sidebar',
        title: 'Left sidebar layout (25% + 75%)'
      }
    },
    {
      id: '2-columns-sidebar-right',
      label: '2 Columns (75/25)',
      category: 'layout',
      content: '<div class="layout-block two-columns sidebar-right"><div class="column main">Main Content</div><div class="column sidebar">Sidebar</div></div>',
      attributes: {
        icon: 'fas fa-layout-sidebar-reverse',
        title: 'Right sidebar layout (75% + 25%)'
      }
    },
    
    // Three Column Layouts
    {
      id: '3-columns-equal',
      label: '3 Columns (33/33/33)',
      category: 'layout',
      content: '<div class="layout-block three-columns equal"><div class="column">Column 1</div><div class="column">Column 2</div><div class="column">Column 3</div></div>',
      attributes: {
        icon: 'fas fa-th-large',
        title: '3 equal columns (33% each)'
      }
    },
    {
      id: '3-columns-center-focus',
      label: '3 Columns (25/50/25)',
      category: 'layout',
      content: '<div class="layout-block three-columns center-focus"><div class="column side">Side</div><div class="column center">Main Content</div><div class="column side">Side</div></div>',
      attributes: {
        icon: 'fas fa-grip-lines-vertical',
        title: 'Center-focused layout (25% + 50% + 25%)'
      }
    },
    
    // Four Column Layouts
    {
      id: '4-columns-equal',
      label: '4 Columns (25/25/25/25)',
      category: 'layout',
      content: '<div class="layout-block four-columns equal"><div class="column">Col 1</div><div class="column">Col 2</div><div class="column">Col 3</div><div class="column">Col 4</div></div>',
      attributes: {
        icon: 'fas fa-th',
        title: '4 equal columns (25% each)'
      }
    },
    
    // Complex Layouts
    {
      id: 'hero-section',
      label: 'Hero Section',
      category: 'layout',
      content: '<div class="layout-block hero-section"><div class="hero-content"><h1>Hero Title</h1><p>Hero description</p></div></div>',
      attributes: {
        icon: 'fas fa-star',
        title: 'Hero section layout'
      }
    },
    {
      id: 'card-grid',
      label: 'Card Grid (2x2)',
      category: 'layout',
      content: '<div class="layout-block card-grid"><div class="card">Card 1</div><div class="card">Card 2</div><div class="card">Card 3</div><div class="card">Card 4</div></div>',
      attributes: {
        icon: 'fas fa-grip',
        title: '2x2 card grid layout'
      }
    }
  ];
  
  // Add all blocks to the panel
  DEFAULT_BLOCKS.forEach(block => {
    blocksPanel.add(block);
  });
  
  console.log('📦 Added default blocks:', DEFAULT_BLOCKS.length);
}

// Global function to manually initialize blocks (for debugging)
window.initializeBlocksManually = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    console.log('🔧 Manually initializing blocks...');
    addBasicBlocks(blocksPanel);
    return true;
  } else {
    console.error('❌ Blocks panel not found');
    return false;
  }
};

// Global function to check blocks panel status
window.checkBlocksPanel = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    console.log('📊 Blocks Panel Status:');
    console.log('- Found:', !!blocksPanel);
    console.log('- Initialized:', blocksPanel.initialized);
    console.log('- Blocks count:', blocksPanel.blocks ? blocksPanel.blocks.size : 'N/A');
    console.log('- Categories:', blocksPanel.categories ? Array.from(blocksPanel.categories) : 'N/A');
    return blocksPanel;
  } else {
    console.error('❌ Blocks panel not found in DOM');
    return null;
  }
};

// Global function to check left sidebar status
window.checkLeftSidebar = function() {
  const leftSidebar = document.querySelector('left-sidebar');
  if (leftSidebar) {
    console.log('📊 Left Sidebar Status:');
    console.log('- Found:', !!leftSidebar);
    console.log('- Active panel:', leftSidebar.activePanel);
    console.log('- Sections count:', leftSidebar.sections ? leftSidebar.sections.length : 'N/A');
    
    const sections = leftSidebar.querySelectorAll('.sidebar-section');
    console.log('- Available sections:');
    sections.forEach(sec => {
      console.log(`  - ${sec.dataset.section}: ${sec.classList.contains('active') ? 'active' : 'inactive'}`);
    });
    
    return leftSidebar;
  } else {
    console.error('❌ Left sidebar not found in DOM');
    return null;
  }
};

// Global function to manually switch to blocks panel
window.switchToBlocks = function() {
  const leftSidebar = window.leftSidebar || document.querySelector('left-sidebar');
  if (leftSidebar && leftSidebar.switchToPanel) {
    leftSidebar.switchToPanel('blocks');
    console.log('🔄 Switched to blocks panel');
    return true;
  } else {
    console.error('❌ Cannot switch to blocks panel');
    return false;
  }
};

// Comprehensive debug function
window.debugBlocksSystem = function() {
  console.log('🔍 === BLOCKS SYSTEM DEBUG ===');
  
  // Check left sidebar
  const leftSidebar = document.querySelector('left-sidebar');
  console.log('1. Left Sidebar:', !!leftSidebar);
  if (leftSidebar) {
    console.log('   - Active panel:', leftSidebar.activePanel);
    const sections = leftSidebar.querySelectorAll('.sidebar-section');
    console.log('   - Sections found:', sections.length);
    sections.forEach(sec => {
      console.log(`   - Section ${sec.dataset.section}: ${sec.classList.contains('active') ? 'ACTIVE' : 'inactive'}`);
    });
  }
  
  // Check blocks panel
  const blocksPanel = document.querySelector('blocks-panel');
  console.log('2. Blocks Panel:', !!blocksPanel);
  if (blocksPanel) {
    console.log('   - Initialized:', blocksPanel.initialized);
    console.log('   - Blocks count:', blocksPanel.blocks ? blocksPanel.blocks.size : 'N/A');
    console.log('   - Categories:', blocksPanel.categories ? Array.from(blocksPanel.categories) : 'N/A');
    
    const blocksContent = blocksPanel.querySelector('#blocksContent');
    console.log('   - Blocks content found:', !!blocksContent);
    if (blocksContent) {
      console.log('   - Has blocks class:', blocksContent.classList.contains('has-blocks'));
      const blockItems = blocksContent.querySelectorAll('.block-item');
      console.log('   - Block items in DOM:', blockItems.length);
      const categories = blocksContent.querySelectorAll('.block-category');
      console.log('   - Categories in DOM:', categories.length);
    }
    
    const emptyState = blocksPanel.querySelector('#emptyState');
    console.log('   - Empty state visible:', emptyState ? getComputedStyle(emptyState).display !== 'none' : 'N/A');
  }
  
  // Try to manually initialize blocks
  console.log('3. Manual initialization test...');
  if (blocksPanel && blocksPanel.addDefaultBlocks) {
    try {
      blocksPanel.addDefaultBlocks();
      console.log('   - Manual initialization: SUCCESS');
    } catch (e) {
      console.log('   - Manual initialization: FAILED', e.message);
    }
  }
  
  console.log('🔍 === END DEBUG ===');
  
  // Additional debug: Check filtering
  if (blocksPanel) {
    console.log('4. Block filtering debug...');
    const allBlockItems = blocksPanel.querySelectorAll('.block-item');
    const visibleBlocks = blocksPanel.querySelectorAll('.block-item:not(.hidden)');
    const hiddenBlocks = blocksPanel.querySelectorAll('.block-item.hidden');
    
    console.log('   - All block items:', allBlockItems.length);
    console.log('   - Visible blocks:', visibleBlocks.length);
    console.log('   - Hidden blocks:', hiddenBlocks.length);
    console.log('   - Active category:', blocksPanel.activeCategory);
    
    // Show first few blocks for debugging
    allBlockItems.forEach((block, i) => {
      if (i < 5) {
        console.log(`   - Block ${i}: ${block.dataset.type} (${block.dataset.category}) - ${block.classList.contains('hidden') ? 'HIDDEN' : 'VISIBLE'}`);
      }
    });
  }
  
  return { leftSidebar, blocksPanel };
};

// Example of how to add blocks dynamically
export function addCustomBlock(config) {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    return blocksPanel.add(config);
  }
  return null;
}

// Global function to add custom blocks
window.addCustomBlock = function(config) {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    return blocksPanel.add(config);
  }
  console.error('Blocks panel not found');
  return null;
};

// Example of how to remove blocks
export function removeBlock(id) {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    return blocksPanel.remove(id);
  }
  return false;
}

// Quick fix: Force show all blocks
window.showAllBlocks = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    // Remove hidden class from all blocks
    const hiddenBlocks = blocksPanel.querySelectorAll('.block-item.hidden');
    hiddenBlocks.forEach(block => block.classList.remove('hidden'));
    
    // Set category to 'all'
    blocksPanel.setActiveCategory('all');
    
    console.log('🔄 Forced all blocks to be visible');
    return true;
  }
  return false;
};

// Quick fix: Reset blocks panel
window.resetBlocksPanel = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    // Clear all blocks and re-add them
    blocksPanel.clear();
    blocksPanel.addDefaultBlocks();
    console.log('🔄 Reset blocks panel');
    return true;
  }
  return false;
};

// Force refresh blocks display
window.refreshBlocksDisplay = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    // Force show all categories
    const categories = blocksPanel.querySelectorAll('.block-category');
    categories.forEach(cat => cat.classList.remove('filtered-out'));
    
    // Force show all blocks
    const blocks = blocksPanel.querySelectorAll('.block-item');
    blocks.forEach(block => block.classList.remove('hidden'));
    
    // Set active category to 'all'
    blocksPanel.setActiveCategory('all');
    
    console.log('🔄 Refreshed blocks display - Categories:', categories.length, 'Blocks:', blocks.length);
    return { categories: categories.length, blocks: blocks.length };
  }
  return false;
};

// Force complete reload of blocks
window.forceReloadBlocks = function() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    // Clear all existing blocks
    blocksPanel.blocks.clear();
    blocksPanel.categories.clear();
    
    // Clear DOM
    const blocksContent = blocksPanel.querySelector('#blocksContent');
    if (blocksContent) {
      // Remove all categories except empty state
      const categories = blocksContent.querySelectorAll('.block-category');
      categories.forEach(cat => cat.remove());
    }
    
    // Re-add layout blocks
    blocksPanel.addDefaultBlocks();
    
    // Force refresh display
    blocksPanel.setActiveCategory('all');
    
    console.log('🔄 Force reloaded blocks - New count:', blocksPanel.blocks.size);
    return blocksPanel.blocks.size;
  }
  return false;
};

// Complete system refresh
window.refreshLayoutBlocks = function() {
  console.log('🔄 Refreshing layout blocks system...');
  
  // 1. Force reload blocks
  const blockCount = forceReloadBlocks();
  
  // 2. Refresh display
  refreshBlocksDisplay();
  
  // 3. Debug the system
  setTimeout(() => {
    debugBlocksSystem();
  }, 100);
  
  console.log('✅ Layout blocks system refreshed - Blocks:', blockCount);
  return blockCount;
};

// Example of how to get all blocks
export function getAllBlocks() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    return blocksPanel.getAll();
  }
  return [];
}

// Example of how to clear all blocks
export function clearAllBlocks() {
  const blocksPanel = document.querySelector('blocks-panel');
  if (blocksPanel) {
    blocksPanel.clear();
  }
}
