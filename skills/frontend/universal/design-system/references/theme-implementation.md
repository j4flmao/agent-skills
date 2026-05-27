# Theme Implementation

## CSS Custom Properties Theme

```css
:root {
  --token-color-primary: #3b82f6;
  --token-color-primary-hover: #2563eb;
  --token-color-secondary: #8b5cf6;
  --token-color-surface: #ffffff;
  --token-color-surface-secondary: #f9fafb;
  --token-color-background: #ffffff;
  --token-color-text-primary: #111827;
  --token-color-text-secondary: #6b7280;
  --token-color-border: #e5e7eb;
  --token-color-success: #10b981;
  --token-color-warning: #f59e0b;
  --token-color-error: #ef4444;
  --token-radius-sm: 0.25rem;
  --token-radius-md: 0.5rem;
  --token-radius-lg: 1rem;
  --token-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --token-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --token-font-family: 'Inter', system-ui, sans-serif;
  --token-font-size-sm: 0.875rem;
  --token-font-size-base: 1rem;
  --token-font-size-lg: 1.25rem;
}

[data-theme="dark"] {
  --token-color-primary: #60a5fa;
  --token-color-primary-hover: #3b82f6;
  --token-color-secondary: #a78bfa;
  --token-color-surface: #1f2937;
  --token-color-surface-secondary: #374151;
  --token-color-background: #111827;
  --token-color-text-primary: #f9fafb;
  --token-color-text-secondary: #9ca3af;
  --token-color-border: #4b5563;
  --token-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --token-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
}
```

## Theme Provider

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function ThemeProvider({ children, defaultTheme = 'system' }: {
  children: React.ReactNode
  defaultTheme?: 'light' | 'dark' | 'system'
}) {
  const [theme, setTheme] = useState(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateTheme = () => {
      const resolved = theme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : theme
      setResolvedTheme(resolved)
      document.documentElement.setAttribute('data-theme', resolved)
    }

    updateTheme()
    mediaQuery.addEventListener('change', updateTheme)
    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

## Semantic Token Mapping

```typescript
interface SemanticTokens {
  background: {
    primary: string
    secondary: string
    tertiary: string
  }
  text: {
    primary: string
    secondary: string
    disabled: string
    inverse: string
  }
  border: {
    default: string
    hover: string
    focus: string
  }
  interactive: {
    primary: string
    primaryHover: string
    secondary: string
    ghost: string
  }
  status: {
    success: { bg: string; text: string; border: string }
    warning: { bg: string; text: string; border: string }
    error: { bg: string; text: string; border: string }
    info: { bg: string; text: string; border: string }
  }
}

const lightTokens: SemanticTokens = {
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    disabled: '#d1d5db',
    inverse: '#ffffff',
  },
  border: {
    default: '#e5e7eb',
    hover: '#d1d5db',
    focus: '#3b82f6',
  },
  interactive: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    secondary: '#8b5cf6',
    ghost: 'transparent',
  },
  status: {
    success: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    warning: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    error: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    info: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  },
}
```

## Key Points

- Define theme tokens as CSS custom properties for runtime switching
- Create a ThemeProvider with context for React apps
- Support light, dark, and system preference modes
- Map raw tokens to semantic usage categories
- Persist theme preference in local storage
- Prevent flash of wrong theme with inline script
- Use CSS logical properties for theme-independence
- Test themes across all components with visual regression
- Document color contrast ratios for accessibility
- Support high-contrast mode for accessibility
- Use CSS layers for organized theme overrides
- Create themed component variants consistently
