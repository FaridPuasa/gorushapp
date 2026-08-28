// Compresses a base64 data-URL image (the storage format used for Hero
// Slides and CBSL invoice screenshots alike - see models/HeroSlide.js) down
// to a reasonable size for web delivery. Found 2026-08-28: uncompressed
// slide uploads (camera-resolution photos, 500KB-1.7MB each) made the
// homepage's hero carousel one of the slowest things on the site - 3
// slides totaling 3.38MB, re-fetched in full on every single page load
// with no caching at all.
const sharp = require('sharp');

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 78;

// Only shrinks/re-compresses if the image is actually larger than the
// target - never upscales, and re-encodes as JPEG regardless of the
// original format (fine for photographic hero images; not meant for
// content that needs transparency, like logos).
async function compressBase64Image(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return dataUrl;
    }
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return dataUrl;
    const [, , base64Data] = match;
    const inputBuffer = Buffer.from(base64Data, 'base64');

    try {
        const outputBuffer = await sharp(inputBuffer)
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .jpeg({ quality: JPEG_QUALITY })
            .toBuffer();
        return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
    } catch (err) {
        console.error('❌ Image compression failed, storing original:', err.message);
        return dataUrl;
    }
}

module.exports = { compressBase64Image };
