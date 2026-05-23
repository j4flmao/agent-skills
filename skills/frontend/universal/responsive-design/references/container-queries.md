# Container Queries

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

@container outer (min-width: 500px) {
  /* ... */
}

@container inner (min-width: 300px) {
  /* ... */
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
    width: 50cqw;     /* 50% of container width */
    font-size: 5cqw;  /* responsive to container */
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
