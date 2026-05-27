# Lit Testing Reference

## Test Setup

```javascript
import { html, render } from 'lit';
import { fixture, assert } from '@open-wc/testing';

class MyElement extends LitElement {
  render() {
    return html`<p>Hello ${this.name}</p>`;
  }
  
  static properties = {
    name: { type: String },
  };
}
customElements.define('my-element', MyElement);
```

## Component Testing

```javascript
test('renders with default name', async () => {
  const el = await fixture(html`<my-element></my-element>`);
  assert.shadowDom.equal(el, '<p>Hello World</p>');
});

test('updates on property change', async () => {
  const el = await fixture(html`<my-element name="Lit"></my-element>`);
  assert.shadowDom.equal(el, '<p>Hello Lit</p>');
  
  el.name = 'Framework';
  await el.updateComplete;
  assert.shadowDom.equal(el, '<p>Hello Framework</p>');
});
```

## Key Points

- @open-wc/testing provides fixture helpers for Lit elements
- updateComplete awaits after property changes
- shadowDom.equal asserts rendered Shadow DOM content
- a11ySnapshot tests accessibility tree
- Events tested with dispatchEvent and event listeners
- Slotted content tests use unnamed/ named slots
- Reactive properties trigger re-render on change
- Lit elements register as custom elements before testing
- Snapshot testing catches unintended DOM changes
- SSR testing verifies server-rendered Lit output
