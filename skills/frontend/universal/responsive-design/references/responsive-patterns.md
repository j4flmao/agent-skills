# Responsive Patterns

## Layout Patterns

### Stacking Cards (Mobile → Desktop)
```css
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Sidebar Layout (Collapsible)
```css
.page-layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

@media (min-width: 768px) {
  .page-layout {
    grid-template-columns: 250px 1fr;
    grid-template-rows: auto 1fr auto;
  }
  .sidebar { grid-column: 1; grid-row: 1 / -1; }
  .header { grid-column: 2; }
  .main { grid-column: 2; }
}
```

### Holy Grail Layout
```css
.holy-grail {
  display: grid;
  grid-template-areas:
    "header"
    "nav"
    "main"
    "aside"
    "footer";
}

@media (min-width: 768px) {
  .holy-grail {
    grid-template-columns: 200px 1fr 200px;
    grid-template-areas:
      "header header  header"
      "nav    main    aside"
      "footer footer  footer";
  }
}
```

## Responsive Typography Scale

```css
:root {
  --text-xs: clamp(0.75rem, 0.5vw + 0.5rem, 0.875rem);
  --text-sm: clamp(0.875rem, 0.75vw + 0.625rem, 1rem);
  --text-base: clamp(1rem, 1vw + 0.75rem, 1.125rem);
  --text-lg: clamp(1.125rem, 1.5vw + 0.75rem, 1.375rem);
  --text-xl: clamp(1.25rem, 2vw + 0.75rem, 1.75rem);
  --text-2xl: clamp(1.5rem, 3vw + 0.75rem, 2.25rem);
  --text-3xl: clamp(1.875rem, 4vw + 1rem, 3rem);
  --text-4xl: clamp(2.25rem, 5vw + 1rem, 3.75rem);
}
```

## Responsive Spacing

```css
:root {
  --space-xs: clamp(0.25rem, 0.5vw, 0.5rem);
  --space-sm: clamp(0.5rem, 1vw, 0.75rem);
  --space-md: clamp(1rem, 2vw, 1.5rem);
  --space-lg: clamp(1.5rem, 3vw, 2.5rem);
  --space-xl: clamp(2rem, 4vw, 4rem);
  --space-2xl: clamp(3rem, 6vw, 6rem);
}
```

## Responsive Navigation

### Mobile Hamburger
```tsx
function ResponsiveNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="nav">
      <button
        className="md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <ul className={`nav-links ${isOpen ? 'open' : ''}`}>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  )
}
```

```css
.nav-links {
  display: none;
}
.nav-links.open {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .nav-links,
  .nav-links.open {
    display: flex;
    flex-direction: row;
  }
  .md\:hidden { display: none; }
}
```

### Responsive Table

```css
/* Horizontal scroll on mobile */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Card-like table on mobile */
@media (max-width: 640px) {
  table, thead, tbody, th, td, tr {
    display: block;
  }
  thead { display: none; }
  td {
    padding: 0.5rem;
    border: none;
  }
  td::before {
    content: attr(data-label);
    font-weight: 600;
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
  }
  tr {
    border: 1px solid #ddd;
    margin-bottom: 1rem;
    border-radius: 8px;
  }
}
```

## Responsive Images

```html
<img
  src="hero-640.jpg"
  srcset="
    hero-640.jpg 640w,
    hero-1024.jpg 1024w,
    hero-1920.jpg 1920w"
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw"
  alt="Hero image"
/>
```

## Responsive Patterns Decision

| Content | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Single column list | Stack | 2-col grid | 3-col grid |
| Sidebar | Hidden (toggle) | Collapsible | Fixed |
| Table | Card layout | Scrollable | Full table |
| Navigation | Hamburger | Full top nav | Full top nav |
| Typography | clamp(small) | clamp(medium) | clamp(large) |
| Spacing | clamp(small) | clamp(medium) | clamp(large) |
| Images | Full width | Responsive srcset | Responsive srcset |

## Testing Viewports

| Device | Width | CSS Breakpoint |
|--------|-------|---------------|
| iPhone SE | 375px | Default (mobile) |
| iPhone 14 Pro | 390px | Default (mobile) |
| Samsung Galaxy | 412px | Default (mobile) |
| iPad Mini | 768px | `md` (768px) |
| iPad Pro | 1024px | `lg` (1024px) |
| Laptop | 1280px | `xl` (1280px) |
| Desktop | 1440px+ | `2xl` (1536px) |
