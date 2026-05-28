---
name: frontend-remix-patterns
description: >
  Use this skill when the user says 'Remix pattern', 'Remix form validation', 'Remix optimistic UI', 'Remix error boundary', 'Remix SEO', 'Remix caching', 'Remix PWA'. This skill enforces: server-side form validation with Zod, route-level error boundaries, meta exports for SEO, Cache-Control strategies, optimistic updates with useFetcher, and service workers for offline support. Requires existing Remix project (package.json with @remix-run/*). Do NOT use for: React-only validation, client-side-only forms.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, remix, react, patterns, phase-7]
---

# Remix Patterns

## Purpose
Apply production-grade patterns to Remix applications: server validation, error boundaries per route, SEO metadata, caching, optimistic UI, and PWA support.

## Agent Protocol

### Trigger
Exact user phrases: "Remix pattern", "Remix form validation", "Remix optimistic UI", "Remix error boundary", "Remix SEO", "Remix caching", "Remix PWA".

### Input Context
Before activating, verify:
- Remix project with @remix-run/react and a routing structure.
- Whether Zod is already installed for validation.
- Existing meta/SEO setup.
- Target deployment platform for caching strategy.

### Output Artifact
No file output. Produces code patterns for validation, error handling, SEO, caching, optimistic updates, and PWA.

### Response Format
Code examples only. Show action/loader with validation, error boundary, meta export, cache headers.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Form validation uses Zod schema in action, returns field errors as JSON.
- [ ] Client-side enhancement shows errors inline from useActionData.
- [ ] ErrorBoundary per route with root fallback.
- [ ] meta function per route with og, twitter, canonical.
- [ ] Cache-Control headers set on loader responses.
- [ ] Optimistic updates use useFetcher with local state + rollback.
- [ ] Service worker registered from public dir with offline fallback.

### Max Response Length
Code: 15 lines per example. Unlimited patterns.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| Server-side validation only | Simpler, no JS needed for form to work | Basic forms, login, signup |
| Server + client validation with useActionData | Better UX, instant feedback | Forms with many fields |
| Optimistic UI with useFetcher | Instant feedback, rollback on error | Likes, stars, add to cart |
| Route ErrorBoundary | Scoped error handling | Per-route error recovery |
| Root ErrorBoundary | Global fallback | Unexpected errors, network failures |
| Meta per route | SEO per page | Blog posts, product pages |
| Resource route sitemap | Dynamic sitemap generation | Sites with dynamic content |

### Decision Tree: Form Validation

```
Is the form simple (email + password)?
  ├── Yes -> Server validation with Zod
  └── No (many fields, complex rules) ->
       ├── Server validation (required)
       └── + Client enhancement with useActionData
```

### Decision Tree: Optimistic UI

```
Does the mutation need instant feedback?
  ├── No -> Standard <Form> with pending state
  └── Yes -> useFetcher + local state
       ├── Can you easily rollback? -> Optimistic update
       └── Risk of race conditions? -> Use useFetcher data for confirmation
```

### Decision Tree: Error Boundary Placement

```
Is this an expected error (404, 403)?
  ├── Yes -> throw Response in loader, use CatchBoundary (v1) or ErrorBoundary (v2)
  └── No -> ErrorBoundary for unexpected errors
       ├── Route-level -> Scoped error recovery
       └── Root-level -> Global fallback in root.tsx
```

## Common Pitfalls

### Pitfall 1: Client-Only Validation
```tsx
// Wrong — validation only on client, form submits invalid data without JS
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!validate(formData)) return
  submit(formData)
}

// Correct — always validate on server
export async function action({ request }: ActionFunctionArgs) {
  const result = schema.safeParse(formData)
  if (!result.success) return json({ errors: result.error.flatten() }, { status: 400 })
}
```
Client validation is an enhancement. Server validation is mandatory.

### Pitfall 2: Not Using useActionData for Errors
Returning validation errors without `useActionData` forces a full page reload and no inline error display. Always return errors as JSON with 4xx status.

### Pitfall 3: Caching Authenticated Routes
```tsx
// Wrong — caching personalized data
return json(userData, { headers: { 'Cache-Control': 'public, max-age=3600' } })
```
Never Cache-Control authenticated routes. Use `private, no-store` or omit the header.

### Pitfall 4: One Big Action Function
Using a single action with `intent` field is cleaner than multiple routes. Wrap in a switch statement for readability.

### Pitfall 5: Missing Error Boundaries
Without route-level ErrorBoundary, an error in one component crashes the entire page. Add ErrorBoundary to every layout route at minimum.

## Compared With

### Remix Form Validation vs React Hook Form
Remix validates on the server natively; React Hook Form is client-first. Remix works without JS; React Hook Form requires JS. For Remix projects, Zod + server validation is the idiomatic approach.

### Remix Optimistic UI vs TanStack Query
Both support optimistic updates. Remix's useFetcher approach is simpler (form-based) but less flexible. TanStack Query has richer cache invalidation and retry logic but requires more setup.

### Remix Meta vs Next.js Metadata API
Remix's `meta` export is a function that receives loader data, making it truly dynamic per request. Next.js's `generateMetadata` is similar but Remix's approach is more explicit about the data dependency.

## Performance Considerations

### Server Validation Cost
Zod validation on every action has a cost. For very large forms, consider parsing with `.safeParseAsync()` and using `z.object({...}).parse()` only on required fields. Schemas with 20+ fields should be optimized with `.strict()` to reject unexpected fields.

### Cache Strategy
| Cache Header | Effect |
|-------------|--------|
| `public, max-age=300` | Browser caches for 5 minutes |
| `s-maxage=3600` | CDN caches for 1 hour |
| `stale-while-revalidate=60` | Serves stale for 60s while refetching |
| `private, no-store` | Never cache (auth routes) |

### Optimistic UI Performance
Optimistic updates should be lightweight DOM-only changes. Avoid recalculating lists or triggering expensive operations in the optimistic callback.

### Error Boundary Cost
ErrorBoundary components are included in the route's client bundle. They are small (1-2KB) but should not contain heavy UI libraries.

## Ecosystem & Tooling

### Core Libraries
| Library | Purpose |
|---------|---------|
| zod | Schema validation for actions |
| remix-validated-form | Declarative form validation |
| @remix-run/node | Session storage, cookie management |
| @remix-run/react | Client hooks (useActionData, useFetcher) |

### SEO Tools
| Tool | Purpose |
|------|---------|
| @remix-run/sitemap | Sitemap generation |
| robots.txt resource route | Crawler directives |
| JSON-LD in <script> | Structured data for rich snippets |

### Caching Tools
| Tool | Purpose |
|------|---------|
| Cache-Control headers | HTTP caching |
| CDN (Cloudflare, Fastly) | Edge caching |
| Arcache | Remix cache utility |
| remix-cache | Cache management library |

### Testing
- Vitest + React Testing Library for component tests.
- `@remix-run/testing` for loader/action unit tests.
- Playwright for E2E form submission flow.

### Community
- Docs: remix.run/docs
- GitHub: github.com/remix-run/remix
- Discord: discord.gg/remix
- Indie Stack: remix.run/stack/indie

## Workflow

### Step 1: Form Validation (Zod in Action)
```tsx
const schema = z.object({ email: z.string().email(), password: z.string().min(8) })
export async function action({ request }: ActionFunctionArgs) {
  const formData = Object.fromEntries(await request.formData())
  const result = schema.safeParse(formData)
  if (!result.success) return json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  await createUser(result.data)
  return redirect('/dashboard')
}
```
Use `useActionData` in the component to display field-level errors. `aria-invalid` on inputs.

### Step 2: Error Handling (ErrorBoundary)
```tsx
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div><h1>Error</h1><p>{error.message}</p></div>
}
```
Catch boundary for 404/403: `throw new Response('Not Found', { status: 404 })`. Root error boundary in root.tsx catches all unhandled errors.

### Step 3: SEO (Meta + Sitemap)
```tsx
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.product?.name ?? 'Not Found' },
  { name: 'description', content: data?.product?.description?.slice(0, 160) },
  { property: 'og:title', content: data?.product?.name },
  { tagName: 'link', rel: 'canonical', href: `https://site.com${location.pathname}` },
]
```
Sitemap as resource route `sitemap[.]xml.tsx`. Robots.txt as resource route. JSON-LD in component via `<script>`.

### Step 4: Caching
```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  return json(data, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=60' },
  })
}
```
Use `s-maxage` for CDN cache. `stale-while-revalidate` for background refresh. No caching for authenticated routes.

### Step 5: Optimistic UI
```tsx
function LikeButton({ postId }: { postId: string }) {
  const fetcher = useFetcher()
  const optimisticLiked = fetcher.formData?.get('liked') === 'true'
  return (
    <fetcher.Form method="post" action="/api/like">
      <input type="hidden" name="liked" value={String(!optimisticLiked)} />
      <button type="submit">{optimisticLiked ? 'Unlike' : 'Like'}</button>
    </fetcher.Form>
  )
}
```
Rollback: compare `fetcher.data` with optimistic value; revert on error.

### Step 6: PWA
Place `sw.js` in `public/`. Register from root.tsx `<Scripts>` after. Manifest as resource route returning JSON. Offline page as route with service worker cache-first strategy.

### Step 7: Pending States with useNavigation
```tsx
function SubmitButton() {
  const navigation = useNavigation()
  const isPending = navigation.state === 'submitting'
  return <button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
}
```

## Rules
- Validate on server always. Client validation is enhancement only.
- Error boundaries are per route with a root fallback.
- Meta is server-side — dynamic per request, not client-side.
- Cache public routes aggressively. Never cache authenticated data.
- Optimistic updates must handle rollback when action fails.
- Service worker updates should use skip-waiting pattern.
- Use useNavigation for pending states on <Form> submissions.
- Use useFetcher for non-navigation mutations.
- Return errors as JSON with 4xx status codes, not redirects.
- Use Zod for all server-side validation schemas.

## References
- references/remix-data-patterns.md — Remix Data Patterns
- references/remix-form-patterns.md — Remix Form Patterns
- references/remix-forms.md — Remix Forms — Validation, Progressive Enhancement, Pending States
- references/remix-routing.md — Remix Routing & Validation Patterns
- references/remix-seo.md — Remix SEO — Meta, Sitemap, JSON-LD, Canonical
- references/remix-validation.md — Remix Form Validation Patterns
- references/remix-optimistic-ui.md — Remix Optimistic UI Patterns
- references/remix-error-boundaries.md — Remix Error Boundaries and Error Handling

## Handoff
No artifact produced.
Next skill: frontend-react-architecture for shared React patterns (component composition, hooks, state management).
Carry forward: validation schemas, cache strategy, error boundary patterns.
