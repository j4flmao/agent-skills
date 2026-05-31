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

## Workflow

### Step 1: Include htmx
```html
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2/dist/htmx.min.js"></script>
```

### Step 2: Basic AJAX
```html
<button hx-get="/contacts" hx-target="#contact-list" hx-swap="innerHTML">
  Load Contacts
</button>
<div id="contact-list"></div>

<form hx-post="/contacts" hx-target="#contact-list" hx-swap="beforeend">
  <input name="name" required>
  <button type="submit">Add</button>
</form>
```

### Step 3: Lazy Loading
```html
<div hx-get="/graphs/revenue" hx-trigger="load" hx-swap="innerHTML">
  <img class="htmx-indicator" src="/spinner.gif">
</div>
```

### Step 4: Infinite Scroll
```html
<div hx-get="/posts?page=2" hx-trigger="revealed" hx-target="this" hx-swap="afterend">
</div>
```

### Step 5: Optimistic UI and Error Handling
```html
<button hx-post="/items"
        hx-target="#items"
        hx-swap="beforeend"
        hx-on:htmx:before-request="this.classList.add('disabled')"
        hx-on:htmx:after-request="this.classList.remove('disabled')"
        hx-indicator="#spinner">
  Add Item
</button>
```

### Step 6: Server-Side HATEOAS
```python
# views.py
def contact_list(request):
    contacts = Contact.objects.all()
    return render(request, 'contacts/_list.html', {'contacts': contacts})

def create_contact(request):
    form = ContactForm(request.POST)
    if form.is_valid():
        contact = form.save()
        return render(request, 'contacts/_row.html', {'contact': contact})
    return render(request, 'contacts/_form.html', {'form': form}, status=422)

def delete_contact(request, pk):
    contact = get_object_or_404(Contact, pk=pk)
    contact.delete()
    return HttpResponse("")
```

### Step 7: Boost All Links and Forms
```html
<body hx-boost="true">
  <!-- All links and forms use AJAX automatically -->
  <a href="/about">About</a>
  <form action="/search" method="get">
    <input name="q">
    <button type="submit">Search</button>
  </form>
</body>
```

### Step 8: Confirmation Dialogs
```html
<button hx-delete="/contact/1" hx-confirm="Are you sure you want to delete?">
  Delete
</button>
```

## Component Architecture

### htmx Request Pattern Decision
```
What triggers the request?
├── User clicks -> hx-trigger="click" (default for buttons/links)
├── Form submit -> hx-trigger="submit" (default for forms)
├── Page load -> hx-trigger="load"
├── Element visible -> hx-trigger="revealed"
├── Input change -> hx-trigger="change, keyup delay:300ms"
├── Polling -> hx-trigger="every 5s"
├── Intersection -> hx-trigger="intersect threshold:0.5"
└── Custom event -> hx-trigger="custom-event from:window"

Where to swap the response?
├── Replace the target's content -> hx-swap="innerHTML"
├── Replace the target itself -> hx-swap="outerHTML"
├── Insert before target -> hx-swap="beforebegin"
├── Insert after target -> hx-swap="afterend"
├── Append inside target -> hx-swap="beforeend"
├── Prepend inside target -> hx-swap="afterbegin"
├── No swap (just execute) -> hx-swap="none"
└── Delete the target -> hx-swap="delete"
```

## Common Pitfalls

1. **Returning JSON instead of HTML**: htmx expects HTML fragments. JSON responses are not processed.
2. **Full page reloads**: If server returns a full page instead of fragment, content doubles.
3. **Missing hx-target**: Requests default to swapping the triggering element, not the container.
4. **Forgetting 422 for validation errors**: Form validation errors must return 422 status.
5. **Not handling swap strategy**: innerHTML vs outerHTML selection changes behavior significantly.
6. **Overusing hx-boost**: Not all links should be boosted — some need full page loads (downloads, external).
7. **No loading indicators**: Without hx-indicator or CSS on .htmx-request, users see no feedback.

## Best Practices

1. Return HTML fragments, never JSON (unless explicitly for client-side templates).
2. Use HATEOAS — server responses include links/forms for next actions.
3. Choose hx-swap strategy carefully: innerHTML (default), outerHTML, beforeend, afterend.
4. Form validation errors return 422 with updated form HTML.
5. Use hx-indicator to show loading states — CSS class htmx-request is added automatically.
6. Use hx-boost on body to enhance all links and forms with AJAX.
7. Keep server endpoints idempotent when possible.

## Compared With

| Aspect | htmx | React | Alpine.js |
|--------|------|-------|-----------|
| Rendering | Server HTML | Client VDOM | Client DOM |
| State location | Server | Client state tree | DOM + Alpine.store |
| API responses | HTML fragments | JSON | JSON |
| Learning curve | Hours | Weeks | Days |
| Bundle size | ~14KB | ~120KB (min) | ~10KB |
| SEO | Full HTML | Needs SSR | HTML baseline |
| Offline support | Limited | Via service worker | Via SW |

## Performance

1. htmx is ~14KB min+gzip — negligible bundle cost.
2. Requests return HTML fragments (smaller than full page, larger than JSON).
3. Server rendering time adds latency vs client rendering.
4. Partial swaps reduce DOM diffing to target elements only.
5. hx-trigger="load" defers rendering to after initial paint (improves LCP).
6. Caching: traditional HTTP caching works (ETags, Last-Modified).
7. Boosting enables view-transitions for smooth navigation.

## Tooling

1. htmx browser DevTools extension — inspect htmx requests and responses.
2. `hyperscript` — companion language for event handling (optional).
3. `alpinejs` — complementary for client-side interactivity (tabs, modals).
4. `django-htmx` — Django middleware and decorators.
5. `flask-htmx` — Flask extension for htmx request detection.
6. `laravel-htmx` — Laravel package with helpers.
7. `go-htmx` — Go middleware for htmx headers.
8. `spring-htmx` — Spring Boot integration.

## Rules
- Server returns HTML fragments, never JSON (unless explicitly for client-side templates).
- Use HATEOAS: server responses include links/forms for next actions.
- Choose the correct hx-swap strategy: innerHTML (default), outerHTML, beforeend (append), afterend.
- Use hx-trigger for custom events: click, change, submit, load, revealed, intersect, every.
- Form validation errors return 422 status with updated form HTML.
- Use hx-indicator to show loading states — CSS class htmx-request is added automatically.
- Use hx-boost on body to enhance all links and forms with AJAX.
- Keep server endpoints idempotent when possible (GET for reads, POST for mutations).

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
