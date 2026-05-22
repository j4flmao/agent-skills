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
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Frontend Form Handling

**Description:** Implements form handling — validation, state management, submission, complex field patterns. Triggered by "form handling", "form validation", "React Hook Form", "Formik", "form state", "form submission", "field validation", "form error", "controlled input", "uncontrolled input", "form schema", "Zod validation", "form dirty", "field array".

**Version:** 1.0.0  
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

---

## Workflow

### 1. Library Selection
- **React Hook Form:** Large/complex forms with many fields. Uncontrolled inputs minimize re-renders. Best for: performance-sensitive forms, field arrays, multi-step.
- **Formik:** Simple to moderate forms. Controlled inputs. Best for: small forms where re-render cost is negligible, teams familiar with Formik patterns.
- **TanStack Form:** Framework-agnostic (React, Vue, Solid, Svelte). Best for: cross-framework projects or when you need form logic outside React.

### 2. Schema Validation
- Define Zod/Yup schemas shared between frontend and backend when possible.
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

---

## Rules

1. Use uncontrolled inputs for performance (`register` vs `setValue`).
2. Validation schema is the single source of truth — never duplicate rules.
3. Form errors displayed inline per field — not just a summary toast.
4. Submit button disabled only during `isSubmitting` — never based on `isValid`.
5. Reset form (`reset()`) after successful submission.
6. Never trust client validation alone — always re-validate server-side.
7. Debounce async validation with at least 300ms and abort previous requests.
8. Use unique `key` for each field array row; include index for reorder stability.

---

## References

- `references/form-validation.md` — Zod schemas, field-level, async validation, error handling
- `references/form-patterns.md` — field arrays, wizard forms, dependent fields, form state

---

## Handoff

If form requires multi-step wizard with persisted draft state or server-side draft saving, flag for backend handoff. Otherwise deliver complete form implementation with schema, fields, validation, and submission handler.
