# Image CDN Configuration

## CDN Provider Interface

```typescript
interface ImageCdnConfig {
  provider: 'cloudinary' | 'imgix' | 'cloudflare' | 'akamai' | 'custom'
  baseUrl: string
  apiKey?: string
  defaultParams?: Record<string, string | number>
  signedUrls?: boolean
  secretKey?: string
}

interface ImageTransformParams {
  width?: number
  height?: number
  quality?: number
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: string
  blur?: number
  brightness?: number
  contrast?: number
  saturation?: number
}

interface CdnImageResult {
  url: string
  srcSet: string
  width: number
  height: number
  blurDataURL?: string
}
```

## Cloudinary Configuration

```typescript
class CloudinaryProvider {
  private config: ImageCdnConfig
  private baseTransform: string

  constructor(config: ImageCdnConfig) {
    this.config = config
    this.baseTransform = 'f_auto,q_auto'
  }

  buildUrl(publicId: string, params: ImageTransformParams): string {
    const transforms = this.buildTransforms(params)
    return `${this.config.baseUrl}/image/upload/${transforms}/${publicId}`
  }

  buildSrcSet(publicId: string, widths: number[], params?: ImageTransformParams): string {
    return widths
      .map(w => {
        const url = this.buildUrl(publicId, { ...params, width: w })
        return `${url} ${w}w`
      })
      .join(', ')
  }

  private buildTransforms(params: ImageTransformParams): string {
    const parts: string[] = [this.baseTransform]

    if (params.width) parts.push(`w_${params.width}`)
    if (params.height) parts.push(`h_${params.height}`)
    if (params.quality) parts.push(`q_${params.quality}`)
    if (params.fit) parts.push(`c_${params.fit}`)
    if (params.position) parts.push(`g_${params.position}`)
    if (params.format && params.format !== 'auto') parts.push(`f_${params.format}`)
    if (params.blur) parts.push(`e_blur:${params.blur}`)
    if (params.brightness) parts.push(`e_brightness:${params.brightness}`)
    if (params.contrast) parts.push(`e_contrast:${params.contrast}`)

    return parts.join(',')
  }

  generateBlurPlaceholder(publicId: string): string {
    const blurUrl = this.buildUrl(publicId, {
      width: 20,
      quality: 20,
      blur: 50,
    })
    return `url('${blurUrl}')`
  }
}
```

## Imgix Configuration

```typescript
class ImgixProvider {
  private config: ImageCdnConfig

  constructor(config: ImageCdnConfig) {
    this.config = config
  }

  buildUrl(path: string, params: ImageTransformParams): string {
    const query = this.buildQuery(params)
    const fullPath = path.startsWith('/') ? path : `/${path}`
    return `${this.config.baseUrl}${fullPath}?${query}`
  }

  buildSrcSet(path: string, widths: number[], params?: ImageTransformParams): string {
    return widths
      .map(w => {
        const url = this.buildUrl(path, {
          ...params,
          width: w,
          dpr: 1,
        })
        const url2x = this.buildUrl(path, {
          ...params,
          width: w * 2,
          dpr: 2,
        })
        return `${url} ${w}w,\n${url2x} ${w * 2}w`
      })
      .join(',\n')
  }

  private buildQuery(params: ImageTransformParams): string {
    const q = new URLSearchParams()
    if (params.width) q.set('w', params.width.toString())
    if (params.height) q.set('h', params.height.toString())
    if (params.quality) q.set('q', params.quality.toString())
    if (params.fit) q.set('fit', params.fit)
    if (params.position) q.set('pos', params.position)
    q.set('auto', 'compress,format')
    if (params.blur) q.set('blur', params.blur.toString())
    return q.toString()
  }

  generatePlaceholder(path: string): string {
    const base64 = this.buildUrl(path, {
      width: 100,
      blur: 50,
      quality: 20,
    })
    return base64
  }
}
```

## Responsive Image Component

