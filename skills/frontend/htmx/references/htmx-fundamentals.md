# htmx Fundamentals: Hypermedia Model, Core Attributes, Requests and Responses

htmx extends HTML so any element can issue HTTP requests and swap the returned HTML into the page. The server returns HTML fragments, not JSON, keeping application state and rendering on the server (hypermedia as the engine of application state). This reference covers the mental model, the core attributes, triggers, targets and swaps, request and response headers, error behavior, and fundamentals of security. Examples target htmx 2.x. Advanced patterns, server integration, setup and testing are in sibling references.

## Mental Model

```text
user event on element --> htmx issues HTTP request (hx-get/post/...)
   --> server renders an HTML fragment (template partial)
   --> htmx swaps the fragment into the target element (hx-target + hx-swap)
   --> new HTML may contain more hx-* attributes, which htmx processes automatically
```

| Classic SPA | htmx |
|-------------|------|
| JSON API + client-side rendering | HTML responses rendered on the server |
| Client state store | Server state; DOM reflects it |
| Client-side routing | Server routes; `hx-boost` / `hx-push-url` for history |
| Build pipeline required | Single script include works |

htmx fits CRUD apps, dashboards, admin tools and forms well. Highly interactive client-only experiences (rich editors, offline-first apps, complex canvas UIs) still benefit from client frameworks; you can mix them.

## Installation

```html
<script src="https://unpkg.com/htmx.org@2.0.4"
        integrity="sha384-<hash-from-the-htmx-docs>"
        crossorigin="anonymous"></script>
```

Pin an exact version and use the subresource integrity hash published in the htmx documentation, or install from npm (`npm install htmx.org`) and bundle or self-host. Check the current 2.x release before pinning.

## Core Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `hx-get`, `hx-post`, `hx-put`, `hx-patch`, `hx-delete` | Issue a request with that method | `hx-post="/contacts"` |
| `hx-trigger` | Which event triggers the request | `hx-trigger="keyup changed delay:300ms"` |
| `hx-target` | Element that receives the response | `hx-target="#results"`, `closest tr`, `next .error` |
| `hx-swap` | How the response is inserted | `outerHTML`, `beforeend` |
| `hx-select` | Pick part of the response to swap | `hx-select="#list"` |
| `hx-swap-oob` | In the response: swap this element elsewhere by ID (out of band) | `<div id="count" hx-swap-oob="true">` |
| `hx-include` | Include values from other elements | `hx-include="[name='filter']"` |
| `hx-vals` | Add values (JSON) | `hx-vals='{"page": 2}'` |
| `hx-indicator` | Element shown during the request (`htmx-request` class) | `hx-indicator="#spinner"` |
| `hx-push-url` | Push a URL into browser history | `hx-push-url="true"` |
| `hx-boost` | Turn normal links and forms into AJAX with history | `<body hx-boost="true">` |
| `hx-confirm` | Browser confirm dialog before request | `hx-confirm="Delete this item?"` |
| `hx-disabled-elt` | Disable elements during request | `hx-disabled-elt="this"` |
| `hx-on:*` | Inline event handlers | `hx-on::after-request="this.reset()"` |

Attributes are inherited by descendants unless disabled with `hx-disinherit`; put shared settings (for example `hx-target`) on a container.

## Default Triggers

| Element | Default trigger |
|---------|-----------------|
| `input`, `textarea`, `select` | `change` |
| `form` | `submit` |
| Everything else | `click` |

Trigger modifiers and special events:

```html
<input type="search" name="q"
       hx-get="/search"
       hx-trigger="input changed delay:300ms, keyup[key=='Enter']"
       hx-target="#results">

<div hx-get="/notifications" hx-trigger="every 30s"></div>

<div hx-get="/more?page=2" hx-trigger="revealed" hx-swap="afterend"></div>

<div hx-get="/stats" hx-trigger="load"></div>
```

`changed` fires only if the value changed; `delay` debounces; `throttle` rate-limits; `once`, `from:<selector>` and event filters (`[expr]`) are also available.

## Swap Strategies

| `hx-swap` | Effect |
|-----------|--------|
| `innerHTML` (default) | Replace the target's children |
| `outerHTML` | Replace the target itself |
| `beforebegin` / `afterend` | Insert before / after the target |
| `afterbegin` / `beforeend` | Prepend / append inside the target |
| `delete` | Remove the target |
| `none` | Do not swap (out-of-band swaps still apply) |

Modifiers: `swap:200ms` and `settle:` timing for CSS transitions, `scroll:top`, `show:#el:top`, `focus-scroll:true`, `transition:true` (View Transitions API where supported).

## Example: Inline Edit and Delete

```html
<table>
  <tbody id="contacts" hx-target="closest tr" hx-swap="outerHTML">
    <tr>
      <td>Ada Lovelace</td>
      <td>ada@example.com</td>
      <td>
        <button hx-get="/contacts/1/edit">Edit</button>
        <button hx-delete="/contacts/1" hx-confirm="Delete Ada?">Delete</button>
      </td>
    </tr>
  </tbody>
</table>
```

Server responses:
- `GET /contacts/1/edit` returns a `<tr>` containing a form with `hx-put="/contacts/1"`.
- `PUT /contacts/1` returns the updated read-only `<tr>`, or the form row with validation errors and status 422 (see error handling below).
- `DELETE /contacts/1` returns `200` with an empty body, which with `outerHTML` removes the row.

