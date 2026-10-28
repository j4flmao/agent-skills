# Web Component Testing

How to test custom elements: choosing a real-browser runner, fixtures, attribute/property reflection, events, shadow DOM and slots, form-associated elements, accessibility, visual regression and framework interop. Examples use Web Test Runner with `@open-wc/testing`; Vitest browser mode and Playwright component testing are noted as alternatives.

## Choose a Real Browser

| Runner | Environment | Notes |
|---|---|---|
| Web Test Runner (`@web/test-runner`) + `@open-wc/testing` | Real Chromium/Firefox/WebKit via Playwright | Purpose-built for web components; fixtures, a11y and snapshot helpers |
| Vitest browser mode | Real browser via Playwright/WebdriverIO | Good if the project already uses Vitest |
| Playwright Test | Real browsers, page-level | E2E and visual comparisons |
| Jest/Vitest + jsdom | Simulated DOM | Supports custom elements and shadow DOM basics, but no layout/CSS computation, focus behavior is approximate, and form-associated APIs (`ElementInternals`) are incomplete — avoid for anything beyond pure logic |

No polyfills are needed: custom elements and shadow DOM are supported in all evergreen browsers.

## Setup (Web Test Runner)

```bash
npm i -D @web/test-runner @web/test-runner-playwright @open-wc/testing @web/test-runner-commands
npx playwright install chromium firefox webkit
```

```js
// web-test-runner.config.mjs
import { playwrightLauncher } from "@web/test-runner-playwright";

export default {
  files: "src/**/*.test.js",
  nodeResolve: true,
  browsers: [
    playwrightLauncher({ product: "chromium" }),
    playwrightLauncher({ product: "firefox" }),
    playwrightLauncher({ product: "webkit" }),
  ],
};
```

TypeScript sources: add `@web/dev-server-esbuild` as a plugin, or test the compiled output.

## Fixtures and Rendering

```js
import { fixture, html, expect, elementUpdated, oneEvent } from "@open-wc/testing";
import "../src/my-counter.js";

describe("my-counter", () => {
  it("renders default state", async () => {
    const el = await fixture(html`<my-counter></my-counter>`);
    expect(el.shadowRoot.querySelector(".count").textContent).to.equal("0");
  });
```

`fixture` attaches the element to the document, waits for it to render (Lit `updateComplete` when present), and cleans up after each test.

## Attributes and Properties

```js
  it("reflects attribute to property and re-renders", async () => {
    const el = await fixture(html`<my-counter count="3"></my-counter>`);
    expect(el.count).to.equal(3);

    el.count = 5;
    await elementUpdated(el);
    expect(el.getAttribute("count")).to.equal("5");          // only if the property reflects
    expect(el.shadowRoot.querySelector(".count").textContent).to.equal("5");
  });
```

Test both directions explicitly, plus invalid values (`count="abc"`, negative numbers) and removal of the attribute.

## Events

```js
  it("dispatches a composed change event on click", async () => {
    const el = await fixture(html`<my-counter></my-counter>`);
    const button = el.shadowRoot.querySelector("button");

    setTimeout(() => button.click());
    const ev = await oneEvent(el, "count-changed");

    expect(ev.detail).to.deep.equal({ value: 1 });
    expect(ev.bubbles).to.be.true;
    expect(ev.composed).to.be.true;                         // crosses shadow boundaries
  });
```

## Lifecycle and Cleanup

Lifecycle callbacks are captured from the class at definition time, so spying on an instance method does not intercept them. Test observable effects instead:

```js
  it("removes document listeners when disconnected", async () => {
    const el = await fixture(html`<my-dropdown open></my-dropdown>`);
    el.remove();
    document.body.click();                                   // would toggle if listener leaked
    expect(el.open).to.be.true;
  });
```

## Shadow DOM, Slots and Parts

