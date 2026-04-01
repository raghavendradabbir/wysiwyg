// Element Interactions Tests
// Tests drag, resize, context menus, and advanced interactions

import { test, expect } from '@playwright/test';
import { TestHelper, TEST_DATA } from './setup.js';

test.describe('Element Interactions', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    await page.context().addInitScript(() => {
      try { window.localStorage.clear(); } catch (_) {}
    });
    helper = new TestHelper(page);
    await helper.navigateToEditor();
    await helper.fillStartupForm(TEST_DATA.projects.simple);
  });

  test.describe('Element Dragging', () => {
    test('should drag element to new position', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 100, 100);
      
      // Get initial position
      const initialBox = await element.boundingBox();
      
      // Drag element
      await helper.dragElement(element, 150, 100);
      
      // Verify new position
      const newBox = await element.boundingBox();
      expect(newBox.x).toBeGreaterThan(initialBox.x + 100);
    });

    test('should drag multiple selected elements together', async ({ page }) => {
      // Create multiple elements
      const element1 = await helper.dragComponentToCanvas('heading', 100, 100);
      const element2 = await helper.dragComponentToCanvas('text', 200, 100);
      
      // Multi-select elements
      await helper.selectMultipleElements([element1, element2]);
      
      // Get initial positions
      const initial1 = await element1.boundingBox();
      const initial2 = await element2.boundingBox();
      
      // Drag first element (should move both)
      await helper.dragElement(element1, 100, 50);
      
      // Verify both moved by same amount
      const new1 = await element1.boundingBox();
      const new2 = await element2.boundingBox();
      
      const deltaX1 = new1.x - initial1.x;
      const deltaX2 = new2.x - initial2.x;
      const deltaY1 = new1.y - initial1.y;
      const deltaY2 = new2.y - initial2.y;
      
      expect(Math.abs(deltaX1 - deltaX2)).toBeLessThan(5);
      expect(Math.abs(deltaY1 - deltaY2)).toBeLessThan(5);
    });

    test('should constrain dragging to canvas bounds', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 100, 100);
      
      // Try to drag beyond left edge
      await helper.dragElement(element, -200, 0);
      
      // Element should not go beyond canvas
      const box = await element.boundingBox();
      const canvasBox = await page.locator('#canvas').boundingBox();
      
      expect(box.x).toBeGreaterThanOrEqual(canvasBox.x);
    });

    test('should show visual feedback during drag', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Start drag
      const box = await element.boundingBox();
      await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
      await page.mouse.down();
      
      // Verify z-index increased during drag
      const zIndex = await helper.getElementStyle(element, 'z-index');
      expect(parseInt(zIndex)).toBeGreaterThan(100);
      
      // End drag
      await page.mouse.up();
    });
  });

  test.describe('Element Resizing', () => {
    test('should resize element using corner handles', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Get initial size
      const initialBox = await element.boundingBox();
      
      // Resize using SE handle
      await helper.resizeElement(element, 'se', 50, 30);
      
      // Verify size increased
      const newBox = await element.boundingBox();
      expect(newBox.width).toBeGreaterThan(initialBox.width + 30);
      expect(newBox.height).toBeGreaterThan(initialBox.height + 20);
    });

    test('should resize element using edge handles', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('button', 200, 200);
      
      const initialBox = await element.boundingBox();
      
      // Resize using right edge handle
      await helper.resizeElement(element, 'e', 60, 0);
      
      const newBox = await element.boundingBox();
      expect(newBox.width).toBeGreaterThan(initialBox.width + 40);
      expect(Math.abs(newBox.height - initialBox.height)).toBeLessThan(5); // Height unchanged
    });

    test('should maintain minimum size during resize', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('text', 200, 200);
      
      // Try to resize to very small size
      await helper.resizeElement(element, 'nw', 500, 500);
      
      // Should maintain minimum size
      const box = await element.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(20);
      expect(box.height).toBeGreaterThanOrEqual(20);
    });

    test('should update adorners during resize', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('container', 200, 200);
      
      // Start resize
      await helper.selectElement(element);
      const handle = element.locator('.resize-handle.se');
      
      const handleBox = await handle.boundingBox();
      await page.mouse.move(handleBox.x + handleBox.width/2, handleBox.y + handleBox.height/2);
      await page.mouse.down();
      
      // Move mouse to resize
      await page.mouse.move(handleBox.x + 100, handleBox.y + 50);
      
      // Adorner should still be visible and positioned correctly
      const adorner = element.locator('.element-adorner');
      await expect(adorner).toBeVisible();
      
      await page.mouse.up();
    });

    test('should resize CH5 components correctly', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('ch5-button', 200, 200);
      
      const initialBox = await element.boundingBox();
      
      // Resize CH5 component
      await helper.resizeElement(element, 'se', 40, 20);
      
      const newBox = await element.boundingBox();
      expect(newBox.width).toBeGreaterThan(initialBox.width + 20);
      
      // Verify inner CH5 element also resized
      const ch5Element = element.locator('ch5-button');
      const ch5Box = await ch5Element.boundingBox();
      expect(ch5Box.width).toBeCloseTo(newBox.width, 10);
    });
  });

  test.describe('Context Menu', () => {
    test('should show context menu on right click', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      await helper.rightClickElement(element);
      
      // Verify context menu appears
      const contextMenu = page.locator('#contextMenu');
      await expect(contextMenu).toBeVisible();
      
      // Verify menu items
      await expect(contextMenu).toContainText('Duplicate');
      await expect(contextMenu).toContainText('Delete');
      await expect(contextMenu).toContainText('Bring to Front');
      await expect(contextMenu).toContainText('Send to Back');
    });

    test('should duplicate element via context menu', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('text', 200, 200);
      
      await helper.rightClickElement(element);
      await helper.selectContextAction('duplicate');
      
      // Verify duplicate created
      await helper.assertElementCount('.editable-element', 2);
      
      // Verify duplicate is positioned below original
      const elements = await page.locator('.editable-element').all();
      const box1 = await elements[0].boundingBox();
      const box2 = await elements[1].boundingBox();
      
      expect(box2.y).toBeGreaterThan(box1.y);
    });

    test('should delete element via context menu', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('button', 200, 200);
      
      await helper.rightClickElement(element);
      await helper.selectContextAction('delete');
      
      // Verify element removed
      await helper.assertElementCount('.editable-element', 0);
    });

    test('should change z-index via context menu', async ({ page }) => {
      // Create overlapping elements
      const element1 = await helper.dragComponentToCanvas('container', 200, 200);
      const element2 = await helper.dragComponentToCanvas('text', 220, 220);
      
      // Bring first element to front
      await helper.rightClickElement(element1);
      await helper.selectContextAction('moveToFront');
      
      // Verify z-index changed
      const zIndex = await helper.getElementStyle(element1, 'z-index');
      expect(parseInt(zIndex)).toBeGreaterThan(900);
    });

    test('should reset element size via context menu', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Resize element first
      await helper.resizeElement(element, 'se', 100, 50);
      
      // Reset size via context menu
      await helper.rightClickElement(element);
      await helper.selectContextAction('resetSize');
      
      // Verify size reset to default
      const box = await element.boundingBox();
      expect(box.width).toBeLessThan(200); // Should be back to default
    });

    test('should hide context menu when clicking elsewhere', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('image', 200, 200);
      
      await helper.rightClickElement(element);
      
      const contextMenu = page.locator('#contextMenu');
      await expect(contextMenu).toBeVisible();
      
      // Click elsewhere
      await page.click('#canvas', { position: { x: 400, y: 400 } });
      
      // Context menu should hide
      await expect(contextMenu).toBeHidden();
    });
  });

  test.describe('Marquee Selection', () => {
    test('should select multiple elements with marquee', async ({ page }) => {
      // Create elements in a grid
      await helper.dragComponentToCanvas('heading', 100, 100);
      await helper.dragComponentToCanvas('text', 200, 100);
      await helper.dragComponentToCanvas('button', 100, 200);
      await helper.dragComponentToCanvas('image', 200, 200);
      
      // Start marquee selection
      await page.mouse.move(80, 80);
      await page.mouse.down();
      await page.mouse.move(250, 250);
      
      // Verify marquee box appears
      const marquee = page.locator('.marquee-selection');
      await expect(marquee).toBeVisible();
      
      await page.mouse.up();
      
      // Verify all elements selected
      const selectedElements = page.locator('.editable-element.multi-selected');
      await expect(selectedElements).toHaveCount(4);
    });

    test('should handle partial element selection with marquee', async ({ page }) => {
      // Create elements
      await helper.dragComponentToCanvas('heading', 100, 100);
      await helper.dragComponentToCanvas('text', 300, 300);
      
      // Select only first element with marquee
      await page.mouse.move(50, 50);
      await page.mouse.down();
      await page.mouse.move(200, 200);
      await page.mouse.up();
      
      // Only first element should be selected
      const selectedElements = page.locator('.editable-element.multi-selected');
      await expect(selectedElements).toHaveCount(1);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should delete selected element with Delete key', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('text', 200, 200);
      
      await helper.selectElement(element);
      await page.keyboard.press('Delete');
      
      await helper.assertElementCount('.editable-element', 0);
    });

    test('should delete multiple selected elements', async ({ page }) => {
      const element1 = await helper.dragComponentToCanvas('heading', 100, 100);
      const element2 = await helper.dragComponentToCanvas('text', 200, 200);
      
      await helper.selectMultipleElements([element1, element2]);
      await page.keyboard.press('Delete');
      
      await helper.assertElementCount('.editable-element', 0);
    });

    test('should handle Escape key to clear selection', async ({ page }) => {
      const element = await helper.dragComponentToCanvas('button', 200, 200);
      
      await helper.selectElement(element);
      await expect(element).toHaveClass(/selected/);
      
      await page.keyboard.press('Escape');
      
      // Selection should be cleared
      await expect(element).not.toHaveClass(/selected/);
    });
  });
});
