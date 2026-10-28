# Lit Fundamentals: Setup, Templates, Styling and Interop

Lit (v3) is a small library for building fast, standards-based Web Components. Components extend `LitElement`, render with tagged `html` templates that update only changed parts, and run in any framework or none. This reference covers project setup, decorator configurations, template binding syntax, styling and slots, and using Lit components from frameworks. Reactive properties in depth, lifecycle, events, directives, SSR and architecture are covered in sibling references.

## What Lit Gives You

| Piece | Purpose |
|---|---|
| `LitElement` | Base class adding reactive properties, rendering and scoped styles on top of `HTMLElement` |
| `lit-html` templates (`html`) | Declarative templates with efficient updates (no virtual DOM diffing of the whole tree) |
| Reactive properties | Changing them schedules an asynchronous, batched update |
| `css` + Shadow DOM | Encapsulated styles |
| Directives | Template helpers (`repeat`, `classMap`, `styleMap`, `when`, `ref`, ...) |

Lit components are standard custom elements: they work in plain HTML, React, Vue, Angular, Svelte and server-rendered pages.

## Setup

```bash
npm create vite@latest my-components -- --template lit-ts
cd my-components && npm install && npm run dev
# or add to an existing project
npm install lit
```

### Decorators: pick one configuration
| Mode | tsconfig | Field syntax |
|---|---|---|
| TypeScript experimental decorators (common today) | `"experimentalDecorators": true`, `"useDefineForClassFields": false` | `@property() name = "x";` |
| Standard (TC39) decorators (TS 5.0+, Lit 3) | no `experimentalDecorators` | `@property() accessor name = "x";` |
| No decorators (plain JS) | none | `static properties = { name: {} };` and initialize in constructor |

With experimental decorators, `useDefineForClassFields: false` is required, otherwise class fields shadow Lit's reactive accessors and updates silently stop.

## A First Component

```ts
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("user-badge")
export class UserBadge extends LitElement {
  static styles = css`
    :host { display: inline-flex; align-items: center; gap: 0.5rem; font: inherit; }
    :host([compact]) img { width: 1.5rem; height: 1.5rem; }
    img { width: 2.5rem; height: 2.5rem; border-radius: 50%; }
    .name { font-weight: 600; color: var(--user-badge-color, inherit); }
  `;

  @property() name = "";
  @property({ attribute: "avatar-url" }) avatarUrl = "";
  @property({ type: Boolean, reflect: true }) compact = false;
  @state() private expanded = false;

  render() {
    return html`
      <img src=${this.avatarUrl} alt="" />
      <button class="name" aria-expanded=${this.expanded} @click=${this.toggle}>${this.name}</button>
      ${this.expanded ? html`<slot name="details"></slot>` : null}
    `;
  }

  private toggle() {
    this.expanded = !this.expanded;
    this.dispatchEvent(new CustomEvent("badge-toggle", { detail: { expanded: this.expanded }, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap { "user-badge": UserBadge; }
}
```

```html
<script type="module" src="/src/user-badge.ts"></script>
<user-badge name="Ada" avatar-url="/ada.png" compact>
  <span slot="details">Admin since 2021</span>
</user-badge>
```

## Template Binding Syntax

| Binding | Syntax | Sets |
|---|---|---|
| Child content | `<p>${value}</p>` | Text, templates, arrays, `nothing` |
| Attribute | `<img alt=${text}>` | String attribute |
| Boolean attribute | `<button ?disabled=${busy}>` | Adds/removes attribute |
| Property | `<input .value=${val}>` | DOM property (objects, arrays, live values) |
| Event listener | `<button @click=${this.onClick}>` | `addEventListener`; `this` bound to the component |
| Element directive | `<input ${ref(this.inputRef)}>` | Element-level directives |

