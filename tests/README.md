# WYSIWYG Editor Test Suite

Comprehensive automation test suite for the WYSIWYG Editor using Playwright.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- WYSIWYG Editor project set up

### Installation
```bash
# Install test dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Debug specific test
npm run test:debug -- tests/startup.test.js

# View test report
npm run test:report
```

## 📋 Test Coverage

### 1. Startup and Project Creation (`startup.test.js`)
- ✅ First-time user experience
- ✅ Project/solution creation flow
- ✅ Form validation
- ✅ Checkbox behavior
- ✅ Keyboard shortcuts

### 2. Hierarchy Management (`hierarchy.test.js`)
- ✅ Project CRUD operations
- ✅ Page management
- ✅ Inline editing
- ✅ Tree navigation
- ✅ Context display
- ✅ Persistence

### 3. Component Creation (`components.test.js`)
- ✅ Drag and drop creation
- ✅ All standard components (heading, text, image, button, list, etc.)
- ✅ CH5 components
- ✅ Content editing
- ✅ Properties panel
- ✅ Layer management

### 4. Element Interactions (`interactions.test.js`)
- ✅ Drag and drop positioning
- ✅ Multi-element selection
- ✅ Resize operations
- ✅ Context menu actions
- ✅ Marquee selection
- ✅ Keyboard shortcuts

### 5. UI Features (`ui-features.test.js`)
- ✅ Ribbon toolbar functionality
- ✅ Theme switching (CH5 and app themes)
- ✅ Layout modes (freeform/responsive)
- ✅ Zoom controls
- ✅ Device frames
- ✅ Sidebar toggles
- ✅ Layer management

### 6. Save/Load Operations (`save-load.test.js`)
- ✅ Page content persistence
- ✅ Multi-page data handling
- ✅ Project structure persistence
- ✅ Undo/redo functionality
- ✅ Export/import operations
- ✅ Error handling and recovery

## 🎯 Test Scenarios

### Critical User Journeys
1. **New User Onboarding**: First visit → Startup modal → Project creation → First component
2. **Content Creation**: Add components → Edit content → Resize/position → Save
3. **Multi-Page Workflow**: Create pages → Switch between pages → Manage content
4. **Project Management**: Add projects → Organize hierarchy → Manage multiple projects
5. **Export Workflow**: Create content → Export HTML → Verify output

### Edge Cases Covered
- Empty states and placeholders
- Form validation errors
- Browser refresh/reload scenarios
- Large datasets (many elements/pages)
- Corrupted localStorage recovery
- Mobile/responsive behavior

## 🔧 Test Configuration

### Browser Coverage
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari/WebKit
- ✅ Edge
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

### Test Environment
- **Base URL**: `http://localhost:5173`
- **Viewport**: 1920x1080 (desktop), device-specific (mobile)
- **Timeout**: 60s per test, 10s per action
- **Retries**: 2 on CI, 0 locally
- **Parallel**: Yes (with workers)

## 📊 Test Reports

After running tests, view results:
```bash
npm run test:report
```

Reports include:
- ✅ Pass/fail status for each test
- 📸 Screenshots on failure
- 🎥 Video recordings of failed tests
- 📈 Performance metrics
- 🔍 Detailed error traces

## 🛠 Helper Functions

The `TestHelper` class provides utilities for:
- **Navigation**: `navigateToEditor()`, `fillStartupForm()`
- **Component Creation**: `dragComponentToCanvas()`, `createElementViaClick()`
- **Interactions**: `selectElement()`, `resizeElement()`, `dragElement()`
- **Hierarchy**: `addProject()`, `addPage()`, `switchToPage()`
- **Assertions**: `assertElementExists()`, `assertElementCount()`
- **Utilities**: `takeScreenshot()`, `getElementStyle()`

## 🐛 Debugging Tests

### Debug Mode
```bash
# Debug specific test with browser open
npm run test:debug -- tests/components.test.js

# Run single test in headed mode
npx playwright test tests/startup.test.js --headed --project=chromium
```

### Screenshots and Videos
- Screenshots taken on failure automatically
- Videos recorded for failed tests
- Manual screenshots: `await helper.takeScreenshot('test-name')`

### Common Issues
1. **Timing Issues**: Use `waitForSelector()` instead of `waitForTimeout()`
2. **Element Not Found**: Check selectors and ensure elements are visible
3. **Flaky Tests**: Add proper waits and increase timeouts if needed
4. **Server Not Ready**: Ensure dev server is running on port 5173

## 📝 Writing New Tests

### Test Structure
```javascript
import { test, expect } from '@playwright/test';
import { TestHelper, TEST_DATA } from './setup.js';

test.describe('Feature Name', () => {
  let helper;

  test.beforeEach(async ({ page }) => {
    helper = new TestHelper(page);
    await page.evaluate(() => localStorage.clear());
    await helper.navigateToEditor();
    await helper.fillStartupForm(TEST_DATA.projects.simple);
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices
- ✅ Use descriptive test names
- ✅ Clear localStorage before each test
- ✅ Use helper functions for common operations
- ✅ Add assertions for expected outcomes
- ✅ Handle async operations properly
- ✅ Take screenshots for visual verification
- ✅ Test both success and error scenarios

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📈 Performance Testing

Tests include performance considerations:
- Large dataset handling (20+ elements)
- Complex nested structures
- Save/load operations with substantial content
- Memory usage during extended sessions

## 🔒 Security Testing

Basic security scenarios covered:
- Input validation and sanitization
- XSS prevention in content editing
- Safe HTML export (no script injection)
- localStorage data integrity

---

**Happy Testing! 🎉**

For questions or issues, check the test output logs and Playwright documentation.






# Run startup modal tests
npx playwright test tests/startup-modal.test.js

# Run with browser visible
npx playwright test tests/startup-modal.test.js --headed

# Run in headless mode (default)
npx playwright test tests/startup-modal.test.js