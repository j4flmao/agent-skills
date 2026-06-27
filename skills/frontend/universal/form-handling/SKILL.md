---
name: frontend-form-handling
description: >
  Use this skill when the user says 'form handling', 'form validation', 'React Hook Form', 'Formik', 'form state', 'form submission', 'field validation', 'form error', 'controlled input', 'uncontrolled input', 'form schema', 'Zod validation', 'form dirty', 'field array'. Implement client-side forms with validation, complex fields, and UX patterns. Do NOT use for: backend validation or API design.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, forms, phase-7, universal]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Form Handling

**Description:** Implements form handling — validation, state management, submission, complex field patterns. Triggered by "form handling", "form validation", "React Hook Form", "Formik", "form state", "form submission", "field validation", "form error", "controlled input", "uncontrolled input", "form schema", "Zod validation", "form dirty", "field array".

**Version:** 2.0.0  
**Author:** j4flmao  
**License:** MIT

---

## Purpose

Build robust, performant forms with proper validation, accessibility, and user experience — minimizing re-renders through uncontrolled inputs while maintaining a single source of truth via schema validation.

---

## Agent Protocol

### Trigger
User request includes any of: "form handling", "form validation", "React Hook Form", "Formik", "form state", "form submission", "field validation", "form error", "controlled input", "uncontrolled input", "form schema", "Zod validation", "form dirty", "field array".

### Input Context
- Framework (React, Vue, Svelte, vanilla)
- Validation library in use
- Form complexity (simple, multi-step, field arrays)
- UX requirements (validation timing, error display pattern)

### Output Artifact
Form implementation with validation schemas and UX patterns.

### Response Format
```
## Strategy
<form-library-selection, validation-schema>

## Implementation
<field-registration, validation, submission code>

## UX Pattern
<validation-timing, error-display, disabled-state>

—
Compression footer: frontend-form-handling/v1 | 3 sections | lib: <selected> | schema: <zod|yup>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Validation schema covers all fields including async rules
- Form state (dirty/touched/submitting) properly managed
- Error messages displayed inline per field
- Submit button resets after success, shows errors on failure
- Field arrays support add/remove/reorder

### Max Response Length
4096 tokens

## Form Architecture / Decision Trees

### Library Selection Decision Tree
```
Form complexity?
  |-- Simple (<10 fields, no dynamic fields) -->
  |     Framework preference?
  |     |-- React --> React Hook Form (uncontrolled, fast) or Formik (controlled, simpler)
  |     |-- Vue --> VeeValidate + Zod
  |     |-- Angular --> Reactive Forms (built-in)
  |     |-- Svelte --> SvelteKit Forms or Felte
  |
  |-- Moderate (10-30 fields, field arrays, dependent fields) -->
  |     |-- React --> React Hook Form + Zod (field arrays, useWatch)
  |     |-- Framework-agnostic --> TanStack Form
  |
  |-- Complex (30+ fields, multi-step wizard, dynamic field arrays) -->
  |     |-- React --> React Hook Form + Zod (persist step data, lazy register)
  |
  |-- Cross-framework / monorepo -->
        |-- TanStack Form (React, Vue, Solid, Svelte)
```

### Validation Strategy Decision Tree
```
Validation timing?
  |-- On change (every keystroke) -->
  |     Use for: password strength, character count, real-time feedback
  |     Risk: excessive re-renders, annoying UX for long forms
  |     Mitigation: only on specific fields, not entire form
  |
  |-- On blur (when field loses focus) -->
  |     Use for: most fields (email, name, phone, URL)
  |     Best for: balance between feedback and interruption
  |
  |-- On submit (when form is submitted) -->
  |     Use for: large forms, when you want to avoid premature error display
  |     Risk: user sees many errors at once, can be overwhelming
  |
  |-- Hybrid -->
        |-- Validate on blur for most fields
        |-- Validate on change for password/username
        |-- Validate everything on submit
```

### Multi-step Form Decision Tree
```
Paginated or wizard?
  |-- Paginated (all steps visible, scroll-based) -->
  |     Validity: All fields validated on each "Next" click
  |     State: Single form, all fields registered
  |
  |-- Wizard (one step at a time) -->
  |     Step persistence? -->
  |     |-- Session only --> sessionStorage (survives refresh)
  |     |-- Resume later --> API draft save (server-side)
  |     Step validation? -->
  |     |-- Validate current step only on "Next"
  |     |-- Don't re-validate previous steps on "Back"
  |     Submission? -->
        |-- Per-step submit (save as you go) --> API call per step
        |-- Final submit only --> Merge all step data, one API call
