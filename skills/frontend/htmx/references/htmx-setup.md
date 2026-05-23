# htmx Setup Guide

## Installation

### CDN

```html
<!-- htmx 2.x (latest) -->
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2/dist/htmx.min.js"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.3/dist/htmx.min.js"></script>

<!-- With integrity hash -->
<script src="https://unpkg.com/htmx.org@2.0.3/dist/htmx.min.js"
        integrity="sha384-xxxxxxxxxxx"
        crossorigin="anonymous"></script>
```

### npm

```bash
npm install htmx.org
```

```js
// ES modules
import 'htmx.org'

// CommonJS
require('htmx.org')

// Or as a module with custom config
import htmx from 'htmx.org'
htmx.config.globalViewTransitions = true
```

### WebJars (Java)

```xml
<dependency>
  <groupId>org.webjars.npm</groupId>
  <artifactId>htmx.org</artifactId>
  <version>2.0.3</version>
</dependency>
```

## Configuration

```html
<!-- Meta-driven config -->
<meta name="htmx-config" content='{"globalViewTransitions":"true"}'>

<!-- Or via JavaScript -->
<script>
  htmx.config.historyEnabled = true
  htmx.config.historyCacheSize = 20
  htmx.config.refreshOnHistoryMiss = false
  htmx.config.defaultSwapStyle = 'innerHTML'
  htmx.config.defaultSettleDelay = 20
  htmx.config.includeIndicatorStyles = true
  htmx.config.indicatorClass = 'htmx-indicator'
  htmx.config.requestClass = 'htmx-request'
  htmx.config.addedClass = 'htmx-added'
  htmx.config.settleClass = 'htmx-settling'
  htmx.config.swappingClass = 'htmx-swapping'
  htmx.config.allowEval = true
  htmx.config.allowScriptTags = true
  htmx.config.inlineScriptNonce = ''
  htmx.config.disableSelector = '[hx-disable], [data-hx-disable]'
  htmx.config.scrollBehavior = 'smooth'
  htmx.config.defaultFocusScroll = true
  htmx.config.getCacheBusterParam = false
  htmx.config.globalViewTransitions = false
  htmx.config.methodsThatUseUrlParams = ['get']
  htmx.config.selfRequestsOnly = false
  htmx.config.ignoreTitle = false
  htmx.config.scrollIntoViewOnBoost = true
  htmx.config.triggerSpecsCache = null
</script>
```

## Extensions

```html
<!-- Include extension -->
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2/dist/ext/json-enc.js"></script>

<!-- Use extension -->
<form hx-post="/api/submit" hx-ext="json-enc">
  <input name="email">
  <button>Submit</button>
</form>
```

### Built-in Extensions

| Extension | Purpose | CDN Path |
|-----------|---------|----------|
| `json-enc` | JSON-encode form bodies | `ext/json-enc.js` |
| `ajax-header` | Include X-Requested-With | `ext/ajax-header.js` |
| `class-tools` | CSS class manipulation | `ext/class-tools.js` |
| `response-targets` | Swap on HTTP response codes | `ext/response-targets.js` |
| `disable-element` | Disable element during request | `ext/disable-element.js` |
| `include-vals` | Include additional values | `ext/include-vals.js` |
| `preload` | Preload linked content | `ext/preload.js` |
| `restored` | Fire event on history restore | `ext/restored.js` |
| `alpine-morph` | Morph Alpine.js components | `ext/alpine-morph.js` |
| `path-deps` | Path-based dependencies | `ext/path-deps.js` |
| `head-support` | Merge head elements | `ext/head-support.js` |
| `loading-states` | Loading state CSS classes | `ext/loading-states.js` |
| `morphdom-swap` | Use morphdom for swap | `ext/morphdom-swap.js` |
| `multi-swap` | Swap multiple targets | `ext/multi-swap.js` |
| `path-variables` | URL path variable templates | `ext/path-variables.js` |

## Response Headers

| Header | Purpose |
|--------|---------|
| `HX-Location` | Client-side redirect to a URL |
| `HX-Push-Url` | Push URL to history bar |
| `HX-Replace-Url` | Replace current URL in history bar |
| `HX-Reswap` | Override swap strategy for this response |
| `HX-Retarget` | CSS selector to target for swap |
| `HX-Reselect` | CSS selector to select content to swap |
| `HX-Trigger` | Trigger events on the client |
| `HX-Trigger-After-Settle` | Trigger events after settle |
| `HX-Trigger-After-Swap` | Trigger events after swap |

## Event Reference

```javascript
// Lifecycle events (in order)
htmx.on('htmx:beforeRequest', (e) => {})
htmx.on('htmx:beforeSend', (e) => {})
htmx.on('htmx:beforeSwap', (e) => {})
htmx.on('htmx:responseError', (e) => {})
htmx.on('htmx:load', (e) => {})  // New content loaded
htmx.on('htmx:afterRequest', (e) => {})
htmx.on('htmx:afterSettle', (e) => {})
htmx.on('htmx:afterSwap', (e) => {})

// History events
htmx.on('htmx:beforeHistorySave', (e) => {})
htmx.on('htmx:historyRestored', (e) => {})

// Abort
htmx.on('htmx:abort', (e) => {})
```

## Security

```html
<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy"
      content="script-src 'self' https://cdn.jsdelivr.net;">

<!-- Disable eval-based expressions -->
<script>htmx.config.allowEval = false</script>

<!-- Anti-CSRF token -->
<form hx-post="/api/items"
      hx-headers='{"X-CSRFToken": "{{ csrf_token }}"}'>
  <input name="name">
  <button>Submit</button>
</form>
```

## Tools

- **htmx DevTools** — Chrome extension for inspecting htmx requests and swaps
- **htmx debug mode** — `localStorage.setItem('htmx-debug', 'true')` for verbose logging
- **htmx.logger** — `htmx.logger = (elt, event, data) => console.log(event, elt, data)`
