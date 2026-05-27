# Form Accessibility

## ARIA Labeling and Descriptions

```typescript
interface AccessibleFieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  helpText?: string
  placeholder?: string
}

function AccessibleField({
  id,
  label,
  required,
  error,
  helpText,
  placeholder,
}: AccessibleFieldProps) {
  const errorId = `${id}-error`
  const helpId = `${id}-help`

  return (
    <div className="form-field" role="group">
      <label
        htmlFor={id}
        className="form-field__label block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-500 ml-1">*</span>
        )}
      </label>
      {helpText && (
        <p id={helpId} className="form-field__help text-xs text-gray-500 mb-1">
          {helpText}
        </p>
      )}
      <input
        id={id}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[
          error ? errorId : null,
          helpText ? helpId : null,
        ].filter(Boolean).join(' ') || undefined}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
          focus:outline-none focus:ring-2`}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="form-field__error text-sm text-red-600 mt-1"
        >
          {error}
        </p>
      )}
    </div>
  )
}
```

## Error Announcement with Live Region

```typescript
function FormErrorAnnouncer({ errors }: { errors: Record<string, string[]> }) {
  const errorCount = Object.values(errors).flat().length
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (errorCount > 0) {
      const messages = Object.entries(errors)
        .flatMap(([field, msgs]) => msgs.map(m => `${field}: ${m}`))
        .join(', ')
      setAnnouncement(`${errorCount} error${errorCount > 1 ? 's' : ''}: ${messages}`)
    } else {
      setAnnouncement('')
    }
  }, [errors])

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}
```

## Focus Management on Validation

```typescript
function useFormFocus(errors: Record<string, string[]>, formRef: RefObject<HTMLFormElement>) {
  const firstErrorField = useRef<string | null>(null)

  useEffect(() => {
    const errorFields = Object.keys(errors).filter(k => errors[k].length > 0)
    if (errorFields.length === 0) {
      firstErrorField.current = null
      return
    }

    const firstField = errorFields[0]
    if (firstField !== firstErrorField.current) {
      firstErrorField.current = firstField
      const element = formRef.current?.querySelector<HTMLElement>(
        `[name="${firstField}"], #${firstField}`
      )
      element?.focus()

      const errorMessage = errors[firstField][0]
      if (errorMessage && element) {
        announceError(firstField, errorMessage)
      }
    }
  }, [errors])
}

function announceError(field: string, message: string): void {
  const announcer = document.getElementById('form-error-announcer')
  if (announcer) {
    announcer.textContent = `${field}: ${message}`
  }
}
```

## Keyboard Navigation

```typescript
function FormKeyboardNav({ children }: { children: React.ReactNode }) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      const form = e.target.form
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input, select, textarea'))
        const currentIndex = inputs.indexOf(e.target)
        if (currentIndex === inputs.length - 1) {
          return
        }
        if (e.target.type !== 'textarea') {
          e.preventDefault()
          const nextInput = inputs[currentIndex + 1] as HTMLElement
          nextInput?.focus()
        }
      }
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}
```

## Fieldset and Legend Grouping

```typescript
interface FieldGroupProps {
  legend: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function FieldGroup({ legend, required, error, children }: FieldGroupProps) {
  const errorId = `${legend.toLowerCase().replace(/\s+/g, '-')}-error`

  return (
    <fieldset
      className="form-group border border-gray-200 rounded-lg p-4 mb-4"
      aria-invalid={!!error}
    >
      <legend className="form-group__legend font-medium text-gray-700 px-1">
        {legend}
        {required && (
          <span aria-hidden="true" className="text-red-500 ml-1">*</span>
        )}
      </legend>
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
    </fieldset>
  )
}
```

## Radio and Checkbox Group Accessibility

```typescript
interface RadioGroupProps {
  name: string
  legend: string
  options: { value: string; label: string; description?: string }[]
  value?: string
  onChange?: (value: string) => void
  error?: string
}

function AccessibleRadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps) {
  const errorId = `${name}-error`

  return (
    <fieldset
      className="radio-group mb-4"
      aria-invalid={!!error}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="font-medium text-gray-700 mb-2">{legend}</legend>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
              className="mt-1"
            />
            <div>
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <p className="text-sm text-gray-500">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
    </fieldset>
  )
}
```

## Progress Indicator for Multi-Step Forms

```typescript
interface FormProgressProps {
  steps: string[]
  currentStep: number
  errors: Record<number, string[]>
}

