const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Remarkable } = require('remarkable');
const hljs = require('highlight.js');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

let browserPath = null;
if (fs.existsSync(chromePath)) {
    browserPath = chromePath;
} else if (fs.existsSync(edgePath)) {
    browserPath = edgePath;
}

if (!browserPath) {
    console.error('Chrome veya Edge bulunamadı!');
    process.exit(1);
}

const md = new Remarkable('full', {
    html: true,
    breaks: false,
    typographer: false,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang }).value;
            } catch (err) {}
        }
        try {
            return hljs.highlightAuto(str).value;
        } catch (err) {}
        return '';
    }
});

const getHtmlTemplate = (title, content) => `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
@page {
    size: A4 portrait;
    margin: 14mm 12mm 14mm 12mm;
}
* {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box;
}
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
    font-size: 11px;
    line-height: 1.55;
    color: #1e293b;
    background-color: #ffffff;
    padding: 0;
    margin: 0;
}
h1 {
    font-size: 21px;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 8px;
    margin-top: 24px;
    margin-bottom: 14px;
    page-break-after: avoid;
}
h2 {
    font-size: 15px;
    font-weight: 700;
    color: #1e3a8a;
    background-color: #f1f5f9 !important;
    border-left: 5px solid #2563eb;
    padding: 7px 12px;
    border-radius: 4px;
    margin-top: 22px;
    margin-bottom: 12px;
    page-break-after: avoid;
}
h3 {
    font-size: 13px;
    font-weight: 600;
    color: #1d4ed8;
    margin-top: 18px;
    margin-bottom: 8px;
    padding-bottom: 3px;
    border-bottom: 1px dashed #cbd5e1;
    page-break-after: avoid;
}
h4 {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
}
p {
    margin-top: 0;
    margin-bottom: 10px;
    color: #334155;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
    margin-bottom: 16px;
    font-size: 10.5px;
    page-break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
th {
    background-color: #1e293b !important;
    color: #ffffff !important;
    font-weight: 700;
    padding: 8px 10px;
    border: 1px solid #334155;
    text-align: left;
    vertical-align: middle;
}
td {
    border: 1px solid #cbd5e1;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
    color: #1e293b;
    line-height: 1.45;
}
tr:nth-child(even) td {
    background-color: #f8fafc !important;
}
tr:nth-child(odd) td {
    background-color: #ffffff !important;
}
blockquote {
    margin: 14px 0;
    padding: 10px 14px;
    background-color: #eff6ff !important;
    border-left: 4px solid #3b82f6;
    border-radius: 0 6px 6px 0;
    color: #1e40af;
    font-size: 11px;
    page-break-inside: avoid;
}
blockquote p {
    margin-bottom: 0;
    color: #1e40af;
}
blockquote strong {
    color: #1e3a8a;
}
code {
    font-family: Consolas, "Liberation Mono", Courier, monospace;
    font-size: 10px;
    background-color: #f1f5f9 !important;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid #cbd5e1;
}
pre {
    background-color: #0f172a !important;
    color: #f8fafc !important;
    padding: 12px 14px;
    border-radius: 6px;
    font-family: Consolas, "Liberation Mono", Courier, monospace;
    font-size: 9.5px;
    line-height: 1.45;
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 12px 0;
    page-break-inside: avoid;
    border: 1px solid #334155;
}
pre code {
    background-color: transparent !important;
    color: #f8fafc !important;
    padding: 0;
    border: none;
    font-size: 9.5px;
}
ul, ol {
    margin-top: 4px;
    margin-bottom: 12px;
    padding-left: 20px;
}
li {
    margin-bottom: 4px;
    color: #334155;
}
strong {
    font-weight: 700;
    color: #0f172a;
}
hr {
    border: 0;
    height: 2px;
    background: #cbd5e1;
    margin: 20px 0;
}
.hljs-keyword, .hljs-selector-tag { color: #f43f5e; font-weight: bold; }
.hljs-string, .hljs-title { color: #38bdf8; }
.hljs-comment { color: #64748b; font-style: italic; }
.hljs-number { color: #f59e0b; }
.hljs-type, .hljs-class { color: #a855f7; }
</style>
</head>
<body>
${content}
</body>
</html>`;

function convertFile(filename) {
    const mdName = filename.endsWith('.md') ? filename : filename + '.md';
    const pdfName = mdName.replace(/\.md$/, '.pdf');

    const inputPath = path.resolve(__dirname, '..', 'mentörüm', 'docs', mdName);
    const outputPath = path.resolve(__dirname, '..', 'mentörüm', 'docs', pdfName);
    const copyPath = path.resolve(__dirname, pdfName);
    const tempHtmlPath = path.resolve(__dirname, `temp_${path.parse(mdName).name}.html`);

    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Dosya bulunamadı: ${inputPath}`);
        return;
    }

    console.log(`\n📄 İşleniyor: ${mdName} -> ${pdfName}`);
    const mdContent = fs.readFileSync(inputPath, 'utf8');
    const renderedHtml = md.render(mdContent);
    const fullHtml = getHtmlTemplate(path.parse(mdName).name, renderedHtml);

    fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

    const args = [
        '--headless',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${outputPath}`,
        tempHtmlPath
    ];

    try {
        execFileSync(browserPath, args, { encoding: 'utf8' });
        if (fs.existsSync(outputPath)) {
            fs.copyFileSync(outputPath, copyPath);
            const stats = fs.statSync(outputPath);
            console.log(`  ✅ Başarılı! Oluşturulan PDF: ${(stats.size / 1024).toFixed(1)} KB`);
        } else {
            console.error(`  ❌ Hata: PDF oluşturulamadı.`);
        }
    } catch (err) {
        console.error(`  ❌ Dönüştürme hatası:`, err.message);
    } finally {
        if (fs.existsSync(tempHtmlPath)) {
            fs.unlinkSync(tempHtmlPath);
        }
    }
}

const targetFiles = [
    'TASK_LIST_V7_ON_RAPOR_DEEPSEEK.md',
    'TASK_LIST_V7_ON_RAPOR_GEMINI_FLASH_3.8.md',
    'TASK_LIST_V7_ON_RAPOR_GEMINI.md'
];

targetFiles.forEach(convertFile);
console.log('\n🎉 Tüm PDF dönüştürmeleri tamamlandı!');
