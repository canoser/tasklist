const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

console.log('PDF oluşturma işlemi başlıyor (Ferah tasarım ile)...');

const options = {
    cssPath: path.join(__dirname, 'pdf_style.css'),
    paperBorder: '1.5cm' // Kenarlardan 1.5cm boşluk veriyoruz
};

markdownpdf(options).from('fizik_yillik_plan.md').to('fizik_yillik_plan.pdf', function () {
    if (fs.existsSync('fizik_yillik_plan.pdf')) {
        console.log('Başarılı! Ferah görünümlü PDF dosyası "fizik_yillik_plan.pdf" adıyla aynı dizinde oluşturuldu.');
    } else {
        console.log('Hata oluştu, dosya bulunamadı.');
    }
});
