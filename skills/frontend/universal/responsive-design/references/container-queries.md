# Container Queries

Size container queries style an element by the size of an ancestor container instead of the viewport, so a component adapts wherever it is placed. Size queries are Baseline across current Chrome, Edge, Firefox and Safari; style queries are not yet universal.

## Basic Syntax

```css
/* Define a container */
.parent {
  container-type: inline-size;
  container-name: sidebar;
}

/* Query the container */
@container sidebar (min-width: 400px) {
  .child {
    flex-direction: row;
  }
}
```

## `container-type` Values

| Value | Behavior |
|-------|----------|
| `inline-size` | Queries inline-axis width only (most common) |
| `size` | Queries both inline and block axes (adds containment) |
| `normal` | No containment — use when only `container-name` is needed |

## Shorthand

```css
.container {
  container: card / inline-size;
}

/* Longhand equivalent */
.container {
  container-type: inline-size;
  container-name: card;
}
```

## Use Case: Reusable Card Component

```css
.card-wrapper {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

@container (min-width: 350px) {
  .card {
    flex-direction: row;
  }
  .card-image {
    width: 150px;
    height: 150px;
  }
}

@container (min-width: 600px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
  .card-title {
    font-size: 1.5rem;
  }
}
```

## Use Case: Dashboard Widgets

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.widget {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .widget-header {
    flex-direction: row;
    justify-content: space-between;
  }
}

@container (max-width: 300px) {
  .widget-content {
    display: none; /* Collapse on very narrow widgets */
  }
}
```

## Nested Containers

```css
.outer {
  container-type: inline-size;
  container-name: outer;
}

.inner {
  container-type: inline-size;
  container-name: inner;
}

/* An unnamed @container matches the nearest ancestor container.
   Name containers to target an outer one explicitly. */
@container outer (min-width: 500px) {
  .inner { padding: 2rem; }
}

@container inner (min-width: 300px) {
  .item { display: grid; grid-template-columns: auto 1fr; }
}
```

## Fallback for Browsers Without Container Queries

```css
/* Supported in Chrome 105+, Safari 16+, Firefox 110+ */

/* Fallback: use media queries */
@media (min-width: 768px) {
  .card { flex-direction: row; }
}

/* Progressive enhancement: container query */
@supports (container-type: inline-size) {
  .card-wrapper { container-type: inline-size; }

  @container (min-width: 400px) {
    .card { flex-direction: row; }
  }
}
```

## Common Gotchas

```css
/* WILL NOT WORK — needs a container ancestor */
@container (min-width: 400px) {
  .direct-child { /* this element has no container ancestor */ }
}

/* WORKS */
.parent { container-type: inline-size; }
@container (min-width: 400px) {
  .descendant { /* descendant of .parent */ }
}

/* Container queries on the container itself won't work */
.container { container-type: inline-size; }
@container (min-width: 500px) {
  .container { /* this won't apply to .container itself */ }
}
```

## Container Query Length Units

```css
.container { container-type: inline-size; }

@container (min-width: 600px) {
  .child {
    /* cqw = 1% of container width */
    width: 50cqi;     /* 50% of container inline size */
    /* Clamp fluid type so it never ignores the user's zoom/base size */
    font-size: clamp(1rem, 0.75rem + 2cqi, 1.75rem);
    padding: 2cqi;    /* 2% of container inline size */
  }
}
```

| Unit | Relative To |
|------|-------------|
| `cqw` | 1% of container width |
| `cqh` | 1% of container height |
| `cqi` | 1% of container inline size |
| `cqb` | 1% of container block size |
| `cqmin` | Smaller of `cqi` and `cqb` |
| `cqmax` | Larger of `cqi` and `cqb` |

Without a size container ancestor, `cq*` units fall back to the small viewport units (`svw`, `svh`, ...).

## Range Syntax and Logic

```css
@container card (400px <= width < 700px) {
  .card { grid-template-columns: 120px 1fr; }
}

@container (orientation: landscape) and (min-height: 300px) {
  /* height/orientation queries need container-type: size */
  .media { aspect-ratio: 16 / 9; }
}
```

## Style Queries (progressive enhancement)

Style queries test computed custom properties on the container. Any element is a style container by default; no `container-type` is needed. Check current browser support before relying on them and keep a sensible default.

```css
.card-wrapper { --variant: compact; }

@container style(--variant: featured) {
  .card { border: 2px solid var(--accent); }
}
```

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| `container-type: size` on an element with auto height | Its height collapses (size containment ignores children); use `inline-size` unless the height is set explicitly |
| Querying the container itself | A container cannot style itself from its own query; style descendants or wrap it |
| Making every element a container | Containment changes layout/sizing behaviour; mark only component wrappers |
| Font sizes in raw `cqw` | Wrap in `clamp()` with `rem` bounds to respect user zoom |
| Mixing viewport media queries and container queries for the same component | Use media queries for page layout, container queries for component internals |

## Checklist

- [ ] Component wrapper declares `container-type: inline-size` (and a name when nested)
- [ ] Component CSS uses `@container`, page shell uses `@media`
- [ ] Fluid units bounded with `clamp()`
- [ ] Style queries only as enhancement with a default style
- [ ] Tested by placing the component in narrow and wide slots, not just by resizing the window
