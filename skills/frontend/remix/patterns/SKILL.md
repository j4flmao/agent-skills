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

## Rules
- Validate on server always. Client validation is enhancement only.
- Error boundaries are per route with a root fallback.
- Meta is server-side — dynamic per request, not client-side.
- Cache public routes aggressively. Never cache authenticated data.
- Optimistic updates must handle rollback when action fails.
- Service worker updates should use skip-waiting pattern.

## References
- `references/remix-forms.md` — validation, progressive enhancement, pending states
- `references/remix-seo.md` — meta, sitemap, JSON-LD, canonical

## Handoff
No artifact produced.
Next skill: frontend-react-architecture for shared React patterns (component composition, hooks, state management).
Carry forward: validation schemas, cache strategy, error boundary patterns.