```

---

## Workflow

### 1. Library Selection
- **React Hook Form:** Large/complex forms with many fields. Uncontrolled inputs minimize re-renders. Best for: performance-sensitive forms, field arrays, multi-step.
- **Formik:** Simple to moderate forms. Controlled inputs. Best for: small forms where re-render cost is negligible, teams familiar with Formik patterns.
- **TanStack Form:** Framework-agnostic (React, Vue, Solid, Svelte). Best for: cross-framework projects or when you need form logic outside React.
- **Angular Reactive Forms:** Angular-native form handling. Best for: Angular projects, complex dynamic forms with FormArray, custom validators.

### 2. Schema Validation
- Define Zod/Yup/Joi schemas shared between frontend and backend when possible.
- Infer TypeScript types from schema: `z.infer<typeof schema>`.
- Field-level validation for immediate feedback; form-level validation for cross-field rules.
- Async validation (e.g., username uniqueness): debounce 300ms, abort previous on new keystroke.
- Schema is the single source of truth — never duplicate validation rules.

### 3. Form State Management
- Track: `dirty`, `touched`, `submitting`, `validating`, `isValid`.
- Uncontrolled inputs via `register` (React Hook Form) for performance.
- Controlled inputs via `watch` or `controller` when needed (dependent fields, custom inputs).
- Reset form to initial values or server response after successful submit.
- Submit button shows spinner during `submitting`, re-enables on error.

### 4. Complex Field Patterns
- **Field arrays:** add, remove, reorder with index tracking. Each row has unique key. Support nested field arrays.
- **Multi-step wizard:** each step validates independently; collected data merged on final submit. Allow back navigation without re-validation.
- **Dependent fields:** `watch` one field to update another (e.g., country → state/province options). Re-validate dependent field on source change.

### 5. UX Patterns
- Validate on blur (not on every keystroke) for most fields.
- Real-time validation for password strength, character counters.
- Debounced async validation (300ms) — cancel in-flight request on new input.
- Error displayed inline below each field, not in a summary banner only.
- Submit button disabled only during submission — not based on form validity. Allow invalid submit to show all errors at once.
- Focus first field with error on submit.

### 6. Client-Side Validation
Use Zod for schema-based validation. Define the schema once, reuse across frontend and backend. Field-level validation refines each field with `.min()`, `.max()`, `.email()`, `.url()`, `.regex()`. Form-level validation uses `.refine()` or `.superRefine()` for cross-field rules. Transform input values with `.transform()` and `.coerce()` for type conversion. Error messages are custom strings passed as the second argument to each refinement.

### 7. Server-Side Validation
Never trust client validation alone — always re-validate on the server. Return server validation errors mapped to field names for inline display. The server response format for validation errors follows a consistent structure: `{ errors: { fieldName: "error message" }, message: "Validation failed" }`. Map server errors to form fields after submission. Generic server errors (network, 500) display in a form-level banner or toast.

### 8. Error Display
Errors display inline below each field with the `role="alert"` attribute for accessibility. Field errors appear after the user has blurred the field (touched) or after submission. The error message is associated with the input via `aria-describedby`. The first field with an error receives focus on submission failure. Error messages are human-readable, specific, and actionable — not generic "Invalid input" messages.

### 9. Async Validation
Async validation checks field values against the server (e.g., username availability, email uniqueness). Debounce async validation by 300ms to avoid excessive API calls. Abort the previous in-flight request when the user types again. Show a loading indicator during async validation. Cache validation results to avoid redundant checks. Re-validate when the field value changes after a successful async check passes.

### 10. Multi-Step Wizard Forms
Divide the form into logical steps with a step indicator. Each step validates independently — only the fields for the current step are validated when advancing. Data from all steps is collected and merged on final submission. Allow back navigation to previous steps without re-validation. Preserve data from previous steps when the user navigates back. Persist partial data to sessionStorage for recovery on browser refresh.

### 11. File Upload
File upload fields use a controlled component wrapper. Validate file type, size, and count before upload. Show a preview of selected files with upload progress. Support drag-and-drop file selection. Handle upload cancellation and retry. Display server-side file validation errors inline. Support multiple file upload with field array pattern.

### 12. Accessibility
All form fields have associated `<label>` elements. Error messages use `role="alert"` for screen reader announcement. Required fields are marked with `aria-required="true"`. Submit button shows loading state with `aria-busy="true"`. Focus management: first error field receives focus on failed submission, first field of new step receives focus in wizards, thank-you message receives focus after success. Keyboard navigation: Enter submits the form, Tab moves between fields, Escape closes dialogs or dropdowns within the form.

---

## Form Architecture Decision Guide

| Scenario | Library | Validation | Strategy |
|---|---|---|---|
| Simple contact form (<10 fields) | Formik or RHF | Zod | Client-only |
| User registration (10-30 fields) | React Hook Form | Zod (shared) | Client + server |
| Multi-step wizard with persistence | React Hook Form | Zod | Client + server + draft |
| Dynamic invoice form with line items | React Hook Form | Zod | Client + server |
| Settings page with auto-save | TanStack Form | Zod | Debounced server |
| Admin dashboard with file uploads | React Hook Form | Zod | Client + server |
| Enterprise signup with compliance | Formik or RHF | Yup | Client + server + audit |
| Angular app with complex validation | Angular Reactive | Built-in + Zod | Client + server |

## Validation Strategy Decision Tree

```
Form complexity?
├── Simple (<10 fields)
│   └── Validation: On blur + On submit → Zod schema
├── Moderate (10-30 fields)
│   └── Validation: On blur + On submit + Async → Zod schema
└── Complex (30+ fields, multi-step, dynamic)
    └── Validation: On blur + On step change + On submit → Zod schema + server
    
