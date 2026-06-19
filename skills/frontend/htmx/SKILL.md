---
name: htmx
description: >
  Use this skill when the user says 'htmx', 'htmx setup', 'htmx ajax', 'htmx hx-get', 'htmx hx-post', 'htmx HATEOAS', 'htmx hypermedia', 'htmx server-driven', or when building hypermedia-driven applications with htmx. This skill enforces: server-driven AJAX via HTML attributes, HATEOAS principles, minimal JavaScript, partial page replacements, hypermedia as the engine of application state. Requires htmx in the project (CDN or npm). Do NOT use for: SPA frameworks (React, Vue, Alpine), JSON API clients, or full page reload patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, htmx, phase-1]
---

# htmx

## Purpose
Build hypermedia-driven web applications where the server sends HTML fragments in response to AJAX requests triggered by HTML attributes — no JavaScript required.

## Agent Protocol

### Trigger
Exact user phrases: "htmx setup", "htmx project", "htmx hx-get", "htmx hx-post", "htmx HATEOAS", "htmx hypermedia", "htmx server", "htmx ajax", "hypermedia app".

### Input Context
Before activating, verify:
- htmx is included (CDN script or npm).
- What backend framework is used (Django, Rails, Go, Laravel, etc.).

### Output Artifact
No file output. Produces HTML snippets with htmx attributes as text.

### Response Format
HTML with htmx attributes:
```html
<button hx-get="/api/data" hx-target="#result" hx-swap="innerHTML">
  Load Data
</button>
<div id="result"></div>
```

No preamble. No postamble. No explanations. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] AJAX requests use hx-get, hx-post, hx-put, hx-patch, or hx-delete.
- [ ] Responses are HTML fragments, not JSON.
- [ ] Target element specified with hx-target or defaults to the triggering element.
- [ ] Swap strategy chosen: innerHTML, outerHTML, beforebegin, afterbegin, beforeend, afterend.
- [ ] HATEOAS: server returns next-available actions as hypermedia links.
- [ ] History and URL updates via hx-push-url or hx-replace-url.
- [ ] Validation and feedback via hx-trigger, hx-indicator, hx-disable.

### Max Response Length
~4096 tokens.

## Component Architecture / Decision Trees

### Architecture Options

| Approach | Trade-off | When to Use |
|----------|-----------|-------------|
| hx-get fragment swap | Simple data fetch, GET semantics | Read operations, lazy load |
| hx-post form with validation | Form submission, 422 errors | Mutations with validation |
| hx-boost on links/forms | Full-page SPA-like navigation | Enhancing existing HTML |
| hx-trigger="every 10s" | Polling for updates | Real-time-ish dashboards |
| hx-trigger="revealed" | Lazy load below fold | Performance optimization |
| hx-trigger="intersect" | Viewport-based loading | Infinite scroll |
| Server-Sent Events (hx-sse) | Server push | Real-time notifications |
| WebSockets (hx-ws) | Bidirectional stream | Chat, collaborative editing |

### Decision Tree: Request Trigger

```
What triggers the AJAX request?
  Button/link click -> hx-trigger="click" (default for buttons, links, forms)
  Page load -> hx-trigger="load"
  Element scrolled into view -> hx-trigger="revealed"
  Input change -> hx-trigger="change, keyup delay:300ms" (search-as-you-type)
  Time interval -> hx-trigger="every 5s" (polling)
  Intersection observer -> hx-trigger="intersect threshold:0.5"
  Custom JS event -> hx-trigger="custom-event from:body"
  Focus loss -> hx-trigger="focusOut delay:200ms"
```

### Decision Tree: Swap Strategy

```
What should happen with the response?
  Replace target's children -> hx-swap="innerHTML" (default)
  Replace the whole target -> hx-swap="outerHTML"
  Insert before the target -> hx-swap="beforebegin"
  Insert after the target -> hx-swap="afterend"
  Append inside target -> hx-swap="beforeend"
  Prepend inside target -> hx-swap="afterbegin"
  Execute response JS only -> hx-swap="none"
  Remove the target -> hx-swap="delete"
```

### Hypermedia Architecture Decision

```
How much of the page does this interaction affect?
  Small widget update -> Return fragment, swap innerHTML on container
  Form submission with errors -> Return updated form HTML with 422 status
  Section replacement (tab) -> Return section HTML, swap outerHTML on section
  Full page navigation -> Use hx-boost on links for seamless navigation
  Modal/dialog -> Return dialog HTML, swap innerHTML on modal container
  Infinite scroll -> Return next page items, swap beforeend on list
```

## Component Design Patterns

### Button with Loading State

