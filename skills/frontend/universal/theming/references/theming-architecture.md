# Theming Architecture

## Theme Layer Architecture

```
┌──────────────────────────────────────────┐
│           Design Tokens                  │
│  (primitive values: colors, spacing, etc)│
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│           Theme Definitions               │
│  :root (light)  │  [data-theme="dark"]   │
│  --color-bg: #fff│  --color-bg: #111     │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│        Component Styles                  │
│  background: var(--color-bg)            │
│  color: var(--color-text)               │
└──────────────────────────────────────────┘
```

## Token Categories

```css
:root {
  /* Colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-brand: #2563eb;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;

  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-8: 2rem;

  /* Typography */
  --font-family: Inter, system-ui, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
  --line-height-normal: 1.5;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

  /* Radii */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
}
```

## Dark Theme

```css
[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border: #334155;
  --color-brand: #3b82f6;
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error: #ef4444;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.5);
}
```

## Theme Switching Logic

```typescript
type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  resolved: 'light' | 'dark'  // actual applied theme
  preferred: Theme             // user preference
}

function useTheme(): ThemeState & { setTheme: (t: Theme) => void } {
  const [preferred, setPreferred] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    return stored ?? 'system'
  })

  const resolved = useMemo(() => {
    if (preferred === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return preferred
  }, [preferred])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
    localStorage.setItem('theme', preferred)
  }, [resolved, preferred])

  // Listen for system theme changes
  useEffect(() => {
    if (preferred !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preferred])

  return { resolved, preferred, setTheme: setPreferred }
}
```

## Anti-Flicker Script

```html
<!-- Place in <head> before any CSS loads -->
<script>
  (function() {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

## Theme Provider (React)

```tsx
const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  isDark: boolean
} | null>(null)

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolved, preferred, setTheme } = useTheme()

  return (
    <ThemeContext.Provider value={{
      theme: preferred,
      setTheme,
      isDark: resolved === 'dark',
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('ThemeProvider missing')
  return ctx
}
```

## Theme Toggle Component

```tsx
function ThemeToggle() {
  const { theme, setTheme, isDark } = useThemeContext()

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  return (
    <button onClick={cycleTheme} aria-label={`Current theme: ${theme}. Click to change.`}>
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}
```

## Multi-Theme Support (Brands)

```css
[data-theme="dark"][data-brand="acme"] {
  --color-brand: #7c3aed;
  --color-bg-primary: #0f172a;
}

[data-theme="light"][data-brand="acme"] {
  --color-brand: #6d28d9;
  --color-bg-primary: #ffffff;
}

[data-theme="dark"][data-brand="beta"] {
  --color-brand: #0891b2;
  --color-bg-primary: #1c1917;
}
```

## Theming Decision Tree

```
Theming requirement?
├── Light only → No theme system needed (use static colors)
├── Light + Dark
│   ├── CSS only → :root + [data-theme] + media query
│   └── With toggle → Add theme provider + persistence
├── Light + Dark + System
│   └── Add prefers-color-scheme detection + anti-flicker
├── Multi-brand + Light/Dark
│   └── Compound selectors [data-theme][data-brand]
└── Custom themes (user-defined)
    └── Generated CSS variables at runtime
```
