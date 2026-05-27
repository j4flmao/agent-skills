# Component Architecture

## Component Composition

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors'
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="mr-2" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  )
}
```

## Compound Components

```typescript
interface SelectContextType {
  value: string | string[]
  onChange: (value: string | string[]) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  multiple?: boolean
}

const SelectContext = createContext<SelectContextType | null>(null)

function useSelectContext(): SelectContextType {
  const context = useContext(SelectContext)
  if (!context) {
    throw new Error('Select compound components must be used within Select')
  }
  return context
}

function Select({ children, value, onChange, multiple }: {
  children: React.ReactNode
  value: string | string[]
  onChange: (value: string | string[]) => void
  multiple?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <SelectContext.Provider value={{ value, onChange, isOpen, setIsOpen, multiple }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ children }: { children: React.ReactNode }) {
  const { setIsOpen } = useSelectContext()
  return (
    <button
      onClick={() => setIsOpen(prev => !prev)}
      className="w-full border rounded-lg p-2"
    >
      {children}
    </button>
  )
}

function SelectContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSelectContext()
  if (!isOpen) return null
  return (
    <div className="absolute z-50 w-full mt-1 border rounded-lg bg-white shadow-lg">
      {children}
    </div>
  )
}

function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: selected, onChange, setIsOpen } = useSelectContext()
  const isSelected = Array.isArray(selected) ? selected.includes(value) : selected === value

  return (
    <div
      className={`p-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
      onClick={() => {
        if (Array.isArray(selected)) {
          onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
        } else {
          onChange(value)
          setIsOpen(false)
        }
      }}
      role="option"
      aria-selected={isSelected}
    >
      {children}
    </div>
  )
}

Select.Trigger = SelectTrigger
Select.Content = SelectContent
Select.Item = SelectItem
```

## Polymorphic Components

```typescript
type PolymorphicProps<
  T extends React.ElementType,
  P = Record<string, never>,
> = {
  as?: T
  children: React.ReactNode
} & P & Omit<React.ComponentPropsWithoutRef<T>, keyof P>

function Box<T extends React.ElementType = 'div'>({
  as,
  children,
  ...props
}: PolymorphicProps<T>) {
  const Component = as || 'div'
  return <Component {...props}>{children}</Component>
}
```

## Component Slots Pattern

```typescript
interface CardSlots {
  image?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
}

function Card({ slots, variant = 'default' }: {
  slots: CardSlots
  variant?: 'default' | 'elevated' | 'bordered'
}) {
  const variantStyles = {
    default: 'bg-white',
    elevated: 'bg-white shadow-md',
    bordered: 'bg-white border border-gray-200',
  }

  return (
    <div className={`rounded-xl p-6 ${variantStyles[variant]}`}>
      {slots.image && <div className="mb-4">{slots.image}</div>}
      <div className="text-lg font-semibold">{slots.title}</div>
      {slots.description && (
        <div className="mt-2 text-gray-600">{slots.description}</div>
      )}
      {slots.actions && <div className="mt-4 flex gap-2">{slots.actions}</div>}
      {slots.footer && (
        <div className="mt-4 pt-4 border-t">{slots.footer}</div>
      )}
    </div>
  )
}
```

## Key Points

- Use composition over inheritance for component design
- Implement compound components with shared context
- Use polymorphic components for flexible element rendering
- Follow the slots pattern for complex component layouts
- Keep components focused on a single responsibility
- Use TypeScript generics for type-safe component APIs
- Provide sensible defaults for all component props
- Forward refs for accessibility and form integration
- Document component APIs with Storybook stories
- Test components in isolation with comprehensive coverage
- Maintain consistent prop naming across components
- Implement proper focus management for interactive components