```html
<button hx-get="/api/refresh" hx-target="#data" hx-indicator="#spinner">
  Refresh
  <img id="spinner" class="htmx-indicator" src="/spinner.gif" />
</button>
```

### Form with Validation

```html
<form hx-post="/contacts" hx-target="#form-area" hx-swap="outerHTML">
  <input type="text" name="email" hx-get="/contacts/check-email"
         hx-trigger="change" hx-target="#email-error">
  <div id="email-error"></div>
  <button type="submit">Submit</button>
</form>
```

Server returns updated form HTML with class "error" on invalid fields and HTTP 422 status.

### Infinite Scroll

```html
<div hx-get="/posts?page=2" hx-trigger="revealed" hx-swap="beforeend" hx-target="#posts">
</div>
<div id="posts">
  <!-- Existing posts rendered by server -->
</div>
```

### Tabs via Fragment Swap

```html
<div hx-target="#tab-content" hx-swap="innerHTML">
  <a hx-get="/tabs/info">Info</a>
  <a hx-get="/tabs/settings">Settings</a>
</div>
<div id="tab-content">
  <!-- Server-rendered tab content -->
</div>
```

### Inline Edit

```html
<div hx-get="/contacts/1/edit" hx-trigger="dblclick" hx-target="this" hx-swap="outerHTML">
  <span>{{ contact.name }}</span>
</div>
```

Server returns `<form>` with input filled in and hx-put to cancel/submit.

## State Management Patterns

### Server-Driven State (Primary)

State lives on the server. Client is a stateless HTML viewer. The server:
- Renders current state as HTML
- Returns fragments representing new state after mutations
- Sends links for available actions (HATEOAS)

### URL State via hx-push-url

```html
<div hx-get="/products?page=2" hx-push-url="true" hx-target="#products">
  Next Page
</div>
```

### Client State via Alpine.js (Companion)

For client-only UI state (modals, toggles, theme), pair htmx with Alpine.js:

```html
<div x-data="{ modalOpen: false }">
  <button hx-get="/api/data" hx-target="#result" @click.prevent>Load</button>
  <div x-show="modalOpen">Modal content</div>
</div>
```

## Performance Optimization

1. htmx is ~14KB min+gzip — negligible bundle cost.
2. Requests return HTML fragments (smaller than full page, larger than JSON).
3. Server rendering time adds latency vs client rendering.
4. Partial swaps reduce DOM diffing to target elements only.
5. hx-trigger="load" defers rendering to after initial paint (improves LCP).
6. Caching: traditional HTTP caching works (ETags, Last-Modified).
7. Boosting enables view-transitions for smooth navigation.
8. hx-trigger="every 30s" for polling — balance freshness vs server load.
9. Debounce inputs with `delay:300ms` to avoid excess requests.
10. hx-preserve keeps elements untouched across swaps (useful for video players, audio).

## Build & Bundle Considerations

- htmx works via CDN — no build step required.
- npm install: `npm install htmx.org`, then `import 'htmx.org'`.
- Extensions (`hx-ext`) each add 2-5KB — only load what you need.
- htmx 2.x is available both as ESM and UMD bundles.
- No tree-shaking concerns — the entire library is ~14KB.
- Compatible with any backend build pipeline (webpack, esbuild, Vite, no bundler).
- Alpine.js + htmx together is ~24KB total — still smaller than most UI frameworks alone.

## Testing Strategies

### Server-Side Focused Testing

Since htmx is primarily server-driven, testing focuses on the backend:

```python
# pytest example for Django + htmx
def test_contact_list_htmx(client):
    response = client.get('/contacts', HTTP_HX_REQUEST='true')
    assert response.status_code == 200
    assert 'partials/_contact_list.html' in response.templates
    assert 'hx-get' in response.content.decode()
```

### Browser Testing with Playwright

```javascript
test('infinite scroll loads more items', async ({ page }) => {
  await page.goto('/posts')
  const initialCount = await page.locator('.post').count()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForResponse(resp => resp.url().includes('/posts?page=2'))
  const newCount = await page.locator('.post').count()
  expect(newCount).toBeGreaterThan(initialCount)
})
```

### Key Testing Practices
- Test server endpoints with htmx headers — assert HTML fragment correctness.
- Test swap behavior by asserting DOM structure after hx-trigger.
- Use hx-on:htmx:beforeRequest for instrumentation in E2E tests.
- Test error scenarios: 422 for form errors, 404 for missing resources.

## Migration Patterns

### From jQuery AJAX to htmx

