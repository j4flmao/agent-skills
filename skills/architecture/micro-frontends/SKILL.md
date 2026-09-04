# Micro-Frontends (MFE)

## 1. Skill Context
**Focus**: Scaling frontend development across multiple independent teams, decoupling monolithic SPAs (React/Vue/Angular), and continuous delivery for UI.
**Triggers**: micro-frontends, module-federation, spa, architecture, web-components.

## 2. The Monolithic SPA Problem
At enterprise scale, a single React repository (Monolith) becomes a bottleneck.
- 50 developers trying to merge into the same `package.json`.
- A 10-minute CI/CD build time.
- The Marketing team cannot deploy a typo fix without dragging the heavy E-Commerce codebase with them.

**Micro-frontends** apply the microservices philosophy to the browser. The UI is assembled from independent fragments maintained by different teams.

## 3. Implementation Strategies

### A. Webpack Module Federation (Run-time Integration)
*The Modern Standard.*
Allows a JavaScript application to dynamically load code from another application at runtime.
- **Host App (App Shell)**: Handles routing, authentication, and the global layout (Sidebar, Header).
- **Remote App (e.g., Checkout Team)**: Exposes its `CheckoutComponent`. The Host dynamically imports it.
- *Pros*: Shared dependencies (React is only loaded once). Seamless UX.
- *Cons*: High coupling in tooling. Requires Webpack 5 (or Vite equivalents).

### B. Web Components (DOM Integration)
Teams build their fragments using framework-agnostic Web Components (`<checkout-button></checkout-button>`).
- *Pros*: Tech-agnostic. The Host can be Angular, the Remote can be React.
- *Cons*: Passing complex data structures (objects/functions) across DOM attributes is clunky.

### C. IFrames (Isolation Integration)
*The Legacy/Nuclear Option.*
- *Pros*: Absolute CSS and JS isolation. Zero chance of a memory leak in the Remote crashing the Host.
- *Cons*: Terrible UX, routing nightmares, slow performance, impossible to create overlapping overlays (like a global modal).

## 4. Architectural Anti-Patterns
- **The "Shared State" Trap**: Trying to use a global Redux store across 5 micro-frontends. If MFE A changes the Redux structure, MFE B crashes. MFEs should communicate via standard DOM Events (`CustomEvent`) or query parameters, maintaining minimal shared state.
- **CSS Bleeding**: If the Checkout MFE defines `.btn { color: red; }`, it will globally override the Host's CSS. MFEs must enforce CSS Modules, Styled Components, or Shadow DOM to scope their styles.
- **Dependency Bloat**: If Team A uses React 17, Team B uses React 18, and Team C uses Vue, the user downloads 3 MB of frameworks. Technology diversity is a theoretical benefit of MFEs, but a practical nightmare. Enforce a unified tech stack at the enterprise level.
