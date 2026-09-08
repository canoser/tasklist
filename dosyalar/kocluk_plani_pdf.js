const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\canos\\.gemini\\antigravity-ide\\brain\\bcac9a91-6533-48f9-8436-6000faaaf260';
const outputDir = __dirname;

const options = {
    cssPath: path.join(__dirname, 'pdf_style.css'),
    paperBorder: '1.5cm'
};

const files = [
    { input: path.join(brainDir, 'implementation_plan.md'), output: 'DersMatris_Kocluk_Gereksinimleri_v3.pdf' },
    { input: path.join(brainDir, 'software_architecture.md'), output: 'DersMatris_Kocluk_Yazilim_Mimarisi.pdf' }
];

let completed = 0;

files.forEach(f => {
    const outPath = path.join(outputDir, f.output);
    console.log(`Oluşturuluyor: ${f.output}...`);
    markdownpdf(options).from(f.input).to(outPath, function () {
        completed++;
        if (fs.existsSync(outPath)) {
            console.log(`✅ ${f.output} başarıyla oluşturuldu.`);
        } else {
            console.log(`❌ ${f.output} oluşturulamadı!`);
        }
        if (completed === files.length) {
            console.log('\\nTüm PDF dosyaları tamamlandı.');
        }
    });
});
