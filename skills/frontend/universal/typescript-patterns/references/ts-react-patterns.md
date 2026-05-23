# TypeScript React Patterns

## Generic Component with ForwardRef

```tsx
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'

type InputProps = ComponentPropsWithoutRef<'input'> & {
  label: string
  error?: string
}

export const Input = forwardRef<ElementRef<'input'>, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <label>
      <span>{label}</span>
      <input ref={ref} className={cn('input', error && 'input--error', className)} {...props} />
      {error && <span role="alert">{error}</span>}
    </label>
  )
)
Input.displayName = 'Input'
```

## Polymorphic Component (As Prop)

```tsx
type PolymorphicProps<C extends React.ElementType> = {
  as?: C
  children: React.ReactNode
} & Omit<ComponentPropsWithoutRef<C>, 'as' | 'children'>

function Box<C extends React.ElementType = 'div'>({
  as,
  children,
  ...props
}: PolymorphicProps<C>) {
  const Component = as || 'div'
  return <Component {...props}>{children}</Component>
}

// Usage
<Box as="section" className="hero" />
<Box as="a" href="/">Link</Box>
```

## Generic Hook

```tsx
function useMap<T, U>(items: T[], fn: (item: T) => U): U[] {
  return useMemo(() => items.map(fn), [items, fn])
}
```

## Extract Props from Component

```tsx
type ButtonProps = React.ComponentProps<typeof Button>
type ButtonRef = React.ElementRef<typeof Button>
```

## Event Handler Types

```tsx
type InputChange = React.ChangeEvent<HTMLInputElement>
type FormSubmit = React.FormEvent<HTMLFormElement>
type KeyDown = React.KeyboardEvent<HTMLDivElement>
type MouseClick = React.MouseEvent<HTMLButtonElement>
```

## Discriminated Props Pattern

```tsx
type ButtonProps =
  | { variant: 'link'; href: string; children: React.ReactNode }
  | { variant: 'button'; onClick: () => void; children: React.ReactNode }

function Button(props: ButtonProps) {
  if (props.variant === 'link') return <a href={props.href}>{props.children}</a>
  return <button onClick={props.onClick}>{props.children}</button>
}
```

## Omit and Extend

```tsx
type SelectProps = Omit<ComponentPropsWithoutRef<'select'>, 'onChange'> & {
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}
```

## Const Objects with `as const`

```tsx
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

type Breakpoint = keyof typeof BREAKPOINTS
// "sm" | "md" | "lg" | "xl"
```

## Template Literal Types

```tsx
type Size = 'sm' | 'md' | 'lg'
type Color = 'red' | 'blue' | 'green'

type ClassName = `${Color}-${Size}`
// "red-sm" | "red-md" | "red-lg" | "blue-sm" | ...
```