```js
  it("projects named slot content", async () => {
    const el = await fixture(html`<my-card><span slot="title">Hello</span></my-card>`);
    const slot = el.shadowRoot.querySelector('slot[name="title"]');
    const assigned = slot.assignedElements();
    expect(assigned).to.have.length(1);
    expect(assigned[0].textContent).to.equal("Hello");
  });

  it("exposes a styling part", async () => {
    const el = await fixture(html`<my-card></my-card>`);
    expect(el.shadowRoot.querySelector('[part~="header"]')).to.exist;
  });

  it("does not leak outer styles into shadow content", async () => {
    const el = await fixture(html`
      <div><style>p { color: rgb(255, 0, 0); }</style><my-card></my-card></div>`);
    const inner = el.querySelector("my-card").shadowRoot.querySelector("p");
    expect(getComputedStyle(inner).color).not.to.equal("rgb(255, 0, 0)");
  });
```

Computed-style assertions require a real browser.

## Form-Associated Elements

```js
  it("participates in forms via ElementInternals", async () => {
    const form = await fixture(html`
      <form><my-input name="username" value="testuser" required></my-input></form>`);
    const input = form.querySelector("my-input");

    expect(new FormData(form).get("username")).to.equal("testuser");

    input.value = "";
    expect(input.checkValidity()).to.be.false;
    expect(input.validity.valueMissing).to.be.true;

    input.value = "changed";
    form.reset();                                            // calls formResetCallback
    expect(input.value).to.equal("testuser");
  });
```

The component must declare `static formAssociated = true`, call `attachInternals()`, and implement `setFormValue`, validity via `setValidity`, and `formResetCallback`.

## Keyboard and Accessibility

```js
import { sendKeys } from "@web/test-runner-commands";

  it("toggles with keyboard and passes axe checks", async () => {
    const el = await fixture(html`<my-switch label="Notifications"></my-switch>`);
    el.focus();
    await sendKeys({ press: "Space" });
    expect(el.checked).to.be.true;
    expect(el.shadowRoot.querySelector('[role="switch"]').getAttribute("aria-checked")).to.equal("true");
    await expect(el).to.be.accessible();                    // axe-core via chai-a11y-axe
  });
```

`sendKeys` dispatches real key presses through the browser, unlike synthetic `KeyboardEvent`s. Also test focus delegation (`delegatesFocus`), tab order across shadow roots, and visible focus styles.

## Snapshots and Visual Regression

```js
  it("matches shadow DOM snapshot", async () => {
    const el = await fixture(html`<my-card heading="A"></my-card>`);
    await expect(el).shadowDom.to.equalSnapshot();
  });
});
```

Keep DOM snapshots small and stable (they break on harmless markup changes). For appearance, use visual regression in real browsers (`@web/test-runner-visual-regression`, Playwright `toHaveScreenshot`, Chromatic/Percy with Storybook).

## Framework Interop

| Framework | What to test |
|---|---|
| React 19+ | Properties set as properties (not stringified attributes) and custom events via `on<EventName>` props |
| React ≤ 18 | Wrapper (e.g. `@lit/react` `createComponent`) maps props and events |
| Vue | `compilerOptions.isCustomElement` configured; `.prop` modifier for complex values; events via `@event-name` |
| Angular | `CUSTOM_ELEMENTS_SCHEMA`; property binding `[prop]` |

Test interop in the consuming app's test setup with real rendering; Custom Elements Everywhere documents framework compatibility.

## Performance

Avoid timing assertions with fixed millisecond budgets in unit tests: they are flaky across machines. Measure render/update cost with benchmarks (e.g. Tachometer) or browser performance traces, and track regressions over time.

## Checklist
- [ ] Tests run in real browsers (at least Chromium, ideally Firefox and WebKit)
- [ ] Attribute/property reflection both directions, including invalid values
- [ ] Events: detail, `bubbles`, `composed`
- [ ] Lifecycle effects tested by observable behavior
- [ ] Slots, parts and style encapsulation verified
- [ ] Form-associated behavior (value, validity, reset) tested in a form
- [ ] Keyboard interaction with real key presses and axe checks
- [ ] Visual regression for appearance; minimal DOM snapshots
