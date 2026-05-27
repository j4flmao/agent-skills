# Responsive Images

## Picture Element Approach

```tsx
function ResponsivePicture({
  src,
  alt,
  widths,
  formats = ['avif', 'webp', 'jpeg'],
  className,
  priority,
}: {
  src: string
  alt: string
  widths: number[]
  formats?: string[]
  className?: string
  priority?: boolean
}) {
  return (
    <picture>
      {formats.map(format => (
        <source
          key={format}
          type={`image/${format}`}
          srcSet={widths.map(w => `${src}?w=${w}&fmt=${format} ${w}w`).join(', ')}
          sizes={`(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw`}
        />
      ))}
      <img
        src={`${src}?w=${widths[0]}`}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
      />
    </picture>
  )
}
```

## Srcset Strategy

```tsx
function SrcsetImage({
  src,
  alt,
  sizes,
  breakpoints,
}: {
  src: string
  alt: string
  sizes?: string
  breakpoints: Array<{ width: number; density?: number }>
}) {
  const srcset = breakpoints
    .map(bp => {
      const url = `${src}?w=${bp.width}`
      return bp.density ? `${url} ${bp.density}x` : `${url} ${bp.width}w`
    })
    .join(', ')

  return (
    <img
      src={`${src}?w=${breakpoints[0].width}`}
      srcSet={srcset}
      sizes={sizes ?? '100vw'}
      alt={alt}
      className="w-full h-auto"
    />
  )
}

// Usage examples
function ProductGallery() {
  return (
    <SrcsetImage
      src="/product.jpg"
      alt="Product photo"
      sizes="(max-width: 600px) 100vw, 50vw"
      breakpoints={[
        { width: 320 },
        { width: 640 },
        { width: 960 },
        { width: 1280 },
        { width: 1920 },
      ]}
    />
  )
}
```

## Art Direction with Picture

```tsx
function ArtDirectedImage({ images }: {
  images: {
    mobile: { src: string; width: number }
    tablet: { src: string; width: number }
    desktop: { src: string; width: number }
  }
}) {
  return (
    <picture>
      <source
        media="(min-width: 1024px)"
        srcSet={`${images.desktop.src}?w=${images.desktop.width}`}
        sizes="100vw"
      />
      <source
        media="(min-width: 768px)"
        srcSet={`${images.tablet.src}?w=${images.tablet.width}`}
        sizes="100vw"
      />
      <img
        src={`${images.mobile.src}?w=${images.mobile.width}`}
        alt=""
        className="w-full h-auto"
      />
    </picture>
  )
}
```

## Aspect Ratio Containers

```tsx
function AspectRatioContainer({
  ratio,
  children,
  className,
}: {
  ratio: number
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  )
}

function ResponsiveImageWithRatio({
  src,
  alt,
  aspectRatio = 16/9,
}: {
  src: string
  alt: string
  aspectRatio?: number
}) {
  return (
    <AspectRatioContainer ratio={aspectRatio}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </AspectRatioContainer>
  )
}
```

## Placeholder and Blur-up

```tsx
function ProgressiveImage({ src, placeholderSrc, alt }: {
  src: string
  placeholderSrc?: string
  alt: string
}) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative" style={{ aspectRatio: '16/9' }}>
      {placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500
            ${loaded ? 'opacity-0' : 'opacity-100'}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500
          ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
      />
    </div>
  )
}
```

## Responsive Grid Layout

```tsx
function ImageGrid({ images }: {
  images: Array<{
    src: string
    alt: string
    span?: number
  }>
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((img, i) => (
        <div
          key={i}
          className={`${img.span === 2 ? 'col-span-2 row-span-2' : ''}`}
        >
          <ResponsiveImageWithRatio
            src={img.src}
            alt={img.alt}
            aspectRatio={img.span === 2 ? 1 : 3/4}
          />
        </div>
      ))}
    </div>
  )
}
```

## Lazy Loading with Intersection Observer

```tsx
function LazyImage({ src, alt, threshold = 0.1 }: {
  src: string
  alt: string
  threshold?: number
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (imgRef.current) observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={imgRef} className="min-h-[200px]">
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`w-full transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {!loaded && <div className="bg-gray-200 animate-pulse w-full h-48" />}
    </div>
  )
}
```

## Key Points

- Use srcset with width descriptors for resolution switching
- Implement art direction via the picture element and media queries
- Set explicit aspect ratios to prevent Cumulative Layout Shift
- Use lazy loading for below-the-fold images
- Generate multiple image formats (AVIF, WebP) with fallbacks
- Serve appropriately sized images based on viewport
- Implement blur-up or skeleton placeholders for perceived performance
- Use responsive image grids with varying column counts
- Set sizes attribute to inform the browser about display size
- Prioritize LCP images with eager loading
- Test image quality and load time across device types
