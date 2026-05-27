# Image Accessibility

## Accessible Image Component

```typescript
interface AccessibleImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  loading?: 'lazy' | 'eager'
  longDescription?: string
  caption?: string
  role?: 'img' | 'presentation' | 'none'
  sizes?: string
}

function AccessibleImage({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  longDescription,
  caption,
  role,
  sizes,
}: AccessibleImageProps) {
  const descId = longDescription ? `desc-${src.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined

  return (
    <figure className={`accessible-image ${className ?? ''}`} role="group">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        role={role || (alt ? undefined : 'presentation')}
        aria-describedby={descId}
        sizes={sizes}
        className="max-w-full h-auto"
      />
      {longDescription && (
        <details id={descId} className="mt-2">
          <summary className="text-sm text-blue-600 cursor-pointer">
            Image description
          </summary>
          <p className="text-sm text-gray-600 mt-1">{longDescription}</p>
        </details>
      )}
      {caption && (
        <figcaption className="text-sm text-gray-500 mt-1">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
```

## Alt Text Generator from Context

```typescript
interface ImageContext {
  pageTitle?: string
  section?: string
  purpose: 'decorative' | 'informative' | 'functional' | 'logo' | 'navigation'
  content?: string
  nearbyText?: string
}

function generateAltText(context: ImageContext): string {
  switch (context.purpose) {
    case 'decorative':
      return ''
    case 'logo':
      return `${context.content ?? context.pageTitle ?? 'Company'} logo`
    case 'functional': {
      if (context.content) return context.content
      return `${context.section ?? 'Link'} button`
    }
    case 'navigation':
      return `${context.content ?? 'Navigate to'} ${context.section ?? 'page'}`
    case 'informative':
    default:
      if (context.content) return context.content
      if (context.nearbyText) return `Image related to: ${context.nearbyText}`
      return context.pageTitle ? `Image for ${context.pageTitle}` : ''
  }
}
```

## Alt Text Validation

```typescript
interface AltTextIssue {
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
}

function validateAltText(alt: string, context: { isDecorative?: boolean }): AltTextIssue[] {
  const issues: AltTextIssue[] = []

  if (context.isDecorative && alt !== '') {
    issues.push({
      severity: 'error',
      message: 'Decorative images must have empty alt text (alt="")',
      suggestion: 'Set alt="" for this decorative image',
    })
  }

  if (!context.isDecorative) {
    if (!alt || alt.trim() === '') {
      issues.push({
        severity: 'error',
        message: 'Informative images must have descriptive alt text',
        suggestion: 'Add alt text describing the image content and purpose',
      })
    } else {
      if (alt.length < 5) {
        issues.push({
          severity: 'warning',
          message: 'Alt text is too short to be descriptive',
          suggestion: 'Expand the alt text to fully describe the image',
        })
      }

      if (alt.length > 250) {
        issues.push({
          severity: 'warning',
          message: 'Alt text is very long. Consider using longdesc instead',
          suggestion: 'Move detailed description to aria-describedby or a long description link',
        })
      }

      const badPatterns = [
        { pattern: /^image of/i, msg: 'Avoid starting with "Image of"' },
        { pattern: /^picture of/i, msg: 'Avoid starting with "Picture of"' },
        { pattern: /^photo of/i, msg: 'Avoid starting with "Photo of"' },
        { pattern: /^graphic of/i, msg: 'Avoid starting with "Graphic of"' },
        { pattern: /\bclick here\b/i, msg: 'Avoid "click here" in alt text' },
        { pattern: /^$/i, msg: 'Alt text is empty' },
      ]

      for (const { pattern, msg } of badPatterns) {
        if (pattern.test(alt)) {
          issues.push({
            severity: 'warning',
            message: msg,
            suggestion: 'Remove the phrase and describe the image directly',
          })
        }
      }

      if (alt === alt.toUpperCase()) {
        issues.push({
          severity: 'warning',
          message: 'Alt text is in all caps, which may be read as acronyms by screen readers',
          suggestion: 'Use normal capitalization instead',
        })
      }
    }
  }

  return issues
}
```

## Icon and SVG Accessibility

```typescript
interface AccessibleIconProps {
  icon: React.ReactNode
  label?: string
  size?: number
  className?: string
  onClick?: () => void
}

function AccessibleIcon({ icon, label, size = 24, className, onClick }: AccessibleIconProps) {
  const isButton = !!onClick
  const Component = isButton ? 'button' : 'span'

  return (
    <Component
      className={`inline-flex items-center justify-center ${className ?? ''}`}
      onClick={onClick}
      role={isButton ? 'button' : 'img'}
      aria-label={label}
      tabIndex={isButton ? 0 : undefined}
      style={{ width: size, height: size }}
    >
      {icon}
    </Component>
  )
}

function AccessibleSvg({
  children,
  label,
  size = 24,
  className,
}: {
  children: React.ReactNode
  label: string
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      role="img"
      aria-label={label}
      focusable="false"
    >
      {children}
    </svg>
  )
}
```

## Background Image Accessibility

```typescript
interface AccessibleBackgroundProps {
  className?: string
  backgroundImage?: string
  children: React.ReactNode
  decorative?: boolean
  label?: string
}

function AccessibleBackground({
  className,
  backgroundImage,
  children,
  decorative = false,
  label,
}: AccessibleBackgroundProps) {
  return (
    <div
      className={className}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : label}
    >
      {children}
    </div>
  )
}
```

## Lazy Loading Accessibility

```typescript
function useAccessibleLazyLoad(
  imageRef: RefObject<HTMLImageElement>,
  onLoad?: () => void
) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const img = imageRef.current
    if (!img) return

    const handleLoad = () => {
      setIsLoaded(true)
      onLoad?.()
    }

    const handleError = () => {
      setError('Failed to load image')
      setIsLoaded(true)
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)

    if (img.complete) {
      setIsLoaded(true)
    }

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [src])

  return { isLoaded, error }
}

function LazyAccessibleImage({ src, alt, fallbackText = 'Image failed to load' }: {
  src: string
  alt: string
  fallbackText?: string
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const { isLoaded, error } = useAccessibleLazyLoad(imgRef)

  return (
    <div className="relative" role="img" aria-label={alt}>
      {!isLoaded && !error && (
        <div className="animate-pulse bg-gray-200 rounded" style={{ aspectRatio: '16/9' }} />
      )}
      <img
        ref={imgRef}
        src={src}
        alt=""
        loading="lazy"
        className={`w-full ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
      />
      {error && (
        <div role="alert" className="text-red-500 text-sm mt-1">
          {fallbackText}
        </div>
      )}
    </div>
  )
}
```

## Image Map Accessibility

```typescript
interface AccessibleImageMapProps {
  src: string
  alt: string
  areas: Array<{
    shape: 'rect' | 'circle' | 'poly'
    coords: number[]
    href: string
    alt: string
    title?: string
  }>
}

function AccessibleImageMap({ src, alt, areas }: AccessibleImageMapProps) {
  const mapId = `map-${src.replace(/[^a-zA-Z0-9]/g, '-')}`

  return (
    <>
      <img
        src={src}
        alt={alt}
        useMap={`#${mapId}`}
        className="max-w-full"
        usemap={`#${mapId}`}
      />
      <map name={mapId} id={mapId}>
        {areas.map((area, index) => (
          <area
            key={index}
            shape={area.shape}
            coords={area.coords.join(',')}
            href={area.href}
            alt={area.alt}
            title={area.title}
          />
        ))}
      </map>
    </>
  )
}
```

## Key Points

- Always provide meaningful alt text for informative images
- Use empty alt text (alt="") for decorative images
- Avoid redundant phrases like "image of" or "picture of"
- Keep alt text under 250 characters
- Use long descriptions via aria-describedby for complex images
- Provide captions and context with figure and figcaption
- Ensure icons and SVGs have accessible labels
- Use role="presentation" for decorative background images
- Announce image loading errors to screen readers
- Validate alt text quality programmatically in CI/CD
- Include proper ARIA roles for interactive images
- Maintain adequate color contrast in images containing text
