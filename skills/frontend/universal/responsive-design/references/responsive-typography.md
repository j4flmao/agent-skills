# Responsive Typography

## Fluid Type Scale

```typescript
// CSS custom properties for fluid typography
const fluidTypeScale = `
  :root {
    --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
    --text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
    --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
    --text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
    --text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
    --text-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);
    --text-3xl: clamp(1.875rem, 1.6rem + 1.375vw, 2.5rem);
    --text-4xl: clamp(2.25rem, 1.9rem + 1.75vw, 3rem);
    --text-5xl: clamp(3rem, 2.5rem + 2.5vw, 4rem);
  }
`

function FluidText({
  as: Component = 'p',
  size = 'base',
  weight,
  className,
  children,
}: {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'div'
  size?: keyof typeof textSizes
  weight?: string
  className?: string
  children: React.ReactNode
}) {
  const textSizes = {
    xs: 'var(--text-xs)',
    sm: 'var(--text-sm)',
    base: 'var(--text-base)',
    lg: 'var(--text-lg)',
    xl: 'var(--text-xl)',
    '2xl': 'var(--text-2xl)',
    '3xl': 'var(--text-3xl)',
    '4xl': 'var(--text-4xl)',
    '5xl': 'var(--text-5xl)',
  }

  return (
    <Component
      className={className}
      style={{
        fontSize: textSizes[size],
        fontWeight: weight,
      }}
    >
      {children}
    </Component>
  )
}
```

## Responsive Heading Hierarchy

```css
/* responsive-headings.css */
h1 {
  font-size: var(--text-4xl);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

h2 {
  font-size: var(--text-3xl);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

h3 {
  font-size: var(--text-2xl);
  line-height: 1.3;
}

h4 {
  font-size: var(--text-xl);
  line-height: 1.4;
}

/* Responsive heading adjustments */
@media (min-width: 768px) {
  h1 { font-size: var(--text-5xl); }
  h2 { font-size: var(--text-4xl); }
  h3 { font-size: var(--text-3xl); }
}

/* Line length constraint for readability */
.prose {
  max-width: 65ch;
}

.prose-wide {
  max-width: 80ch;
}

.prose-narrow {
  max-width: 45ch;
}
```

## Line Height and Spacing

```typescript
interface TypeSpacingConfig {
  lineHeight: {
    tight: number
    normal: number
    relaxed: number
    loose: number
  }
  paragraphSpacing: string
  headingMargin: string
}

const typeSpacing: TypeSpacingConfig = {
  lineHeight: {
    tight: 1.15,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  paragraphSpacing: 'var(--space-y)',
  headingMargin: 'var(--space-lg)',
}

function Paragraph({ children, spacing = 'normal' }: {
  children: React.ReactNode
  spacing?: keyof TypeSpacingConfig['lineHeight']
}) {
  return (
    <p
      className="mb-4"
      style={{ lineHeight: typeSpacing.lineHeight[spacing] }}
    >
      {children}
    </p>
  )
}
```

## Modular Scale Generator

```typescript
function generateModularScale(
  baseSize: number,
  ratio: number,
  steps: number
): Record<string, string> {
  const scale: Record<string, string> = {}

  for (let i = -steps; i <= steps; i++) {
    const size = baseSize * Math.pow(ratio, i)
    const name = i === 0 ? 'base' : i < 0 ? `negative-${Math.abs(i)}` : `step-${i}`
    scale[name] = `${size.toFixed(3)}rem`
  }

  return scale
}

interface TypographyTheme {
  fontFamily: string
  baseSize: number
  scaleRatio: number
  scaleSteps: number
  fontWeights: {
    light: number
    regular: number
    medium: number
    semibold: number
    bold: number
  }
}

function generateTypographyTheme(config: TypographyTheme): Record<string, string> {
  const scale = generateModularScale(config.baseSize, config.scaleRatio, config.scaleSteps)

  return {
    '--font-family': config.fontFamily,
    '--font-light': config.fontWeights.light.toString(),
    '--font-regular': config.fontWeights.regular.toString(),
    '--font-medium': config.fontWeights.medium.toString(),
    '--font-semibold': config.fontWeights.semibold.toString(),
    '--font-bold': config.fontWeights.bold.toString(),
    ...Object.entries(scale).reduce((acc, [key, value]) => {
      acc[`--fs-${key}`] = value
      return acc
    }, {} as Record<string, string>),
  }
}
```

