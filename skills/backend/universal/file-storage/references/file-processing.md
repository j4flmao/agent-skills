# File Processing Patterns Reference

## Image Resizing and Optimization

### Sharp (Node.js)
```typescript
import sharp from 'sharp';

// Resize with multiple outputs
async function processImage(input: Buffer, filename: string) {
  const outputs = [
    { suffix: 'thumb', width: 150, height: 150 },
    { suffix: 'small', width: 300, height: 300 },
    { suffix: 'medium', width: 800, height: 800 },
    { suffix: 'large', width: 1920, height: 1080 },
  ];

  const results = await Promise.all(outputs.map(async ({ suffix, width, height }) => {
    const buffer = await sharp(input)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80, effort: 6 })        // effort=6 for best compression
      .toBuffer();

    return { filename: `${filename}_${suffix}.webp`, buffer };
  }));

  return results;
}
```

### ImageMagick (via CLI)
```bash
# Resize with sharpening
convert input.jpg -resize 800x800^ -gravity center -extent 800x800 -sharpen 0x1 output.jpg

# Progressive JPEG
convert input.jpg -interlace Plane -quality 85 output.jpg

# Convert to WebP
convert input.jpg -quality 80 output.webp
```

### Optimization Pipeline

| Stage | Tool | Purpose |
|-------|------|---------|
| Resize | Sharp / ImageMagick | Scale to target dimensions |
| Format | WebP / AVIF | Modern codec (30-50% smaller) |
| Compression | MozJPEG / pngquant | Lossy/lossless optimization |
| Metadata | ExifTool / Sharp | Strip EXIF, ICC, XMP |
| Responsive | srcset generation | Serve correct size per viewport |

```typescript
// Full optimization pipeline
async function optimizeImage(input: Buffer) {
  const metadata = await sharp(input).metadata();
  const pipeline = sharp(input)
    .resize({ withoutEnlargement: true })
    .withMetadata({ icc: 'sRGB' }) // Keep color profile
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .webp({ quality: 80, alphaQuality: 80, nearLossless: true });

  // Generate AVIF as well (up to 50% smaller than WebP)
  const avif = await pipeline.clone().avif({ quality: 65 }).toBuffer();
  const webp = await pipeline.toBuffer();

  return { avif, webp, originalFormat: metadata.format };
}
```

## Video Transcoding

### FFmpeg
```bash
# HLS streaming output
ffmpeg -i input.mp4 \
  -filter_complex \
    "[0:v]split=3[v1][v2][v3]; \
     [v1]scale=w=640:h=360[v1out]; \
     [v2]scale=w=854:h=480[v2out]; \
     [v3]scale=w=1280:h=720[v3out]" \
  -map [v1out] -c:v:0 libx264 -b:v:0 800k \
  -map [v2out] -c:v:1 libx264 -b:v:1 1400k \
  -map [v3out] -c:v:2 libx264 -b:v:2 2800k \
  -map a:0 -c:a aac -b:a 128k \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -master_pl_name master.m3u8 \
  output_%v.m3u8

# Thumbnail generation
ffmpeg -i input.mp4 -ss 00:01:00 -vframes 1 -vf "scale=320:-1" thumb.jpg

# GIF generation
ffmpeg -i input.mp4 -vf "fps=10,scale=480:-1:flags=lanczos,palettegen" palette.png
ffmpeg -i input.mp4 -i palette.png -lavfi "fps=10,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse" output.gif
```

### Video Processing Pipeline
```typescript
interface TranscodeConfig {
  resolutions: Array<{ width: number; height: number; bitrate: string }>;
  format: 'hls' | 'dash' | 'mp4';
  thumbnailTimeSeconds: number;
  gifDurationSeconds: number;
}

async function transcodeVideo(input: Buffer, config: TranscodeConfig) {
  // 1. Validate input (codec, duration, resolution)
  // 2. Generate HLS/DASH segments
  // 3. Generate thumbnails at config.thumbnailTimeSeconds
  // 4. Generate poster image (first frame)
  // 5. Generate GIF preview if needed
  // 6. Upload all outputs to storage
  // 7. Return manifest URL and metadata
}
```

## Document Conversion

```typescript
// PDF generation (Node.js)
import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

function generateInvoice(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Content
    doc.fontSize(24).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${data.invoiceNumber}`);
    doc.text(`Date: ${data.date.toLocaleDateString()}`);
    doc.moveDown();

    // Table
    data.items.forEach(item => {
      doc.text(`${item.name} x${item.quantity}  $${(item.price * item.quantity).toFixed(2)}`);
    });

    doc.moveDown();
    doc.fontSize(16).text(`Total: $${data.total.toFixed(2)}`, { align: 'right' });
    doc.end();
  });
}
```

## Streaming Processing

```typescript
import { Transform } from 'stream';
import sharp from 'sharp';

// Stream-based image processing (low memory)
function createResizeStream(width: number, height: number) {
  return sharp().resize(width, height, { fit: 'inside' }).webp({ quality: 80 });
}

// Pipe input to output
async function processStreaming(input: Readable, output: Writable) {
  return new Promise((resolve, reject) => {
    input
      .pipe(createResizeStream(800, 600))
      .pipe(output)
      .on('finish', resolve)
      .on('error', reject);
  });
}
```

## Virus Scanning

```typescript
// ClamAV integration (using clamscan)
import { NodeClam } from 'clamscan';

async function scanFile(buffer: Buffer): Promise<{ clean: boolean; viruses: string[] }> {
  const clamscan = await new NodeClam().init({
    clamdscan: { socket: '/var/run/clamav/clamd.ctl' }
  });

  const result = await clamscan.scanBuffer(buffer);
  return {
    clean: result.isClean,
    viruses: result.viruses || []
  };
}
```
