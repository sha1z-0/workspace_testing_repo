const fs = require('fs');
const path = require('path');

// Read the markdown file
const mdContent = fs.readFileSync(path.join(__dirname, 'Finova_Workspace_QA_Change_Report.md'), 'utf8');

// Simple markdown to HTML converter
function mdToHtml(md) {
  let html = md;
  
  // Escape HTML special chars in code blocks first
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="lang-${lang}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
    return `%%CODEBLOCK_${idx}%%`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge adjacent blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
  
  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    return match;
  });
  
  // Process tables
  const lines = html.split('\n');
  let inTable = false;
  let tableHtml = '';
  let isHeader = true;
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        isHeader = true;
        tableHtml = '<table>';
      }
      // Check if separator row
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        isHeader = false;
        continue;
      }
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
      if (isHeader) {
        tableHtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        isHeader = false;
      } else {
        tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      }
    } else {
      if (inTable) {
        tableHtml += '</tbody></table>';
        processedLines.push(tableHtml);
        inTable = false;
        tableHtml = '';
        isHeader = true;
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable) {
    tableHtml += '</tbody></table>';
    processedLines.push(tableHtml);
  }
  html = processedLines.join('\n');
  
  // Checkbox lists
  html = html.replace(/^- \[x\] (.+)$/gm, '<div class="check-item done"><span class="checkbox">☑</span> $1</div>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<div class="check-item"><span class="checkbox">☐</span> $1</div>');
  
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive li's
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Paragraphs
  html = html.replace(/^(?!<[hupoltdb]|<\/|%%|<hr|<blockquote|<div)(.+)$/gm, '<p>$1</p>');
  
  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`%%CODEBLOCK_${idx}%%`, block);
  });
  
  // Center div
  html = html.replace(/<div align="center">/g, '<div class="centered">');
  html = html.replace(/<\/div>/g, '</div>');
  
  return html;
}

const bodyHtml = mdToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Finova Workspace — QA Change Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  @page {
    size: A4;
    margin: 18mm 15mm 18mm 15mm;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10.5px;
    color: #1e293b;
    line-height: 1.65;
    background: #fff;
    padding: 20px 40px;
    max-width: 900px;
    margin: 0 auto;
  }
  
  .centered { text-align: center; margin: 30px 0; }
  
  /* COVER */
  .centered h1:first-child {
    font-size: 28px;
    color: #0f172a;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
    border: none;
    padding: 0;
  }
  .centered h2 {
    font-size: 16px;
    color: #3B82F6;
    font-weight: 500;
    border: none;
    padding: 0;
    margin-top: 0;
  }
  
  h1 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 2.5px solid #3B82F6;
    padding-bottom: 6px;
    margin-top: 32px;
    margin-bottom: 14px;
    letter-spacing: -0.3px;
    page-break-after: avoid;
  }
  
  h2 {
    font-size: 15px;
    font-weight: 600;
    color: #1e3a5f;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 24px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  
  h3 {
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }
  
  h4 {
    font-size: 11.5px;
    font-weight: 600;
    color: #475569;
    margin-top: 12px;
    margin-bottom: 4px;
  }
  
  p {
    margin: 6px 0;
  }
  
  strong { font-weight: 600; }
  
  code {
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 9.5px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    color: #be185d;
  }
  
  pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 14px 16px;
    border-radius: 8px;
    font-size: 9px;
    line-height: 1.5;
    overflow-x: auto;
    margin: 10px 0;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0 14px 0;
    font-size: 10px;
    page-break-inside: avoid;
  }
  
  thead th {
    background: #1e3a5f;
    color: #fff;
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  td {
    padding: 6px 10px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  
  tbody tr:nth-child(even) td {
    background: #f8fafc;
  }
  
  tbody tr:hover td {
    background: #eff6ff;
  }
  
  blockquote {
    border-left: 3px solid #3B82F6;
    padding: 8px 14px;
    margin: 10px 0;
    background: #eff6ff;
    border-radius: 0 6px 6px 0;
    color: #334155;
    font-size: 10px;
  }
  
  ul {
    margin: 6px 0 6px 20px;
    padding: 0;
  }
  
  li {
    margin: 3px 0;
  }
  
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 20px 0;
  }
  
  .check-item {
    padding: 3px 0 3px 4px;
    font-size: 10.5px;
  }
  .check-item .checkbox {
    font-size: 12px;
    margin-right: 6px;
    color: #94a3b8;
  }
  .check-item.done .checkbox {
    color: #22c55e;
  }
  
  /* Print optimizations */
  @media print {
    body { padding: 0; max-width: none; }
    h1 { page-break-after: avoid; }
    h2, h3 { page-break-after: avoid; }
    table, pre, blockquote { page-break-inside: avoid; }
    .page-break { page-break-before: always; }
  }
  
  /* Section styling */
  h2 + p { margin-top: 4px; }
  
  /* Cover page separator */
  .centered + hr {
    border-top: 2px solid #3B82F6;
    margin: 20px auto;
    width: 60%;
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

const outPath = path.join(__dirname, 'Finova_Workspace_QA_Change_Report.html');
fs.writeFileSync(outPath, fullHtml, 'utf8');
console.log('HTML report generated:', outPath);
console.log('');
console.log('To create a PDF:');
console.log('  1. Open the HTML file in your browser');
console.log('  2. Press Ctrl+P (Print)');
console.log('  3. Set Destination to "Save as PDF"');
console.log('  4. Set Margins to "Default" or "Minimum"');
console.log('  5. Enable "Background graphics"');
console.log('  6. Click Save');