## Responsive Text Component

```typescript
interface ResponsiveTextProps {
  mobile: { size: string; lineHeight?: number }
  tablet?: { size: string; lineHeight?: number }
  desktop?: { size: string; lineHeight?: number }
  children: React.ReactNode
  as?: 'p' | 'span' | 'div'
  className?: string
}

function ResponsiveText({
  mobile,
  tablet,
  desktop,
  children,
  as: Component = 'p',
  className,
}: ResponsiveTextProps) {
  return (
    <Component
      className={className}
      style={{
        fontSize: mobile.size,
        lineHeight: mobile.lineHeight,
        ...(tablet ? {
          [`@media (min-width: 768px)`]: {
            fontSize: tablet.size,
            lineHeight: tablet.lineHeight,
          },
        } : {}),
        ...(desktop ? {
          [`@media (min-width: 1024px)`]: {
            fontSize: desktop.size,
            lineHeight: desktop.lineHeight,
          },
        } : {}),
      }}
    >
      {children}
    </Component>
  )
}
```

## Viewport Unit Based Typography

```typescript
const vwTypeScale = {
  h1: 'clamp(2.5rem, 5vw, 4.5rem)',
  h2: 'clamp(2rem, 4vw, 3.5rem)',
  h3: 'clamp(1.5rem, 3vw, 2.5rem)',
  h4: 'clamp(1.25rem, 2vw, 1.75rem)',
  body: 'clamp(1rem, 1.5vw, 1.125rem)',
  small: 'clamp(0.875rem, 1.25vw, 0.9375rem)',
}

function ViewportSizedText({
  level,
  children,
}: {
  level: keyof typeof vwTypeScale
  children: React.ReactNode
}) {
  const Tag = level.startsWith('h') ? level : 'p'
  return (
    <Tag style={{ fontSize: vwTypeScale[level] }}>
      {children}
    </Tag>
  )
}
```

## Typography Accessibility

```typescript
interface TypeAccessibilityConfig {
  minFontSize: number
  maxLineLength: number
  lineHeight: number
  paragraphSpacing: number
}

const TYPE_ACCESSIBILITY: TypeAccessibilityConfig = {
  minFontSize: 16,
  maxLineLength: 80,
  lineHeight: 1.5,
  paragraphSpacing: 1.5,
}

function AccessibleText({ children, size = 16 }: {
  children: React.ReactNode
  size?: number
}) {
  const adjustedSize = Math.max(size, TYPE_ACCESSIBILITY.minFontSize)

  return (
    <div
      style={{
        fontSize: `${adjustedSize}px`,
        maxWidth: `${TYPE_ACCESSIBILITY.maxLineLength}ch`,
        lineHeight: TYPE_ACCESSIBILITY.lineHeight,
      }}
    >
      {children}
    </div>
  )
}
```

## Key Points

- Use clamp() for fluid type scaling without breakpoints
- Generate modular type scales based on ratios for visual harmony
- Set max-width on text containers for readable line lengths (50-75 characters)
- Adjust heading sizes at breakpoints for balanced hierarchy
- Maintain minimum 16px font size to prevent mobile zoom issues
- Use relative units (rem/em) rather than fixed pixels
- Line height should decrease as font size increases
- Provide sufficient paragraph spacing for scanability
- Ensure heading-letter spacing tightens at larger sizes
- Test typography across all breakpoints and devices
