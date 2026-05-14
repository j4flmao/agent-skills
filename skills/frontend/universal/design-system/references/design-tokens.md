# Design Tokens

## Token Hierarchy

### Primitive Tokens (raw values)
```json
{
  "color-blue-500": "#3B82F6",
  "color-gray-100": "#F3F4F6",
  "space-4": "4px",
  "font-size-sm": "14px",
  "font-size-base": "16px",
  "border-radius-sm": "4px"
}
```

### Semantic Tokens (context)
```json
{
  "color-primary": "{color-blue-500}",
  "color-surface": "{color-gray-100}",
  "spacing-inset-sm": "{space-4}",
  "font-body": "{font-size-base}",
  "radius-button": "{border-radius-sm}"
}
```

### Component Tokens (scoped)
```json
{
  "button-bg": "{color-primary}",
  "button-padding": "{spacing-inset-sm} 16px",
  "button-font": "{font-body}",
  "button-radius": "{radius-button}"
}
```

## Usage
```css
/* CSS custom properties */
:root {
  --color-primary: #3B82F6;
  --color-surface: #F3F4F6;
  --spacing-sm: 4px;
}

.btn {
  background: var(--color-primary);
  padding: var(--spacing-sm) 16px;
}
```

```typescript
// TypeScript
const tokens = {
  color: { primary: '#3B82F6', surface: '#F3F4F6' },
  spacing: { sm: 4, md: 8, lg: 16 },
} as const
```

## Naming Convention
```
{category}-{property}-{variant}-{state}
color-bg-primary-hover
space-padding-md
font-size-body-lg
border-radius-button
```
