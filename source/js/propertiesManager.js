import { saveState as saveStateModule } from './state.js';

/**
 * PropertiesManager - Handles properties panel management and CH5 properties
 */
export class PropertiesManager {
  constructor(editor) {
    this.editor = editor;
    this.rightSidebar = null;
  }

  /**
   * Update properties panel with selected element
   */
  updatePropertiesPanel(element = null) {
    // Delegate to right-sidebar component if present
    if (!this.rightSidebar) {
      this.rightSidebar = document.querySelector('right-sidebar');
    }
    if (this.rightSidebar?.setSelectedElement) {
      this.rightSidebar.setSelectedElement(element || this.editor.selectedElement || null);
    }
  }

  /**
   * Get CH5 properties for a specific type
   */
  getCH5Properties(type) {
    const ch5Element = this.editor.selectedElement.querySelector(type);
    if (!ch5Element) return '';

    // If schema is loaded, try to build from it
    if (this.editor.ch5Schema) {
      const schemaUI = this.buildCH5PropertiesFromSchema(type, ch5Element);
      if (schemaUI) return schemaUI;
    }

    // Fallback to existing (minimal) defaults when schema not available
    return this.buildFallbackCH5Properties(type, ch5Element);
  }

  /**
   * Build fallback CH5 properties when schema is not available
   */
  buildFallbackCH5Properties(type, ch5Element) {
    let properties = '';
    
    switch (type) {
      case 'ch5-button':
        properties = `
          <div class="property-group">
            <label>Label</label>
            <input type="text" class="property-input ch5-prop" data-attr="label" value="${ch5Element.getAttribute('label') || 'Button'}">
          </div>
        `;
        break;
      case 'ch5-textinput':
        properties = `
          <div class="property-group">
            <label>Placeholder</label>
            <input type="text" class="property-input ch5-prop" data-attr="placeholder" value="${ch5Element.getAttribute('placeholder') || ''}">
          </div>
        `;
        break;
      case 'ch5-slider':
        properties = `
          <div class="property-group">
            <label>Value</label>
            <input type="number" class="property-input ch5-prop" data-attr="value" value="${ch5Element.getAttribute('value') || '50'}">
          </div>
        `;
        break;
    }
    
    return properties;
  }

