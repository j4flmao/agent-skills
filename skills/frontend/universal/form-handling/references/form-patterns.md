# Form Patterns

Field arrays, wizard forms, dependent fields, and form state management.

---

## Field Arrays

React Hook Form + useFieldArray:

```tsx
const { fields, append, remove, move } = useFieldArray({
  control,
  name: 'items',
});

return (
  <>
    {fields.map((field, index) => (
      <div key={field.id}>
        <input {...register(`items.${index}.name`)} />
        <button type="button" onClick={() => remove(index)}>Remove</button>
      </div>
    ))}
    <button type="button" onClick={() => append({ name: '' })}>Add Item</button>
  </>
);
```

- Use `field.id` (not index) as key for stable re-renders across reorder.
- Nested field arrays are supported: `items.${i}.subItems.${j}.name`.
- For reorder: `move(fromIndex, toIndex)` — use drag-and-drop handler.

---

## Multi-step Wizard

```tsx
const steps = ['personal', 'address', 'review'];
const [step, setStep] = useState(0);

const handleNext = async () => {
  const fields = steps[step] === 'personal'
    ? ['name', 'email']
    : ['address', 'city'];
  const output = await trigger(fields);
  if (output) setStep(s => s + 1);
};

// On final step, submit all data
const onSubmit = (data: AllFormData) => fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
```

- Validate only current step fields before advancing.
- Preserve data from previous steps on back navigation.
- Show step indicator with completed/current/pending states.
- Persist partial data to sessionStorage for recovery on refresh.

---

## Dependent Fields

```tsx
const selectedCountry = watch('country');
const cities = countryCityMap[selectedCountry] ?? [];

return (
  <select {...register('city')} disabled={!selectedCountry}>
    {cities.map(c => <option key={c} value={c}>{c}</option>)}
  </select>
);
```

- Reset dependent field value when source changes.
- Re-validate dependent field on source change.
- Show loading state if dependent options come from API.

---

## Form State

| State | React Hook Form | Formik | Description |
|-------|----------------|--------|-------------|
| dirty | `formState.isDirty` | `formik.dirty` | Form has unsaved changes |
| touched | `formState.touched` | `formik.touched` | Fields user has blurred |
| submitting | `formState.isSubmitting` | `formik.isSubmitting` | Submission in progress |
| isValid | `formState.isValid` | `formik.isValid` | No validation errors |
| errors | `formState.errors` | `formik.errors` | Current validation errors |

```tsx
<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? <Spinner /> : 'Submit'}
</button>
```

- Do NOT disable based on `!isValid` — let user see all errors on invalid submit attempt.
- Show unsaved changes warning via `isDirty` when navigating away.
- Reset `isDirty` after successful submit via `reset(data)`.