| jQuery Pattern | htmx Equivalent |
|----------------|-----------------|
| `$.get('/url', fn)` | `<button hx-get="/url" hx-target="#result">` |
| `$.post('/url', data, fn)` | `<form hx-post="/url" hx-target="#result">` |
| `$.ajax({error: fn})` | Server returns error HTML, CSS on .htmx-request errors |
| Manual loading spinner | `hx-indicator="#spinner"` |
| `$(el).html(html)` | `hx-swap="innerHTML"` |
| `$(el).replaceWith(html)` | `hx-swap="outerHTML"` |

**Migration strategy**: Wrap each AJAX interaction with htmx attributes. Remove jQuery AJAX calls as you go.

### From React to htmx

Fundamental architecture change (client to server rendering). Best for content-heavy apps:
- Replace useState/xhr with server state rendered as HTML.
- Replace React Router with hx-boost for navigation.
- Replace form libraries with hx-post + server validation (422).
- Keep Alpine.js for client-only UI state (modals, toggles).

## Anti-Patterns

1. **Returning JSON instead of HTML**: htmx expects HTML fragments. JSON responses are not processed.
2. **Full page reloads**: If server returns a full page instead of fragment, content doubles.
3. **Missing hx-target**: Defaults to swapping the triggering element, not the container.
4. **Forgetting 422 for validation errors**: Form validation errors must return 422 status.
5. **Not handling swap strategy**: innerHTML vs outerHTML selection changes behavior.
6. **Overusing hx-boost**: Some links need full page loads (downloads, external).
7. **No loading indicators**: Without hx-indicator or CSS on .htmx-request, users see no feedback.
8. **Missing CSRF tokens**: Add hx-headers for Django/Laravel.
9. **Multiple hx-trigger on one element**: Use a parent wrapper for multiple triggers.
10. **Not handling request errors**: Use hx-on:htmx:responseError for error handling.

## Common Pitfalls

1. Returning JSON instead of HTML — htmx processes HTML fragments only.
2. Full page reloads — server should return fragments, not full pages.
3. Missing hx-target — defaults to triggering element, not container.
4. Forgetting 422 for validation errors — forms need 422 for error state.
5. No loading indicators — use hx-indicator.

## Compared With

| Aspect | htmx | React | Alpine.js |
|--------|------|-------|-----------|
| Rendering | Server HTML | Client VDOM | Client DOM |
| State location | Server | Client state tree | DOM + Alpine.store |
| API responses | HTML fragments | JSON | JSON |
| Learning curve | Hours | Weeks | Days |
| Bundle size | ~14KB | ~120KB (min) | ~10KB |
| SEO | Full HTML | Needs SSR | HTML baseline |

## Server Integration Patterns

### Django
```python
def contact_list(request):
    if request.htmx:
        return render(request, 'contacts/_list.html', {'contacts': Contact.objects.all()})
    return render(request, 'contacts/index.html', {'contacts': Contact.objects.all()})
```

### Laravel
```php
Route::get('/contacts', function () {
    if (request()->header('HX-Request')) {
        return view('contacts/_list', ['contacts' => Contact::all()]);
    }
    return view('contacts/index', ['contacts' => Contact::all()]);
});
```

### Node/Express
```javascript
app.get('/contacts', (req, res) => {
  if (req.headers['hx-request']) {
    return res.render('contacts/_list', { contacts })
  }
  res.render('contacts/index', { contacts })
})
```

## Advanced Patterns

### Active Search
```html
<input type="search" name="q" hx-post="/search" hx-trigger="input changed delay:500ms, search" hx-target="#search-results" hx-indicator="#spinner">
```

### Lazy Loading with Placeholder
```html
<div hx-get="/graphs/revenue" hx-trigger="load"><img class="htmx-indicator" src="/spinner.gif"></div>
```

### Delete with Confirmation
```html
<button hx-delete="/contacts/1" hx-confirm="Delete contact?" hx-target="closest tr">Delete</button>
```

## Tooling

1. htmx DevTools browser extension
2. `hyperscript` — companion language (optional)
3. `alpinejs` — complementary for client interactivity
4. `django-htmx` — Django middleware
5. `flask-htmx` — Flask extension
6. `laravel-htmx` — Laravel package
7. `go-htmx` — Go middleware
8. `spring-htmx` — Spring Boot integration

## Rules
- Server returns HTML fragments, never JSON (unless explicitly for client-side templates).
- Use HATEOAS: server responses include links/forms for next actions.
- Choose the correct hx-swap strategy: innerHTML (default), outerHTML, beforeend (append), afterend.
- Use hx-trigger for custom events: click, change, submit, load, revealed, intersect, every.
- Form validation errors return 422 status with updated form HTML.
- Use hx-indicator to show loading states.
- Keep server endpoints idempotent when possible.