```typescript
interface ResponsiveImageProps {
  src: string
  alt: string
  widths?: number[]
  sizes?: string
  priority?: boolean
  className?: string
  aspectRatio?: number
  cdn: ImageCdnConfig
  transforms?: ImageTransformParams
}

function getProvider(cdn: ImageCdnConfig) {
  switch (cdn.provider) {
    case 'cloudinary':
      return new CloudinaryProvider(cdn)
    case 'imgix':
      return new ImgixProvider(cdn)
    default:
      throw new Error(`Unsupported CDN provider: ${cdn.provider}`)
  }
}

function CdnImage({
  src,
  alt,
  widths = [640, 768, 1024, 1280, 1536],
  sizes = '100vw',
  priority = false,
  className,
  aspectRatio,
  cdn,
  transforms,
}: ResponsiveImageProps) {
  const provider = getProvider(cdn)
  const srcSet = provider.buildSrcSet(src, widths, transforms)
  const fallbackUrl = provider.buildUrl(src, {
    ...transforms,
    width: widths[Math.floor(widths.length / 2)],
  })
  const blurDataURL = provider.generateBlurPlaceholder(src)

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
    >
      <img
        src={fallbackUrl}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="w-full h-full object-cover"
        style={{
          backgroundImage: `url(${blurDataURL})`,
          backgroundSize: 'cover',
        }}
      />
    </div>
  )
}
```

## Signed URL Generation

```typescript
import { createHmac } from 'node:crypto'

function generateSignedUrl(
  baseUrl: string,
  secret: string,
  expiresInSeconds = 3600
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds
  const url = new URL(baseUrl)

  url.searchParams.set('expires', expires.toString())

  const signature = createHmac('sha256', secret)
    .update(url.pathname + url.search)
    .digest('base64url')

  url.searchParams.set('sig', signature)
  return url.toString()
}

function verifySignedUrl(url: string, secret: string): boolean {
  const parsed = new URL(url)
  const expires = parseInt(parsed.searchParams.get('expires') ?? '0', 10)
  const sig = parsed.searchParams.get('sig')

  if (!sig || Date.now() / 1000 > expires) return false

  parsed.searchParams.delete('sig')
  const expectedSig = createHmac('sha256', secret)
    .update(parsed.pathname + parsed.search)
    .digest('base64url')

  return sig === expectedSig
}
```

## CDN Health Checks

```typescript
interface CdnHealthCheckResult {
  provider: string
  region: string
  latency: number
  statusCode: number
  isHealthy: boolean
  timestamp: Date
}

async function checkCdnHealth(cdn: ImageCdnConfig): Promise<CdnHealthCheckResult[]> {
  const regions = [
    { name: 'us-east', url: `https://us-east.${new URL(cdn.baseUrl).hostname}` },
    { name: 'eu-west', url: `https://eu-west.${new URL(cdn.baseUrl).hostname}` },
    { name: 'ap-southeast', url: `https://ap-southeast.${new URL(cdn.baseUrl).hostname}` },
  ]

  const results = await Promise.allSettled(
    regions.map(async (region) => {
      const start = performance.now()
      const response = await fetch(region.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      const latency = performance.now() - start

      return {
        provider: cdn.provider,
        region: region.name,
        latency,
        statusCode: response.status,
        isHealthy: response.status < 500,
        timestamp: new Date(),
      }
    })
  )

  return results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : {
          provider: cdn.provider,
          region: 'unknown',
          latency: -1,
          statusCode: 0,
          isHealthy: false,
          timestamp: new Date(),
        }
  )
}
```

## CDN Fallback Strategy

```typescript
class CdnFailover {
  private primary: ImageCdnConfig
  private secondary: ImageCdnConfig
  private isPrimaryHealthy: boolean = true

  constructor(primary: ImageCdnConfig, secondary: ImageCdnConfig) {
    this.primary = primary
    this.secondary = secondary
  }

  async getImageUrl(src: string, params: ImageTransformParams): Promise<string> {
    if (!this.isPrimaryHealthy) {
      return this.buildUrl(this.secondary, src, params)
    }

    try {
      const url = this.buildUrl(this.primary, src, params)
      const response = await fetch(url, { method: 'HEAD' })
      if (!response.ok) throw new Error(`CDN returned ${response.status}`)
      return url
    } catch {
      this.isPrimaryHealthy = false
      setTimeout(() => { this.isPrimaryHealthy = true }, 60000)
      return this.buildUrl(this.secondary, src, params)
    }
  }

  private buildUrl(cdn: ImageCdnConfig, src: string, params: ImageTransformParams): string {
    // Implementation depends on provider
    return `${cdn.baseUrl}/${src}?w=${params.width ?? 'auto'}`
  }
}
```

## Key Points

- Abstract CDN providers behind a common interface for portability
- Generate srcSet with multiple widths for responsive images
- Use auto format and quality parameters for optimal delivery
- Implement signed URLs for private/protected image assets
- Generate blur placeholder URLs for progressive loading
- Configure proper aspect ratio containers to prevent layout shift
- Monitor CDN health across geographic regions
- Implement CDN failover with automatic detection and recovery
- Use URL-based transforms instead of on-the-fly processing
- Cache transformed URLs aggressively on the CDN edge
