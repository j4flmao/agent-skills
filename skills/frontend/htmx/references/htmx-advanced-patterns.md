# htmx Advanced Patterns

## Overview

Advanced htmx patterns cover complex interactions beyond basic AJAX loading: optimistic UI, polling, server-sent events, WebSocket integration, history management, view transitions, animation, client-side templates, web components, keyboard shortcuts, multi-step forms, and sophisticated validation flows.

## Optimistic UI

### Optimistic Add

```html
<button hx-post="/items"
        hx-target="#items"
        hx-swap="beforeend"
        hx-on:htmx:before-request="addOptimisticItem()">
  Add Item
</button>
<ul id="items">
  <!-- existing items -->
</ul>
```

```javascript
function addOptimisticItem() {
  const items = document.getElementById('items')
  const li = document.createElement('li')
  li.id = 'optimistic-item'
  li.className = 'optimistic'
  li.innerHTML = `
    <span>Adding...</span>
    <span class="spinner"></span>
  `
  items.appendChild(li)
}
```

With server confirmation:

```html
<button hx-post="/items"
        hx-target="#items"
        hx-swap="beforeend"
        hx-on:htmx:before-request="document.getElementById('items').insertAdjacentHTML('beforeend',
          '<li class=\\'optimistic\\'>Adding... <span class=\\'spinner\\'></span></li>'
        )"
        hx-on:htmx:after-on-error="document.querySelector('.optimistic').remove()">
  Add Item
</button>
```

## Polling

### Basic Polling

```html
<div hx-get="/notifications" hx-trigger="every 10s" hx-swap="innerHTML">
  <!-- Notifications loaded and refreshed every 10 seconds -->
</div>
```

### Polling with Conditional Stop

```html
<!-- Server returns 286 (hx-stop-polling) to stop -->
<div hx-get="/job-status" hx-trigger="every 2s" hx-swap="innerHTML">
  Checking job status...
</div>
```

Server response to stop polling:

```python
def job_status(request):
    job = get_job(request.GET.get('job_id'))
    if job.completed:
        response = render(request, 'job/_complete.html', {'job': job})
        response.status_code = 286  # htmx stops polling
        return response
    return render(request, 'job/_progress.html', {'job': job})
```

### Polling on Visibility

```html
<div hx-get="/live-data"
     hx-trigger="every 5s"
     hx-target="this"
     hx-swap="innerHTML"
     hx-on:htmx:before-request="if (document.hidden) return false">
  <!-- Only polls when tab is visible -->
</div>
```

## Server-Sent Events

### SSE with htmx

```html
<div hx-sse="connect:/events swap:message">
  <div hx-get="/initial-data" hx-trigger="load">
    Loading initial data...
  </div>
</div>
```

```python
# Server (Django with StreamingHttpResponse)
import json
import time

def event_stream(request):
    def event_generator():
        while True:
            data = {'message': 'Hello at ' + time.strftime('%H:%M:%S')}
            yield f"event: message\ndata: {json.dumps(data)}\n\n"
            time.sleep(2)  # or use asyncio.sleep in async view

    return StreamingHttpResponse(
        event_generator(),
        content_type='text/event-stream',
    )
```

### SSE for Live Updates

```html
<div hx-sse="connect:/prices-stream swap:price-update">
  <div id="prices">
    <div hx-get="/initial-prices" hx-trigger="load">
      Loading prices...
    </div>
  </div>
</div>
```

```python
# Server sends SSE events
def price_stream(request):
    def event_generator():
        while True:
            price_data = get_latest_prices()
            html = render_to_string('prices/_table.html', {'prices': price_data})
            yield f"event: price-update\ndata: {html}\n\n"
            time.sleep(1)

    return StreamingHttpResponse(
        event_generator(),
        content_type='text/event-stream',
    )
```

## WebSocket

```html
<!-- Client side -->
<div hx-ws="connect:wss://example.com/chat">
  <form hx-ws="send" hx-target="#messages">
    <input name="message" required />
    <button type="submit">Send</button>
  </form>
  <div id="messages" hx-ws="receive">
    <!-- Messages appear here via WebSocket -->
  </div>
</div>
```

