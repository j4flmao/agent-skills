# PR Template

## Title Format
```
feat(scope): concise description under 72 chars
fix(scope): concise description under 72 chars
refactor(scope): concise description under 72 chars
chore(scope): concise description under 72 chars
test(scope): concise description under 72 chars
docs(scope): concise description under 72 chars
```

## Summary
One paragraph. Why this change exists. What problem it solves. Impact on users or developers.

## Changes
- `path/to/file.ts:42` — Added validation for email format
- `path/to/service.ts:15-30` — Refactored user lookup to use cache-first strategy
- `tests/validation.test.ts` — Unit tests for new validator

## Testing
- Unit tests added: `tests/validation.test.ts` covers all cases
- Manual test: submit form with invalid email → correct error shown
- Edge cases: empty string, null, Unicode emails, SQL injection attempts

## Checklist
- [ ] Self-review completed
- [ ] Tests added / existing tests pass
- [ ] Documentation updated
- [ ] No lint errors
- [ ] Edge cases handled