## Forms

```html
<form hx-post="/contacts" hx-target="#contacts" hx-swap="beforeend"
      hx-on::after-request="if (event.detail.successful) this.reset()">
  <input name="name" required>
  <input name="email" type="email" required>
  <button type="submit">Add</button>
</form>
```

- Form values are sent as form-encoded data (`application/x-www-form-urlencoded`), or multipart with `hx-encoding="multipart/form-data"` for files.
- Non-GET requests include the closest form's values; GET requests include values only for the element and explicit `hx-include`.
- In htmx 2, `DELETE` requests send parameters in the query string (as with `GET`).
- Keep native HTML validation (`required`, `type="email"`); htmx respects it on form submission. Always validate again on the server.

## Request Headers Sent by htmx

| Header | Meaning |
|--------|---------|
| `HX-Request: true` | Request issued by htmx |
| `HX-Target` | ID of the target element |
| `HX-Trigger` / `HX-Trigger-Name` | ID / name of the triggering element |
| `HX-Current-URL` | Browser URL |
| `HX-Boosted` | Request from a boosted link or form |
| `HX-History-Restore-Request` | Request to restore history after a cache miss |

Servers commonly render a fragment when `HX-Request` is present and a full page otherwise, so URLs work both via htmx and direct navigation. When doing this, send `Vary: HX-Request` so caches do not mix fragments and full pages.

## Response Headers Understood by htmx

| Header | Effect |
|--------|--------|
| `HX-Redirect` | Client-side full redirect |
| `HX-Location` | AJAX navigation to a URL without full reload |
| `HX-Refresh: true` | Full page refresh |
| `HX-Push-Url` / `HX-Replace-Url` | Update browser history |
| `HX-Retarget` / `HX-Reswap` / `HX-Reselect` | Override target, swap or select from the server |
| `HX-Trigger` | Trigger client events, optionally with JSON details (also `HX-Trigger-After-Swap`, `HX-Trigger-After-Settle`) |

Example: after creating a contact, respond with `HX-Trigger: contactsChanged`, and have a counter element listen with `hx-trigger="contactsChanged from:body"`.

## Error Handling

- By default htmx does **not** swap responses with 4xx or 5xx status codes; it fires `htmx:responseError` instead.
- Two common approaches for validation errors:
  1. Return `422` and configure swapping for it, via the `htmx:beforeSwap` event (`evt.detail.shouldSwap = true`) or the `htmx.config.responseHandling` setting in htmx 2.
  2. Return `200` with the form fragment containing error messages (simpler, but less semantic).
- Show a generic error message for network failures (`htmx:sendError`) and server errors.

```js
document.body.addEventListener("htmx:beforeSwap", (evt) => {
  if (evt.detail.xhr.status === 422) {
    evt.detail.shouldSwap = true;
    evt.detail.isError = false;
  }
});
```

## Security Fundamentals

- **Escape all user content** in server templates (auto-escaping on). htmx inserts HTML, so unescaped content is an XSS vector, and injected `hx-*` attributes could trigger requests.
- Use `hx-disable` on regions that render untrusted HTML so htmx does not process attributes there.
- **CSRF**: include tokens for non-GET requests, for example `<body hx-headers='{"X-CSRF-Token": "{{ csrf_token }}"}'>`, or hidden form fields.
- htmx 2 defaults `htmx.config.selfRequestsOnly = true`, blocking requests to other origins; keep it unless you have a reason.
- Set a Content Security Policy; `hx-on` and inline scripts may require adjustments (htmx has `htmx.config.allowEval` and nonce support for inline scripts in responses).
- Authorization is enforced on the server for every fragment endpoint, exactly as for full pages.

## Progressive Enhancement

Write links and forms that work without JavaScript (`href`, `action`, `method`), then add htmx attributes or `hx-boost`. This keeps pages accessible, crawlable and resilient if the script fails to load.

## Accessibility Basics

- Use semantic elements (`button` for actions, `a` for navigation); htmx does not change their semantics.
- Announce dynamic updates with `aria-live` regions for status messages.
- Manage focus after swaps (for example focus the first invalid field, or the new content heading).
- Indicators should have accessible text, not only a spinner.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Returning JSON to htmx endpoints | Return HTML fragments |
| Fragment and full page cached under the same URL | `Vary: HX-Request` |
| Validation errors not displayed (4xx not swapped) | Configure swapping for 422 or return 200 with errors |
| Duplicated templates for fragment and page | Compose pages from the same partials |
| Unescaped user content | Template auto-escaping, `hx-disable` for untrusted HTML |
| Missing CSRF on POST/PUT/DELETE | `hx-headers` or hidden fields |

## Checklist

- [ ] htmx version pinned with SRI or self-hosted
- [ ] Endpoints return fragments for htmx and full pages otherwise, with `Vary: HX-Request`
- [ ] Targets and swaps chosen deliberately; shared settings inherited from containers
- [ ] Validation error and network error handling defined
- [ ] Output escaping, CSRF protection and server-side authorization on every endpoint
- [ ] Progressive enhancement and accessibility for dynamic updates
