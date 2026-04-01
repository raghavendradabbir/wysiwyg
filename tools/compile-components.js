#!/usr/bin/env node

/**
 * Component SCSS Compiler
 * Compiles all component SCSS files to CSS
 */

const fs = require('fs');
const path = require('path');
const sass = require('sass');

const componentsDir = path.join(__dirname, 'components');
const components = [
  'startup-modal',
  'ribbon-toolbar',
  'activity-bar',
  'left-sidebar',
  'main-editor',
  'right-sidebar',
  'context-menu'
];

async function compileComponent(componentName) {
  const scssFile = path.join(componentsDir, componentName, `${componentName}.scss`);
  const cssFile = path.join(componentsDir, componentName, `${componentName}.css`);

  try {
    if (!fs.existsSync(scssFile)) {
      console.warn(`SCSS file not found: ${scssFile}`);
      return;
    }

    console.log(`Compiling ${componentName}...`);

    const result = sass.compile(scssFile, {
      style: 'compressed',
      sourceMap: true
    });

    // Write CSS file
    fs.writeFileSync(cssFile, result.css);
    
    // Write source map if available
    if (result.sourceMap) {
      fs.writeFileSync(`${cssFile}.map`, JSON.stringify(result.sourceMap));
    }

    console.log(`✓ Compiled ${componentName}.scss → ${componentName}.css`);

  } catch (error) {
    console.error(`✗ Error compiling ${componentName}:`, error.message);
  }
}

async function compileAllComponents() {
  console.log('Compiling component SCSS files...\n');

  for (const component of components) {
    await compileComponent(component);
  }

  console.log('\nComponent compilation complete!');
}

// Run if called directly
if (require.main === module) {
  compileAllComponents().catch(console.error);
}

module.exports = { compileComponent, compileAllComponents };
