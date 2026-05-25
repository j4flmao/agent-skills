# Image Delivery

## CDN Provider Comparison

| Provider | Transforms | Free Tier | Edge | Cost |
|----------|-----------|-----------|------|------|
| Cloudinary | Resize, format, quality, crop | 25GB storage, 25GB/month | Yes | Pay per use |
| Imgix | Full range | None | Yes | Pay per use |
| Cloudflare Images | Basic transforms | Included with CF plans | Yes | Flat fee |
| Next.js Image | Built-in transforms | Free (self-host) | Yes (Vercel) | Platform cost |
| ImageEngine | Automatic optimization | Trial only | Yes | Pay per use |
| Thumbor | Self-hosted | Free (OSS) | No | Infrastructure |

## Cloudinary Setup

```typescript
// Fetch-based delivery
const CLOUD_NAME = 'my-cloud'

function cloudinaryUrl(publicId: string, options: TransformOptions = {}): string {
  const transforms = []
  if (options.width) transforms.push(`w_${options.width}`)
  if (options.height) transforms.push(`h_${options.height}`)
  if (options.format) transforms.push(`f_${options.format}`)
  if (options.quality) transforms.push(`q_${options.quality}`)
  if (options.crop) transforms.push(`c_${options.crop}`)
  if (options.sharpen) transforms.push(`e_sharpen:${options.sharpen}`)

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(',')}/${publicId}`
}

// Usage
<img src={cloudinaryUrl('hero.jpg', { width: 800, format: 'avif', quality: 80 })} />
```

## Responsive Image Component

```typescript
interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  widths?: number[]
  sizes?: string
  priority?: boolean
}

function ResponsiveImage({
  src,
  alt,
  widths = [640, 768, 1024, 1280, 1536],
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  ...props
}: ResponsiveImageProps) {
  const srcset = widths
    .map(w => `${cloudinaryUrl(src, { width: w })} ${w}w`)
    .join(', ')

  return (
    <img
      src={cloudinaryUrl(src, { width: widths[0] })}
      srcSet={srcset}
      sizes={sizes}
      alt={alt}
      loading={priority ? undefined : 'lazy'}
      decoding="async"
      {...props}
    />
  )
}
```

## Picture Element with Format Fallback

```tsx
<picture>
  <source srcSet={avifUrl} type="image/avif" sizes={sizes} />
  <source srcSet={webpUrl} type="image/webp" sizes={sizes} />
  <img src={fallbackJpg} alt="description" loading="lazy" decoding="async" />
</picture>
```

## Art Direction

```tsx
<picture>
  <source media="(min-width: 1024px)" srcSet={desktopImg} />
  <source media="(min-width: 640px)" srcSet={tabletImg} />
  <img src={mobileImg} alt="description" />
</picture>
```

## LCP Image Preloading

```html
<head>
  <link rel="preload" as="image" href="/hero.avif" imagesrcset="/hero-640.avif 640w, /hero-1024.avif 1024w, /hero-1920.avif 1920w" imagesizes="100vw">
</head>
```

## Progressive Image Loading

```typescript
function ProgressiveImage({ src, placeholder, alt }: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{ position: 'relative', aspectRatio: '16/9' }}>
      {!loaded && (
        <img
          src={placeholder}
          alt=""
          style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 300ms' }}
      />
    </div>
  )
}
```

## Image URL Transform Reference

| Transform | Parameter | Example |
|-----------|-----------|---------|
| Resize width | `w_N` | `w_800` |
| Resize height | `h_N` | `h_600` |
| Fit/crop | `c_fill` | `c_fill,g_face` |
| Format | `f_avif` | `f_webp` |
| Quality | `q_N` | `q_80` |
| Sharpen | `e_sharpen:N` | `e_sharpen:100` |
| Blur | `e_blur:N` | `e_blur:200` |
| Rotate | `a_N` | `a_90` |
| Background color | `b_rgb:fff` | `b_rgb:000` |
| DPR | `dpr_N` | `dpr_2` |

## Image Loading Strategy Map

| Position | Loading | Fetch Priority | Preload |
|----------|---------|---------------|---------|
| Above-fold (LCP candidate) | `eager` | `high` | Yes |
| Above-fold (other) | `eager` | `auto` | No |
| Below-fold | `lazy` | `low` | No |
| Background (CSS) | N/A | N/A | Use preload |
| Thumbnail list | `lazy` | `low` | No |
| Modal/yopup | `lazy` | `auto` | No |
