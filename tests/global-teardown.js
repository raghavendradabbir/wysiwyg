// Global teardown for Playwright tests
// Runs once after all tests complete

async function globalTeardown(config) {
  console.log('🏁 WYSIWYG Editor test suite completed!');
  
  // Clean up temporary files if needed
  const fs = require('fs');
  const path = require('path');
  
  // Optional: Clean up old screenshots (keep only recent ones)
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (fs.existsSync(screenshotsDir)) {
    const files = fs.readdirSync(screenshotsDir);
    console.log(`📸 Generated ${files.length} screenshots`);
  }
  
  // Optional: Generate test summary
  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir);
    console.log(`📊 Test artifacts saved in test-results/`);
    
    // List key files
    files.forEach(file => {
      if (file.endsWith('.json') || file.endsWith('.xml') || file.endsWith('.html')) {
        console.log(`   - ${file}`);
      }
    });
  }
  
  console.log('✨ Run "npm run test:report" to view detailed results');
  
  return Promise.resolve();
}

module.exports = globalTeardown;
