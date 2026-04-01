// HTML Modal for code output
// Usage: import { showHTMLModal } from './htmlModal.js';
// Then call: showHTMLModal(editor, htmlContent, cssContent)

export function showHTMLModal(editor, htmlContent, cssContent) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.html-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Load Prism once for syntax highlighting
  ensurePrismLoaded();

  // Pretty print content for alignment
  const formattedHtml = formatHTML(htmlContent);
  const formattedCss = formatCSS(cssContent);

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'html-modal';
  modal.innerHTML = `
    <div class="html-modal-overlay">
      <div class="html-modal-content">
        <div class="html-modal-header">
          <h3>Generated Code</h3>
          <button class="html-modal-close">&times;</button>
        </div>
        <div class="html-modal-tabs">
          <button class="tab-btn active" data-tab="html">HTML</button>
          <button class="tab-btn" data-tab="css">CSS</button>
        </div>
        <div class="html-modal-body">
          <div class="tab-content active" data-tab="html">
            <pre class="code-container"><code class="language-html" id="code-html"></code></pre>
          </div>
          <div class="tab-content" data-tab="css">
            <pre class="code-container"><code class="language-css" id="code-css"></code></pre>
          </div>
        </div>
        <div class="html-modal-footer">
          <button class="html-copy-btn">Copy Current Tab</button>
          <button class="html-download-btn">Download Both Files</button>
        </div>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .html-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 10000; }
    .html-modal-overlay { width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .html-modal-content { background: white; border-radius: 8px; width: 90%; max-width: 900px; max-height: 90%; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .html-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #eee; }
    .html-modal-header h3 { margin: 0; color: #333; }
    .html-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .html-modal-close:hover { color: #333; }
    .html-modal-tabs { display: flex; border-bottom: 1px solid #eee; }
    .tab-btn { padding: 12px 24px; border: none; background: none; cursor: pointer; font-weight: 500; color: #666; border-bottom: 2px solid transparent; transition: all 0.2s ease; }
    .tab-btn.active { color: #007bff; border-bottom-color: #007bff; }
    .tab-btn:hover { color: #007bff; }
    .html-modal-body { flex: 1; overflow: hidden; position: relative; }
    .tab-content { display: none; padding: 0; height: 100%; }
    .tab-content.active { display: block; }
    .code-container { margin: 0; height: 460px; max-height: 60vh; overflow: auto; background: #f8f9fa; border-top: 1px solid #eee; border-bottom: 1px solid #eee; }
    .code-container code { display: block; padding: 16px 20px; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 13px; line-height: 1.5; white-space: pre; }
    .html-modal-footer { padding: 20px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end; }
    .html-copy-btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; background: #007bff; color: white; }
    .html-copy-btn:hover { background: #0056b3; }
    .html-download-btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; background: #28a745; color: white; }
    .html-download-btn:hover { background: #1e7e34; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.html-modal-close');
  const copyBtn = modal.querySelector('.html-copy-btn');
  const downloadBtn = modal.querySelector('.html-download-btn');
  const overlay = modal.querySelector('.html-modal-overlay');
  const tabBtns = modal.querySelectorAll('.tab-btn');
  const tabContents = modal.querySelectorAll('.tab-content');

  // Insert formatted and highlighted code
  const codeHtml = modal.querySelector('#code-html');
  const codeCss = modal.querySelector('#code-css');
  if (codeHtml) codeHtml.textContent = formattedHtml;
  if (codeCss) codeCss.textContent = formattedCss;
  if (window.Prism) {
    window.Prism.highlightElement(codeHtml);
    window.Prism.highlightElement(codeCss);
  }

  // Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.dataset.tab === targetTab) content.classList.add('active');
      });
    });
  });

  // Close actions
  const close = () => { modal.remove(); style.remove(); };
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // Copy
  copyBtn.addEventListener('click', async () => {
    const activeTab = modal.querySelector('.tab-content.active');
    const code = activeTab.querySelector('code');
    const content = code.textContent;
    const tabType = activeTab.dataset.tab.toUpperCase();
    try {
      await navigator.clipboard.writeText(content);
      editor?.showNotification?.(`${tabType} copied to clipboard!`, 'success');
    } catch (err) {
      // Fallback: create a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = content; document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      editor?.showNotification?.(`${tabType} copied to clipboard!`, 'success');
    }
  });

  // Download
  downloadBtn.addEventListener('click', () => {
    const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const htmlLink = document.createElement('a');
    htmlLink.href = htmlUrl; htmlLink.download = 'index.html';
    document.body.appendChild(htmlLink); htmlLink.click(); document.body.removeChild(htmlLink);
    URL.revokeObjectURL(htmlUrl);

    const cssBlob = new Blob([formattedCss], { type: 'text/css' });
    const cssUrl = URL.createObjectURL(cssBlob);
    const cssLink = document.createElement('a');
    cssLink.href = cssUrl; cssLink.download = 'styles.css';
    document.body.appendChild(cssLink); cssLink.click(); document.body.removeChild(cssLink);
    URL.revokeObjectURL(cssUrl);

    editor?.showNotification?.('HTML and CSS files downloaded!', 'success');
  });

  // Focus HTML code block for keyboard scrolling
  const firstCode = modal.querySelector('#code-html');
  if (firstCode && firstCode.parentElement) firstCode.parentElement.focus?.();
}

// Utilities
function ensurePrismLoaded() {
  if (!document.getElementById('prism-css')) {
    const link = document.createElement('link');
    link.id = 'prism-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/prismjs@1/themes/prism.min.css';
    document.head.appendChild(link);
  }
  if (!window.Prism && !document.getElementById('prism-core')) {
    const script = document.createElement('script');
    script.id = 'prism-core';
    script.src = 'https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js';
    document.body.appendChild(script);
    const autoloader = document.createElement('script');
    autoloader.id = 'prism-autoloader';
    autoloader.src = 'https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js';
    document.body.appendChild(autoloader);
  }
}

function formatHTML(input) {
  try {
    // Insert newlines between tags
    let html = input.replace(/>\s*</g, '><').replace(/></g, '>\n<');
    const lines = html.split(/\n/);
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    let indent = 0;
    const out = [];
    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const isClosing = /^<\//.test(line);
      const isSelfClose = /\/>$/.test(line);
      const tagMatch = line.match(/^<([a-zA-Z0-9-]+)/);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : '';
      if (isClosing) indent = Math.max(indent - 1, 0);
      out.push('  '.repeat(indent) + line);
      if (!isClosing && !isSelfClose && tag && !voidTags.has(tag) && !line.includes('</')) {
        indent += 1;
      }
    }
    return out.join('\n');
  } catch (e) {
    return input;
  }
}

function formatCSS(input) {
  try {
    let css = input
      .replace(/\s*{\s*/g, ' {\n')
      .replace(/;\s*/g, ';\n')
      .replace(/\s*}\s*/g, '\n}\n');
    const lines = css.split(/\n/);
    let indent = 0; const out = [];
    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('}')) indent = Math.max(indent - 1, 0);
      out.push('  '.repeat(indent) + line);
      if (line.endsWith('{')) indent += 1;
    }
    return out.join('\n');
  } catch (e) {
    return input;
  }
}