  /**
   * Build CH5 properties from schema
   */
  buildCH5PropertiesFromSchema(type, ch5Element) {
    try {
      const schema = this.editor.ch5Schema;
      if (!schema) return '';

      // The actual schema structure is: { ch5Elements: { elements: [...] } }
      let compEntry = null;
      if (schema.ch5Elements && Array.isArray(schema.ch5Elements.elements)) {
        compEntry = schema.ch5Elements.elements.find(c => (c.tagName === type || c.name === type));
      }
      if (!compEntry) return '';

      const attrs = compEntry.attributes || compEntry.attrs || compEntry.properties || [];
      if (!Array.isArray(attrs) || attrs.length === 0) return '';

      const ignoreAttributes = [
        'appendclasswheninviewport', 'customclasspressed', 'customclassselected', 
        'customclassdisabled', 'show', 'dir', 'class', 'style', 'role', 'debug', 
        'trace', 'customclass', 'customstyle', 'id', 'disabled'
      ];

      // Build UI
      const groups = attrs.map(attr => {
        if (!ignoreAttributes.includes(attr.name.toLowerCase())) {
          const attrName = attr.name || attr.attribute || attr.key;
          const attrType = (attr.attributeType || attr.type || 'String');
          const attrDefault = attr.default ?? '';
          const attrEnum = Array.isArray(attr.value) ? attr.value : (Array.isArray(attr.enum) ? attr.enum : null);
          const currentVal = ch5Element.getAttribute(attrName) ?? attrDefault ?? '';

          // Skip internal or event-only attributes heuristically, and join-based attributes
          if (!attrName || /^sendevent|^receivestate/i.test(attrName) || attr.join) return '';

          // Skip common attributes that are better handled elsewhere
          if (['id', 'noshowtype'].includes(attrName)) return '';

          let control = '';
          if (attrEnum && attrEnum.length > 0) {
            control = `
            <select class="property-input ch5-schema-prop" data-attr="${attrName}">
              <option value="">-- Select --</option>
              ${attrEnum.map(v => `<option value="${v}" ${String(currentVal) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
            </select>`;
          } else if (/boolean/i.test(attrType)) {
            const checked = String(currentVal) === 'true' || currentVal === true ? 'checked' : '';
            control = `
            <input type="checkbox" class="property-input ch5-schema-prop" data-attr="${attrName}" ${checked}>`;
          } else if (/number|integer/i.test(attrType)) {
            const numVal = Number(currentVal ?? 0);
            control = `
            <input type="number" class="property-input ch5-schema-prop" data-attr="${attrName}" value="${isNaN(numVal) ? '' : numVal}">`;
          } else if (/color/i.test(attrName)) {
            const safe = typeof currentVal === 'string' && /^#|rgb|hsl/.test(currentVal) ? currentVal : '#667eea';
            control = `
            <input type="color" class="property-input ch5-schema-prop" data-attr="${attrName}" value="${safe}">`;
          } else {
            control = `
            <input type="text" class="property-input ch5-schema-prop" data-attr="${attrName}" value="${currentVal}">`;
          }

          return `
          <div class="property-group">
            <label>${attrName}</label>
            ${control}
          </div>`;
        }
      }).filter(Boolean).join('');

      return groups;
    } catch (e) {
      console.warn('Failed to build CH5 properties from schema:', e);
      return '';
    }
  }

  /**
   * Attach property event listeners
   */
  attachPropertyEventListeners() {
    // Width and height inputs
    const widthInput = document.getElementById('prop-width');
    const heightInput = document.getElementById('prop-height');

    if (widthInput) {
      widthInput.addEventListener('input', (e) => {
        const width = parseInt(e.target.value);
        if (width >= 20 && this.editor.selectedElement) {
          this.editor.selectedElement.style.width = width + 'px';
          this.updateCH5ComponentSize(this.editor.selectedElement, width, parseInt(this.editor.selectedElement.style.height) || 50);
          this.editor.updateAdorners(this.editor.selectedElement);
        }
      });
    }

    if (heightInput) {
      heightInput.addEventListener('input', (e) => {
        const height = parseInt(e.target.value);
        if (height >= 20 && this.editor.selectedElement) {
          this.editor.selectedElement.style.height = height + 'px';
          this.updateCH5ComponentSize(this.editor.selectedElement, parseInt(this.editor.selectedElement.style.width) || 150, height);
          this.editor.updateAdorners(this.editor.selectedElement);
        }
      });
    }

    // CH5 attribute inputs
    this.attachCH5PropertyListeners();
    this.attachCH5SchemaPropertyListeners();
    this.attachCH5CSSVariableListeners();
  }

  /**
   * Attach CH5 property listeners
   */
  attachCH5PropertyListeners() {
    const ch5PropInputs = document.querySelectorAll('.ch5-prop');
    ch5PropInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const attr = e.target.getAttribute('data-attr');
        const value = e.target.value;
        const type = this.editor.selectedElement?.getAttribute('data-type');
        const ch5Element = this.editor.selectedElement?.querySelector(type);

        if (ch5Element && attr) {
          ch5Element.setAttribute(attr, value);
          saveStateModule(this.editor);
        }
      });
    });
  }

  /**
   * Attach CH5 schema property listeners
   */
  attachCH5SchemaPropertyListeners() {
    const ch5SchemaInputs = document.querySelectorAll('.ch5-schema-prop');
    ch5SchemaInputs.forEach(input => {
      const eventType = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(eventType, (e) => {
        const attr = e.target.getAttribute('data-attr');
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const type = this.editor.selectedElement?.getAttribute('data-type');
        const ch5Element = this.editor.selectedElement?.querySelector(type);

        if (ch5Element && attr) {
          if (e.target.type === 'checkbox') {
            if (value) {
              ch5Element.setAttribute(attr, 'true');
            } else {
              ch5Element.removeAttribute(attr);
            }
          } else {
            ch5Element.setAttribute(attr, value);
          }
          saveStateModule(this.editor);
        }
      });
    });
  }

  /**
   * Attach CH5 CSS variable listeners
   */
  attachCH5CSSVariableListeners() {
    const ch5CssVarInputs = document.querySelectorAll('.ch5-css-var');
    ch5CssVarInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const cssVar = e.target.getAttribute('data-var');
        const value = e.target.value;
        const type = this.editor.selectedElement?.getAttribute('data-type');
        const ch5Element = this.editor.selectedElement?.querySelector(type);

        if (ch5Element && cssVar) {
          ch5Element.style.setProperty(cssVar, value);
          saveStateModule(this.editor);
        }
      });
    });
  }

  /**
   * Update CH5 component size
   */
  updateCH5ComponentSize(element, width, height) {
    const type = element.getAttribute('data-type');
    if (type && type.startsWith('ch5-')) {
      const ch5Element = element.querySelector(type);
      if (ch5Element) {
        // Update CSS custom properties for CH5 components
        ch5Element.style.setProperty('--width', width + 'px');
        ch5Element.style.setProperty('--height', height + 'px');
        ch5Element.style.width = width + 'px';
        ch5Element.style.height = height + 'px';

        // Update specific CH5 component properties
        if (type === 'ch5-button') {
          ch5Element.setAttribute('customStyle', `width: ${width}px; height: ${height}px;`);
        } else if (type === 'ch5-textinput') {
          ch5Element.setAttribute('customStyle', `width: ${width}px; height: ${height}px;`);
        } else if (type === 'ch5-slider') {
          ch5Element.setAttribute('customStyle', `width: ${width}px; height: ${height}px;`);
        }
      }
    }
  }

  /**
   * Get element properties for display
   */
  getElementProperties(element) {
    if (!element) return {};

    const type = element.getAttribute('data-type');
    const properties = {
      id: element.id,
      type: type,
      width: parseInt(element.style.width) || element.offsetWidth,
      height: parseInt(element.style.height) || element.offsetHeight,
      left: parseInt(element.style.left) || element.offsetLeft,
      top: parseInt(element.style.top) || element.offsetTop,
      zIndex: element.style.zIndex || 'auto'
    };

    // Add CH5-specific properties
    if (type && type.startsWith('ch5-')) {
      const ch5Element = element.querySelector(type);
      if (ch5Element) {
        properties.ch5Attributes = this.getCH5ElementAttributes(ch5Element);
      }
    }

    return properties;
  }

  /**
   * Get CH5 element attributes
   */
  getCH5ElementAttributes(ch5Element) {
    const attributes = {};
    for (let i = 0; i < ch5Element.attributes.length; i++) {
      const attr = ch5Element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  /**
   * Set element property
   */
  setElementProperty(element, property, value) {
    if (!element) return;

    switch (property) {
      case 'width':
        element.style.width = value + 'px';
        this.updateCH5ComponentSize(element, parseInt(value), parseInt(element.style.height) || 50);
        break;
      case 'height':
        element.style.height = value + 'px';
        this.updateCH5ComponentSize(element, parseInt(element.style.width) || 150, parseInt(value));
        break;
      case 'left':
        element.style.left = value + 'px';
        break;
      case 'top':
        element.style.top = value + 'px';
        break;
      case 'zIndex':
        element.style.zIndex = value;
        break;
      default:
        // Handle custom properties
        element.style.setProperty(property, value);
    }

    this.editor.updateAdorners?.(element);
    saveStateModule(this.editor);
  }

  /**
   * Get available property types for an element
   */
  getAvailableProperties(elementType) {
    const baseProperties = ['width', 'height', 'left', 'top', 'zIndex'];
    
    if (elementType && elementType.startsWith('ch5-')) {
      // Add CH5-specific properties based on schema
      if (this.editor.ch5Schema) {
        const compEntry = this.editor.ch5Schema.ch5Elements?.elements?.find(c => 
          c.tagName === elementType || c.name === elementType
        );
        if (compEntry && compEntry.attributes) {
          const ch5Props = compEntry.attributes.map(attr => attr.name || attr.attribute || attr.key);
          return [...baseProperties, ...ch5Props];
        }
      }
    }

    return baseProperties;
  }

  /**
   * Validate property value
   */
  validatePropertyValue(property, value, elementType) {
    switch (property) {
      case 'width':
      case 'height':
        const numValue = parseInt(value);
        return !isNaN(numValue) && numValue >= 20;
      case 'left':
      case 'top':
        const posValue = parseInt(value);
        return !isNaN(posValue) && posValue >= 0;
      case 'zIndex':
        return !isNaN(parseInt(value));
      default:
        return true; // Allow any value for custom properties
    }
  }

  /**
   * Reset properties panel
   */
  resetPropertiesPanel() {
    this.updatePropertiesPanel(null);
  }

  /**
   * Refresh properties panel
   */
  refreshPropertiesPanel() {
    this.updatePropertiesPanel(this.editor.selectedElement);
  }
}