```python
# Server (using channels or websocket library)
import asyncio
import json

connected_clients = set()

async def chat_handler(websocket, path):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            # Broadcast to all connected clients
            html = f'<div class="message"><strong>{data["user"]}:</strong> {data["text"]}</div>'
            for client in connected_clients:
                await client.send(json.dumps({
                    'HEADERS': {'HX-Trigger': 'new-message'},
                    'body': html,
                }))
    finally:
        connected_clients.remove(websocket)
```

## History Management

### Push URL on Navigation

```html
<!-- Update URL when content loads -->
<a hx-get="/page/2"
   hx-target="#content"
   hx-push-url="true">
  Next Page
</a>

<!-- Replace URL (no history entry) -->
<a hx-get="/search?q=term"
   hx-target="#results"
   hx-replace-url="true">
  Search
</a>
```

### History Restoration

When user clicks back/forward, htmx restores the page state from cache:

```html
<body hx-history="true">
  <!-- htmx saves and restores content on history navigation -->
</body>
```

To handle history restoration events:

```html
<body hx-on:htmx:history-restore="initPageState(event)">
  <!-- Restore page-specific state -->
</body>
```

## View Transitions

### Basic View Transition (htmx 2.x)

```html
<body hx-boost="true">
  <a href="/about" hx-target="body" hx-swap="innerHTML show:window:top">
    About
  </a>
</body>
```

```css
/* CSS view transitions */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

.htmx-settling {
  animation: fade-in 0.3s ease;
}
```

### Custom Route Transitions

```css
/* Page transition for boosted links */
@keyframes slide-in-right {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.htmx-settling {
  animation: slide-in-right 0.3s ease;
}
```

## Animation Patterns

### Loading State Animation

```css
/* htmx adds .htmx-request during requests */
div.htmx-request {
  opacity: 0.5;
  transition: opacity 0.2s;
}

div.htmx-request::after {
  content: '';
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-left: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Swap Animations

```css
/* New content fade-in */
.htmx-added {
  animation: fade-in 0.3s ease;
}

/* Removed content fade-out */
.htmx-removed {
  animation: fade-out 0.3s ease;
}

/* Swapping content */
.htmx-swapping {
  animation: fade-out 0.3s ease;
  opacity: 0;
}
```

### Morph Swap (Smooth Transitions)

```html
<div hx-get="/content"
     hx-target="this"
     hx-swap="morph">
  <!-- Morphs smoothly between old and new content -->
</div>
```

Requires the `idiomorph` extension:

```html
<script src="https://unpkg.com/idiomorph/dist/idiomorph-ext.min.js"></script>
```

## Client-Side Templates

### Template Rendering

```html
<script src="https://unpkg.com/htmx.org/dist/ext/client-side-templates.js"></script>

