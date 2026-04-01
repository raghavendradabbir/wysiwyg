import { showHTMLModal } from './htmlModal.js';
import { showNotification } from './utils.js';
import { updatePlaceholder as updatePlaceholderModule } from './state.js';
import { updateLayersList as updateLayersListModule } from './layerManager.js';

/**
 * ExportManager - Handles HTML/CSS export functionality and file operations
 */
export class ExportManager {
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Export HTML file
   */
  exportHTML() {
    try {
      const cleanHTML = this.getCleanHTML();
      const fullHTML = this.generateFullHTML(cleanHTML);
      this.downloadFile(fullHTML, 'wysiwyg-export.html', 'text/html');
      showNotification('✅ HTML exported successfully!', 'success');
    } catch (error) {
      console.error('Export HTML error:', error);
      showNotification('❌ Failed to export HTML!', 'error');
    }
  }

  /**
   * Export CSS file
   */
  exportCSS() {
    try {
      const { cssContent } = this.generateCleanOutput();
      this.downloadFile(cssContent, 'wysiwyg-styles.css', 'text/css');
      showNotification('✅ CSS exported successfully!', 'success');
    } catch (error) {
      console.error('Export CSS error:', error);
      showNotification('❌ Failed to export CSS!', 'error');
    }
  }

  /**
   * Export complete project (HTML + CSS)
   */
  exportProject() {
    try {
      const { htmlContent, cssContent } = this.generateCleanOutput();
      
      // Create a zip-like structure with both files
      const projectData = {
        'index.html': htmlContent,
        'styles.css': cssContent,
        'project.json': this.generateProjectMetadata()
      };
      
      this.downloadFile(JSON.stringify(projectData, null, 2), 'wysiwyg-project.json', 'application/json');
      showNotification('✅ Project exported successfully!', 'success');
    } catch (error) {
      console.error('Export project error:', error);
      showNotification('❌ Failed to export project!', 'error');
    }
  }

  /**
   * View HTML/CSS in modal
   */
  viewHTML() {
    try {
      // Generate clean HTML and CSS
      const { htmlContent, cssContent } = this.generateCleanOutput();
      
      // Create modal to display both HTML and CSS
      showHTMLModal(this.editor, htmlContent, cssContent);
    } catch (error) {
      console.error('View HTML error:', error);
      showNotification('❌ Failed to generate HTML preview!', 'error');
    }
  }

  /**
   * Get clean HTML without editor artifacts
   */
  getCleanHTML() {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.editor.canvas.innerHTML;
    
    // Remove editor-specific elements and attributes
    tempDiv.querySelectorAll('.editable-element').forEach(el => {
      el.classList.remove('editable-element', 'selected', 'multi-selected');
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-type');
      el.removeAttribute('data-locked');
      el.removeAttribute('draggable');
      
      // Remove adorners
      const adorner = el.querySelector('.element-adorner');
      if (adorner) adorner.remove();
      
      // Replace wrapper with inner content for simple elements
      if (el.children.length === 1 && !el.style.cssText) {
        el.outerHTML = el.innerHTML;
      }
    });
    
    // Remove placeholder
    const placeholder = tempDiv.querySelector('.canvas-placeholder');
    if (placeholder) placeholder.remove();
    
    // Remove selection marquee if present
    const marquee = tempDiv.querySelector('.selection-marquee');
    if (marquee) marquee.remove();
    
    return tempDiv.innerHTML.trim();
  }

  /**
   * Generate full HTML document
   */
  generateFullHTML(cleanHTML) {
    const { cssContent } = this.generateCleanOutput();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WYSIWYG Export</title>
    <style>
${cssContent}
    </style>
</head>
<body>
    <div class="container">
${cleanHTML}
    </div>
</body>
</html>`;
  }

  /**
   * Generate clean HTML and CSS output
   */
  generateCleanOutput() {
    // Generate clean HTML from the canvas
    const canvasClone = this.editor.canvas.cloneNode(true);

    // Remove all adorners and editor-specific elements
    const adorners = canvasClone.querySelectorAll('.element-adorner');
    adorners.forEach(adorner => adorner.remove());

    // Remove selection marquee
    const marquee = canvasClone.querySelector('.selection-marquee');
    if (marquee) marquee.remove();

    // Collect CSS rules and clean up elements
    let cssRules = [];
    const elements = canvasClone.querySelectorAll('.editable-element');

    elements.forEach((element, index) => {
      const elementId = `element-${index + 1}`;
      element.id = elementId;

      // Extract inline styles to CSS
      const inlineStyles = element.style.cssText;
      if (inlineStyles) {
        cssRules.push(`#${elementId} {\n  ${inlineStyles.replace(/; /g, ';\n  ')}\n}`);
        element.removeAttribute('style');
      }