function FormProgressIndicator({ steps, currentStep, errors }: FormProgressProps) {
  return (
    <nav aria-label="Form progress" className="mb-6">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const hasErrors = errors[index]?.length > 0

          return (
            <li key={step} className="flex items-center gap-2">
              <span
                role="step"
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step}${hasErrors ? ' (has errors)' : ''}`}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isComplete ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-300' : ''}
                  ${!isComplete && !isCurrent ? 'bg-gray-200 text-gray-500' : ''}
                  ${hasErrors && isCurrent ? 'bg-red-500 text-white' : ''}`}
              >
                {isComplete ? '✓' : index + 1}
              </span>
              <span className={`text-sm ${isCurrent ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                {step}
              </span>
              {index < steps.length - 1 && (
                <span className="text-gray-300 mx-1" aria-hidden="true">—</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

## Screen Reader Only Utilities

```typescript
const srOnly = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`

function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only" style={srOnly}>
      {children}
    </span>
  )
}

function LoadingIndicator({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2">
      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
    </div>
  )
}
```

## Validation Announcements

```typescript
function useLiveValidation(
  validationState: Record<string, { isValid: boolean; message?: string }>
): void {
  const previousValidState = useRef(validationState)

  useEffect(() => {
    for (const [field, state] of Object.entries(validationState)) {
      const prev = previousValidState.current[field]
      if (prev?.isValid !== state.isValid && !state.isValid && state.message) {
        announceError(field, state.message)
      }
    }
    previousValidState.current = validationState
  }, [validationState])
}

function SubmitButton({
  isSubmitting,
  disabled,
  children,
}: {
  isSubmitting: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={disabled || isSubmitting}
      aria-busy={isSubmitting}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:bg-blue-700 transition-colors"
    >
      {isSubmitting ? (
        <>
          <span className="sr-only">Submitting...</span>
          <span aria-hidden="true">Submitting...</span>
        </>
      ) : children}
    </button>
  )
}
```

## Color and Contrast Requirements

```typescript
const ERROR_COLORS = {
  text: '#DC2626',
  background: '#FEF2F2',
  border: '#FCA5A5',
  hover: '#B91C1C',
}

const SUCCESS_COLORS = {
  text: '#16A34A',
  background: '#F0FDF4',
  border: '#86EFAC',
}

function validateColorContrast(foreground: string, background: string): boolean {
  const hexToRgb = (hex: string) => {
    const [r, g, b] = hex.match(/\w\w/g)!.map(x => parseInt(x, 16))
    return { r, g, b }
  }

  const getLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(hexToRgb(foreground))
  const l2 = getLuminance(hexToRgb(background))
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

  return ratio >= 4.5
}
```

## Autocomplete Attributes

```typescript
const AUTOCOMPLETE_MAP: Record<string, string> = {
  firstName: 'given-name',
  lastName: 'family-name',
  email: 'email',
  phone: 'tel',
  address: 'street-address',
  city: 'address-level2',
  state: 'address-level1',
  zipCode: 'postal-code',
  country: 'country-name',
  company: 'organization',
  creditCard: 'cc-number',
  expiry: 'cc-exp',
  cvv: 'cc-csc',
}

function AutocompleteInput({
  name,
  ...props
}: {
  name: keyof typeof AUTOCOMPLETE_MAP
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      name={name}
      autoComplete={AUTOCOMPLETE_MAP[name] ?? 'off'}
    />
  )
}
```

## Key Points

- Always associate labels with inputs using htmlFor/id pairs
- Use aria-invalid, aria-required, and aria-describedby for validation feedback
- Announce form errors to screen readers using live regions
- Focus the first error field on validation failure
- Group related fields with fieldset and legend elements
- Ensure error indicators are not solely color-dependent
- Implement proper keyboard navigation and focus trapping in modals
- Use aria-busy on submit buttons during form submission
- Provide autocomplete attributes for common field types
- Maintain minimum 4.5:1 contrast ratio for error text
- Include screen-reader-only text for visual-only indicators
- Announce loading states and progress in multi-step forms
