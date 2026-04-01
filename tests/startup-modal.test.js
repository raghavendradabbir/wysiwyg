// Startup Modal Component Tests
// Tests the startup modal functionality including validation, project creation, and UI behavior

import { test, expect } from '@playwright/test';

test.describe('Startup Modal Component', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before navigation
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    
    // Navigate to the app using full URL
    await page.goto('http://127.0.0.1:64144/source/index.html');
    
    // Wait for the startup modal to be visible
    await page.waitForSelector('#startupModal.show', { timeout: 15000 });
  });

  test('should show startup modal with project manager view', async ({ page }) => {
    // Verify modal is visible
    await expect(page.locator('#startupModal')).toBeVisible();
    
    // Should show project manager view by default
    await expect(page.locator('#projectManagerView')).toBeVisible();
    await expect(page.locator('#createProjectView')).toBeHidden();
    
    // Should show empty state when no projects
    await expect(page.locator('#projectsEmpty')).toBeVisible();
    await expect(page.locator('#projectsTable')).toBeHidden();
  });

  test('should navigate to create project form', async ({ page }) => {
    // Wait for the button to be clickable and click it
    await page.waitForSelector('#createNewProjectBtn', { state: 'visible' });
    await page.click('#createNewProjectBtn', { force: true });
    
    // Should switch to create view
    await expect(page.locator('#projectManagerView')).toBeHidden();
    await expect(page.locator('#createProjectView')).toBeVisible();
    
    // Verify form elements exist
    await expect(page.locator('#projectName')).toBeVisible();
    await expect(page.locator('label[for="useSameName"]')).toBeVisible();
    await expect(page.locator('#solutionNameGroup')).toBeHidden();
    
    // Checkbox should be checked by default
    await expect(page.locator('#useSameName')).toBeChecked();
  });

  test('should toggle solution field visibility', async ({ page }) => {
    await page.waitForSelector('#createNewProjectBtn', { state: 'visible' });
    await page.click('#createNewProjectBtn', { force: true });
    
    const checkbox = page.locator('#useSameName');
    const solutionGroup = page.locator('#solutionNameGroup');
    
    // Initially hidden (checkbox checked)
    await expect(solutionGroup).toBeHidden();
    
    // Uncheck to show solution field
    await page.click('label[for="useSameName"]');
    await expect(solutionGroup).toBeVisible();
    
    // Check to hide solution field
    await page.click('label[for="useSameName"]');
    await expect(solutionGroup).toBeHidden();
  });

  test('should validate project name with regex rules', async ({ page }) => {
    await page.waitForSelector('#createNewProjectBtn', { state: 'visible' });
    await page.click('#createNewProjectBtn', { force: true });
    
    const projectInput = page.locator('#projectName');
    const projectError = page.locator('#projectNameError');
    const submitBtn = page.locator('button[type="submit"]');
    
    // Test name starting with number
    await projectInput.fill('123Project');
    await projectInput.blur();
    await expect(projectError).toBeVisible();
    await expect(projectError).toContainText('Must start with a letter');
    await expect(submitBtn).toBeDisabled();
    
    // Test name with spaces
    await projectInput.fill('My Project');
    await projectInput.blur();
    await expect(projectError).toBeVisible();
    await expect(projectError).toContainText('No spaces allowed');
    await expect(submitBtn).toBeDisabled();
    
    // Test valid name
    await projectInput.fill('MyProject123');
    await projectInput.blur();
    await expect(projectError).toBeHidden();
    await expect(submitBtn).toBeEnabled();
  });

  test('should validate solution name equality when not using same name', async ({ page }) => {
    await page.waitForSelector('#createNewProjectBtn', { state: 'visible' });
    await page.click('#createNewProjectBtn', { force: true });
    
    const projectInput = page.locator('#projectName');
    const checkbox = page.locator('#useSameName');
    const solutionInput = page.locator('#solutionName');
    const solutionError = page.locator('#solutionNameError');
    const submitBtn = page.locator('button[type="submit"]');
    
    // Fill project name and uncheck same name
    await projectInput.fill('MyProject');
    await page.click('label[for="useSameName"]');
    
    // Fill same name for solution
    await solutionInput.fill('MyProject');
    await solutionInput.blur();
    
    await expect(solutionError).toBeVisible();
    await expect(solutionError).toContainText('Solution name must be different from project name');
    await expect(submitBtn).toBeDisabled();
    
    // Change to different name
    await solutionInput.fill('MySolution');
    await solutionInput.blur();
    
    await expect(solutionError).toBeHidden();
    await expect(submitBtn).toBeEnabled();
  });

  test('should mirror project name to solution when using same name', async ({ page }) => {
    await page.waitForSelector('#createNewProjectBtn', { state: 'visible' });
    await page.click('#createNewProjectBtn', { force: true });
    
    const projectInput = page.locator('#projectName');
    const checkbox = page.locator('#useSameName');
    const solutionInput = page.locator('#solutionName');
    
    // Uncheck to show solution field
    await page.click('label[for="useSameName"]');
    await solutionInput.fill('DifferentName');
    
    // Check same name - should mirror project name
    await page.click('label[for="useSameName"]');
    await projectInput.fill('MyProject');
    
    // Uncheck to verify mirroring
    await page.click('label[for="useSameName"]');
    await expect(solutionInput).toHaveValue('MyProject');
  });

  test('should handle Enter key submission', async ({ page }) => {
    await page.waitForSelector('#createNewProjectBtn', { state: 'visible' });
    await page.click('#createNewProjectBtn', { force: true });
    
    // Fill project name and press Enter
    await page.fill('#projectName', 'EnterProject');
    await page.press('#projectName', 'Enter');
    
    // Should submit and close modal
    await expect(page.locator('#startupModal')).toBeHidden();
  });

  test('should be strictly modal (no escape/overlay close)', async ({ page }) => {
    // Try to close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#startupModal')).toBeVisible();
    
    // Try to close by clicking overlay (this should not work)
    // Use force since the overlay might be intercepted by other elements
    await page.click('.startup-modal-overlay', { force: true });
    await expect(page.locator('#startupModal')).toBeVisible();
  });

  test('should show project list when projects exist', async ({ page }) => {
    // Navigate with pre-existing projects
    await page.addInitScript(() => {
      const data = {
        projects: [
          {
            id: 'proj_1',
            projectName: 'Project1',
            solutionName: 'Solution1',
            createdOn: '2024-01-01T00:00:00.000Z',
            lastModified: '2024-01-01T00:00:00.000Z',
            createdVersion: '1.0.0'
          },
          {
            id: 'proj_2',
            projectName: 'Project2',
            solutionName: 'Solution2',
            createdOn: '2024-01-02T00:00:00.000Z',
            lastModified: '2024-01-02T00:00:00.000Z',
            createdVersion: '1.0.0'
          }
        ]
      };
      window.localStorage.setItem('wysiwyg_projects_data_v1', JSON.stringify(data));
    });
    
    await page.goto('http://127.0.0.1:64144/source/index.html');
    await page.waitForSelector('#startupModal.show', { timeout: 15000 });
    
    // Should show project table
    await expect(page.locator('#projectsTable')).toBeVisible();
    await expect(page.locator('#projectsEmpty')).toBeHidden();
    
    // Should show controls
    await expect(page.locator('.project-controls')).toBeVisible();
    
    // Should show projects in table
    await expect(page.locator('text=Project1')).toBeVisible();
    await expect(page.locator('text=Project2')).toBeVisible();
  });

  test('should prevent duplicate project names', async ({ page }) => {
    // Navigate with pre-existing project
    await page.addInitScript(() => {
      const data = {
        projects: [{
          projectName: 'ExistingProject',
          solutionName: 'ExistingSolution',
          createdOn: new Date().toISOString()
        }]
      };
      window.localStorage.setItem('wysiwyg_projects_data_v1', JSON.stringify(data));
    });
    
    await page.goto('http://127.0.0.1:64144/source/index.html');
    await page.waitForSelector('#startupModal.show', { timeout: 15000 });
    await page.waitForSelector('#createNewProjectBtn', { state: 'visible' });
    await page.click('#createNewProjectBtn', { force: true });
    
    const projectInput = page.locator('#projectName');
    const projectError = page.locator('#projectNameError');
    const submitBtn = page.locator('button[type="submit"]');
    
    // Try to create project with existing name
    await projectInput.fill('ExistingProject');
    await projectInput.blur();
    
    await expect(projectError).toBeVisible();
    await expect(projectError).toContainText('A project with this name already exists');
    await expect(submitBtn).toBeDisabled();
    
    // Change to unique name
    await projectInput.fill('NewProject');
    await projectInput.blur();
    
    await expect(projectError).toBeHidden();
    await expect(submitBtn).toBeEnabled();
  });

  test('should filter projects by search', async ({ page }) => {
    // Navigate with multiple projects
    await page.addInitScript(() => {
      const data = {
        projects: [
          { projectName: 'WebApp', solutionName: 'WebSolution' },
          { projectName: 'MobileApp', solutionName: 'MobileSolution' },
          { projectName: 'DesktopApp', solutionName: 'DesktopSolution' }
        ]
      };
      window.localStorage.setItem('wysiwyg_projects_data_v1', JSON.stringify(data));
    });
    
    await page.goto('http://127.0.0.1:64144/source/index.html');
    await page.waitForSelector('#startupModal.show', { timeout: 15000 });
    
    // Search for 'Web'
    await page.fill('#projectSearch', 'Web');
    
    // Should show only WebApp
    await expect(page.locator('text=WebApp')).toBeVisible();
    await expect(page.locator('text=MobileApp')).toBeHidden();
    await expect(page.locator('text=DesktopApp')).toBeHidden();
  });

  test('should group projects by solution', async ({ page }) => {
    // Navigate with projects having same solution
    await page.addInitScript(() => {
      const data = {
        projects: [
          { projectName: 'Web', solutionName: 'MainSolution' },
          { projectName: 'API', solutionName: 'MainSolution' },
          { projectName: 'Mobile', solutionName: 'OtherSolution' }
        ]
      };
      window.localStorage.setItem('wysiwyg_projects_data_v1', JSON.stringify(data));
    });
    
    await page.goto('http://127.0.0.1:64144/source/index.html');
    await page.waitForSelector('#startupModal.show', { timeout: 15000 });
    
    // Enable grouping
    await page.check('#groupBySolution');
    
    // Should show solution headers
    await expect(page.locator('.solution-header-row')).toHaveCount(2);
    await expect(page.locator('.solution-header-row').first()).toContainText('MainSolution');
    await expect(page.locator('.solution-header-row').last()).toContainText('OtherSolution');
  });

  test('should delete project with confirmation', async ({ page }) => {
    // Navigate with a project to delete
    await page.addInitScript(() => {
      const data = {
        projects: [{
          id: 'proj_1',
          projectName: 'TestProject',
          solutionName: 'TestSolution'
        }]
      };
      window.localStorage.setItem('wysiwyg_projects_data_v1', JSON.stringify(data));
    });
    
    await page.goto('http://127.0.0.1:64144/source/index.html');
    await page.waitForSelector('#startupModal.show', { timeout: 15000 });
    
    // Mock confirm dialog to return true
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    
    // Click delete button
    await page.click('button[data-action="delete"]');
    
    // Project should be removed
    await expect(page.locator('text=TestProject')).toBeHidden();
    await expect(page.locator('#projectsEmpty')).toBeVisible();
  });
});
