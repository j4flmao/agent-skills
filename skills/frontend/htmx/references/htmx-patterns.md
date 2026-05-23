# htmx Patterns & Best Practices

## Core Attribute Reference

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `hx-get` | GET request | `hx-get="/api/data"` |
| `hx-post` | POST request | `hx-post="/api/data"` |
| `hx-put` | PUT request | `hx-put="/api/data/1"` |
| `hx-patch` | PATCH request | `hx-patch="/api/data/1"` |
| `hx-delete` | DELETE request | `hx-delete="/api/data/1"` |
| `hx-target` | Target element for swap | `hx-target="#result"` |
| `hx-swap` | Swap strategy | `hx-swap="outerHTML"` |
| `hx-trigger` | When to fire request | `hx-trigger="mouseenter"` |
| `hx-indicator` | Loading indicator | `hx-indicator="#spinner"` |
| `hx-push-url` | Push URL to history | `hx-push-url="true"` |
| `hx-replace-url` | Replace current URL | `hx-replace-url="true"` |
| `hx-boost` | Enhance anchors/forms | `hx-boost="true"` |
| `hx-confirm` | Confirm dialog | `hx-confirm="Delete?"` |
| `hx-disable` | Disable htmx on element | `hx-disable` |
| `hx-encoding` | Encoding type | `hx-encoding="multipart/form-data"` |
| `hx-ext` | Enable extension | `hx-ext="json-enc"` |
| `hx-headers` | Custom headers | `hx-headers='{"X-Custom":"val"}'` |
| `hx-include` | Include values | `hx-include="#form1"` |
| `hx-params` | Filter params | `hx-params="not password"` |
| `hx-preserve` | Preserve element | `hx-preserve="true"` |
| `hx-prompt` | Prompt dialog | `hx-prompt="Enter name"` |
| `hx-select-oob` | Out-of-band swap | `hx-select-oob="#notif"` |
| `hx-select` | Select content to swap | `hx-select="#content"` |
| `hx-sync` | Sync requests | `hx-sync="this:replace"` |
| `hx-vals` | Include values (JSON) | `hx-vals='{"key":"val"}'` |

## Swap Strategies

| Strategy | Behavior |
|----------|----------|
| `innerHTML` | Replace content inside target (default) |
| `outerHTML` | Replace entire target element |
| `beforebegin` | Insert before target |
| `afterbegin` | Insert as first child of target |
| `beforeend` | Insert as last child of target |
| `afterend` | Insert after target |
| `delete` | Delete target element |
| `none` | No swap (use with HX-Trigger) |

## Trigger Modifiers

```html
<!-- Debounce input -->
<input hx-get="/search" hx-trigger="keyup changed delay:300ms">

<!-- Throttle -->
<div hx-get="/updates" hx-trigger="every 2s">

<!-- Once -->
<button hx-post="/action" hx-trigger="click once">Do Once</button>

<!-- From another element -->
<div hx-get="/details" hx-trigger="click from:#btn">

<!-- Filter by key -->
<input hx-get="/search" hx-trigger="keyup[keyCode==13]">

<!-- Multiple triggers -->
<div hx-get="/data"
     hx-trigger="click, keyup[keyCode==13] from:body">
</div>

<!-- Intersection observer -->
<img hx-get="/analytics/track" hx-trigger="intersect once">
```

## Indicators

```html
<!-- Element-level indicator (CSS class htmx-indicator) -->
<button hx-get="/data" hx-indicator="#spinner">
  Load
  <img id="spinner" class="htmx-indicator" src="/spinner.gif">
</button>

<!-- CSS for built-in indicator -->
<style>
  .htmx-indicator {
    opacity: 0;
    transition: opacity 0.3s;
  }
  .htmx-request .htmx-indicator {
    opacity: 1;
  }
</style>

<!-- Using request class -->
<style>
  button.htmx-request {
    opacity: 0.7;
    cursor: wait;
  }
</style>
```

## HATEOAS Patterns

### Server Returns Next Actions

```html
<!-- Server response for /contacts/1 -->
<div id="contact-detail" hx-target="this" hx-swap="outerHTML">
  <h2>John Doe</h2>
  <p>Email: john@example.com</p>

  <!-- Server includes available actions -->
  <button hx-get="/contacts/1/edit">Edit</button>
  <button hx-delete="/contacts/1"
          hx-confirm="Delete this contact?"
          hx-target="#contact-list"
          hx-swap="outerHTML">Delete</button>
  <a href="/contacts">Back to list</a>
</div>
```

