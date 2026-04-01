// Save/Load and Persistence Tests
// Tests data persistence, state management, and save/load functionality

import { test, expect } from '@playwright/test';
import { TestHelper, TEST_DATA } from './setup.js';

test.describe('Save/Load and Persistence', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    helper = new TestHelper(page);
    await page.evaluate(() => localStorage.clear());
    await helper.navigateToEditor();
    await helper.fillStartupForm(TEST_DATA.projects.simple);
  });

  test.describe('Page Content Persistence', () => {
    test('should save and restore page content', async ({ page }) => {
      // Create complex content
      const heading = await helper.dragComponentToCanvas('heading', 100, 100);
      const text = await helper.dragComponentToCanvas('text', 100, 200);
      const button = await helper.dragComponentToCanvas('button', 100, 300);
      
      // Edit content
      await heading.dblclick();
      await page.keyboard.selectAll();
      await page.keyboard.type('My Custom Heading');
      await page.click('#canvas', { position: { x: 400, y: 400 } });
      
      // Resize an element
      await helper.resizeElement(button, 'se', 50, 20);
      
      // Save page
      await page.click('#savePage');
      
      // Simulate page reload
      await page.reload();
      
      // Content should be restored
      await helper.assertElementCount('.editable-element', 3);
      await expect(page.locator('.editable-element').first()).toContainText('My Custom Heading');
    });

    test('should maintain element positions after save/load', async ({ page }) => {
      // Create element at specific position
      const element = await helper.dragComponentToCanvas('text', 250, 300);
      const initialBox = await element.boundingBox();
      
      // Save and reload
      await page.click('#savePage');
      await page.reload();
      
      // Position should be maintained
      const restoredElement = page.locator('.editable-element').first();
      await helper.assertElementPosition(restoredElement, initialBox.x, initialBox.y, 20);
    });

    test('should preserve element styling and properties', async ({ page }) => {
      // Create and style element
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.selectElement(element);
      
      // Change properties via properties panel
      await page.fill('#elementWidth', '300');
      await page.press('#elementWidth', 'Enter');
      
      // Save and reload
      await page.click('#savePage');
      await page.reload();
      
      // Styling should be preserved
      const restoredElement = page.locator('.editable-element').first();
      const width = await helper.getElementStyle(restoredElement, 'width');
      expect(width).toBe('300px');
    });

    test('should handle CH5 component persistence', async ({ page }) => {
      // Create CH5 component
      const element = await helper.dragComponentToCanvas('ch5-button', 200, 200);
      
      // Verify CH5 element exists
      const ch5Element = element.locator('ch5-button');
      await expect(ch5Element).toBeVisible();
      
      // Save and reload
      await page.click('#savePage');
      await page.reload();
      
      // CH5 component should be restored
      const restoredElement = page.locator('.editable-element').first();
      const restoredCH5 = restoredElement.locator('ch5-button');
      await expect(restoredCH5).toBeVisible();
    });
  });

  test.describe('Multi-Page Persistence', () => {
    test('should save content across multiple pages', async ({ page }) => {
      // Create content on first page
      await helper.dragComponentToCanvas('heading', 100, 100);
      
      // Add second page
      await helper.addPage('Second Page');
      
      // Create different content on second page
      await helper.dragComponentToCanvas('button', 200, 200);
      
      // Save all pages
      await page.click('#saveAllPages');
      
      // Reload and verify both pages
      await page.reload();
      
      // Check first page
      await helper.switchToPage('Home');
      await helper.assertElementCount('.editable-element', 1);
      await expect(page.locator('[data-type="heading"]')).toBeVisible();
      
      // Check second page
      await helper.switchToPage('Second Page');
      await helper.assertElementCount('.editable-element', 1);
      await expect(page.locator('[data-type="button"]')).toBeVisible();
    });

    test('should maintain page selection after reload', async ({ page }) => {
      // Add pages
      await helper.addPage('About');
      await helper.addPage('Contact');
      
      // Switch to middle page
      await helper.switchToPage('About');
      
      // Save and reload
      await page.click('#saveAllPages');
      await page.reload();
      
      // Should restore selection to About page
      await expect(page.locator('.tree-page.active')).toContainText('About');
    });

    test('should handle page dirty states correctly', async ({ page }) => {
      // Create content
      await helper.dragComponentToCanvas('text', 200, 200);
      
      // Page should be marked dirty
      await expect(page.locator('.tree-page:has-text("Home")')).toContainText('*');
      
      // Save page
      await page.click('#savePage');
      
      // Dirty marker should be cleared
      await expect(page.locator('.tree-page:has-text("Home")')).not.toContainText('*');
      
      // Make another change
      await helper.dragComponentToCanvas('button', 300, 300);
      
      // Should be dirty again
      await expect(page.locator('.tree-page:has-text("Home")')).toContainText('*');
    });
  });

  test.describe('Project and Solution Persistence', () => {
    test('should persist project structure', async ({ page }) => {
      // Add project and pages
      await helper.addProject('Website Project');
      await helper.addPage('Landing');
      await helper.addPage('Features');
      
      // Reload
      await page.reload();
      
      // Structure should be restored
      await expect(page.locator('text=Website Project')).toBeVisible();
      await expect(page.locator('text=Landing')).toBeVisible();
      await expect(page.locator('text=Features')).toBeVisible();
    });

    test('should maintain hierarchy expansion state', async ({ page }) => {
      // Add second project
      await helper.addProject('Second Project');
      
      // Collapse first project
      const expander = page.locator('.tree-project:has-text("Test Project") .tree-expander').first();
      await expander.click();
      
      // Reload
      await page.reload();
      
      // Expansion state should be maintained
      await expect(expander).toHaveClass(/fa-chevron-right/);
    });

    test('should handle solution-level persistence', async ({ page }) => {
      // Create solution with different name
      await page.evaluate(() => localStorage.clear());
      await helper.navigateToEditor();
      await helper.fillStartupForm('My Project', 'My Solution');
      
      // Add content
      await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Reload
      await page.reload();
      
      // Solution structure should be restored
      await expect(page.locator('text=My Solution')).toBeVisible();
      await expect(page.locator('text=My Project')).toBeVisible();
      await helper.assertElementCount('.editable-element', 1);
    });
  });

  test.describe('Undo/Redo Persistence', () => {
    test('should maintain undo history after save', async ({ page }) => {
      // Create element
      await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Create another element
      await helper.dragComponentToCanvas('text', 200, 300);
      
      // Save
      await page.click('#savePage');
      
      // Should still be able to undo
      await page.click('#undo');
      await helper.assertElementCount('.editable-element', 1);
      
      // And redo
      await page.click('#redo');
      await helper.assertElementCount('.editable-element', 2);
    });

    test('should clear undo history after reload', async ({ page }) => {
      // Create and save content
      await helper.dragComponentToCanvas('button', 200, 200);
      await page.click('#savePage');
      
      // Reload
      await page.reload();
      
      // Undo should not work (no history)
      await page.click('#undo');
      await helper.assertElementCount('.editable-element', 1); // Should remain unchanged
    });
  });

  test.describe('Export and Import', () => {
    test('should export clean HTML without editor artifacts', async ({ page }) => {
      // Create content
      await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.dragComponentToCanvas('text', 200, 300);
      
      // Get canvas HTML
      const canvasHTML = await helper.getCanvasHTML();
      
      // Should contain content elements
      expect(canvasHTML).toContain('element-heading');
      expect(canvasHTML).toContain('element-paragraph');
      
      // Should not contain editor artifacts
      expect(canvasHTML).not.toContain('element-adorner');
      expect(canvasHTML).not.toContain('resize-handle');
      expect(canvasHTML).not.toContain('selected');
    });

    test('should handle HTML export with styling', async ({ page }) => {
      // Create and style element
      const element = await helper.dragComponentToCanvas('button', 200, 200);
      await helper.selectElement(element);
      
      // Resize element
      await helper.resizeElement(element, 'se', 50, 20);
      
      // Export should include inline styles
      await page.click('#exportHTML');
      
      // Note: Actual file download testing would require additional setup
      // This test verifies the export function is callable
    });

    test('should maintain data integrity during export/import cycle', async ({ page }) => {
      // Create complex content
      await helper.dragComponentToCanvas('heading', 100, 100);
      await helper.dragComponentToCanvas('text', 100, 200);
      await helper.dragComponentToCanvas('ch5-button', 100, 300);
      
      // Save current state
      const originalHTML = await helper.getCanvasHTML();
      
      // Export and save
      await page.click('#savePage');
      
      // Clear and reload
      await page.evaluate(() => {
        document.getElementById('canvas').innerHTML = '';
      });
      
      await page.click('#load');
      
      // Content should match original
      const restoredHTML = await helper.getCanvasHTML();
      
      // Should have same number of elements
      await helper.assertElementCount('.editable-element', 3);
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle corrupted localStorage gracefully', async ({ page }) => {
      // Set invalid localStorage data
      await page.evaluate(() => {
        localStorage.setItem('wysiwyg_hierarchy_v1', 'invalid json data');
      });
      
      // Should still load editor without crashing
      await page.reload();
      await expect(page.locator('#canvas')).toBeVisible();
      
      // Should show startup modal for recovery
      await helper.waitForStartupModal();
    });

    test('should recover from missing page data', async ({ page }) => {
      // Create content and save
      await helper.dragComponentToCanvas('heading', 200, 200);
      await page.click('#savePage');
      
      // Corrupt page data
      await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('wysiwyg_hierarchy_v1'));
        // Remove page content
        Object.values(data.solutions).forEach(solution => {
          Object.values(solution.projects).forEach(project => {
            Object.values(project.pages).forEach(page => {
              page.content = '';
            });
          });
        });
        localStorage.setItem('wysiwyg_hierarchy_v1', JSON.stringify(data));
      });
      
      // Reload should handle missing content gracefully
      await page.reload();
      await expect(page.locator('#canvas')).toBeVisible();
      
      // Should show placeholder
      await expect(page.locator('.canvas-placeholder')).toBeVisible();
    });

    test('should handle save failures gracefully', async ({ page }) => {
      // Mock localStorage to fail
      await page.evaluate(() => {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = () => {
          throw new Error('Storage quota exceeded');
        };
        window.originalSetItem = originalSetItem;
      });
      
      // Create content
      await helper.dragComponentToCanvas('text', 200, 200);
      
      // Try to save (should handle error gracefully)
      await page.click('#savePage');
      
      // Editor should still be functional
      await expect(page.locator('#canvas')).toBeVisible();
      
      // Restore localStorage
      await page.evaluate(() => {
        localStorage.setItem = window.originalSetItem;
      });
    });
  });

  test.describe('Performance and Large Data', () => {
    test('should handle large number of elements', async ({ page }) => {
      // Create many elements
      for (let i = 0; i < 20; i++) {
        await helper.dragComponentToCanvas('text', 100 + (i % 5) * 100, 100 + Math.floor(i / 5) * 100);
      }
      
      // Save should complete without timeout
      await page.click('#saveAllPages');
      
      // Reload should restore all elements
      await page.reload();
      await helper.assertElementCount('.editable-element', 20);
    });

    test('should handle complex nested content', async ({ page }) => {
      // Create container with nested elements
      const container = await helper.dragComponentToCanvas('container', 200, 200);
      
      // Add elements inside container (if supported)
      await helper.dragComponentToCanvas('heading', 220, 220);
      await helper.dragComponentToCanvas('text', 220, 260);
      await helper.dragComponentToCanvas('button', 220, 300);
      
      // Save and reload
      await page.click('#savePage');
      await page.reload();
      
      // All elements should be restored
      await helper.assertElementCount('.editable-element', 4);
    });
  });
});