Async validation needed?
├── Yes → Debounce 300ms, abort previous, cache results
└── No → Synchronous validation only

Multi-step wizard?
├── Yes → Validate per-step, persist to sessionStorage, merge on submit
└── No → Single-page form

File upload?
├── Yes → Validate type/size/count client-side, re-validate server-side
└── No → Standard fields only
```

## Error State Decision Flow

```
User interacts with field
├── User types (change)
│   └── Validation: NO (onChange mode disabled by default)
├── User leaves field (blur)
│   ├── Field has value → Validate → Error? → Show inline error
│   └── Field is empty → Check required → Error? → Show on submit
├── User submits form
│   ├── All fields validated
│   ├── Any errors? → Focus first error, show all inline errors
│   └── No errors → Submit → Server validation
│       ├── Server OK → Reset form, show success
│       └── Server error → Map to fields, show inline + banner errors
└── User navigates away with dirty form
    └── Show unsaved changes warning dialog
```

## Unsaved Changes Protection

Prompt the user when they navigate away from a dirty form:

```typescript
// React Router v6
import { useBlocker } from 'react-router-dom';

function useUnsavedChanges(isDirty: boolean) {
  useBlocker(() => {
    if (isDirty) {
      return !window.confirm('You have unsaved changes. Leave anyway?');
    }
    return false;
  });
}
```

```typescript
// Next.js App Router
import { useEffect } from 'react';

function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
```

## Performance Optimization

### Field Re-render Optimization
Use `React.memo` on field components to prevent re-renders of unchanged fields. For React Hook Form, use `useWatch` instead of `watch` to subscribe to specific fields without causing the entire form to re-render. Use `Controller` only for custom components — prefer `register` for native inputs. Separate field components into individual memoized components.

### Large Form Optimization
For forms with 50+ fields, consider: virtualized field list (react-window), deferred field registration (register fields in batches), and lazy validation (validate only visible/required fields initially). Use field-level subscription instead of form-level subscription to minimize re-renders.

### React Hook Form Performance Comparison
| Approach | Re-renders on keystroke | Re-renders on submit | Bundle size |
|----------|------------------------|---------------------|-------------|
| Controlled (useState) | All fields | All fields | 0KB (built-in) |
| Formik (controlled) | All fields | All fields | ~13KB |
| React Hook Form (uncontrolled) | Only the field being typed | Only changed fields | ~9KB |
| React Hook Form + useWatch | Subscribed fields only | Changed fields | ~9KB + deps |

## Form Testing Patterns

### React Hook Form Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('RegistrationForm', () => {
  it('shows validation error for empty email', async () => {
    render(<RegistrationForm />);
    await userEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
  });

  it('submits valid form data', async () => {
    const onSubmit = jest.fn();
    render(<RegistrationForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Name'), 'Test User');
    await userEvent.click(screen.getByText('Submit'));
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
    });
  });
});
```

