#!/usr/bin/env node
/*
Class usage auditor
- Scans SCSS for class selectors
- Scans HTML/JS for class usages
- Outputs JSON and Markdown summaries
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SCSS_GLOB_EXT = new Set(['.scss', '.css']);
const USAGE_EXT = new Set(['.html', '.js', '.ts', '.tsx', '.jsx']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function extractScssClasses(content) {
  // Rough regex to capture class selectors: .class, excluding .0 or numbers-starting
  // Avoid false positives: .5rem, .75, etc.; also ignore SCSS placeholders (%), variables ($), mixins (@mixin)
  const classes = new Set();
  const classRegex = /\.(?:[a-zA-Z_][a-zA-Z0-9_-]*)/g;
  const commentless = content.replace(/\/\*[\s\S]*?\*\//g, '');
  let m;
  while ((m = classRegex.exec(commentless))) {
    const cls = m[0].slice(1);
    // Skip dot that are part of numeric values like .5, and keyframes percentages not matched anyway
    if (/^\d/.test(cls)) continue;
    // Ignore chained selectors like .class:hover (we'll still collect class part)
    // Dedup
    classes.add(cls);
  }
  return classes;
}

function extractUsages(content) {
  const used = new Set();
  // class="..."
  const classAttrRegex = /class(?:Name)?\s*=\s*(["'])(.*?)\1/gs;
  let m;
  while ((m = classAttrRegex.exec(content))) {
    const val = m[2];
    val.split(/\s+/).forEach(c => { if (c) used.add(c.replace(/[^a-zA-Z0-9_-]/g, '')); });
  }
  // classList.add('a','b'), remove, toggle
  const classListRegex = /classList\.(?:add|remove|toggle)\s*\(([^)]*)\)/g;
  while ((m = classListRegex.exec(content))) {
    const args = m[1].split(/[,\n]/).map(s => s.trim().replace(/^['"`](.*)['"`]$/, '$1'));
    args.forEach(a => { if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(a)) used.add(a); });
  }
  // element.className = 'foo bar'
  const classNameSet = /className\s*=\s*(["'])(.*?)\1/g;
  while ((m = classNameSet.exec(content))) {
    const val = m[2];
    val.split(/\s+/).forEach(c => { if (c) used.add(c.replace(/[^a-zA-Z0-9_-]/g, '')); });
  }
  // Generic string occurrences might be too noisy; skip for now
  return used;
}

function main() {
  const files = walk(ROOT);
  const scssFiles = files.filter(f => SCSS_GLOB_EXT.has(path.extname(f)));
  const usageFiles = files.filter(f => USAGE_EXT.has(path.extname(f)));

  const allClasses = new Set();
  const classOrigins = new Map(); // class -> Set(files)

  for (const f of scssFiles) {
    const content = readFileSafe(f);
    const classes = extractScssClasses(content);
    for (const c of classes) {
      allClasses.add(c);
      if (!classOrigins.has(c)) classOrigins.set(c, new Set());
      classOrigins.get(c).add(path.relative(ROOT, f));
    }
  }

  const usedClasses = new Set();
  const usageMap = new Map(); // class -> Set(files)

  for (const f of usageFiles) {
    const content = readFileSafe(f);
    const used = extractUsages(content);
    for (const u of used) {
      if (!usageMap.has(u)) usageMap.set(u, new Set());
      usageMap.get(u).add(path.relative(ROOT, f));
      usedClasses.add(u);
    }
  }

  const unused = [];
  const used = [];
  const maybe = []; // present in SCSS and referenced in JS/HTML but uncertain? We'll keep used only.

  for (const c of Array.from(allClasses).sort()) {
    const isUsed = usedClasses.has(c);
    const origins = Array.from(classOrigins.get(c) || []);
    const usages = Array.from(usageMap.get(c) || []);
    const entry = { class: c, definedIn: origins, usedIn: usages };
    if (isUsed) used.push(entry); else unused.push(entry);
  }

  const report = { summary: { totalDefined: allClasses.size, totalUsed: used.length, totalUnused: unused.length }, unused, used };

  // Output both JSON and Markdown
  console.log(JSON.stringify(report, null, 2));

  const md = [];
  md.push(`# CSS Class Usage Report`);
  md.push(`- Total defined: ${allClasses.size}`);
  md.push(`- Used: ${used.length}`);
  md.push(`- Unused: ${unused.length}`);
  md.push(`\n## Unused (top 100)`);
  unused.slice(0, 100).forEach(e => {
    md.push(`- ${e.class} — defined in ${e.definedIn.join(', ')}`);
  });
  md.push(`\n## Notes`);
  md.push(`- Dynamic class names constructed at runtime may not be detected.`);
  md.push(`- If a class is applied by external libraries or via inline stylesheets injected at runtime, it may be marked unused.`);
  fs.writeFileSync(path.join(ROOT, 'class-usage-report.md'), md.join('\n'), 'utf8');

  console.error(`\nWrote Markdown summary to class-usage-report.md`);
}

main();