Rules:
- Expressions only in attribute values, text positions and element positions; not in tag or attribute names.
- Use `nothing` (from `lit`) to render nothing or remove an attribute: `alt=${desc ?? nothing}`.
- Values are escaped; interpolated strings never become HTML. `unsafeHTML` exists for trusted HTML only; sanitize anything user-provided.
- Lists: `items.map(i => html`...`)` for simple lists; `repeat(items, i => i.id, i => html`...`)` when items reorder and DOM state must follow keys.

## Styling

| Technique | Use |
|---|---|
| `static styles = css`...`` | Scoped styles, shared across instances via constructable stylesheets |
| `:host`, `:host([attr])`, `:host(:hover)` | Style the element itself |
| CSS custom properties (`var(--x, default)`) | Theming hooks that pierce shadow DOM |
| `::part(name)` with `part="name"` | Let consumers style specific internal elements |
| `::slotted(selector)` | Style direct slotted children (limited) |
| Shared style modules | Export `css` constants and include in `static styles = [base, css`...`]` |

Do not interpolate untrusted values into `css` templates; use `unsafeCSS` only for trusted constants. For dynamic values use `styleMap` or custom properties.

## Slots and Composition
- Default `<slot>` receives unassigned children; named slots (`<slot name="footer">`) receive `slot="footer"` children.
- Fallback content inside `<slot>` renders when nothing is slotted.
- React to slot changes with `@slotchange` and `slot.assignedElements({ flatten: true })`.
- Prefer slots for content customization and properties for data.

## Accessibility Basics
- Use native interactive elements inside the shadow root (`button`, `input`) rather than clickable `div`s.
- Forward labels: shadow DOM breaks `for`/`id` association across boundaries; take a `label` property or slot, or use form-associated custom elements (`static formAssociated = true` with `attachInternals()`) for inputs.
- Set `delegatesFocus` when the host should forward focus: `static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };`

## Using Lit Components in Frameworks

| Framework | Notes |
|---|---|
| Plain HTML / server templates | Import the module once; use tags |
| React 19+ | Custom elements supported: properties and custom events work natively |
| React 18 and earlier | Use `@lit/react` `createComponent` wrapper to map props and events |
| Vue | Configure `compilerOptions.isCustomElement` for your tag prefix; use `.prop` modifier for objects |
| Angular | Add `CUSTOM_ELEMENTS_SCHEMA`; bind properties with `[prop]` |
| Svelte | Works directly; props set as properties when defined |

```ts
// React 18 wrapper
import * as React from "react";
import { createComponent } from "@lit/react";
import { UserBadge } from "./user-badge.js";

export const UserBadgeReact = createComponent({
  tagName: "user-badge",
  elementClass: UserBadge,
  react: React,
  events: { onBadgeToggle: "badge-toggle" },
});
```

## Packaging Basics
- Publish ES modules with type declarations; do not bundle `lit` into the library (peer/regular dependency so apps dedupe it).
- Register each tag once; avoid side-effect conflicts by using a unique prefix (`acme-`).
- Provide a Custom Elements Manifest (`@custom-elements-manifest/analyzer`) for IDEs and documentation tools.

## Common Pitfalls
| Pitfall | Fix |
|---|---|
| `useDefineForClassFields: true` with experimental decorators | Set it to false, or use standard decorators with `accessor` |
| Mutating arrays/objects in place | Assign a new value or call `this.requestUpdate()` |
| Binding objects as attributes | Use property binding `.items=${list}` |
| Events not crossing shadow boundary | `bubbles: true, composed: true` |
| Using `unsafeHTML` with user input | Sanitize or render with templates |

## Checklist
- [ ] Decorator mode and tsconfig consistent
- [ ] Tag names prefixed and declared in `HTMLElementTagNameMap`
- [ ] Attribute vs. property bindings used correctly
- [ ] Styles static, themable via custom properties and parts
- [ ] Accessible native controls and focus delegation where needed
- [ ] Framework interop verified (React wrapper for React 18)
