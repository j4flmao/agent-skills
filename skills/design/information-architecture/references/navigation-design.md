# Navigation Design Reference

## Navigation Levels

### Global Navigation (Primary)
The top-level navigation visible on every page.

| Pattern | Structure | Best For | Example |
|---------|-----------|----------|---------|
| Top bar | Horizontal links in header | 3-7 items, broad content | Marketing sites |
| Sidebar | Vertical menu on left | Many items, deep hierarchy | SaaS apps |
| Hamburger | Icon that reveals menu | Space-constrained, mobile | Mobile-first |
| Tab bar | Bottom tabs (mobile) | 3-5 primary sections | Native apps |
| Mega menu | Large expandable panels | Many sub-items per category | E-commerce |

### Local Navigation (Secondary)
Navigation within a section or context.

```yaml
local_navigation:
  - type: subnav
    placement: Below global nav or sidebar
    example:
      section: "Settings"
      items: [Profile, Security, Billing, Notifications, Integrations]
  - type: tab_nav
    placement: Content area top
    example:
      section: "Order Details"
      tabs: [Summary, Items, Shipping, History]
```

### Contextual Navigation
Navigation related to the current content or task.

- Inline links within content
- Related content sections
- "Next article" / "Previous article"
- Recommended items
- Walkthrough steps

### Utility Navigation
Secondary actions not part of content hierarchy.

```yaml
utility_nav:
  - Login / Sign up
  - Language selector
  - Theme toggle
  - Accessibility settings
  - Help / Support
  - Cart / Wishlist
```

## Breadcrumb Patterns

| Pattern | Format | When to Use |
|---------|--------|-------------|
| Location | Home > Products > Shoes > Running | Deep hierarchies, content sites |
| Path | Products > Home > Kitchen > Appliances | Flow-based, task-oriented |
| Attribute | Blue > Large > Cotton > Under $50 | Filter-based, e-commerce |

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/products/shoes">Shoes</a></li>
    <li aria-current="page">Running Shoes</li>
  </ol>
</nav>
```

### Breadcrumb Best Practices
- Always show current page as last item (not linked)
- Use `aria-current="page"` for accessibility
- Don't use breadcrumbs for flat sites (1-2 levels)
- Truncate long breadcrumbs with "..." and hover to expand
- Chevron separators are most recognized (>90% user understanding)

## Hub-and-Spoke Pattern

Hub: Central overview / menu of options
Spokes: Individual task flows

### Application
```yaml
hub_and_spoke:
  hub: Dashboard / Account Overview
  spokes:
    - "Update Profile" (3-step form)
    - "Change Password" (1-step)
    - "Manage Subscriptions" (nested flow)
    - "View Order History" (list + detail)
  pattern:
    spoke_entrance: from hub
    spoke_progress: linear step-by-step
    spoke_exit: return to hub (no cross-spoke navigation)
```

### When to Use
- Complex multi-step tasks (checkout, onboarding)
- Setup wizards (new user setup, device configuration)
- Testing/assessment flows
- Content creation (writing an article, composing a message)

## Mega Menu Design

```html
<nav class="mega-menu" aria-label="Main navigation">
  <ul>
    <li>
      <button aria-expanded="false">Products</button>
      <div class="mega-panel">
        <div class="mega-column">
          <h3>By Category</h3>
          <ul>
            <li><a href="/products/shoes">Shoes</a></li>
            <li><a href="/products/clothing">Clothing</a></li>
          </ul>
        </div>
        <div class="mega-column">
          <h3>By Activity</h3>
          <ul>
            <li><a href="/products/running">Running</a></li>
            <li><a href="/products/hiking">Hiking</a></li>
          </ul>
        </div>
      </div>
    </li>
  </ul>
</nav>
```

### Guidelines
- Group into 3-5 columns max
- 8-12 items per column max
- Add featured content (images, promotions) in a dedicated column
- Close on click outside and Escape key
- Don't use mega menus for fewer than 8 items

## Search Navigation Patterns

| Pattern | Description | Best For |
|---------|-------------|----------|
| Autocomplete | Suggest queries while typing | Large catalogs |
| Faceted search | Filter by category, price, rating | E-commerce |
| Search + browse | Both search and category navigation | General content |
| Typeahead with results | Show result previews in dropdown | Documentation |
| Voice search | Speech-to-text query | Mobile, accessibility |

```javascript
// Debounced search with autocomplete
function setupSearch(input, onResults) {
  let timeout;
  input.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const results = await searchAPI(e.target.value);
      onResults(results);
    }, 300);
  });
}
```

## Navigation Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Mystery meat | Unclear navigation labels | Use descriptive, scannable labels |
| Buried navigation | Key actions hidden in menus | Surface top tasks in global nav |
| Overloaded hamburger | 15+ items in mobile menu | Prioritize, group, or use progressive disclosure |
| Inconsistent nav | Different patterns per page | Define a single navigation system |
| No current location | User can't tell where they are | Highlight active nav item, show breadcrumbs |
| Dead-end pages | No onward navigation | Always provide next steps or back links |
