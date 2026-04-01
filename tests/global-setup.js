// Global setup for Playwright tests
// Runs once before all tests

async function globalSetup(config) {
  console.log('🚀 Starting WYSIWYG Editor test suite...');
  
  // Ensure test directories exist
  const fs = require('fs');
  const path = require('path');
  
  const dirs = [
    'test-results',
    'screenshots',
    'downloads'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Log test configuration (derive from first project if needed)
  const firstProject = (config && config.projects && config.projects[0]) || {};
  const use = firstProject.use || config.use || {};
  const baseURL = use.baseURL || 'http://localhost:5173';
  const workers = config.workers ?? 'auto';
  const retries = config.retries ?? 0;

  console.log(`🌐 Base URL: ${baseURL}`);
  console.log(`🔧 Workers: ${workers}`);
  console.log(`🔄 Retries: ${retries}`);
  
  return Promise.resolve();
}

module.exports = globalSetup;
