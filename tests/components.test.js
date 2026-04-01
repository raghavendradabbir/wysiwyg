// Component Creation and Management Tests
// Tests drag-and-drop, component creation, and basic interactions

import { test, expect } from '@playwright/test';
import { TestHelper, TEST_DATA } from './setup.js';

test.describe('Component Creation and Management', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    // Clear storage before app scripts
    await page.context().addInitScript(() => {
      try { window.localStorage.clear(); } catch (_) {}
    });
    helper = new TestHelper(page);
    await helper.navigateToEditor();
    await helper.fillStartupForm(TEST_DATA.projects.simple);
  });

  test.describe('Basic Component Creation', () => {
    TEST_DATA.components.forEach(componentType => {
      test(`should create ${componentType} component via drag and drop`, async ({ page }) => {
        const element = await helper.dragComponentToCanvas(componentType, 200, 200);
        
        // Verify element created
        await expect(element).toBeVisible();
        await expect(element).toHaveAttribute('data-type', componentType);
        
        // Verify element is selected
        await expect(element).toHaveClass(/selected/);
        
        // Verify adorners appear
        await expect(element.locator('.element-adorner')).toBeVisible();
        
        // Take screenshot for visual verification
        await helper.takeScreenshot(`${componentType}-created`);
      });
    });

    test('should create multiple components', async ({ page }) => {
      // Create heading
      await helper.dragComponentToCanvas('heading', 100, 100);
      
      // Create text below it
      await helper.dragComponentToCanvas('text', 100, 200);
      
      // Create button to the right
      await helper.dragComponentToCanvas('button', 300, 150);
      
      // Verify all elements exist
      await helper.assertElementCount('.editable-element', 3);
      
      // Verify different types
      await expect(page.locator('[data-type="heading"]')).toBeVisible();
      await expect(page.locator('[data-type="text"]')).toBeVisible();
      await expect(page.locator('[data-type="button"]')).toBeVisible();
    });

    test('should position components at drop location', async ({ page }) => {
      const x = 250, y = 300;
      const element = await helper.dragComponentToCanvas('heading', x, y);
      
      // Verify position (with some tolerance for margins/padding)
      await helper.assertElementPosition(element, x - 50, y - 50, 50);
    });
  });

  test.describe('CH5 Component Creation', () => {
    TEST_DATA.ch5Components.forEach(componentType => {
      test(`should create ${componentType} component`, async ({ page }) => {
        const element = await helper.dragComponentToCanvas(componentType, 200, 200);
        
        // Verify CH5 element created
        await expect(element).toBeVisible();
        await expect(element).toHaveAttribute('data-type', componentType);
        
        // Verify inner CH5 element exists
        const ch5Element = element.locator(componentType);
        await expect(ch5Element).toBeVisible();
        
        await helper.takeScreenshot(`${componentType}-created`);
      });
    });

    test('should handle CH5 component specific properties', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('ch5-button', 200, 200);
      
      // Select element to show properties panel
      await helper.selectElement(element);
      
      // Verify properties panel shows CH5-specific options
      const propertiesPanel = page.locator('#propertiesPanel');
      await expect(propertiesPanel).toContainText('CH5');
    });
  });

  test.describe('Component Selection', () => {
    test('should select single component', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Click elsewhere to deselect
      await page.click('#canvas', { position: { x: 400, y: 400 } });
      await expect(element).not.toHaveClass(/selected/);
      
      // Click element to select
      await helper.selectElement(element);
      await expect(element).toHaveClass(/selected/);
      await expect(element.locator('.element-adorner')).toBeVisible();
    });

    test('should support multi-selection with Ctrl/Cmd', async ({ page }) => {
      // Create multiple elements
      const element1 = await helper.dragComponentToCanvas('heading', 100, 100);
      const element2 = await helper.dragComponentToCanvas('text', 200, 200);
      const element3 = await helper.dragComponentToCanvas('button', 300, 300);
      
      // Multi-select with Ctrl/Cmd
      await helper.selectMultipleElements([element1, element2]);
      
      // Verify both selected
      await expect(element1).toHaveClass(/multi-selected/);
      await expect(element2).toHaveClass(/multi-selected/);
      await expect(element3).not.toHaveClass(/multi-selected/);
      
      // Add third element to selection
      await element3.click({ modifiers: ['Meta'] });
      await expect(element3).toHaveClass(/multi-selected/);
    });

    test('should clear selection when clicking canvas', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Element should be selected
      await expect(element).toHaveClass(/selected/);
      
      // Click empty canvas area
      await page.click('#canvas', { position: { x: 400, y: 400 } });
      
      // Selection should be cleared
      await expect(element).not.toHaveClass(/selected/);
      await expect(element.locator('.element-adorner')).toBeHidden();
    });

    test('should handle selection with keyboard shortcuts', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Select element
      await helper.selectElement(element);
      
      // Press Delete key
      await page.keyboard.press('Delete');
      
      // Element should be removed
      await expect(element).toHaveCount(0);
      await helper.assertElementCount('.editable-element', 0);
    });
  });

  test.describe('Component Content Editing', () => {
    test('should edit text content inline', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Double-click to edit
      await element.dblclick();
      
      // Type new content
      await page.keyboard.type('Custom Heading Text');
      
      // Click elsewhere to finish editing
      await page.click('#canvas', { position: { x: 400, y: 400 } });
      
      // Verify content changed
      await expect(element).toContainText('Custom Heading Text');
    });

    test('should edit button text', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('button', 200, 200);
      const button = element.locator('.element-button');
      
      // Double-click button to edit
      await button.dblclick();
      
      // Clear and type new text
      await page.keyboard.selectAll();
      await page.keyboard.type('Click Me!');
      
      // Press Enter to finish
      await page.keyboard.press('Enter');
      
      // Verify button text changed
      await expect(button).toContainText('Click Me!');
    });

    test('should handle list editing', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('list', 200, 200);
      const list = element.locator('.element-list');
      
      // Double-click to edit
      await list.dblclick();
      
      // Add list items
      await page.keyboard.type('First item');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Second item');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Third item');
      
      // Click elsewhere to finish
      await page.click('#canvas', { position: { x: 400, y: 400 } });
      
      // Verify list items
      await expect(list).toContainText('First item');
      await expect(list).toContainText('Second item');
      await expect(list).toContainText('Third item');
    });
  });

  test.describe('Component Properties', () => {
    test('should show properties panel when element selected', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      await helper.selectElement(element);
      
      // Verify properties panel shows element info
      const propertiesPanel = page.locator('#propertiesPanel');
      await expect(propertiesPanel).toContainText('Heading');
      await expect(propertiesPanel).toContainText('Width');
      await expect(propertiesPanel).toContainText('Height');
    });

    test('should update element properties via panel', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.selectElement(element);
      
      // Change width via properties panel
      const widthInput = page.locator('#elementWidth');
      await widthInput.fill('300');
      await widthInput.press('Enter');
      
      // Verify element width changed
      const width = await helper.getElementStyle(element, 'width');
      expect(width).toBe('300px');
    });
  });

  test.describe('Component Layers', () => {
    test('should show elements in layers panel', async ({ page }) => {
      await helper.dragComponentToCanvas('heading', 100, 100);
      await helper.dragComponentToCanvas('text', 200, 200);
      
      // Verify layers panel shows both elements
      const layersPanel = page.locator('#layersList');
      await expect(layersPanel.locator('.layer-item')).toHaveCount(2);
    });

    test('should select element from layers panel', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Click elsewhere to deselect
      await page.click('#canvas', { position: { x: 400, y: 400 } });
      
      // Click element in layers panel
      await page.click('#layersList .layer-item');
      
      // Verify element selected
      await expect(element).toHaveClass(/selected/);
    });
  });
});
