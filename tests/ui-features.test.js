// UI Features Tests
// Tests toolbar, themes, zoom, device frames, and layout modes

import { test, expect } from '@playwright/test';
import { TestHelper, TEST_DATA } from './setup.js';

test.describe('UI Features and Controls', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    // Clear storage before any app script runs (best practice)
    await page.context().addInitScript(() => {
      try { window.localStorage.clear(); } catch (_) {}
    });
    helper = new TestHelper(page);
    await helper.navigateToEditor();
    await helper.fillStartupForm(TEST_DATA.projects.simple);
  });

  test.describe('Ribbon Toolbar', () => {
    test('should switch between ribbon tabs', async ({ page }) => {
      // Initially on Home tab
      await expect(page.locator('.ribbon-tab.active')).toContainText('Home');
      await expect(page.locator('#home-panel')).toHaveClass(/active/);
      
      // Switch to Design tab
      await page.click('.ribbon-tab[data-tab="design"]');
      await expect(page.locator('.ribbon-tab.active')).toContainText('Design');
      await expect(page.locator('#design-panel')).toHaveClass(/active/);
      
      // Switch to View tab
      await page.click('.ribbon-tab[data-tab="view"]');
      await expect(page.locator('.ribbon-tab.active')).toContainText('View');
      await expect(page.locator('#view-panel')).toHaveClass(/active/);
    });

    test('should handle undo/redo operations', async ({ page }) => {
      // Create an element
      await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.assertElementCount('.editable-element', 1);
      
      // Undo creation
      await page.click('#undo');
      await helper.assertElementCount('.editable-element', 0);
      
      // Redo creation
      await page.click('#redo');
      await helper.assertElementCount('.editable-element', 1);
    });

    test('should save and load functionality', async ({ page }) => {
      // Create content
      await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.dragComponentToCanvas('text', 200, 300);
      
      // Save page
      await page.click('#savePage');
      
      // Clear canvas manually (simulate data loss)
      await page.evaluate(() => {
        document.getElementById('canvas').innerHTML = '';
      });
      
      // Load from memory
      await page.click('#load');
      
      // Content should be restored
      await helper.assertElementCount('.editable-element', 2);
    });

    test('should export HTML', async ({ page }) => {
      // Create some content
      await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.dragComponentToCanvas('button', 200, 300);
      
      // Click export HTML
      await page.click('#exportHTML');
      
      // Should trigger download (check for download event)
      const downloadPromise = page.waitForEvent('download');
      await downloadPromise;
    });

    test('should view HTML in modal', async ({ page }) => {
      // Create content
      await helper.dragComponentToCanvas('text', 200, 200);
      
      // Click view HTML
      await page.click('#viewHTML');
      
      // Should show HTML modal/preview
      // Note: Implementation depends on how viewHTML is implemented
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Theme Management', () => {
    test('should switch CH5 themes', async ({ page }) => {
      // Switch to Design tab
      await page.click('.ribbon-tab[data-tab="design"]');
      
      // Change CH5 theme
      await page.selectOption('#ch5Theme', 'dark');
      
      // Verify theme changed (check for theme-specific classes or styles)
      const themeLink = page.locator('#ch5-theme');
      const href = await themeLink.getAttribute('href');
      expect(href).toContain('dark');
    });

    test('should switch app themes', async ({ page }) => {
      // Switch to Design tab
      await page.click('.ribbon-tab[data-tab="design"]');
      
      // Switch to dark app theme
      await page.click('#appThemeDark');
      
      // Verify body has dark theme class
      await expect(page.locator('body')).toHaveClass(/dark-theme/);
      
      // Switch back to light
      await page.click('#appThemeLight');
      await expect(page.locator('body')).not.toHaveClass(/dark-theme/);
    });

    test('should show theme info on hover', async ({ page }) => {
      // Switch to Design tab
      await page.click('.ribbon-tab[data-tab="design"]');
      
      // Hover over theme info button
      await page.hover('#ch5ThemeInfoBtn');
      
      // Should show tooltip or info
      const infoBtn = page.locator('#ch5ThemeInfoBtn');
      const title = await infoBtn.getAttribute('title');
      expect(title).toContain('Light theme');
    });
  });

  test.describe('Layout Modes', () => {
    test('should switch between freeform and responsive modes', async ({ page }) => {
      // Switch to Design tab
      await page.click('.ribbon-tab[data-tab="design"]');
      
      // Initially in freeform mode
      await expect(page.locator('#layoutMode')).toHaveValue('freeform');
      
      // Create element in freeform
      const element = await helper.dragComponentToCanvas('heading', 200, 200);
      await expect(element.locator('.element-adorner')).toBeVisible();
      
      // Switch to responsive mode
      await page.selectOption('#layoutMode', 'responsive');
      
      // Adorners should be hidden
      await expect(element.locator('.element-adorner')).toBeHidden();
      
      // Canvas should have responsive class
      await expect(page.locator('#canvas')).toHaveClass(/responsive/);
    });

    test('should handle element positioning in different modes', async ({ page }) => {
      // Create element in freeform
      const element = await helper.dragComponentToCanvas('text', 200, 200);
      
      // Switch to responsive mode
      await page.click('.ribbon-tab[data-tab="design"]');
      await page.selectOption('#layoutMode', 'responsive');
      
      // Element should maintain content but lose absolute positioning
      await expect(element).toBeVisible();
      
      // Switch back to freeform
      await page.selectOption('#layoutMode', 'freeform');
      
      // Adorners should reappear
      await helper.selectElement(element);
      await expect(element.locator('.element-adorner')).toBeVisible();
    });
  });

  test.describe('Zoom Controls', () => {
    test('should zoom in and out', async ({ page }) => {
      // Switch to View tab
      await page.click('.ribbon-tab[data-tab="view"]');
      
      // Get initial zoom level
      const initialZoom = await page.locator('#zoomLevel').inputValue();
      expect(initialZoom).toBe('100');
      
      // Zoom in
      await page.click('#zoomIn');
      const zoomedIn = await page.locator('#zoomLevel').inputValue();
      expect(parseInt(zoomedIn)).toBeGreaterThan(100);
      
      // Zoom out
      await page.click('#zoomOut');
      const zoomedOut = await page.locator('#zoomLevel').inputValue();
      expect(parseInt(zoomedOut)).toBeLessThan(parseInt(zoomedIn));
    });

    test('should reset zoom to 100%', async ({ page }) => {
      // Switch to View tab
      await page.click('.ribbon-tab[data-tab="view"]');
      
      // Zoom in first
      await page.click('#zoomIn');
      await page.click('#zoomIn');
      
      // Reset zoom
      await page.click('#zoomReset');
      
      // Should be back to 100%
      const zoom = await page.locator('#zoomLevel').inputValue();
      expect(zoom).toBe('100');
    });

    test('should set custom zoom level', async ({ page }) => {
      // Switch to View tab
      await page.click('.ribbon-tab[data-tab="view"]');
      
      // Set custom zoom
      await page.fill('#zoomLevel', '150');
      await page.press('#zoomLevel', 'Enter');
      
      // Verify zoom applied
      const canvas = page.locator('#canvas');
      const transform = await helper.getElementStyle(canvas, 'transform');
      expect(transform).toContain('scale(1.5)');
    });

    test('should handle zoom with mouse wheel', async ({ page }) => {
      // Create element for reference
      await helper.dragComponentToCanvas('heading', 200, 200);
      
      // Zoom with mouse wheel (Ctrl + wheel)
      await page.mouse.move(400, 300);
      await page.mouse.wheel(0, -100, { modifiers: ['Control'] });
      
      // Zoom level should increase
      const zoom = await page.locator('#zoomLevel').inputValue();
      expect(parseInt(zoom)).toBeGreaterThan(100);
    });
  });

  test.describe('Device Frames', () => {
    test('should switch between device types', async ({ page }) => {
      // Switch to View tab
      await page.click('.ribbon-tab[data-tab="view"]');
      
      // Initially desktop
      await expect(page.locator('#deviceType')).toHaveValue('desktop');
      await expect(page.locator('#deviceFrame')).toHaveClass(/desktop/);
      
      // Switch to iPhone
      await page.selectOption('#deviceType', 'iphone-12');
      await expect(page.locator('#deviceFrame')).toHaveClass(/iphone-12/);
      
      // Switch to iPad
      await page.selectOption('#deviceType', 'ipad');
      await expect(page.locator('#deviceFrame')).toHaveClass(/ipad/);
    });

    test('should update device info display', async ({ page }) => {
      // Switch to View tab
      await page.click('.ribbon-tab[data-tab="view"]');
      
      // Change device
      await page.selectOption('#deviceType', 'iphone-se');
      
      // Device info should update
      const deviceInfo = page.locator('#deviceInfo');
      await expect(deviceInfo).toContainText('iPhone SE');
    });

    test('should maintain content when switching devices', async ({ page }) => {
      // Create content
      await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.dragComponentToCanvas('button', 200, 300);
      
      // Switch device
      await page.click('.ribbon-tab[data-tab="view"]');
      await page.selectOption('#deviceType', 'samsung-s21');
      
      // Content should still be there
      await helper.assertElementCount('.editable-element', 2);
    });
  });

  test.describe('Sidebar Controls', () => {
    test('should toggle left sidebar', async ({ page }) => {
      const sidebar = page.locator('#leftSidebar');
      const toggle = page.locator('#leftSidebarToggle');
      
      // Initially visible
      await expect(sidebar).toBeVisible();
      
      // Toggle to hide
      await toggle.click();
      await expect(sidebar).toBeHidden();
      
      // Toggle to show
      await toggle.click();
      await expect(sidebar).toBeVisible();
    });

    test('should toggle right sidebar', async ({ page }) => {
      const sidebar = page.locator('#rightSidebar');
      const toggle = page.locator('#rightSidebarToggle');
      
      // Initially visible
      await expect(sidebar).toBeVisible();
      
      // Toggle to hide
      await toggle.click();
      await expect(sidebar).toBeHidden();
      
      // Toggle to show
      await toggle.click();
      await expect(sidebar).toBeVisible();
    });

    test('should maintain sidebar state during interactions', async ({ page }) => {
      // Hide left sidebar
      await page.click('#leftSidebarToggle');
      
      // Create element
      await helper.dragComponentToCanvas('text', 200, 200);
      
      // Sidebar should still be hidden
      await expect(page.locator('#leftSidebar')).toBeHidden();
    });
  });

  test.describe('Layer Management', () => {
    test('should show layers in layer panel', async ({ page }) => {
      // Create multiple elements
      await helper.dragComponentToCanvas('heading', 100, 100);
      await helper.dragComponentToCanvas('text', 200, 200);
      await helper.dragComponentToCanvas('button', 300, 300);
      
      // Verify layers panel shows all elements
      const layerItems = page.locator('#layersList .layer-item');
      await expect(layerItems).toHaveCount(3);
    });

    test('should move layers up and down', async ({ page }) => {
      // Create elements
      await helper.dragComponentToCanvas('heading', 100, 100);
      await helper.dragComponentToCanvas('text', 200, 200);
      
      // Select first element
      const firstElement = page.locator('.editable-element').first();
      await helper.selectElement(firstElement);
      
      // Move layer up
      await page.click('#moveLayerUp');
      
      // Verify layer order changed in panel
      const layerItems = page.locator('#layersList .layer-item');
      const firstLayerText = await layerItems.first().textContent();
      expect(firstLayerText).toContain('Heading');
    });

    test('should duplicate layer', async ({ page }) => {
      // Create element
      await helper.dragComponentToCanvas('button', 200, 200);
      
      // Select element
      const element = page.locator('.editable-element');
      await helper.selectElement(element);
      
      // Duplicate via layer panel
      await page.click('#duplicateLayer');
      
      // Should have 2 elements now
      await helper.assertElementCount('.editable-element', 2);
    });

    test('should delete layer', async ({ page }) => {
      // Create element
      await helper.dragComponentToCanvas('image', 200, 200);
      
      // Select element
      const element = page.locator('.editable-element');
      await helper.selectElement(element);
      
      // Delete via layer panel
      await page.click('#deleteLayer');
      
      // Element should be removed
      await helper.assertElementCount('.editable-element', 0);
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should handle mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // UI should adapt to mobile
      const editorContainer = page.locator('.editor-container');
      await expect(editorContainer).toBeVisible();
      
      // Sidebars might be collapsed on mobile
      // This depends on your responsive CSS implementation
    });

    test('should maintain functionality on different screen sizes', async ({ page }) => {
      // Test on tablet size
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Should still be able to create elements
      await helper.dragComponentToCanvas('heading', 200, 200);
      await helper.assertElementCount('.editable-element', 1);
      
      // Test on large desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Should still work
      await helper.dragComponentToCanvas('text', 300, 300);
      await helper.assertElementCount('.editable-element', 2);
    });
  });
});
