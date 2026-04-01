// Test setup and utilities for WYSIWYG Editor automation tests
// Provides helper functions and common test configurations

export class TestHelper {
  constructor(page) {
    this.page = page;
  }

  // Navigation helpers
  async navigateToEditor() {
    // Use Playwright's configured baseURL
    await this.page.goto('/');
    // Wait for startup modal instead of canvas since modal shows first
    await this.page.waitForSelector('startup-modal', { timeout: 10000 });
  }

  async waitForStartupModal() {
    await this.page.waitForSelector('#startupModal', { state: 'visible', timeout: 10000 });
  }

  async fillStartupForm(projectName, solutionName = null) {
    // Navigate to create project view first
    await this.page.click('#createNewProjectBtn');
    
    await this.page.fill('#projectName', projectName);
    
    if (solutionName) {
      await this.page.uncheck('#useSameName');
      await this.page.waitForSelector('#solutionNameGroup', { visible: true });
      await this.page.fill('#solutionName', solutionName);
    }
    
    await this.page.click('button[type="submit"]');
    // The modal may be hidden or removed; wait for either state robustly
    await this.page.waitForSelector('#startupModal', { state: 'hidden' }).catch(async () => {
      await this.page.waitForSelector('#startupModal', { state: 'detached' });
    });
  }

  // Element creation helpers
  async dragComponentToCanvas(componentType, x = 200, y = 200) {
    const dragItem = await this.page.locator(`[data-type="${componentType}"]`).first();
    const canvas = await this.page.locator('#canvas');
    
    await dragItem.dragTo(canvas, {
      targetPosition: { x, y }
    });
    
    // Wait for a new editable element to be attached (not necessarily visible yet)
    const newElement = this.page.locator('.editable-element').last();
    await newElement.waitFor({ state: 'attached', timeout: 10000 });
    // Ensure it is in viewport if hidden due to scroll
    try {
      await newElement.scrollIntoViewIfNeeded();
    } catch (_) {}
    return newElement;
  }

  async createElementViaClick(componentType, x = 200, y = 200) {
    await this.page.click(`[data-type="${componentType}"]`);
    await this.page.click('#canvas', { position: { x, y } });
    const newElement = this.page.locator('.editable-element').last();
    await newElement.waitFor({ state: 'attached', timeout: 10000 });
    try { await newElement.scrollIntoViewIfNeeded(); } catch (_) {}
    return newElement;
  }

  // Selection helpers
  async selectElement(element) {
    await element.click();
    await this.page.waitForSelector('.editable-element.selected');
  }

  async selectMultipleElements(elements) {
    for (let i = 0; i < elements.length; i++) {
      const modifier = i === 0 ? [] : ['Meta']; // Cmd/Ctrl for multi-select
      await elements[i].click({ modifiers: modifier });
    }
  }

  // Resize helpers
  async resizeElement(element, direction, deltaX = 50, deltaY = 50) {
    await this.selectElement(element);
    const handle = await element.locator(`.resize-handle.${direction}`);
    
    const handleBox = await handle.boundingBox();
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaX, startY + deltaY);
    await this.page.mouse.up();
  }

  // Drag helpers
  async dragElement(element, deltaX = 100, deltaY = 100) {
    const box = await element.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaX, startY + deltaY);
    await this.page.mouse.up();
  }

  // Hierarchy helpers
  async addProject(projectName) {
    await this.page.click('[data-action="add-project"]');
    await this.page.fill('.item-name-input', projectName);
    await this.page.press('.item-name-input', 'Enter');
  }

  async addPage(pageName) {
    await this.page.click('[data-action="add-page"]');
    await this.page.fill('.item-name-input', pageName);
    await this.page.press('.item-name-input', 'Enter');
  }

  async switchToPage(pageName) {
    await this.page.click(`text=${pageName}`);
    await this.page.waitForTimeout(500); // Allow page switch
  }

  // Context menu helpers
  async rightClickElement(element) {
    await element.click({ button: 'right' });
    await this.page.waitForSelector('#contextMenu', { visible: true });
  }

  async selectContextAction(action) {
    await this.page.click(`[data-action="${action}"]`);
    await this.page.waitForSelector('#contextMenu', { visible: false });
  }

  // Assertion helpers
  async assertElementExists(selector) {
    const element = await this.page.locator(selector);
    await expect(element).toBeVisible();
    return element;
  }

  async assertElementCount(selector, count) {
    const elements = await this.page.locator(selector);
    await expect(elements).toHaveCount(count);
  }

  async assertElementPosition(element, expectedX, expectedY, tolerance = 10) {
    const box = await element.boundingBox();
    expect(Math.abs(box.x - expectedX)).toBeLessThan(tolerance);
    expect(Math.abs(box.y - expectedY)).toBeLessThan(tolerance);
  }

  async assertElementSize(element, expectedWidth, expectedHeight, tolerance = 10) {
    const box = await element.boundingBox();
    expect(Math.abs(box.width - expectedWidth)).toBeLessThan(tolerance);
    expect(Math.abs(box.height - expectedHeight)).toBeLessThan(tolerance);
  }

  // Utility helpers
  async takeScreenshot(name) {
    await this.page.screenshot({ path: `tests/screenshots/${name}.png` });
  }

  async waitForAnimation(duration = 500) {
    await this.page.waitForTimeout(duration);
  }

  async getElementStyle(element, property) {
    return await element.evaluate((el, prop) => {
      return window.getComputedStyle(el)[prop];
    }, property);
  }

  async getCanvasHTML() {
    return await this.page.locator('#canvas').innerHTML();
  }
}

// Test data constants
export const TEST_DATA = {
  projects: {
    simple: 'Test Project',
    complex: 'Complex Website Project'
  },
  solutions: {
    personal: 'Personal Projects',
    business: 'Business Solutions'
  },
  components: [
    'heading', 'text', 'image', 'button', 'list', 
    'divider', 'container', 'spacer'
  ],
  ch5Components: [
    'ch5-button', 'ch5-label', 'ch5-image', 'ch5-slider',
    'ch5-textinput', 'ch5-toggle', 'ch5-select'
  ]
};

// Common test configurations
export const TEST_CONFIG = {
  timeout: 30000,
  viewport: { width: 1920, height: 1080 },
  slowMo: 100, // Slow down for debugging
  headless: false // Set to true for CI
};
