# htmx Advanced Patterns

## WebSocket Integration

```html
<div hx-ws="connect:/chatroom">
  <ul id="messages" hx-ws="send">
    {{#each messages}}
      <li>{{this}}</li>
    {{/each}}
  </ul>
  <form hx-ws="send" hx-trigger="submit">
    <input name="message">
    <button type="submit">Send</button>
  </form>
</div>
```

```python
# server example with WebSocket
async def chatroom_handler(ws):
    async for msg in ws:
        # Broadcast to all connected clients
        await ws.send(f"<li>{msg}</li>")
```

## Server-Sent Events (SSE)

```html
<div hx-sse="connect:/events swap:message">
  <div hx-get="/initial-data" hx-trigger="load"></div>
</div>
```

## History Management

```html
<a hx-get="/page/2" hx-push-url="true">Next Page</a>
<button hx-get="/search" hx-replace-url="true">Search</button>
```

```js
// Intercept history events
document.body.addEventListener('htmx:historyRestore', (e) => {
  console.log('Restored:', e.detail.path)
})
```

## Confirmation Patterns

```html
<button hx-delete="/item/123"
        hx-confirm="Are you sure you want to delete this item?"
        hx-target="#items">
  Delete
</button>
```

## Multi-Trigger Patterns

```html
<div hx-get="/search"
     hx-trigger="keyup changed delay:300ms, search from:document"
     hx-target="#results">
  <input name="q" type="search">
</div>
```

## Loading States

```html
<button hx-post="/submit"
        hx-indicator="#spinner"
        hx-disabled-elt="this">
  Submit
</button>
<div id="spinner" class="htmx-indicator">
  <img src="/spinner.gif"> Processing...
</div>
```

```css
button.htmx-request { opacity: 0.6; cursor: wait; }
.htmx-indicator { display: none; }
.htmx-request .htmx-indicator { display: inline; }
```

## Cascading Selections

```html
<select name="country" hx-get="/cities" hx-target="#cities"
        hx-trigger="change">
  <option value="us">USA</option>
  <option value="ca">Canada</tr>
</select>

<select id="cities" name="city">
  <option>Select a country first</option>
</select>
```

## Out-of-Band Swaps

```html
<!-- Response HTML can target multiple elements -->
<div id="main-content">
  Updated content
</div>
<div id="notification" hx-swap-oob="true">
  <div class="alert alert-success">Saved!</div>
</div>
```

## Custom Events

```html
<button hx-post="/items" hx-trigger="click"
        hx-on::before-request="console.log('starting')"
        hx-on::after-request="console.log('done')"
        hx-on::send-error="handleError(event)">
  Save
</button>
```

```js
// Custom event dispatch
document.body.addEventListener('refresh-list', () => {
  htmx.trigger('#list', 'htmx:load')
})

// Trigger from server response
htmx.ajax('GET', '/items', { target: '#list', swap: 'innerHTML' })
```

## JSON Support

```html
<div hx-get="/api/data"
     hx-trigger="load"
     hx-ext="json-enc"
     hx-headers='{"Accept": "application/json"}'>
</div>
```

## Extension Patterns

```html
<!-- Include extensions -->
<script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/json-enc.js"></script>
<script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/disable-element.js"></script>
<script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/path-deps.js"></script>

<!-- Use extensions -->
<form hx-ext="json-enc, disable-element" hx-post="/api/submit">
  <input name="email" type="email">
  <button type="submit" hx-disable-element="this">Submit</button>
</form>
```

## Preloading

```html
<body hx-ext="preload">
  <a href="/products" hx-preload="mouseover">Products</a>
</body>
```

## Debug Mode

```html
<script>
  htmx.config.historyEnabled = true
  htmx.config.defaultSettleDelay = 20
  htmx.config.defaultSwapDelay = 0
  htmx.logAll()  // Log all htmx events
</script>
```
