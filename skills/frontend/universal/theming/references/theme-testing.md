# Theme Testing

## Theme Switch Test

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Theme Switching', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('defaults to system preference', () => {
    const matchMedia = window.matchMedia as jest.Mock
    matchMedia.mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    render(<ThemeProvider><App /></ThemeProvider>)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles theme on button click', async () => {
    const user = userEvent.setup()
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)

    const toggle = screen.getByRole('button', { name: /toggle theme/i })
    expect(document.documentElement.classList.contains('light')).toBe(true)

    await user.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists theme choice in localStorage', async () => {
    const user = userEvent.setup()
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>)

    const toggle = screen.getByRole('button', { name: /toggle theme/i })
    await user.click(toggle)

    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('respects persisted theme on mount', () => {
    localStorage.setItem('theme', 'dark')
    render(<ThemeProvider><App /></ThemeProvider>)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
```

## CSS Variable Verification

```typescript
describe('CSS Custom Properties', () => {
  const THEME_VARIABLES = {
    light: {
      '--color-bg': '#ffffff',
      '--color-text': '#1a1a1a',
      '--color-primary': '#2563eb',
      '--color-secondary': '#64748b',
      '--color-border': '#e2e8f0',
      '--color-surface': '#f8fafc',
      '--font-size-base': '16px',
      '--spacing-unit': '8px',
    },
    dark: {
      '--color-bg': '#0f172a',
      '--color-text': '#e2e8f0',
      '--color-primary': '#3b82f6',
      '--color-secondary': '#94a3b8',
      '--color-border': '#334155',
      '--color-surface': '#1e293b',
      '--font-size-base': '16px',
      '--spacing-unit': '8px',
    },
  }

  it.each(['light', 'dark'])('defines all variables for %s theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    const root = document.documentElement
    const computed = getComputedStyle(root)

    for (const [varName, expectedValue] of Object.entries(THEME_VARIABLES[theme])) {
      const actualValue = computed.getPropertyValue(varName).trim()
      expect(actualValue).toBe(expectedValue)
    }
  })

  it('switches all variables correctly', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    const lightBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg').trim()

    document.documentElement.setAttribute('data-theme', 'dark')
    const darkBg = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg').trim()

    expect(lightBg).not.toBe(darkBg)
  })

  it('has no undefined variable references', () => {
    const elements = document.querySelectorAll('*')
    const undefinedRefs: string[] = []

    elements.forEach(el => {
      const style = getComputedStyle(el)
      for (let i = 0; i < style.length; i++) {
        const prop = style[i]
        const value = style.getPropertyValue(prop)
        const refs = value.match(/var\(--[\w-]+\)/g) || []

        refs.forEach(ref => {
          const varName = ref.replace('var(', '').replace(')', '')
          const varValue = style.getPropertyValue(varName)
          if (!varValue) {
            undefinedRefs.push(`${el.tagName}: ${ref}`)
          }
        })
      }
    })

    expect(undefinedRefs).toEqual([])
  })
})
```

## Anti-Flicker Test

```typescript
describe('Theme Anti-Flicker', () => {
  it('injects theme class before first paint', () => {
    const script = document.createElement('script')
    script.textContent = `
      (function() {
        var theme = localStorage.getItem('theme');
        if (!theme) {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark' : 'light';
        }
        document.documentElement.classList.add(theme);
        document.documentElement.style.display = 'block';
      })();
    `

    document.head.appendChild(script)
    const classes = document.documentElement.classList
    expect(classes.contains('dark') || classes.contains('light')).toBe(true)
  })

  it('prevents flash of wrong theme', () => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')

    // Simulate page load
    window.dispatchEvent(new Event('DOMContentLoaded'))

    // Verify no transition from light to dark
    const mutations: string[] = []
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.attributeName === 'class') {
          mutations.push(m.target.className)
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })

    expect(mutations.length).toBe(0)
    observer.disconnect()
  })
})
```

## Component Theme Snapshots

```typescript
describe('Component Theme Snapshots', () => {
  it.each(['light', 'dark'] as const)('renders Button in %s theme', (theme) => {
    const { container } = render(
      <ThemeProvider initialTheme={theme}>
        <Button variant="primary">Click Me</Button>
      </ThemeProvider>
    )

    expect(container.firstChild).toMatchSnapshot()
  })

  it('renders components with correct theme tokens', () => {
    const { getByText } = render(
      <ThemeProvider initialTheme="light">
        <Card>
          <Heading>Title</Heading>
          <Text>Content</Text>
        </Card>
      </ThemeProvider>
    )

    const card = getByText('Title').closest('[class*="card"]')
    const styles = getComputedStyle(card!)

    expect(styles.backgroundColor).toBe('var(--color-surface)')
    expect(styles.borderColor).toBe('var(--color-border)')
  })
})
```

## Theme API Integration Test

```typescript
describe('Theme Provider', () => {
  it('provides theme context to children', () => {
    let contextValue: ThemeContext

    render(
      <ThemeProvider>
        <ThemeConsumer>
          {(value) => {
            contextValue = value
            return null
          }}
        </ThemeConsumer>
      </ThemeProvider>
    )

    expect(contextValue!.theme).toBeDefined()
    expect(contextValue!.toggleTheme).toBeDefined()
    expect(contextValue!.setTheme).toBeDefined()
  })

  it('allows setting theme directly', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeControls />
      </ThemeProvider>
    )

    const darkButton = screen.getByText('Dark Mode')
    await user.click(darkButton)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
```

## Media Query Simulation

```typescript
function simulateColorScheme(scheme: 'light' | 'dark') {
  const eventListenerMap: Record<string, Set<EventListener>> = {}

  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query === `(prefers-color-scheme: ${scheme})`,
    media: query,
    addEventListener: (type: string, listener: EventListener) => {
      if (!eventListenerMap[type]) eventListenerMap[type] = new Set()
      eventListenerMap[type].add(listener)
    },
    removeEventListener: (type: string, listener: EventListener) => {
      eventListenerMap[type]?.delete(listener)
    },
  }))

  return {
    changeScheme: (newScheme: 'light' | 'dark') => {
      const event = new Event('change')
      eventListenerMap['change']?.forEach(fn => fn(event))
    },
  }
}
```

## Accessibility Contrast Test

```typescript
function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (hex: string) => {
    const rgb = hex.match(/[A-Fa-f0-9]{2}/g)!.map(c => {
      const val = parseInt(c, 16) / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  }

  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  return ratio
}

describe('Theme Contrast', () => {
  it.each(['light', 'dark'])('meets AA contrast requirements in %s theme', (theme) => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    const styles = getComputedStyle(root)

    const textColor = styles.getPropertyValue('--color-text').trim()
    const bgColor = styles.getPropertyValue('--color-bg').trim()
    const ratio = getContrastRatio(textColor, bgColor)

    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})
```

## Key Points

- Test theme switching toggles CSS classes correctly
- Verify all CSS custom properties are defined for each theme
- Validate theme persistence via localStorage
- Test anti-flicker script prevents flash of unstyled content
- Use snapshot tests to catch unintended visual changes
- Verify contrast ratios meet WCAG AA standards in all themes
- Test system preference detection and override behavior
- Validate no undefined CSS variable references exist
- Test theme context API provides correct values
- Simulate media query changes for dynamic theme switching
- Verify CSS variable transitions between themes are smooth
