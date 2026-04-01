// Hierarchy Management Tests
// Tests solution/project/page management and navigation

import { test, expect } from '@playwright/test';
import { TestHelper, TEST_DATA } from './setup.js';

test.describe('Hierarchy Management', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    await page.context().addInitScript(() => {
      try { window.localStorage.clear(); } catch (_) {}
    });
    helper = new TestHelper(page);
    await helper.navigateToEditor();
    await helper.fillStartupForm(TEST_DATA.projects.simple);
  });

  test.describe('Project Management', () => {
    test('should add new project to solution', async ({ page }) => {
      const newProjectName = 'Second Project';
      
      // Click add project button
      await page.click('[data-action="add-project"]');
      
      // Fill project name
      await page.fill('.item-name-input', newProjectName);
      await page.press('.item-name-input', 'Enter');
      
      // Verify project appears in hierarchy
      await expect(page.locator(`text=${newProjectName}`)).toBeVisible();
      
      // Verify project is selected
      await expect(page.locator('.tree-project.active')).toContainText(newProjectName);
    });

    test('should rename project inline', async ({ page }) => {
      const newName = 'Renamed Project';
      
      // Click rename button
      await page.click('.tree-project [data-action="rename"]');
      
      // Edit name
      await page.fill('.item-name-input', newName);
      await page.press('.item-name-input', 'Enter');
      
      // Verify name changed
      await expect(page.locator(`text=${newName}`)).toBeVisible();
      await expect(page.locator(`text=${TEST_DATA.projects.simple}`)).toHaveCount(1); // Only solution
    });

    test('should duplicate project with all pages', async ({ page }) => {
      // Add a page first
      await helper.addPage('Custom Page');
      
      // Duplicate project
      await page.click('.tree-project [data-action="duplicate"]');
      
      // Verify duplicate exists
      await expect(page.locator('text=Test Project Copy')).toBeVisible();
      
      // Verify pages were copied
      await page.click('text=Test Project Copy');
      await expect(page.locator('text=Home')).toHaveCount(2); // Original + copy
      await expect(page.locator('text=Custom Page')).toHaveCount(2);
    });

    test('should delete project when multiple exist', async ({ page }) => {
      // Add second project
      await helper.addProject('Project to Delete');
      
      // Delete the second project
      await page.click('.tree-project:has-text("Project to Delete") [data-action="delete"]');
      
      // Confirm deletion
      await page.click('button:has-text("OK")');
      
      // Verify project removed
      await expect(page.locator('text=Project to Delete')).toHaveCount(0);
      
      // Verify original project still exists
      await expect(page.locator(`text=${TEST_DATA.projects.simple}`)).toBeVisible();
    });

    test('should prevent deleting last project', async ({ page }) => {
      // Try to delete the only project (should not have delete button)
      const deleteBtn = page.locator('.tree-project [data-action="delete"]');
      await expect(deleteBtn).toHaveCount(0);
    });
  });

  test.describe('Page Management', () => {
    test('should add new page to project', async ({ page }) => {
      const newPageName = 'About Page';
      
      // Click add page button in pages group
      await page.click('[data-action="add-page"]');
      
      // Fill page name
      await page.fill('.item-name-input', newPageName);
      await page.press('.item-name-input', 'Enter');
      
      // Verify page appears and is selected
      await expect(page.locator(`text=${newPageName}`)).toBeVisible();
      await expect(page.locator('.tree-page.active')).toContainText(newPageName);
    });

    test('should switch between pages', async ({ page }) => {
      // Add second page
      await helper.addPage('Contact Page');
      
      // Switch back to Home
      await helper.switchToPage('Home');
      await expect(page.locator('.tree-page.active')).toContainText('Home');
      
      // Switch to Contact
      await helper.switchToPage('Contact Page');
      await expect(page.locator('.tree-page.active')).toContainText('Contact Page');
    });

    test('should rename page inline', async ({ page }) => {
      const newName = 'Landing Page';
      
      // Click rename on Home page
      await page.click('.tree-page:has-text("Home") [data-action="rename"]');
      
      // Edit name
      await page.fill('.item-name-input', newName);
      await page.press('.item-name-input', 'Enter');
      
      // Verify name changed
      await expect(page.locator(`text=${newName}`)).toBeVisible();
      await expect(page.locator('text=Home')).toHaveCount(0);
    });

    test('should delete page when multiple exist', async ({ page }) => {
      // Add second page
      await helper.addPage('Page to Delete');
      
      // Delete the second page
      await page.click('.tree-page:has-text("Page to Delete") [data-action="delete"]');
      
      // Confirm deletion
      await page.click('button:has-text("OK")');
      
      // Verify page removed
      await expect(page.locator('text=Page to Delete')).toHaveCount(0);
      
      // Verify switched back to Home
      await expect(page.locator('.tree-page.active')).toContainText('Home');
    });

    test('should prevent deleting last page', async ({ page }) => {
      // Try to delete the only page (should not have delete button)
      const deleteBtn = page.locator('.tree-page [data-action="delete"]');
      await expect(deleteBtn).toHaveCount(0);
    });

    test('should show page count in pages group', async ({ page }) => {
      // Initially 1 page
      await expect(page.locator('.tree-count')).toContainText('(1)');
      
      // Add pages
      await helper.addPage('Page 2');
      await helper.addPage('Page 3');
      
      // Should show 3 pages
      await expect(page.locator('.tree-count')).toContainText('(3)');
    });
  });

  test.describe('Navigation and Context', () => {
    test('should update context display when switching', async ({ page }) => {
      const context = page.locator('#currentContext');
      
      // Add project and page
      await helper.addProject('New Project');
      await helper.addPage('New Page');
      
      // Verify context shows full path
      await expect(context).toContainText(TEST_DATA.projects.simple); // Solution
      await expect(context).toContainText('New Project');
      await expect(context).toContainText('New Page');
    });

    test('should expand/collapse tree items', async ({ page }) => {
      // Add second project
      await helper.addProject('Second Project');
      
      // Find expander for first project
      const expander = page.locator('.tree-project:has-text("Test Project") .tree-expander').first();
      
      // Should be expanded by default
      await expect(expander).toHaveClass(/fa-chevron-down/);
      
      // Click to collapse
      await expander.click();
      await expect(expander).toHaveClass(/fa-chevron-right/);
      
      // Pages should be hidden
      await expect(page.locator('.tree-page:has-text("Home")')).toBeHidden();
      
      // Click to expand
      await expander.click();
      await expect(expander).toHaveClass(/fa-chevron-down/);
      await expect(page.locator('.tree-page:has-text("Home")')).toBeVisible();
    });

    test('should handle keyboard navigation in inline editing', async ({ page }) => {
      // Start renaming
      await page.click('.tree-page:has-text("Home") [data-action="rename"]');
      
      // Type new name
      await page.fill('.item-name-input', 'New Name');
      
      // Press Escape to cancel
      await page.press('.item-name-input', 'Escape');
      
      // Should revert to original name
      await expect(page.locator('text=Home')).toBeVisible();
      await expect(page.locator('text=New Name')).toHaveCount(0);
    });
  });

  test.describe('Persistence', () => {
    test('should persist hierarchy changes', async ({ page }) => {
      // Add project and page
      await helper.addProject('Persistent Project');
      await helper.addPage('Persistent Page');
      
      // Reload page
      await page.reload();
      
      // Should restore hierarchy
      await expect(page.locator('text=Persistent Project')).toBeVisible();
      await expect(page.locator('text=Persistent Page')).toBeVisible();
    });

    test('should maintain selection after reload', async ({ page }) => {
      // Add and select page
      await helper.addPage('Selected Page');
      
      // Reload page
      await page.reload();
      
      // Should restore selection
      await expect(page.locator('.tree-page.active')).toContainText('Selected Page');
    });
  });
});
