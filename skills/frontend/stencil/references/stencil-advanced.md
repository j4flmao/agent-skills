# Stencil Advanced: Forms, Accessibility, Theming, Framework Integration, and Performance

Advanced techniques for production Stencil design systems: form-associated custom elements, accessibility across shadow boundaries, theming APIs, framework wrapper ergonomics, functional components, and runtime performance. Fundamentals are in `stencil-fundamentals.md`; build/SSR configuration in `stencil-deployment.md`.

## Form-Associated Custom Elements

Inputs inside shadow DOM are invisible to a surrounding `<form>`. Form-associated custom elements (FACE) let a component participate natively: submitted values, validation, `reset`, `disabled` via `<fieldset>`.

```tsx
import { Component, Prop, State, AttachInternals, h, Host } from '@stencil/core';

@Component({ tag: 'acme-input', shadow: true, formAssociated: true })
export class AcmeInput {
  @AttachInternals() internals: ElementInternals;

  @Prop() name: string;
  @Prop() required = false;
  @Prop({ mutable: true }) value = '';

  @State() touched = false;

  private onInput = (ev: Event) => {
    this.value = (ev.target as HTMLInputElement).value;
    this.internals.setFormValue(this.value);
    this.validate();
  };

  private validate() {
    if (this.required && !this.value) {
      this.internals.setValidity({ valueMissing: true }, 'This field is required');
    } else {
      this.internals.setValidity({});
    }
  }

  componentWillLoad() {
    this.internals.setFormValue(this.value);
    this.validate();
  }

  formResetCallback() {
    this.value = '';
    this.internals.setFormValue('');
  }

  render() {
    return (
      <Host>
        <input value={this.value} onInput={this.onInput} onBlur={() => (this.touched = true)}
               aria-invalid={this.touched && !this.internals.validity.valid ? 'true' : 'false'} />
      </Host>
    );
  }
}
```

- `formAssociated: true` plus `@AttachInternals()` (Stencil 4.x) expose `ElementInternals`.
- Lifecycle callbacks `formResetCallback`, `formDisabledCallback`, and `formStateRestoreCallback` integrate with the browser.
- Emit standard-like events (`acmeInput`, `acmeChange`) for framework bindings in addition to updating form value.

## Accessibility Across Shadow DOM

ARIA ID references (`aria-labelledby`, `aria-describedby`, `<label for>`) do not cross shadow boundaries.

| Problem | Approach |
|---------|----------|
| External `<label for="x">` cannot target an inner input | FACE: labels associate with the host element; or accept a `label` prop rendered inside |
| `aria-describedby` pointing to light DOM text | Copy text into an internal visually-hidden element, or use slots for help text inside the component |
| Focus management | `delegatesFocus: true` in shadow options so focusing the host focuses the first focusable child |
| Roles on host | Set role/states via `ElementInternals` (`internals.role`, `internals.ariaChecked`) where supported, or on the internal element |

```tsx
@Component({ tag: 'acme-button', shadow: { delegatesFocus: true } })
```

- Test with screen readers and axe (e.g. `@axe-core/playwright` against the docs site); spec tests cannot verify the accessibility tree.

## Theming API

Layer theming so consumers rarely need overrides:

1. **Design tokens** as CSS custom properties defined globally (`--acme-color-primary`).
2. **Component tokens** that default to global tokens (`--acme-button-bg: var(--acme-color-primary)`).
3. **Parts** for structural overrides (`::part(label)`).
4. **States** via reflected attributes (`:host([variant="danger"])`) or custom states (`:host(:state(loading))` with `internals.states`, where supported).

```css
:host {
  --acme-button-bg: var(--acme-color-primary, #2563eb);
  --acme-button-fg: var(--acme-color-on-primary, #fff);
}
button { background: var(--acme-button-bg); color: var(--acme-button-fg); }
```

Document every custom property and part (Stencil's `docs-json` output can feed documentation; JSDoc `@part` and `@cssprop` tags are picked up).

## Functional Components

Stateless helpers rendered inside components (not custom elements):

```tsx
import { FunctionalComponent, h } from '@stencil/core';

interface IconProps { name: string; size?: number }

export const Icon: FunctionalComponent<IconProps> = ({ name, size = 16 }) => (
  <svg width={size} height={size} aria-hidden="true"><use href={`#icon-${name}`} /></svg>
);
```

They cannot have state, lifecycle, or styles of their own; use them to deduplicate markup within a component library.

## Framework Wrappers

Output targets (`@stencil/react-output-target`, `@stencil/angular-output-target`, `@stencil/vue-output-target`) generate wrappers that:

- Map custom events to framework props/outputs (`onAcmeChange` in React).
- Set complex properties (objects/arrays) instead of attributes.
- Provide `ngModel`/`v-model` value accessors for form controls when configured.

React 19 supports custom elements natively (properties and custom events), which reduces the need for wrappers in React-only consumers, but wrappers still help with typing and SSR. Configuration options change between output target major versions; follow each package's README for your version.

## Performance

- **Lazy loading**: the `dist` output loads components on demand; group related components into bundles (`bundles` in `stencil.config.ts`) to cut request counts when they always appear together.
- **dist-custom-elements**: tree-shakeable, no lazy loader; best when consumers use a bundler and import only needed components.
- Avoid re-rendering large lists on every keystroke: debounce input, keep derived data memoized in plain fields updated in `@Watch`.
- `componentShouldUpdate(newVal, oldVal, propName)` can skip renders for irrelevant changes.
- Use `key` on list items so the virtual DOM reuses nodes.
- Keep `@Method()` calls async-aware: they always return Promises and wait for the component to be ready.

## Server-Side Rendering and Hydration

- The `dist-hydrate-script` output renders components to HTML on the server (used by frameworks or custom Node renderers).
- Declarative Shadow DOM support in recent Stencil versions allows server-rendered shadow roots; verify browser and framework support for your targets.
- Avoid accessing `window`/`document` during `componentWillLoad` in code paths that run on the server; guard with `Build.isBrowser`.

## Versioning a Design System

- Follow semver strictly: removing props, events, parts, or CSS custom properties is a breaking change.
- Deprecate with console warnings in dev builds and JSDoc `@deprecated` for one major cycle.
- Visual regression tests (Playwright screenshots, Chromatic) on the documentation/storybook site catch style regressions.

## Pitfalls

- Custom inputs without FACE that silently drop values from native form submissions.
- ARIA references across shadow boundaries that do nothing.
- Exposing internal class names as a styling API instead of parts/custom properties.
- Shipping only the lazy-loaded build to bundler users, increasing requests.

## Checklist

- [ ] Form controls are form-associated with validation and reset
- [ ] `delegatesFocus` and internal labelling for accessible inputs
- [ ] Theming via tokens, component custom properties, and parts, all documented
- [ ] Framework wrappers generated and tested in each framework
- [ ] Output targets for both lazy loading and tree-shakeable consumption
- [ ] SSR-safe code paths; visual regression testing in CI
