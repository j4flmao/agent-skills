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
- [ ] AJAX requests use `hx-get`, `hx-post`, `hx-put`, `hx-patch`, or `hx-delete`.
- [ ] Responses are HTML fragments, not JSON.
- [ ] Target element specified with `hx-target` or defaults to the triggering element.
- [ ] Swap strategy chosen: innerHTML, outerHTML, beforebegin, afterbegin, beforeend, afterend.
- [ ] HATEOAS: server returns next-available actions as hypermedia links.
- [ ] History and URL updates via `hx-push-url` or `hx-replace-url`.
- [ ] Validation and feedback via `hx-trigger`, `hx-indicator`, `hx-disable`.

### Max Response Length
~4096 tokens.

## Workflow

### Step 1: Include htmx
```html
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2/dist/htmx.min.js"></script>
```

### Step 2: Basic AJAX
```html
<!-- Click to load content -->
<button hx-get="/contacts" hx-target="#contact-list" hx-swap="innerHTML">
  Load Contacts
</button>
<div id="contact-list"></div>

<!-- Form submission -->
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

### Step 5: Optimistic UI + Error Handling
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

### Step 6: Server-Side HATEOAS (Example: Django)
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
    return HttpResponse("")  # Empty response removes the row
```

## Rules
- Server returns HTML fragments, never JSON (unless explicitly for client-side templates).
- Use HATEOAS: server responses include links/forms for next actions.
- Choose the correct `hx-swap` strategy: innerHTML (default), outerHTML, beforeend (append), afterend (insert after).
- Use `hx-trigger` for custom events: `click`, `change`, `submit`, `load`, `revealed`, `intersect`.
- Form validation errors return 422 status with updated form HTML.
- Use `hx-indicator` to show loading states — CSS class `htmx-request` is added automatically.
- Use `hx-boost` on `<body>` to enhance all links and forms with AJAX.
- Keep server endpoints idempotent when possible (GET for reads, POST for mutations).

## References
  - references/htmx-advanced.md — htmx Advanced Patterns
  - references/htmx-deployment.md — htmx Deployment
  - references/htmx-fundamentals.md — Htmx Fundamentals
  - references/htmx-patterns.md — htmx Patterns & Best Practices
  - references/htmx-setup.md — htmx Setup Guide
  - references/htmx-testing.md — htmx Testing Reference
## Handoff
No artifact produced.
Next skill: htmx-hyperscript (if client-side logic needed) or backend-htmx-integration.
Carry forward: hx-trigger/hx-target/hx-swap pattern, HTML-fragment responses, HATEOAS.
