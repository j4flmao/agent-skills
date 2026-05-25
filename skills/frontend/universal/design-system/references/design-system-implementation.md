# Design System Implementation

## Project Structure

```
design-system/
├── tokens/
│   ├── primitive/
│   │   ├── colors.css
│   │   ├── spacing.css
│   │   ├── typography.css
│   │   └── shadows.css
│   ├── semantic/
│   │   ├── light.css
│   │   └── dark.css
│   └── index.css              /* imports all tokens */
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   └── Card/
│       ├── Card.tsx
│       └── ...
├── hooks/
│   ├── useTheme.ts
│   └── useMediaQuery.ts
├── utils/
│   ├── cn.ts                  /* classnames helper */
│   └── cva.ts                 /* variant configs */
└── index.ts                   /* public API */
```

## Component API Design Rules

```typescript
interface ComponentAPI {
  // 1. Props: max 10 (excluding className/style/children)
  // 2. Variants: use CVA, not boolean flags
  // 3. Composition: prefer children over config props
  // 4. Escape hatch: always include className
  // 5. Ref forwarding: use forwardRef for interactive elements
  // 6. Display name: set Component.displayName for debugging
}

// ✅ Good API
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  className?: string
  onClick?: () => void
}

// ❌ Bad API (too many booleans)
interface ButtonProps {
  primary?: boolean
  secondary?: boolean
  small?: boolean
  large?: boolean
  disabled?: boolean
  loading?: boolean
  outline?: boolean
  rounded?: boolean
  fullWidth?: boolean
  // ... keeps growing
}
```

## CVA (Class Variance Authority) Pattern

```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const button = cva(
  // Base styles — always applied
  'inline-flex items-center justify-center font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

type ButtonVariants = VariantProps<typeof button>

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={button({ variant, size, className })} {...props} />
}
```

## Slot Pattern for Polymorphic Components

```typescript
import { Slot } from '@radix-ui/react-slot'

interface ButtonProps extends VariantProps<typeof button> {
  asChild?: boolean
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, variant, size, className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={button({ variant, size, className })} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'
```

## Component Token Strategy

```css
/* Component-level tokens reference semantic tokens */
:root {
  /* Semantic layer */
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;

  /* Component layer */
  --button-bg: var(--color-primary);
  --button-text: var(--color-primary-foreground);
  --button-radius: 0.375rem;
  --button-padding: 0.5rem 1rem;
}

[data-theme="dark"] {
  --color-primary: #3b82f6;
  /* button tokens inherit automatically */
}
```

## Testing Strategy

```typescript
// Unit test: variant renders
it('renders primary variant', () => {
  render(<Button variant="primary">Click</Button>)
  expect(screen.getByRole('button')).toHaveClass('bg-primary')
})

// Accessibility test
it('is accessible', async () => {
  const { container } = render(<Button>Click</Button>)
  expect(await axe(container)).toHaveNoViolations()
})

// Ref forwarding
it('forwards ref', () => {
  const ref = createRef<HTMLButtonElement>()
  render(<Button ref={ref}>Click</Button>)
  expect(ref.current).toBeInstanceOf(HTMLButtonElement)
})
```

## Component Distribution

```typescript
// Package.json configuration
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": ["./dist/styles.css"]
}
```
