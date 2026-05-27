# Web Component Testing

## Jest Environment Setup

```javascript
// jest.config.js for web components
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterSetup: ['./jest.setup.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
}

// jest.setup.js
import 'custom-elements-polyfill'
import 'shadow-dom-polyfill'
```

## Unit Test Patterns

```javascript
import './my-component.js'

describe('MyComponent', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders with default properties', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    expect(el.shadowRoot).toBeTruthy()
    expect(el.shadowRoot.querySelector('.title').textContent).toBe('Default Title')
  })

  it('reflects attribute changes', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    el.setAttribute('title', 'Custom Title')
    expect(el.shadowRoot.querySelector('.title').textContent).toBe('Custom Title')
  })

  it('updates on property set', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    el.count = 5
    expect(el.shadowRoot.querySelector('.count').textContent).toBe('5')
  })

  it('dispatches events on interaction', () => {
    const handler = jest.fn()
    const el = document.createElement('my-component')
    document.body.appendChild(el)
    el.addEventListener('my-event', handler)

    el.shadowRoot.querySelector('button').click()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ value: expect.any(Number) }),
      })
    )
  })

  it('cleans up on disconnect', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    const spy = jest.spyOn(el, 'disconnectedCallback')
    document.body.removeChild(el)

    expect(spy).toHaveBeenCalled()
  })
})
```

## Testing Shadow DOM

```javascript
describe('Shadow DOM', () => {
  it('encapsulates styles', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    const parentStyle = getComputedStyle(document.body)
    const shadowStyle = getComputedStyle(el.shadowRoot.querySelector('div'))

    expect(parentStyle.color).not.toBe(shadowStyle.color)
  })

  it('supports slotted content', () => {
    const el = document.createElement('my-component')
    el.innerHTML = '<span slot="title">Slotted Title</span>'
    document.body.appendChild(el)

    const slot = el.shadowRoot.querySelector('slot[name="title"]')
    const assignedNodes = slot.assignedNodes()

    expect(assignedNodes.length).toBe(1)
    expect(assignedNodes[0].textContent).toBe('Slotted Title')
  })

  it('allows CSS part styling', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    const part = el.shadowRoot.querySelector('[part="button"]')
    expect(part).toBeTruthy()
  })
})
```

## Testing Form Integration

```javascript
describe('Form Associated Component', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="test-form">
        <my-input name="username" value="testuser"></my-input>
      </form>
    `
  })

  it('participates in form submission', () => {
    const form = document.getElementById('test-form')
    const formData = new FormData(form)

    expect(formData.get('username')).toBe('testuser')
  })

  it('supports form validation', () => {
    const input = document.querySelector('my-input')
    input.setAttribute('required', '')

    expect(input.checkValidity()).toBe(false)
    input.value = 'valid'
    expect(input.checkValidity()).toBe(true)
  })

  it('resets with form', () => {
    const form = document.getElementById('test-form')
    const input = document.querySelector('my-input')

    input.value = 'changed'
    form.reset()

    expect(input.value).toBe('testuser')
  })
})
```

## Accessibility Testing

```javascript
describe('Accessibility', () => {
  it('has proper ARIA attributes', () => {
    const el = document.createElement('my-button')
    el.setAttribute('aria-label', 'Close dialog')
    document.body.appendChild(el)

    expect(el.getAttribute('aria-label')).toBe('Close dialog')
    expect(el.getAttribute('role')).toBe('button')
  })

  it('supports keyboard navigation', () => {
    const el = document.createElement('my-button')
    document.body.appendChild(el)
    el.focus()

    expect(document.activeElement).toBe(el)
    expect(el.shadowRoot.activeElement).toBeTruthy()
  })

  it('maintains focus order', () => {
    document.body.innerHTML = `
      <my-input></my-input>
      <my-button></my-button>
    `

    const firstInput = document.querySelector('my-input')
    const button = document.querySelector('my-button')

    firstInput.focus()
    expect(document.activeElement).toBe(firstInput)

    // Tab to next focusable element
    button.focus()
    expect(document.activeElement).toBe(button)
  })
})
```

## Performance Testing

```javascript
describe('Performance', () => {
  it('renders within time budget', () => {
    const start = performance.now()
    const el = document.createElement('my-component')
    document.body.appendChild(el)
    const duration = performance.now() - start

    expect(duration).toBeLessThan(50)
  })

  it('updates efficiently', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    const start = performance.now()
    el.setAttribute('count', '100')
    const duration = performance.now() - start

    expect(duration).toBeLessThan(16)
  })

  it('handles batch updates', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    const start = performance.now()
    el.setAttribute('a', '1')
    el.setAttribute('b', '2')
    el.setAttribute('c', '3')
    const duration = performance.now() - start

    expect(duration).toBeLessThan(30)
  })
})
```

## Cross-Framework Integration Tests

```javascript
describe('React Integration', () => {
  it('wraps web component correctly', () => {
    const { container } = render(<ReactWrapper />)
    const wc = container.querySelector('my-component')

    expect(wc).toBeTruthy()
    expect(wc.getAttribute('title')).toBe('From React')
  })

  it('handles events from web component', () => {
    const handler = jest.fn()
    const { container } = render(<ReactWrapper onEvent={handler} />)

    const wc = container.querySelector('my-component')
    wc.dispatchEvent(new CustomEvent('my-event', { detail: 'test' }))

    expect(handler).toHaveBeenCalled()
  })
})

describe('Vue Integration', () => {
  it('mounts Vue component wrapping web component', () => {
    const wrapper = mount(VueWrapper)

    expect(wrapper.find('my-component').exists()).toBe(true)
    expect(wrapper.find('my-component').attributes('title')).toBe('From Vue')
  })
})
```

## Snapshot Testing

```javascript
describe('Snapshots', () => {
  it('matches default state', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    expect(el.shadowRoot.innerHTML).toMatchSnapshot()
  })

  it('matches different states', () => {
    const el = document.createElement('my-component')
    document.body.appendChild(el)

    el.setAttribute('state', 'loading')
    expect(el.shadowRoot.innerHTML).toMatchSnapshot()

    el.setAttribute('state', 'error')
    expect(el.shadowRoot.innerHTML).toMatchSnapshot()

    el.setAttribute('state', 'empty')
    expect(el.shadowRoot.innerHTML).toMatchSnapshot()
  })
})
```

## Key Points

- Always test attribute-to-property reflection
- Verify shadow DOM encapsulation and slot behavior
- Test form-associated elements with actual forms
- Validate CustomEvent dispatch and capture
- Test lifecycle callbacks (connected, disconnected, attributeChanged)
- Verify event cleanup on disconnect to prevent memory leaks
- Test keyboard navigation and focus management
- Use accessibility assertions for ARIA attributes
- Set performance budgets for render and update times
- Test cross-framework integration with React and Vue wrappers
- Take snapshots of shadow DOM content for regression detection
- Test slot projection and named slot distribution
