# Web Component Performance

## Render Optimization

```javascript
class OptimizedComponent extends HTMLElement {
  constructor() {
    super()
    this._renderScheduled = false
    this._pendingUpdates = new Map()
    this.attachShadow({ mode: 'open' })
  }

  _scheduleRender() {
    if (this._renderScheduled) return
    this._renderScheduled = true

    requestAnimationFrame(() => {
      this._renderScheduled = false
      this._performRender()
    })
  }

  _performRender() {
    const updates = Array.from(this._pendingUpdates.entries())
    this._pendingUpdates.clear()

    let html = ''
    for (const [key, value] of updates) {
      html += `<div class="prop">${key}: ${value}</div>`
    }

    if (updates.length > 0) {
      this.shadowRoot.innerHTML = html
    }
  }

  static get observedAttributes() {
    return ['data', 'config']
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._pendingUpdates.set(name, newValue)
      this._scheduleRender()
    }
  }
}
```

## Template Caching

```javascript
class TemplateCachedComponent extends HTMLElement {
  static template = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })

    if (!TemplateCachedComponent.template) {
      TemplateCachedComponent.template = document.createElement('template')
      TemplateCachedComponent.template.innerHTML = `
        <style>
          :host {
            display: block;
            contain: content;
          }
        </style>
        <div part="container">
          <slot></slot>
        </div>
      `
    }

    this.shadowRoot.appendChild(
      TemplateCachedComponent.template.content.cloneNode(true)
    )
  }
}
```

## Batch Property Updates

```javascript
class BatchUpdatingElement extends HTMLElement {
  #pending = new Map()
  #scheduled = false
  #mutationObserver = null

  connectedCallback() {
    this.#mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          this.#queueUpdate(mutation.attributeName, this.getAttribute(mutation.attributeName))
        }
      }
    })

    this.#mutationObserver.observe(this, {
      attributes: true,
      attributeFilter: this.constructor.observedAttributes,
    })
  }

  #queueUpdate(name, value) {
    this.#pending.set(name, value)
    this.#flush()
  }

  #flush() {
    if (this.#scheduled) return
    this.#scheduled = true

    requestAnimationFrame(() => {
      this.#scheduled = false
      this.#applyChanges()
    })
  }

  #applyChanges() {
    const entries = Array.from(this.#pending.entries())
    this.#pending.clear()

    if (entries.length > 0) {
      this.update(entries)
    }
  }

  update(changes) {
    // Override in subclass
  }

  disconnectedCallback() {
    this.#mutationObserver?.disconnect()
  }
}
```

## Conditional Rendering

```javascript
class ConditionalRenderElement extends HTMLElement {
  #renderCache = new Map()

  connectedCallback() {
    this.render()
  }

  render() {
    const state = this.getAttribute('state')
    const cached = this.#renderCache.get(state)

    if (cached) {
      this.shadowRoot.innerHTML = cached
      return
    }

    let html
    switch (state) {
      case 'loading':
        html = '<div class="spinner">Loading...</div>'
        break
      case 'error':
        html = '<div class="error">Error occurred</div>'
        break
      case 'empty':
        html = '<div class="empty">No data</div>'
        break
      default:
        html = '<slot></slot>'
    }

    this.#renderCache.set(state, html)
    this.shadowRoot.innerHTML = html
  }

  static get observedAttributes() {
    return ['state']
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'state' && oldValue !== newValue) {
      this.render()
    }
  }
}
```

## DOM Recycling

```javascript
class RecycledListElement extends HTMLElement {
  #pool = []
  #active = []

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = '<slot></slot>'
  }

  setItems(items) {
    // Return active items to pool
    for (const el of this.#active) {
      el.remove()
      this.#pool.push(el)
    }
    this.#active = []

    // Reuse or create items
    for (const item of items) {
      const el = this.#pool.pop() ?? document.createElement('list-item')
      el.data = item
      this.shadowRoot.appendChild(el)
      this.#active.push(el)
    }
  }
}
```

## Lazy Rendering with IntersectionObserver

```javascript
class LazyRenderElement extends HTMLElement {
  #observer = null
  #hasRendered = false

  connectedCallback() {
    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !this.#hasRendered) {
          this.#hasRendered = true
          this.render()
          this.#observer.disconnect()
        }
      }
    })

    this.#observer.observe(this)
  }

  render() {
    this.innerHTML = '<div class="content">Rendered content</div>'
  }

  disconnectedCallback() {
    this.#observer?.disconnect()
  }
}
```

## Virtual Scrolling in Web Components

```javascript
class VirtualScrollElement extends HTMLElement {
  #visible = []
  #itemHeight = 48
  #buffer = 5

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = `
      <div part="viewport" style="overflow-y: auto; height: 400px;">
        <div part="spacer" style="height: 0;"></div>
        <div part="container"></div>
      </div>
    `

    this.#setupScrollHandler()
  }

  #setupScrollHandler() {
    const viewport = this.shadowRoot.querySelector('[part="viewport"]')
    viewport.addEventListener('scroll', () => this.#updateVisible(), { passive: true })
  }

  set totalItems(count) {
    this.#totalItems = count
    this.shadowRoot.querySelector('[part="spacer"]').style.height = `${count * this.#itemHeight}px`
    this.#updateVisible()
  }

  #updateVisible() {
    const viewport = this.shadowRoot.querySelector('[part="viewport"]')
    const container = this.shadowRoot.querySelector('[part="container"]')
    const scrollTop = viewport.scrollTop
    const viewportHeight = viewport.clientHeight

    const start = Math.max(0, Math.floor(scrollTop / this.#itemHeight) - this.#buffer)
    const end = Math.min(this.#totalItems, Math.ceil((scrollTop + viewportHeight) / this.#itemHeight) + this.#buffer)

    container.style.transform = `translateY(${start * this.#itemHeight}px)`

    const fragment = document.createDocumentFragment()
    for (let i = start; i < end; i++) {
      const item = document.createElement('virtual-item')
      item.index = i
      fragment.appendChild(item)
    }

    container.innerHTML = ''
    container.appendChild(fragment)
  }
}
```

## Key Points

- Batch DOM updates within requestAnimationFrame
- Cache compiled templates to avoid reparsing
- Use MutationObserver for efficient attribute change detection
- Cache render output for different states to avoid recomputation
- Recycle DOM nodes instead of creating and destroying
- Use IntersectionObserver for lazy rendering offscreen content
- Implement virtual scrolling for large lists
- Use CSS containment (contain: content/style) to limit recalculations
- Prefer property sets over attribute changes for complex data
- Minimize shadow DOM tree depth for faster style calculation
- Use event delegation instead of per-item listeners
- Avoid forced synchronous layouts by reading/writing in batches