      // Clean up classes and attributes
      element.classList.remove('editable-element', 'selected', 'multi-selected');
      element.removeAttribute('data-locked');
      element.removeAttribute('draggable');
      element.removeAttribute('data-type');
      element.removeAttribute('contenteditable');
    });

    // Remove placeholder if it exists
    const placeholder = canvasClone.querySelector('.canvas-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    // Generate HTML content
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WYSIWYG Export</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
${canvasClone.innerHTML}
    </div>
</body>
</html>`;

    // Generate CSS content
    const cssContent = this.generateCSS(cssRules);

    return { htmlContent, cssContent };
  }

  /**
   * Generate CSS content
   */
  generateCSS(cssRules) {
    return `/* Generated CSS */
.container {
  position: relative;
  padding: 20px;
  background: white;
  min-height: 500px;
}

/* Element Styles */
${cssRules.join('\n\n')}

/* Base Element Styles */
.element-heading {
  font-weight: bold;
  line-height: 1.2;
  margin: 0;
  padding: 5px;
}

.element-paragraph {
  line-height: 1.6;
  font-size: 1rem;
  margin: 0;
  padding: 10px;
}

.element-image {
  display: block;
  border-radius: 6px;
  object-fit: cover;
}

.element-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.element-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.element-list {
  padding: 10px 10px 10px 30px;
  margin: 0;
}

.element-list li {
  margin: 5px 0;
  line-height: 1.5;
}

.element-divider {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, #667eea, transparent);
  margin: 20px 0;
  border-radius: 1px;
}

/* Layout Styles */
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.col {
  flex: 1;
  min-width: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
  
  .row {
    flex-direction: column;
  }
  
  .element-button {
    width: 100%;
    text-align: center;
  }
}`;
  }

  /**
   * Generate project metadata
   */
  generateProjectMetadata() {
    return {
      name: this.editor.currentProject?.name || 'Untitled Project',
      solution: this.editor.currentSolution?.name || 'Untitled Solution',
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      editor: 'WYSIWYG Editor',
      layoutMode: this.editor.currentLayoutMode,
      device: this.editor.currentDevice,
      zoomLevel: this.editor.zoomLevel,
      elementCount: this.editor.canvas.querySelectorAll('.editable-element').length
    };
  }

  /**
   * Download file
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Save to memory (temporary storage)
   */
  saveToMemory() {
    try {
      const saveData = {
        content: this.editor.canvas.innerHTML,
        timestamp: new Date().toISOString(),
        elementCounter: this.editor.elementManager?.elementCounter || this.editor.elementCounter || 0,
        device: this.editor.currentDevice,
        layoutMode: this.editor.currentLayoutMode,
        zoomLevel: this.editor.zoomLevel
      };
      window.editorSaveData = saveData;
      showNotification('✅ Project saved to memory successfully!', 'success');
    } catch (error) {
      console.error('Save to memory error:', error);
      showNotification('❌ Failed to save project!', 'error');
    }
  }

  /**
   * Load from memory
   */
  loadFromMemory() {
    try {
      const savedData = window.editorSaveData;
      if (savedData) {
        this.editor.canvas.innerHTML = savedData.content;
        
        if (this.editor.elementManager) {
          this.editor.elementManager.elementCounter = savedData.elementCounter || 0;
        } else {
          this.editor.elementCounter = savedData.elementCounter || 0;
        }
        
        // Restore other properties
        if (savedData.layoutMode) this.editor.currentLayoutMode = savedData.layoutMode;
        if (savedData.device) this.editor.currentDevice = savedData.device;
        if (savedData.zoomLevel) this.editor.zoomLevel = savedData.zoomLevel;
        
        // Update UI
        updatePlaceholderModule(this.editor);
        this.reattachEventListeners();
        updateLayersListModule(this.editor);
        
        showNotification('✅ Project loaded successfully!', 'success');
      } else {
        showNotification('❌ No saved project found!', 'warning');
      }
    } catch (error) {
      console.error('Load from memory error:', error);
      showNotification('❌ Failed to load project!', 'error');
    }
  }

  /**
   * Reattach event listeners after loading
   */
  reattachEventListeners() {
    const elements = this.editor.canvas.querySelectorAll('.editable-element');
    elements.forEach(element => {
      if (this.editor.elementManager) {
        this.editor.elementManager.addElementEventListeners(element);
      } else {
        this.editor.addElementEventListeners?.(element);
      }
      
      if (this.editor.currentLayoutMode === 'freeform' && !element.querySelector('.element-adorner')) {
        this.editor.addAdorners?.(element);
      }
    });
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    if (confirm('Are you sure you want to clear all content?')) {
      this.editor.canvas.innerHTML = '';
      if (this.editor.placeholder) {
        this.editor.canvas.appendChild(this.editor.placeholder);
      }
      
      this.editor.selectedElement = null;
      this.editor.selectedLayerId = null;
      this.editor.selectedElements?.clear();
      
      if (this.editor.elementManager) {
        this.editor.elementManager.elementCounter = 0;
      } else {
        this.editor.elementCounter = 0;
      }
      
      updatePlaceholderModule(this.editor);
      updateLayersListModule(this.editor);
      
      // Save state
      if (this.editor.historyManager) {
        this.editor.historyManager.saveState();
      } else if (this.editor.saveState) {
        this.editor.saveState();
      }
      
      showNotification('✅ Canvas cleared successfully!', 'success');
    }
  }

  /**
   * Export as image (requires html2canvas library)
   */
  async exportAsImage(format = 'png') {
    try {
      // Check if html2canvas is available
      if (typeof html2canvas === 'undefined') {
        showNotification('❌ html2canvas library not found!', 'error');
        return;
      }

      const canvas = await html2canvas(this.editor.canvas, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wysiwyg-export.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`✅ Image exported as ${format.toUpperCase()}!`, 'success');
      }, `image/${format}`);

    } catch (error) {
      console.error('Export image error:', error);
      showNotification('❌ Failed to export image!', 'error');
    }
  }

  /**
   * Get export statistics
   */
  getExportStats() {
    const elements = this.editor.canvas.querySelectorAll('.editable-element');
    const elementTypes = {};
    
    elements.forEach(el => {
      const type = el.getAttribute('data-type') || 'unknown';
      elementTypes[type] = (elementTypes[type] || 0) + 1;
    });

    return {
      totalElements: elements.length,
      elementTypes,
      canvasSize: {
        width: this.editor.canvas.offsetWidth,
        height: this.editor.canvas.offsetHeight
      },
      layoutMode: this.editor.currentLayoutMode,
      device: this.editor.currentDevice,
      zoomLevel: this.editor.zoomLevel
    };
  }
}
