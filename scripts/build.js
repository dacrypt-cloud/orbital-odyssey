#!/usr/bin/env node
/**
 * Build Script for Orbital Odyssey: Gravity Well
 * Generates:
 *  - index.html (Self-contained bundle with inline CSS & JS for universal browser / sandboxed iframe compatibility)
 *  - dev.html (Multi-file development loader referencing styles/main.css and src/*.js)
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const templatePath = path.join(rootDir, 'src', 'template.html');
const cssPath = path.join(rootDir, 'styles', 'main.css');

const jsFiles = [
  'src/audio.js',
  'src/physics.js',
  'src/levels.js',
  'src/entities.js',
  'src/renderer.js',
  'src/controls.js',
  'src/game.js'
];

function build() {
  const template = fs.readFileSync(templatePath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  const combinedJs = jsFiles
    .map((rel) => {
      const fullPath = path.join(rootDir, rel);
      return `/* === ${rel} === */\n` + fs.readFileSync(fullPath, 'utf8');
    })
    .join('\n\n');

  // 1. Self-contained index.html
  const bundledHtml = template
    .replace('<!-- __STYLES_PLACEHOLDER__ -->', () => `<style>\n${css}\n</style>`)
    .replace('<!-- __SCRIPTS_PLACEHOLDER__ -->', () => `<script>\n${combinedJs}\n</script>`);

  const outIndex = path.join(rootDir, 'index.html');
  fs.writeFileSync(outIndex, bundledHtml, 'utf8');

  // Also mirror to /home/user/index.html if inside workspace
  const parentIndex = path.resolve(rootDir, '..', 'index.html');
  try {
    fs.writeFileSync(parentIndex, bundledHtml, 'utf8');
  } catch (e) {}

  // 2. Multi-file dev.html
  const devScripts = jsFiles.map((f) => `<script src="${f}"></script>`).join('\n  ');
  const devHtml = template
    .replace('<!-- __STYLES_PLACEHOLDER__ -->', '<link rel="stylesheet" href="styles/main.css" />')
    .replace('<!-- __SCRIPTS_PLACEHOLDER__ -->', devScripts);

  fs.writeFileSync(path.join(rootDir, 'dev.html'), devHtml, 'utf8');

  console.log('[build] Successfully built index.html and dev.html');
}

build();
