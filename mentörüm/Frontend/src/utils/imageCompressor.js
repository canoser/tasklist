// Resimleri Canvas + WebP ile ~400-600 KB seviyesine sıkıştırır.
// "Orijinal/sıkıştırılmamış" seçeneği YOKTUR (tek davranış: sıkıştır).

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}

function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob başarısız'))), 'image/webp', quality);
    });
}

export async function compressImage(file, { maxSize = 600 * 1024, maxDim = 1200, quality = 0.8 } = {}) {
    if (!file.type || !file.type.startsWith('image/')) return file;
    if (file.type === 'image/webp' && file.size <= maxSize) return file;

    const img = await loadImage(file);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    let blob = await canvasToBlob(canvas, quality);
    if (blob.size > maxSize) {
        const q2 = Math.max(0.4, quality * (maxSize / blob.size));
        blob = await canvasToBlob(canvas, q2);
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
}
