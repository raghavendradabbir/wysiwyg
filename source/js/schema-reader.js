/**
 * CH5SchemaReader - A class to read and parse the CH5 schema.json file
 * Provides access to component definitions, attributes, and validation rules
 */
export class CH5SchemaReader {
  constructor() {
    this.schema = null;
    this.components = new Map();
    this.htmlElements = null;
    this.loaded = false;
  }

  /**
   * Load and parse the schema.json file
   * @returns {Promise<boolean>} True if loaded successfully
   */
  async loadSchema() {
    try {
      const response = await fetch('./jsons/schema.json');
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.status}`);
      }
      
      this.schema = await response.json();
      this.parseSchema();
      this.loaded = true;
      return true;
    } catch (error) {
      console.error('Error loading CH5 schema:', error);
      return false;
    }
  }

  /**
   * Parse the loaded schema and organize components
   */
  parseSchema() {
    if (!this.schema) return;

    // Store HTML elements and common attributes
    this.htmlElements = this.schema.htmlElements || {};

    // Parse CH5 components
    if (this.schema.ch5Elements) {
      for (const [key, component] of Object.entries(this.schema.ch5Elements)) {
        if (component.tagName) {
          this.components.set(component.tagName, {
            ...component,
            key: key
          });
        }
      }
    }
  }

  /**
   * Get all available CH5 component tag names
   * @returns {string[]} Array of component tag names
   */
  getComponentTagNames() {
    return Array.from(this.components.keys()).sort();
  }

  /**
   * Get component definition by tag name
   * @param {string} tagName - The component tag name (e.g., 'ch5-button')
   * @returns {Object|null} Component definition or null if not found
   */
  getComponent(tagName) {
    return this.components.get(tagName) || null;
  }

  /**
   * Get all components matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'ch5-button*')
   * @returns {Object[]} Array of matching components
   */
  getComponentsByPattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.components.entries())
      .filter(([tagName]) => regex.test(tagName))
      .map(([, component]) => component);
  }

  /**
   * Get component attributes
   * @param {string} tagName - The component tag name
   * @returns {Object[]} Array of attribute definitions
   */
  getComponentAttributes(tagName) {
    const component = this.getComponent(tagName);
    return component?.attributes || [];
  }

  /**
   * Get component child elements
   * @param {string} tagName - The component tag name
   * @returns {Object[]} Array of child element definitions
   */
  getComponentChildren(tagName) {
    const component = this.getComponent(tagName);
    return component?.childElements || [];
  }

  /**
   * Get component snippets for code generation
   * @param {string} tagName - The component tag name
   * @returns {Object[]} Array of snippet definitions
   */
  getComponentSnippets(tagName) {
    const component = this.getComponent(tagName);
    return component?.snippets || [];
  }

  /**
   * Get default snippet for a component
   * @param {string} tagName - The component tag name
   * @returns {Object|null} Default snippet or null
   */
  getDefaultSnippet(tagName) {
    const snippets = this.getComponentSnippets(tagName);
    return snippets.find(s => s.prefix.includes(':default')) || 
           snippets.find(s => s.prefix.includes(':blank')) || 
           snippets[0] || null;
  }

  /**
   * Generate default HTML for a component
   * @param {string} tagName - The component tag name
   * @param {string} id - Optional ID for the component
   * @returns {string} Generated HTML string
   */
  generateComponentHTML(tagName, id = null) {
    const snippet = this.getDefaultSnippet(tagName);
    if (!snippet || !snippet.body) {
      return `<${tagName}${id ? ` id="${id}"` : ''}></${tagName}>`;
    }

    // Process snippet body (VS Code snippet format)
    let html = snippet.body.join('\n');
    
    // Replace placeholders
    html = html.replace(/\$\{\d+:[^}]*\}/g, ''); // Remove placeholder defaults
    html = html.replace(/\$\d+/g, ''); // Remove simple placeholders
    
    // Add ID if provided
    if (id && !html.includes('id=')) {
      html = html.replace(`<${tagName}`, `<${tagName} id="${id}"`);
    }

    return html;
  }

  /**
   * Get component documentation
   * @param {string} tagName - The component tag name
   * @returns {string} Component description
   */
  getComponentDescription(tagName) {
    const component = this.getComponent(tagName);
    return component?.description || '';
  }

  /**
   * Get component version
   * @param {string} tagName - The component tag name
   * @returns {string} Component version
   */
  getComponentVersion(tagName) {
    const component = this.getComponent(tagName);
    return component?.componentVersion || '';
  }

  /**
   * Check if component exists in schema
   * @param {string} tagName - The component tag name
   * @returns {boolean} True if component exists
   */
  hasComponent(tagName) {
    return this.components.has(tagName);
  }

  /**
   * Get schema version info
   * @returns {Object} Version information
   */
  getVersionInfo() {
    return {
      version: this.schema?.version || 'unknown',
      componentsVersion: this.schema?.componentsVersion || 'unknown'
    };
  }

  /**
   * Get common HTML attributes
   * @returns {Object[]} Array of common attribute definitions
   */
  getCommonAttributes() {
    return this.htmlElements?.common?.attributes || [];
  }

  /**
   * Search components by name or description
   * @param {string} query - Search query
   * @returns {Object[]} Array of matching components
   */
  searchComponents(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.components.values()).filter(component => 
      component.tagName.toLowerCase().includes(lowerQuery) ||
      component.name.toLowerCase().includes(lowerQuery) ||
      (component.description && component.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all components grouped by category/role
   * @returns {Object} Components grouped by role
   */
  getComponentsByRole() {
    const grouped = {};
    for (const component of this.components.values()) {
      const role = component.role || 'other';
      if (!grouped[role]) {
        grouped[role] = [];
      }
      grouped[role].push(component);
    }
    return grouped;
  }

  /**
   * Validate if a component can have specific children
   * @param {string} parentTagName - Parent component tag name
   * @param {string} childTagName - Child component tag name
   * @returns {boolean} True if child is allowed
   */
  canHaveChild(parentTagName, childTagName) {
    const children = this.getComponentChildren(parentTagName);
    return children.some(child => child.tagName === childTagName);
  }

  /**
   * Get required attributes for a component
   * @param {string} tagName - The component tag name
   * @returns {Object[]} Array of required attributes
   */
  getRequiredAttributes(tagName) {
    const attributes = this.getComponentAttributes(tagName);
    return attributes.filter(attr => attr.required === true);
  }
}

// Create a singleton instance
export const schemaReader = new CH5SchemaReader();

// Auto-load schema when module is imported
schemaReader.loadSchema().catch(console.error);