### Form Security Patterns
```typescript
// CSRF token
<form method="POST" action="/api/submit">
  <input type="hidden" name="_csrf" value={csrfToken} />
</form>

// Input sanitization (prevent XSS)
const sanitized = input.replace(/<[^>]*>/g, '')

// Rate limiting on submit
const [lastSubmit, setLastSubmit] = useState(0)
const handleSubmit = async (data: FormData) => {
  const now = Date.now()
  if (now - lastSubmit < 2000) {
    showToast('Please wait before submitting again')
    return
  }
  setLastSubmit(now)
  // ... actual submission
}
```

## Common Pitfalls

### 1. Submit Button Disabled Based on isValid
```typescript
// BAD -- user can't submit to see all errors
<button disabled={!isValid}>Submit</button>

// GOOD -- let user submit, show all errors then
<button disabled={isSubmitting}>Submit</button>
```

### 2. No Unsaved Changes Warning
Users lose form data when they accidentally navigate away. Always implement unsaved changes protection for forms with more than 3 fields.

### 3. Trusting Client-Side Validation Only
Client validation is for UX. Server validation is for security. Always re-validate on the server — client validation can be bypassed.

### 4. Not Resetting Form After Submit
```typescript
// BAD -- form stays dirty after submit
onSubmit: async (data) => { await api.post(data) }

// GOOD -- reset to server response
onSubmit: async (data) => {
  const result = await api.post(data)
  reset(result.data) // reset with server-returned values
}
```

### 5. Excessive Re-renders with Controlled Inputs
Every keystroke in a controlled input re-renders the entire form. Use React Hook Form's uncontrolled `register` or memoize field components.

## Rules

1. Use uncontrolled inputs for performance (`register` vs `setValue`).
2. Validation schema is the single source of truth — never duplicate rules.
3. Form errors displayed inline per field — not just a summary toast.
4. Submit button disabled only during `isSubmitting` — never based on `isValid`.
5. Reset form (`reset()`) after successful submission.
6. Never trust client validation alone — always re-validate server-side.
7. Debounce async validation with at least 300ms and abort previous requests.
8. Use unique `key` for each field array row; include index for reorder stability.
9. Associate errors with inputs via `aria-describedby`.
10. Focus first error field on submission failure.
11. Prompt unsaved changes warning on navigation away from dirty forms.
12. Memoize field components to minimize re-renders on large forms.

---

## References
  - references/form-accessibility.md — Form Accessibility
  - references/form-libraries.md — Form Libraries
  - references/form-security-patterns.md — Form Security Patterns
  - references/form-state.md — Form State
  - references/form-validation.md — Form Validation
  - references/validation-patterns.md — Validation Patterns
## Handoff

If form requires multi-step wizard with persisted draft state or server-side draft saving, flag for backend handoff. Otherwise deliver complete form implementation with schema, fields, validation, and submission handler.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Architecture Decision Trees

### Form Library Decision Tree
```
Is the form simple (login, search, contact)?
  ├── Yes → Native HTML form with validation + framework bindings
  └── No  → Does it need complex validation (cross-field, async)?
       ├── Yes → React Hook Form + Zod/Yup, or Formik
       └── No  → React Hook Form (minimal re-renders)
            Is the form multi-step (wizard)?
            ├── Yes → Step context provider + persisted draft state
            └── No  → Single-page form with sections
```

### Validation Strategy Decision Tree
```
Can validation be done client-side only?
  ├── Yes → Zod schema validation on submit + onChange
  └── No  → Is the validation async (API call)?
       ├── Yes → validate onBlur to avoid excessive API calls
       └── No  → Sync validation with debounced schema check
            Need cross-field validation?
            ├── Yes → Schema refinement (zod.refine) or custom validator
            └── No  → Per-field validation rules
```