### Validation Pattern

```python
# Server returns 422 with error HTML
def create_contact(request):
    form = ContactForm(request.POST)
    if form.is_valid():
        contact = form.save()
        return render(request, 'contacts/_row.html', {'contact': contact})
    else:
        # Return form with errors, 422 status
        response = render(request, 'contacts/_form.html', {'form': form})
        response.status_code = 422
        return response
```

```html
<!-- response-targets extension catches < 500 errors -->
<form hx-post="/contacts"
      hx-target="this"
      hx-swap="outerHTML"
      hx-ext="response-targets">
  <input name="email" value="{{ form.email.value }}">
  <span class="error">{{ form.email.errors }}</span>
  <button>Save</button>
</form>
```

## Out-of-Band Swaps

```html
<!-- Server sends multiple updates in one response -->
<div id="content" hx-swap-oob="true">
  Updated main content
</div>

<div id="notification" hx-swap-oob="true">
  <p>Contact saved successfully!</p>
</div>
```

## Progressive Enhancement

```html
<!-- Full page reload works without JS -->
<a href="/contacts/1" class="enhanced-link"
   hx-get="/contacts/1"
   hx-target="#main"
   hx-push-url="true">
  View Contact
</a>

<!-- Form works without JS too -->
<form action="/contacts" method="POST"
      hx-post="/contacts"
      hx-target="#contact-list"
      hx-swap="beforeend">
  <input name="name" required>
  <button type="submit">Add</button>
</form>
```

## Boosting

```html
<!-- Enhance entire page -->
<body hx-boost="true">
  <a href="/about">About</a>  <!-- Now AJAX -->
  <a href="/contact">Contact</a>
  <a href="/logout" hx-boost="false">Logout</a>  <!-- Full page -->
</body>
```

## History Management

```html
<!-- Tabbed interface with history -->
<div hx-get="/tabs/profile"
     hx-target="#tab-content"
     hx-trigger="click"
     hx-push-url="true"
     class="tab active">
  Profile
</div>

<div id="tab-content">
  <!-- Tab content loaded here -->
</div>

<!-- Server sets the title in response head -->
<title>Profile - My App</title>
```

## Morphing

```html
<!-- Use morphdom for smoother updates -->
<div hx-get="/widget"
     hx-swap="morphdom"
     hx-ext="morphdom-swap">
  Widget content
</div>
```

## Server Examples

### Django

```python
# views.py
from django.shortcuts import render, get_object_or_404

def todo_list(request):
    todos = Todo.objects.all()
    return render(request, 'todos/_list.html', {'todos': todos})

def todo_create(request):
    todo = Todo.objects.create(title=request.POST['title'])
    return render(request, 'todos/_item.html', {'todo': todo})

def todo_toggle(request, pk):
    todo = get_object_or_404(Todo, pk=pk)
    todo.completed = not todo.completed
    todo.save()
    return render(request, 'todos/_item.html', {'todo': todo})

def todo_delete(request, pk):
    get_object_or_404(Todo, pk=pk).delete()
    return HttpResponse('')
```

### Go (Chi + Templ)

```go
r.Get("/contacts", func(w http.ResponseWriter, r *http.Request) {
    contacts := getContacts()
    w.Header().Set("Content-Type", "text/html")
    component(contacts).Render(r.Context(), w)
})

r.Post("/contacts", func(w http.ResponseWriter, r *http.Request) {
    contact := createContact(r.FormValue("name"))
    w.Header().Set("Content-Type", "text/html")
    component(contact).Render(r.Context(), w)
})

r.Delete("/contacts/{id}", func(w http.ResponseWriter, r *http.Request) {
    deleteContact(r.PathValue("id"))
    w.WriteHeader(200)
})
```

## Anti-Patterns to Avoid

1. **Returning JSON** — htmx expects HTML fragments; JSON defeats the hypermedia approach
2. **Client-side templates** — let the server render HTML
3. **Nested interactive components** — each component should manage its own htmx requests
4. **Overriding default behavior aggressively** — `hx-boost` works well for most links
5. **Ignoring progressive enhancement** — ensure pages work without JavaScript
6. **Too many small requests** — batch related content into one endpoint
7. **Missing loading states** — always use `hx-indicator` for async operations
