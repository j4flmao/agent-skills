# Form State

## State Machine

```
Idle → Dirty (any field changed)
  → Submitting (form submitted)
    → Success (reset form, show confirmation)
    → Error (show errors, re-enable)
    → ValidationError (show inline errors)
  → Reset (back to initial state)
```

## Form State Types

```typescript
interface FormState<T> {
  values: T                    // current field values
  errors: Partial<Record<keyof T, string>>  // validation errors
  touched: Partial<Record<keyof T, boolean>> // blurred fields
  dirty: boolean               // any field changed from initial
  isDirty: boolean             // same as dirty
  isSubmitting: boolean        // form is submitting
  isSubmitted: boolean         // form has been submitted
  isSubmitSuccessful: boolean  // last submit succeeded
  submitCount: number          // number of submit attempts
}
```

## React Hook Form State

```typescript
function ProfileForm() {
  const {
    register,        // register field
    handleSubmit,    // submit handler
    watch,           // watch field changes
    getValues,       // get current values (without subscribing)
    setValue,        // set field value
    reset,           // reset form
    formState: { errors, isDirty, isSubmitting, dirtyFields, touchedFields },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      preferences: { newsletter: false },
    },
  })

  // Watch specific fields (component re-renders on change)
  const watchNewsletter = watch('preferences.newsletter')
  const watchAll = watch() // watches entire form

  // Reset after successful submit
  const onSubmit = async (data: ProfileData) => {
    await api.updateProfile(data)
    reset(data) // reset with server response
  }
}
```

## Field Array State

```typescript
import { useFieldArray } from 'react-hook-form'

function InvoiceForm() {
  const { control, register } = useForm<InvoiceForm>()
  const { fields, append, remove, move, swap, insert, prepend } = useFieldArray({
    control,
    name: 'lineItems',
  })

  const addItem = () => append({ description: '', quantity: 1, price: 0 })
  const removeItem = (index: number) => remove(index)
  const moveUp = (index: number) => move(index, index - 1)

  return (
    <>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`lineItems.${index}.description`)} />
          <input type="number" {...register(`lineItems.${index}.quantity`)} />
          <input type="number" {...register(`lineItems.${index}.price`)} />
          <button type="button" onClick={() => removeItem(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={addItem}>Add Item</button>
    </>
  )
}
```

## Dirty State Tracking

```typescript
// Check if form is dirty (unsaved changes)
const isDirty = formState.isDirty
const dirtyFields = formState.dirtyFields // which fields changed

// Warn on navigation
function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''  // standard way
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}

// For SPA navigation
import { useBlocker } from 'react-router-dom'
useBlocker(isDirty)
```

## Form Persistence (Draft Recovery)

```typescript
const STORAGE_KEY = 'form_draft_registration'

function useFormDraft<T>(key: string) {
  const storageKey = `${STORAGE_KEY}_${key}`

  const saveDraft = useCallback((values: T) => {
    sessionStorage.setItem(storageKey, JSON.stringify(values))
  }, [storageKey])

  const loadDraft = useCallback((): T | null => {
    const saved = sessionStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) : null
  }, [storageKey])

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(storageKey)
  }, [storageKey])

  return { saveDraft, loadDraft, clearDraft }
}

// Usage
function MultiStepForm() {
  const { saveDraft, loadDraft, clearDraft } = useFormDraft<FormData>('checkout')
  const form = useForm({ defaultValues: loadDraft() ?? defaultValues })

  // Autosave on field changes
  const watchedValues = form.watch()
  useEffect(() => {
    saveDraft(watchedValues)
  }, [watchedValues, saveDraft])

  const onSubmit = async (data: FormData) => {
    await api.submit(data)
    clearDraft() // remove draft on successful submit
  }
}
```

## Submit State Management

```typescript
function SubmitButton({ isSubmitting, isDirty }: { isSubmitting: boolean; isDirty: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="btn btn-primary"
    >
      {isSubmitting ? (
        <>
          <Spinner className="w-4 h-4 mr-2 inline" />
          Saving...
        </>
      ) : (
        'Save'
      )}
    </button>
  )
}

// Success state
function FormStatus({ isSubmitSuccessful, serverError }: { isSubmitSuccessful: boolean; serverError?: string }) {
  if (isSubmitSuccessful) {
    return <div className="bg-green-50 text-green-700 p-4 rounded">Saved successfully!</div>
  }
  if (serverError) {
    return <div className="bg-red-50 text-red-700 p-4 rounded">{serverError}</div>
  }
  return null
}
```

## State Reset Patterns

```typescript
// Reset to default values
reset()

// Reset with new values
reset({ name: '', email: '' })

// Reset keeping dirty/touched
reset(data, { keepDirty: true, keepTouched: true })

// Reset after success
async function onSubmit(data: FormData) {
  try {
    const result = await api.submit(data)
    reset(result.data) // reset with server response
    toast.success('Saved!')
  } catch (err) {
    setServerError(err.message)
    // form stays in submitted state with errors
  }
}
```

## Form State Decision Tree

```
User interacts with form
├── Types → field dirty = true, form dirty = true
├── Leaves field → field touched = true, validate
├── Submits → isSubmitting = true
│   ├── Validation passes → submit to server
│   │   ├── Success → isSubmitSuccessful = true, reset form
│   │   └── Error → isSubmitting = false, show server errors
│   └── Validation fails → isSubmitting = false, focus first error
├── Cancel/Leave → dirty? → confirm dialog
└── Reset → isDirty = false, clear values
```
