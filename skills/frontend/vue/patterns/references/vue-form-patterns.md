# Vue Form Patterns

## Reactive Form Setup

```vue
<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div v-for="field in fields" :key="field.name" class="form-field">
      <label :for="field.name" class="block text-sm font-medium text-gray-700">
        {{ field.label }}
        <span v-if="field.required" class="text-red-500">*</span>
      </label>
      <input
        v-if="field.type === 'text' || field.type === 'email' || field.type === 'password'"
        :id="field.name"
        :type="field.type"
        v-model="formState[field.name]"
        :class="['mt-1 block w-full rounded-md border-gray-300 shadow-sm',
          errors[field.name] ? 'border-red-500' : '']"
        @blur="validateField(field.name)"
      />
      <select
        v-else-if="field.type === 'select'"
        :id="field.name"
        v-model="formState[field.name]"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      >
        <option value="" disabled>Select {{ field.label }}</option>
        <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <p v-if="errors[field.name]" class="mt-1 text-sm text-red-600">
        {{ errors[field.name] }}
      </p>
    </div>

    <div class="flex justify-end space-x-3">
      <button
        type="button"
        @click="resetForm"
        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
      >
        Reset
      </button>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {{ isSubmitting ? 'Submitting...' : 'Submit' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, type Ref } from 'vue'

interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'select'
  required?: boolean
  options?: { value: string; label: string }[]
  validators?: ((value: string) => string | null)[]
}

interface FormErrors {
  [key: string]: string | null
}

const props = defineProps<{
  fields: FieldConfig[]
  onSubmit: (values: Record<string, string>) => Promise<void>
}>()

const initialValues = props.fields.reduce((acc, field) => {
  acc[field.name] = ''
  return acc
}, {} as Record<string, string>)

const formState = reactive({ ...initialValues })
const errors = reactive<FormErrors>({})
const isSubmitting = ref(false)
const formRef: Ref<HTMLFormElement | null> = ref(null)

function validateField(name: string): boolean {
  const field = props.fields.find(f => f.name === name)
  if (!field) return true

  if (field.required && !formState[name]) {
    errors[name] = `${field.label} is required`
    return false
  }

  if (field.validators) {
    for (const validator of field.validators) {
      const error = validator(formState[name])
      if (error) {
        errors[name] = error
        return false
      }
    }
  }

  errors[name] = null
  return true
}

function validateAll(): boolean {
  let isValid = true
  for (const field of props.fields) {
    if (!validateField(field.name)) {
      isValid = false
    }
  }
  return isValid
}

async function handleSubmit() {
  if (!validateAll()) return

  isSubmitting.value = true
  try {
    await props.onSubmit({ ...formState })
  } catch (error) {
    console.error('Form submission error:', error)
  } finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  Object.assign(formState, initialValues)
  Object.keys(errors).forEach(key => { errors[key] = null })
}
</script>
```

## Composable Form Builder

```typescript
import { reactive, computed, ref } from 'vue'

interface FormField<T> {
  value: T
  error: string | null
  touched: boolean
  dirty: boolean
}

type FormSchema = Record<string, unknown>
type ValidationRules<T> = {
  [K in keyof T]: ((value: T[K], values: T) => string | null)[]
}

function useForm<T extends FormSchema>(
  initial: T,
  rules?: Partial<ValidationRules<T>>
) {
  const fields = reactive(
    Object.keys(initial).reduce((acc, key) => {
      acc[key] = {
        value: initial[key],
        error: null,
        touched: false,
        dirty: false,
      }
      return acc
    }, {} as Record<string, FormField<unknown>>)
  ) as Record<keyof T, FormField<T[keyof T]>>

  const values = computed(() =>
    Object.entries(fields).reduce((acc, [key, field]) => {
      acc[key as keyof T] = field.value as T[keyof T]
      return acc
    }, {} as T)
  )

  const valid = computed(() =>
    Object.values(fields).every(f => f.error === null)
  )

  const dirty = computed(() =>
    Object.values(fields).some(f => f.dirty)
  )

  const touched = computed(() =>
    Object.values(fields).some(f => f.touched)
  )

  function setValue<K extends keyof T>(key: K, value: T[K]) {
    fields[key].value = value
    fields[key].dirty = true
    fields[key].touched = true

    if (rules && rules[key]) {
      const error = runValidators(value, rules[key]!, values.value)
      fields[key].error = error
    }
  }

  function setTouched<K extends keyof T>(key: K) {
    fields[key].touched = true
    if (rules && rules[key]) {
      const error = runValidators(fields[key].value as T[K], rules[key]!, values.value)
      fields[key].error = error
    }
  }

  function validate(): boolean {
    let isValid = true
    for (const key of Object.keys(fields) as Array<keyof T>) {
      fields[key].touched = true
      if (rules && rules[key]) {
        const error = runValidators(
          fields[key].value as T[keyof T],
          rules[key]!,
          values.value
        )
        fields[key].error = error
        if (error) isValid = false
      }
    }
    return isValid
  }

  function reset() {
    for (const key of Object.keys(fields) as Array<keyof T>) {
      fields[key].value = initial[key]
      fields[key].error = null
      fields[key].touched = false
      fields[key].dirty = false
    }
  }

  return {
    fields,
    values,
    valid,
    dirty,
    touched,
    setValue,
    setTouched,
    validate,
    reset,
  }
}

function runValidators<T>(value: T, validators: Function[], values: unknown): string | null {
  for (const validator of validators) {
    const error = validator(value, values)
    if (error) return error
  }
  return null
}
```

## Field Array Management

```vue
<template>
  <div class="space-y-4">
    <div v-for="(item, index) in items" :key="item.key" class="flex gap-2 items-start">
      <input
        v-model="item.value"
        :name="`item-${index}`"
        class="flex-1 rounded-md border-gray-300"
        :class="{ 'border-red-500': item.error }"
      />
      <button type="button" @click="removeItem(index)" class="text-red-500 hover:text-red-700">
        Remove
      </button>
    </div>
    <button type="button" @click="addItem" class="text-blue-600 hover:text-blue-800">
      + Add Item
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface FieldArrayItem {
  key: number
  value: string
  error: string | null
}

let nextKey = 0

const items = ref<FieldArrayItem[]>([])

function addItem(value = '') {
  items.value.push({ key: nextKey++, value, error: null })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

defineExpose({ items, addItem, removeItem })
</script>
```

## Key Points

- Use reactive for form state with field-level error tracking
- Create composable form builder for reusable validation logic
- Track touched, dirty, and error states per field
- Show errors only after field blur or form submission
- Use field arrays with stable keys for dynamic lists
- Debounce async validation to reduce API calls
- Disable submit button during submission
- Validate on blur for immediate feedback
- Focus first error field on validation failure
- Provide clear error messages associated with fields
- Reset form state after successful submission
- Handle form submission errors with user feedback
