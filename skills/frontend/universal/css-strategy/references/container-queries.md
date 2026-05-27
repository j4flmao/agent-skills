# Container Queries

## Basic Container Query

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1rem;
  }

  .card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card__content {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }

  .card__image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
}
```

## Responsive Dashboard Widgets

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.widget {
  container-type: inline-size;
  container-name: widget;
}

@container widget (max-width: 350px) {
  .widget__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .widget__chart {
    height: 150px;
  }

  .widget__legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.75rem;
  }
}

@container widget (min-width: 600px) {
  .widget__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .widget__chart {
    height: 250px;
  }
}
```

## Container Query Units

```css
.responsive-card {
  container-type: inline-size;
}

@container (min-width: 0px) {
  .responsive-card__title {
    font-size: clamp(1rem, 5cqi, 2rem);
    line-height: 1.2;
  }

  .responsive-card__body {
    font-size: clamp(0.875rem, 3cqi, 1rem);
    padding: 2cqi;
  }

  .responsive-card__image {
    width: 100%;
    height: 30cqw;
    object-fit: cover;
    border-radius: 1cqw;
  }
}
```

## Nesting Container Queries

```css
.page-layout {
  container-type: inline-size;
  container-name: layout;
}

.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

@container layout (min-width: 768px) {
  .page {
    display: grid;
    grid-template-columns: 280px 1fr;
  }
}

@container sidebar (max-width: 250px) {
  .nav-item__label {
    display: none;
  }

  .nav-item {
    justify-content: center;
    padding: 0.75rem;
  }
}
```

## Key Points

- Use container queries for component-level responsiveness
- Define container-type and container-name on parent elements
- Combine with CSS Grid for adaptive layouts
- Use cqi/cqw units for container-relative sizing
- Test container queries at various breakpoints
- Avoid deep nesting of container queries
- Provide fallback styles for non-supporting browsers
- Use logical properties for better RTL support
- Combine with cascade layers for organization
- Keep container names descriptive and unique
- Use clamp() for fluid typography within containers
- Profile performance with complex container queries