## References
  - references/htmx-advanced.md — htmx Advanced Patterns
  - references/htmx-deployment.md — htmx Deployment
  - references/htmx-fundamentals.md — Htmx Fundamentals
  - references/htmx-patterns.md — htmx Patterns & Best Practices
  - references/htmx-setup.md — htmx Setup Guide
  - references/htmx-testing.md — htmx Testing Reference
  - references/htmx-advanced-patterns.md — Advanced htmx Patterns
  - references/htmx-server-integration.md — htmx Server Integration Reference

## Handoff
No artifact produced.
Next skill: htmx-hyperscript (if client-side logic needed) or backend-htmx-integration.
Carry forward: hx-trigger/hx-target/hx-swap pattern, HTML-fragment responses, HATEOAS.

## Implementation Patterns

### HTMX Component Pattern

```html
<!-- Server-rendered component with HTMX -->
<div hx-target="this" hx-swap="outerHTML">
  <button hx-get="/api/component/counter"
          hx-trigger="click"
          hx-vals='{"action": "increment"}'>
    Count: {{ count }}
  </button>
</div>

<!-- Inline editing pattern -->
<div hx-target="this" hx-swap="outerHTML">
  <span hx-get="/api/component/edit/{{ id }}"
        hx-trigger="click"
        class="editable">
    {{ value }}
  </span>
</div>

<!-- Lazy loading pattern -->
<div hx-get="/api/component/heavy-content"
     hx-trigger="load"
     hx-swap="innerHTML">
  <div class="spinner">Loading...</div>
</div>

<!-- Infinite scroll -->
<div hx-get="/api/items?page=2"
     hx-trigger="revealed"
     hx-swap="afterend"
     hx-target="this">
</div>

<!-- Form validation -->
<form hx-post="/api/users"
      hx-target="#form-errors"
      hx-swap="innerHTML">
  <input type="text" name="email"
         hx-post="/api/validate/email"
         hx-trigger="change"
         hx-target="next .error">
  <div class="error"></div>
  <button type="submit">Submit</button>
</form>
<div id="form-errors"></div>
```

### Server-Side Handler Pattern

```python
from flask import Blueprint, request, render_template, jsonify

htmx = Blueprint('htmx', __name__)

@htmx.route('/api/component/counter')
def counter_component():
    action = request.form.get('action', 'increment')
    current = int(request.args.get('count', 0))
    if action == 'increment':
        current += 1
    elif action == 'decrement':
        current -= 1
    return render_template('components/_counter.html', count=current)

@htmx.route('/api/component/edit/<id>')
def edit_component(id):
    value = get_value(id)
    return render_template('components/_edit_form.html', id=id, value=value)

@htmx.route('/api/validate/email', methods=['POST'])
def validate_email():
    email = request.form.get('email', '')
    if '@' not in email:
        return '<span class="error">Invalid email</span>'
    return '<span class="success">Valid email</span>'
```

## Architecture Decision Trees

### SPA vs HTMX Decision

```
What's the interactivity requirement?
├── Simple CRUD, forms, navigation
│   └── HTMX + server-side rendering
│       ├── Less JavaScript, simpler architecture
│       ├── Server handles rendering
│       └── Faster initial load
│
├── Complex real-time UIs (drag-drop, drawing)
│   └── SPA (React, Vue, Svelte)
│       ├── Rich client interactivity
│       ├── Complex state management
│       └── More JavaScript overhead
│
├── Mixed (mostly simple, some complex)
│   └── HTMX for simple parts + SPA island for complex
│       └── Best of both worlds
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Returning JSON from HTMX endpoints | Client has to parse and render | Return HTML fragments directly |
| Using htmx for everything | Not appropriate for rich UIs | Use SPA for complex interactive parts |
| No loading indicators | Users don't know if request is working | Always use hx-indicator |
| Wrong swap strategy | Unexpected UI behavior | Choose correct hx-swap for each use case |
| Server endpoints not idempotent | Duplicate requests cause issues | GET should be safe, POST can repeat |

## Performance Optimization

- **Server-Sent Events for real-time updates**: Use HTMX with SSE (Server-Sent Events) for real-time push. SSE triggers HTMX requests to update specific elements. More efficient than polling.
- **View caching on server**: Cache rendered HTML fragments on server. Use response cache headers for HTMX responses. Avoid re-rendering unchanged components.
- **Morphdom swap for minimal DOM changes**: Use `hx-swap="morphdom"` for fine-grained DOM diffing. Only changes the parts of the element that actually changed. Reduces layout thrash.
