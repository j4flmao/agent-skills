# Theme Implementation

Per-framework patterns, switching logic, persistence, anti-flicker script, and Tailwind theming.

---

## Anti-Flicker Script

Place in `<head>` before any CSS loads:

```html
<script>
  (function() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

For SSR (Next.js, Nuxt), also set cookie so server can inject the class server-side:

```ts
// Server-side: read cookie, render HTML with correct data-theme
const theme = cookies().get('theme')?.value ?? 'light';
// Set data-theme on <html> during SSR to prevent flash
```

---

## React ThemeProvider

```tsx
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

Components consume via `var(--color-*)` in CSS, not via context. Context is only for the toggle state.

---

## Tailwind CSS Theming

```ts
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
        },
        text: {
          default: 'var(--color-text-default)',
          muted: 'var(--color-text-muted)',
        },
      },
    },
  },
};
```

Usage: `<div className="bg-surface-primary text-text-default dark:bg-surface-secondary">`

Set `darkMode: 'class'` and toggle `.dark` class on `<html>`. Tailwind's `dark:` variant maps to the parent `.dark` class.

---

## Svelte Theming

```svelte
<script>
  import { writable } from 'svelte/store';
  export const theme = writable('light');
  theme.subscribe(value => {
    document.documentElement.setAttribute('data-theme', value);
  });
</script>
```

Use `:global` for theme-dependent styles:
```css
:global([data-theme="dark"]) {
  --color-surface-primary: #1f2937;
}
```

---

## Persistence Detail

| Storage | Purpose | Read by |
|---------|---------|---------|
| `localStorage` | User preference | Client JS |
| Cookie | SSR consistency | Server (SSR) |
| `prefers-color-scheme` | System default | Client CSS/JS |

Priority: localStorage override → cookie (SSR) → system preference → light fallback.

```ts
function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

---

## CSS Transition on Theme Switch

```css
:root {
  color-scheme: light dark;
}

*, *::before, *::after {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none;
  }
}
```

Transition only color properties (background, text, border), not layout properties. Use 200ms duration. Respect reduced motion.
