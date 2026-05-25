# Image Components

## Next.js Image Component

```tsx
import Image from 'next/image'

function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero banner"
      width={1200}
      height={630}
      priority // preload LCP image
      sizes="100vw"
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j..." // 20px blur hash
    />
  )
}
```

## Custom Image Component

```tsx
interface ImgProps {
  src: string
  alt: string
  width?: number
  height?: number
  aspectRatio?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  className?: string
}

function Img({
  src,
  alt,
  width,
  height,
  aspectRatio = 'auto',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  className,
}: ImgProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ aspectRatio, maxWidth: width }}
    >
      {placeholder === 'blur' && !loaded && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
        />
      )}
      {error ? (
        <div className="flex items-center justify-center bg-gray-100 text-gray-400 w-full h-full">
          <span>Failed to load image</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? undefined : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  )
}
```

## Skeleton Placeholder

```tsx
function ImageSkeleton({ aspectRatio = '16/9' }: { aspectRatio?: string }) {
  return (
    <div
      className="bg-gray-200 animate-pulse rounded"
      style={{ aspectRatio }}
      aria-hidden="true"
    />
  )
}

function ImageWithSkeleton({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{ aspectRatio: '16/9', position: 'relative' }}>
      {!loaded && <ImageSkeleton />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ display: loaded ? 'block' : 'none' }}
      />
    </div>
  )
}
```

## Aspect Ratio Container

```css
/* CSS aspect-ratio property (modern) */
.image-wrapper {
  aspect-ratio: 16 / 9;
}

/* Padding hack (legacy fallback) */
.image-wrapper-legacy {
  position: relative;
  padding-bottom: 56.25%; /* 9/16 * 100 */
}

.image-wrapper-legacy img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

## Avatar Component

```tsx
interface AvatarProps {
  src?: string
  alt: string
  initials?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 32, md: 40, lg: 64 }

function Avatar({ src, alt, initials, size = 'md' }: AvatarProps) {
  const dimension = sizeMap[size]
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div
        className="rounded-full bg-blue-500 text-white flex items-center justify-center font-medium"
        style={{ width: dimension, height: dimension, fontSize: dimension * 0.4 }}
        role="img"
        aria-label={alt}
      >
        {initials ?? alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className="rounded-full object-cover"
      onError={() => setError(true)}
    />
  )
}
```

## Gallery Grid with Masonry

```tsx
function ImageGrid({ images }: { images: ImageItem[] }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
      {images.map(img => (
        <div key={img.id} className="break-inside-avoid mb-4">
          <Img
            src={img.url}
            alt={img.alt}
            aspectRatio={img.aspectRatio}
          />
        </div>
      ))}
    </div>
  )
}
```

## Image Comparison Slider

```tsx
function ImageCompare({ before, after }: { before: string; after: string }) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, x)))
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden select-none"
      onMouseMove={handleMove}
      style={{ aspectRatio: '16/9' }}
    >
      <img src={before} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={after} alt="After" className="w-full h-full object-cover" />
      </div>
    </div>
  )
}
```