<div hx-ext="client-side-templates">
  <div hx-get="/api/users"
       hx-target="this"
       hx-swap="innerHTML"
       mustache-template="user-template">
    Loading...
  </div>

  <template id="user-template">
    {{#users}}
      <div class="user">
        <h3>{{name}}</h3>
        <p>{{email}}</p>
      </div>
    {{/users}}
    {{^users}}
      <p>No users found.</p>
    {{/users}}
  </template>
</div>
```

## Web Components Integration

### Wrapping htmx in a Web Component

```javascript
class HtmxWidget extends HTMLElement {
  connectedCallback() {
    const url = this.getAttribute('src')
    const target = this.getAttribute('target') || 'this'
    const trigger = this.getAttribute('trigger') || 'load'

    this.innerHTML = `
      <div hx-get="${url}"
           hx-target="${target}"
           hx-trigger="${trigger}"
           hx-swap="innerHTML">
        Loading...
      </div>
    `
    htmx.process(this)
  }
}

customElements.define('htmx-widget', HtmxWidget)
```

```html
<htmx-widget src="/widget/data" trigger="click"></htmx-widget>
```

## Keyboard Shortcuts

```html
<!-- Trigger action on Cmd+S (save shortcut) -->
<button hx-post="/save"
        hx-target="#status"
        hx-trigger="keydown[key=='s'&&(metaKey||ctrlKey)] from:window">
  Save
</button>

<!-- Search on Enter in input -->
<input name="q"
       hx-get="/search"
       hx-target="#results"
       hx-trigger="keydown[key=='Enter']"
       hx-swap="innerHTML" />

<!-- Multiple keyboard shortcuts -->
<div hx-get="/help"
     hx-trigger="keydown[key=='h'&&metaKey] from:window"
     hx-target="#help-modal"
     hx-swap="innerHTML">
  Press Cmd+H for help
</div>
```

## Multi-Step Forms

### Server-Driven Wizard

```python
# views.py
def wizard_step(request):
    step = int(request.GET.get('step', 1))
    data = request.session.get('wizard_data', {})

    if request.method == 'POST':
        step = int(request.POST.get('step', 1))

        if step == 1:
            data['name'] = request.POST.get('name')
            data['email'] = request.POST.get('email')
            request.session['wizard_data'] = data
            return render(request, 'wizard/_step2.html', {'data': data})

        elif step == 2:
            data['address'] = request.POST.get('address')
            data['phone'] = request.POST.get('phone')
            request.session['wizard_data'] = data
            return render(request, 'wizard/_step3.html', {'data': data})

        elif step == 3:
            # Final submission
            create_user(data)
            del request.session['wizard_data']
            return render(request, 'wizard/_complete.html')

    return render(request, 'wizard/_step1.html')
```

```html
<div id="wizard" hx-target="this" hx-swap="innerHTML">
  <div hx-get="/wizard/step?step=1" hx-trigger="load">
    Loading wizard...
  </div>
</div>
```

```html
<!-- _step1.html -->
<form hx-post="/wizard/step">
  <input type="hidden" name="step" value="1">
  <label>Name: <input name="name" value="{{data.name}}" required></label>
  <label>Email: <input name="email" type="email" value="{{data.email}}" required></label>
  <button type="submit">Next</button>
</form>
```

## Advanced Form Validation

### Live Validation on Blur

```html
<form hx-post="/register" hx-target="#form-errors">
  <div class="field">
    <label>Email</label>
    <input name="email"
           type="email"
           hx-post="/validate/email"
           hx-target="next .field-error"
           hx-trigger="blur"
           hx-swap="innerHTML"
           required />
    <div class="field-error"></div>
  </div>

  <div class="field">
    <label>Username</label>
    <input name="username"
           hx-post="/validate/username"
           hx-target="next .field-error"
           hx-trigger="keyup delay:500ms, blur"
           hx-swap="innerHTML"
           required />
    <div class="field-error"></div>
  </div>

  <button type="submit">Register</button>
  <div id="form-errors"></div>
</form>
```

```python
# Django validator view
def validate_email(request):
    email = request.POST.get('email', '')
    if User.objects.filter(email=email).exists():
        return HttpResponse(
            '<span class="error">Email already registered</span>',
            status=422
        )
    if '@' not in email:
        return HttpResponse(
            '<span class="error">Invalid email format</span>',
            status=422
        )
    return HttpResponse('<span class="success">Valid email</span>')
```

### Debounced Server-Side Validation

```html
<input name="username"
       hx-post="/check-username"
       hx-trigger="keyup changed delay:500ms"
       hx-target="#username-feedback"
       hx-swap="innerHTML">
<div id="username-feedback"></div>
```

## Infinite Scroll Pattern

```html
<div id="content"
     hx-get="/posts?page=1"
     hx-trigger="load"
     hx-target="this"
     hx-swap="innerHTML">
  Loading posts...
</div>
```

```html
<!-- Posts list — trigger revealed on last item loads next page -->
<div id="posts">
  <!-- page 1 posts rendered by server -->
  <div class="scroll-trigger"
       hx-get="/posts?page=2"
       hx-trigger="revealed"
       hx-target="#posts"
       hx-swap="beforeend">
  </div>
</div>
```

## Dynamic Filters

### Filter with URL Sync

```html
<div hx-target="#results" hx-push-url="true">
  <select name="category"
          hx-get="/products"
          hx-trigger="change">
    <option value="">All Categories</option>
    <option value="electronics">Electronics</option>
    <option value="clothing">Clothing</option>
  </select>

  <input name="q"
         placeholder="Search..."
         hx-get="/products"
         hx-trigger="keyup changed delay:300ms">

  <button name="sort" value="price_asc"
          hx-get="/products"
          hx-trigger="click">
    Price: Low to High
  </button>
</div>

<div id="results">
  <!-- Product listing -->
</div>
```

## Lazy Loading with Intersection Observer

```html
<div hx-get="/heavy-component"
     hx-trigger="intersect threshold:0.1"
     hx-swap="innerHTML"
     style="height: 400px">
  <div class="placeholder">Scroll to load...</div>
</div>

<div hx-get="/analytics-widget"
     hx-trigger="intersect rootMargin:200px"
     hx-swap="innerHTML"
     style="height: 300px">
  <div class="placeholder">Loading analytics...</div>
</div>
```

## Event Bubbling and Delegation

### Global Event Handlers

```html
<body hx-on:htmx:config-request="configureRequest(event)"
      hx-on:htmx:response-error="handleError(event)"
      hx-on:htmx:after-request="updateUI(event)">

  <script>
    function configureRequest(event) {
      event.detail.headers['X-CSRF-Token'] = getCSRFToken()
    }

    function handleError(event) {
      if (event.detail.xhr.status === 401) {
        window.location.href = '/login'
      }
      if (event.detail.xhr.status === 403) {
        alert('You do not have permission to perform this action')
      }
    }

    function updateUI(event) {
      if (event.detail.successful) {
        document.getElementById('last-updated').textContent =
          'Updated: ' + new Date().toLocaleTimeString()
      }
    }
  </script>
</body>
```

### Custom Event Trigger

```html
<!-- Component that triggers a custom event -->
<button hx-post="/cart/add"
        hx-target="#cart-count"
        hx-trigger="click"
        hx-on:htmx:after-request="htmx.trigger('body', 'cart-updated')">
  Add to Cart
</button>

<!-- Listen for the custom event -->
<div hx-get="/cart/summary"
     hx-trigger="cart-updated from:body"
     hx-target="this"
     hx-swap="innerHTML">
  Cart summary
</div>
```

## Hyperscript Integration

```html
<button _="on click
          put 'Saving...' into my innerHTML
          wait for htmx:afterRequest
          put 'Saved!' into my innerHTML
          wait 2s
          put 'Save' into my innerHTML">
  Save
</button>

<div _="on htmx:beforeRequest from closest <form/>
          add @disabled to <button/> in me">
  <button type="submit">Submit</button>
</div>
```

## Error State UI

```html
<div hx-get="/data"
     hx-target="this"
     hx-swap="innerHTML"
     hx-on:htmx:response-error="
       this.innerHTML = '<div class=\\'error\\'>Failed to load. <button onclick=\\'htmx.trigger(this, \\'click\\')\\'>Retry</button></div>'
     ">
  Loading...
</div>
```

## Accessibility

### ARIA Attributes

```html
<button hx-get="/menu"
        hx-target="#menu"
        hx-swap="outerHTML"
        aria-haspopup="true"
        aria-expanded="false"
        hx-on:htmx:after-request="
          this.setAttribute('aria-expanded', 'true')
        ">
  Menu
</button>
```

### Loading State for Screen Readers

```html
<div hx-get="/content"
     hx-target="this"
     hx-trigger="load"
     role="region"
     aria-live="polite"
     aria-busy="true"
     hx-on:htmx:after-request="
       this.setAttribute('aria-busy', 'false')
     ">
  <span class="sr-only">Loading content...</span>
</div>
```

## Debugging

### Event Logging

```html
<body hx-on:htmx:after-request="console.log('Request completed:', event.detail)">
  <!-- Logs all htmx request completions -->
</body>
```

### Development Tools

```javascript
// Enable htmx verbose logging
htmx.config.allowEval = true
htmx.logAll()

// Log specific events
htmx.on('htmx:beforeRequest', (evt) => {
  console.log('Request:', evt.detail.requestConfig)
})

htmx.on('htmx:afterSwap', (evt) => {
  console.log('Swapped:', evt.detail.target)
})
```
