# Component API Design

## CVA (Class Variance Authority) Pattern
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const button = cva('inline-flex items-center justify-center font-medium rounded-md', {
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
      ghost: 'text-gray-700 hover:bg-gray-100',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

type ButtonProps = VariantProps<typeof button> & {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function Button({ variant, size, children, ...props }: ButtonProps) {
  return <button className={button({ variant, size })} {...props}>{children}</button>
}
```

## Component API Rules
- Props follow native HTML attribute names where applicable (`disabled`, `required`, `placeholder`)
- Boolean props default to `false`
- `className` prop for custom styling (merge with CVA)
- `children` for content (not string prop for content)
- Event handlers follow `on{Event}` naming

## Slot Pattern
```typescript
interface CardProps {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function Card({ title, description, actions, children }: CardProps) {
  return (
    <div className="rounded-lg border p-6">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {description && <p className="text-sm text-gray-600">{description}</p>}
      {children}
      {actions && <div className="mt-4 flex gap-2">{actions}</div>}
    </div>
  )
}
```
