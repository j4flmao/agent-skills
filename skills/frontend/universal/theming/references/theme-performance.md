# Theme Performance

## CSS Variable Lookup Optimization

```typescript
function getThemeProperty(varName: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
}

const themePropertyCache = new Map<string, string>()

function getCachedThemeProperty(varName: string): string {
  if (themePropertyCache.has(varName)) {
    return themePropertyCache.get(varName)!
  }

  const value = getThemeProperty(varName)
  themePropertyCache.set(varName, value)
  return value
}

function invalidateThemeCache(): void {
  themePropertyCache.clear()
}
```

## Theme Switch Performance

```typescript
interface ThemeSwitchMetrics {
  duration: number
  repaintCount: number
  layoutShiftCount: number
}

async function measureThemeSwitch(from: string, to: string): Promise<ThemeSwitchMetrics> {
  return new Promise((resolve) => {
    let repaintCount = 0
    let layoutShiftCount = 0
    const startTime = performance.now()

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift') {
          const shift = entry as LayoutShift
          if (shift.value > 0) layoutShiftCount++
        }
      }
    })
    observer.observe({ type: 'layout-shift', buffered: false })

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const duration = performance.now() - startTime
        observer.disconnect()

        resolve({
          duration,
          repaintCount,
          layoutShiftCount,
        })
      })
    })

    document.documentElement.classList.remove(from)
    document.documentElement.classList.add(to)
  })
}
```

## Reduced Motion Support

```typescript
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(reducedMotionQuery.matches)

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    reducedMotionQuery.addEventListener('change', handler)
    return () => reducedMotionQuery.removeEventListener('change', handler)
  }, [])

  return reduced
}

function ThemeTransition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reducedMotion = useReducedMotion()

  return (
    <div
      className={className}
      style={{
        transition: reducedMotion
          ? 'none'
          : 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {children}
    </div>
  )
}
```

## CSS Containment

```css
/* theme-container.css */
.theme-aware-section {
  contain: style;
}

.theme-isolated-component {
  contain: layout style;
}

.theme-root {
  contain: style;
}

/* Prevent theme changes from cascading through the entire tree */
@layer theme {
  :root,
  [data-theme] {
    --color-bg: initial;
    --color-text: initial;
    contain: style;
  }
}
```

## Batch DOM Updates

```typescript
function batchThemeUpdate(theme: Record<string, string>): void {
  const root = document.documentElement

  requestAnimationFrame(() => {
    const entries = Object.entries(theme)
    for (const [key, value] of entries) {
      root.style.setProperty(key, value)
    }
  })
}

class ThemeBatchUpdater {
  private pending: Record<string, string> = {}
  private scheduled = false

  setProperty(key: string, value: string): void {
    this.pending[key] = value
    this.schedule()
  }

  private schedule(): void {
    if (this.scheduled) return
    this.scheduled = true

    requestAnimationFrame(() => {
      const root = document.documentElement
      for (const [key, value] of Object.entries(this.pending)) {
        root.style.setProperty(key, value)
      }
      this.pending = {}
      this.scheduled = false
    })
  }
}
```

## Style Recalculation Minimization

```typescript
function measureStyleRecalculation(): Promise<number> {
  return new Promise((resolve) => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'UpdateLayoutTree') {
          resolve(entry.duration)
        }
      }
      observer.disconnect()
    })

    observer.observe({ entryTypes: ['measure'] })

    performance.mark('style-start')
    requestAnimationFrame(() => {
      performance.mark('style-end')
      performance.measure('UpdateLayoutTree', 'style-start', 'style-end')
    })
  })
}

async function optimizeStyleRecalculation(): Promise<void> {
  const duration = await measureStyleRecalculation()

  if (duration > 50) {
    console.warn(`Style recalculation taking ${duration.toFixed(2)}ms`)
    console.warn('Consider:')
    console.warn('- Reducing CSS selector complexity')
    console.warn('- Using CSS containment')
    console.warn('- Batching DOM updates')
    console.warn('- Avoiding inline style changes')
  }
}
```

## Preconnect for Theme Assets

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

## Critical Theme CSS Extraction

```typescript
function extractCriticalThemeCSS(): string {
  const lightTheme = `
    :root {
      --color-bg: #ffffff;
      --color-text: #1a1a1a;
      --color-primary: #2563eb;
      --color-surface: #f8fafc;
    }
  `

  const darkTheme = `
    [data-theme="dark"] {
      --color-bg: #0f172a;
      --color-text: #e2e8f0;
      --color-primary: #3b82f6;
      --color-surface: #1e293b;
    }
  `

  const antiFlicker = `
    html { display: none; }
    html.light, html.dark { display: block; }
  `

  return `${antiFlicker}\n${lightTheme}\n${darkTheme}`
}

function injectCriticalCSS(): void {
  const style = document.createElement('style')
  style.textContent = extractCriticalThemeCSS()
  document.head.insertBefore(style, document.head.firstChild)
}
```

## Performance Budgets

```typescript
interface ThemePerformanceBudget {
  switchDuration: number
  styleRecalculation: number
  layoutShift: number
  cssSize: number
}

const THEME_BUDGETS: Record<string, ThemePerformanceBudget> = {
  light: {
    switchDuration: 100,
    styleRecalculation: 50,
    layoutShift: 0.1,
    cssSize: 50000,
  },
  dark: {
    switchDuration: 100,
    styleRecalculation: 50,
    layoutShift: 0.1,
    cssSize: 50000,
  },
}

async function auditThemePerformance(theme: string): Promise<string[]> {
  const violations: string[] = []
  const budget = THEME_BUDGETS[theme]

  const switchMetrics = await measureThemeSwitch('light', theme)
  if (switchMetrics.duration > budget.switchDuration) {
    violations.push(
      `Theme switch took ${switchMetrics.duration.toFixed(2)}ms ` +
      `(budget: ${budget.switchDuration}ms)`
    )
  }

  return violations
}
```

## Key Points

- Cache CSS variable lookups to avoid repeated getComputedStyle calls
- Batch theme property updates within requestAnimationFrame
- Use CSS containment to limit style recalculation scope
- Implement prefers-reduced-motion support for accessibility
- Preconnect to font and asset origins used in themes
- Extract critical theme CSS and inline it in the head
- Measure theme switch performance and layout shift
- Set performance budgets for theme-related operations
- Avoid layout-triggering properties in theme transitions
- Use CSS custom properties instead of preprocessor variables for runtime theming
- Minimize repaint areas during theme switches
- Profile style recalculation cost and optimize selectors
