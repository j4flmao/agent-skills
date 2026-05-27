# Accessible Forms

## Form Structure

```typescript
interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  error?: string
  hint?: string
  autocomplete?: string
}

function AccessibleFormField({ field }: { field: FormField }) {
  const errorId = `${field.id}-error`
  const hintId = `${field.id}-hint`
  const describedBy = [field.error ? errorId : '', field.hint ? hintId : '']
    .filter(Boolean).join(' ')

  return (
    <div className="form-field" role="group">
      <label htmlFor={field.id}>
        {field.label}
        {field.required && <span aria-hidden="true">*</span>}
      </label>
      {field.hint && (
        <p id={hintId} className="hint-text">{field.hint}</p>
      )}
      <input
        id={field.id}
        type={field.type}
        required={field.required}
        aria-required={field.required}
        aria-describedby={describedBy || undefined}
        aria-invalid={!!field.error}
        autoComplete={field.autocomplete}
      />
      {field.error && (
        <p id={errorId} className="error-text" role="alert">
          {field.error}
        </p>
      )}
    </div>
  )
}
```

## Error Handling

```typescript
interface FormErrors {
  [field: string]: string
}

function FormErrorSummary({ errors }: { errors: FormErrors }) {
  const errorKeys = Object.keys(errors)
  if (errorKeys.length === 0) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className="error-summary"
      ref={el => el?.focus()}
    >
      <h2>There are {errorKeys.length} errors:</h2>
      <ul>
        {errorKeys.map(key => (
          <li key={key}>
            <a href={`#${key}`}>{errors[key]}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) return 'Email is required'
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return null
}
```

## Multi-Step Forms

```typescript
interface Step {
  title: string
  fields: string[]
  isComplete: boolean
}

function StepIndicator({ steps, currentStep }: { steps: Step[]; currentStep: number }) {
  return (
    <nav aria-label="Form progress">
      <ol role="list" className="step-indicator">
        {steps.map((step, i) => {
          const isCurrent = i === currentStep
          const isPast = i < currentStep
          const state = isPast ? 'completed' : isCurrent ? 'current' : 'upcoming'

          return (
            <li key={i} aria-current={isCurrent ? 'step' : undefined}>
              <span className={`step-${state}`}>
                {isPast ? '✓' : i + 1}
                <span className="sr-only">{state} step: </span>
                {step.title}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

## Validation Patterns

```typescript
interface ValidationRule {
  validate: (value: string) => string | null
  message: string
}

const validationRules: Record<string, ValidationRule[]> = {
  email: [
    { validate: v => v ? null : 'Email is required', message: 'Required' },
    { validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email', message: 'Invalid' },
  ],
  phone: [
    { validate: v => v ? null : 'Phone is required', message: 'Required' },
    { validate: v => /^[\d\s\-()+]+$/.test(v) ? null : 'Invalid format', message: 'Invalid' },
  ],
}

function useFieldValidation(field: string, value: string) {
  const rules = validationRules[field]
  if (!rules) return null

  for (const rule of rules) {
    const error = rule.validate(value)
    if (error) return error
  }
  return null
}
```

## Custom Form Controls

```typescript
interface ToggleProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function AccessibleToggle({ id, label, checked, onChange, disabled }: ToggleProps) {
  return (
    <div className="toggle-wrapper">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') onChange(false)
          if (e.key === 'ArrowRight') onChange(true)
        }}
      >
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </button>
      <label htmlFor={id}>{label}</label>
    </div>
  )
}
```

## Key Points

- Associate labels explicitly with form controls using htmlFor and id
- Group related fields with fieldset and legend elements
- Provide clear error summaries with links to invalid fields
- Use aria-describedby for hints and aria-invalid for errors
- Announce errors as soon as they occur with role="alert"
- Support both mouse and keyboard interaction for custom controls
- Use appropriate autocomplete attributes for common fields
- Maintain focus management for multi-step forms
- Ensure color is not the only indicator of state
- Test forms with screen readers and keyboard-only navigation
- Provide clear instructions for complex input formats
- Allow form review before final submission
