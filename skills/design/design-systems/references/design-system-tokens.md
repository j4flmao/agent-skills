# Design System Tokens

## Token Categories

### Color Tokens
```json
{
  "color": {
    "brand": {
      "primary": { "value": "#2563EB", "type": "color" },
      "secondary": { "value": "#7C3AED", "type": "color" },
      "accent": { "value": "#F59E0B", "type": "color" }
    },
    "neutral": {
      "white": { "value": "#FFFFFF", "type": "color" },
      "gray-50": { "value": "#F9FAFB", "type": "color" },
      "gray-100": { "value": "#F3F4F6", "type": "color" },
      "gray-900": { "value": "#111827", "type": "color" }
    },
    "semantic": {
      "success": { "value": "#10B981", "type": "color" },
      "warning": { "value": "#F59E0B", "type": "color" },
      "error": { "value": "#EF4444", "type": "color" },
      "info": { "value": "#3B82F6", "type": "color" }
    }
  }
}
```

### Spacing Tokens
| Token | Value | Use Case |
|-------|-------|----------|
| space-1 | 4px | Micro spacing |
| space-2 | 8px | Tight spacing |
| space-3 | 12px | Default padding |
| space-4 | 16px | Card padding |
| space-6 | 24px | Section spacing |
| space-8 | 32px | Page margins |
| space-12 | 48px | Large gaps |
| space-16 | 64px | Page sections |

### Typography Tokens
```json
{
  "font": {
    "family": {
      "sans": { "value": "Inter, system-ui, sans-serif" },
      "mono": { "value": "JetBrains Mono, monospace" }
    },
    "size": {
      "xs": { "value": "0.75rem" },
      "sm": { "value": "0.875rem" },
      "base": { "value": "1rem" },
      "lg": { "value": "1.125rem" },
      "xl": { "value": "1.25rem" },
      "2xl": { "value": "1.5rem" },
      "3xl": { "value": "1.875rem" },
      "4xl": { "value": "2.25rem" }
    },
    "weight": {
      "normal": { "value": "400" },
      "medium": { "value": "500" },
      "semibold": { "value": "600" },
      "bold": { "value": "700" }
    }
  }
}
```

## Token Naming Convention

### Pattern
```
{category}-{property}-{variant}-{state}
```

### Examples
- `color-background-primary-default`
- `color-text-on-primary-hover`
- `spacing-padding-card`
- `shadow-elevation-low`

## Distribution

### Style Dictionary
```json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "dist/css/",
      "files": [{ "destination": "tokens.css", "format": "css/variables" }]
    },
    "scss": {
      "transformGroup": "scss",
      "buildPath": "dist/scss/",
      "files": [{ "destination": "_tokens.scss", "format": "scss/variables" }]
    },
    "js": {
      "transformGroup": "js",
      "buildPath": "dist/js/",
      "files": [{ "destination": "tokens.js", "format": "javascript/module" }]
    }
  }
}
```

## Theme Support

### Light/Dark Mode
```json
{
  "color": {
    "background": {
      "primary": {
        "value": { "light": "#FFFFFF", "dark": "#1A1A1A" }
      }
    }
  }
}
```

### Token Aliasing
- Base tokens feed into component-specific aliases
- Changes cascade through the system
- One source of truth for design values
- Enables consistent theming across platforms
