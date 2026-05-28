# Tailwind Performance & Build Optimization

## Understanding Tailwind's Build Pipeline

Tailwind CSS processes your source files in three phases: scanning, generating, and optimizing. Understanding how each phase works helps you optimize build times and output size.

### Phase 1: Content Scanning

Tailwind reads all files matched by `content` patterns and extracts class name strings. This is IO-bound and scales with the number and size of scanned files.

```
Input: content: ['./src/**/*.{jsx,tsx}']
     -> Scan 500 files
     -> Extract 1200 unique class names
     -> 200 custom values from arbitrary syntax [xxx]
     -> 50 variant combinations (hover:, focus:, dark:, etc.)
```

### Phase 2: Class Generation

Each extracted class name is resolved against the configuration to generate the corresponding CSS rule. This phase is CPU-bound and optimized in v4 by using Lightning CSS.

### Phase 3: Optimization

The generated CSS is minified, deduplicated, and optimized. In v4, Lightning CSS handles minification and vendor prefixing in a single pass. In v3, this requires separate postcss plugins.

## Build Time Optimization

### CPU Profiling for Tailwind Builds

```bash
# Time the full build
Measure-Command { npx tailwindcss -i src/input.css -o output.css }

# Profile with Node.js
node --prof node_modules/.bin/tailwindcss -i src/input.css -o output.css
node --prof-process isolate-*.log > profile.txt
```

### Common Build Time Bottlenecks

| Bottleneck | Cause | Fix |
|-----------|-------|-----|
| Too many content paths | Scanning unnecessary directories | Narrow `content` to minimal globs |
| Large node_modules scan | Including `node_modules/**` | Only include specific package paths |
| Complex config | Deeply nested `theme.extend` | Flatten config, extract plugins |
| Many screens | More than 5 breakpoints | Stick to default breakpoints |
| Custom plugins | Plugin runs per candidate class | Use `matchUtilities` over `addUtilities` |

### Content Path Optimization

```js
// BAD -- scans entire project
content: ['./src/**/*'],

// BETTER -- specific extensions
content: ['./src/**/*.{jsx,tsx}'],

// BEST -- narrowest possible
content: [
  './src/pages/**/*.{jsx,tsx}',
  './src/components/**/*.{jsx,tsx}',
  './src/layouts/**/*.{jsx,tsx}',
],
```

### Excluding Test Files

Test files often contain class names that should not appear in production CSS. Exclude them to reduce scan time:

```js
content: {
  files: ['./src/**/*.{jsx,tsx}'],
  extract: {
    // Custom extractor to skip test files
    'jsx': (content) => {
      if (content.includes('.test.') || content.includes('.spec.')) return [];
      return content.match(/[a-zA-Z0-9:-]+/g) || [];
    },
  },
},
```

## CSS Output Size Optimization

### Analyzing Output Size by Category

```bash
# Generate full output
npx tailwindcss -i src/input.css -o full.css

# Count rules by type
rg "^." full.css --count-matches
rg "@media" full.css --count-matches
rg "\." full.css --count-matches

# Largest sections
rg -o '\/\*.*\*\/' full.css | sort | uniq -c | sort -rn
```

### Typical Size Breakdown

| Category | Classes | CSS Size (uncompressed) | % of Total |
|----------|---------|------------------------|------------|
| Layout (flex, grid, etc.) | 50-100 | 2-4 KB | 10% |
| Spacing (padding, margin) | 100-300 | 8-15 KB | 30% |
| Typography (font, text) | 80-200 | 5-10 KB | 20% |
| Color (bg, text, border) | 150-500 | 10-25 KB | 35% |
| Effects (shadow, blur) | 20-50 | 0.5-2 KB | 3% |
| Transforms/Animations | 10-30 | 0.5-1 KB | 2% |

### Strategies to Reduce Output Size

**1. Remove unused default theme values**

```js
// tailwind.config.js
export default {
  theme: {
    // Only include spacing values you actually use
    spacing: {
      0: '0px',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      8: '2rem',
      10: '2.5rem',
      12: '3rem',
    },
  },
};
```

**2. Disable unused core plugins**

```js
export default {
  corePlugins: {
    // Disable if not used
    container: false,
    float: false,
    clear: false,
    objectFit: false,
    objectPosition: false,
    overscrollBehavior: false,
    placeholderColor: false,
    placeholderOpacity: false,
    scrollMargin: false,
    scrollPadding: false,
    scrollSnapType: false,
    scrollSnapAlign: false,
    scrollSnapStop: false,
    space: false,
    touchAction: false,
    userSelect: false,
    visibility: false,
    whitelist: false,
    wordBreak: false,
  },
};
```

**3. Use `@layer` for custom CSS**

All custom CSS placed in `@layer utilities` or `@layer components` is subject to the same tree-shaking as Tailwind's built-in utilities.

```css
/* This CSS is NOT tree-shaken */
.my-custom-class { ... }

/* This CSS IS tree-shaken if unused */
@layer utilities {
  .my-custom-class { ... }
}
```

**4. Avoid unnecessary arbitrary values**

Each arbitrary value generates a unique CSS rule. A page with 50 arbitrary values adds ~2KB of CSS.

```html
<!-- BAD -- generates 3 unique rules -->
<div class="p-[13px] gap-[7px] text-[#333]">

<!-- GOOD -- uses existing tokens, no new rules -->
<div class="p-3 gap-2 text-gray-800">
```

## JIT Engine Deep Dive

### How JIT Detects Classes

Tailwind's JIT engine uses regex extraction to find class names in your source files. The default extractor works well for most cases but can fail with certain patterns.

```js
// Default regex: matches common Tailwind patterns
/[a-zA-Z0-9:-]+/g
```

### Known Extraction Failure Patterns

```jsx
// WON'T WORK -- dynamic concatenation
<div className={`text-${color}-500`}>

// WON'T WORK -- template literals with logic
const classes = `p-${size} ${variant ? `bg-${variant}-500` : 'bg-gray-500'}`;

// WILL WORK -- full class strings
const colorClasses = { red: 'text-red-500', blue: 'text-blue-500' };

// WILL WORK -- object mapping with clsx
const classes = clsx('base-class', {
  'text-red-500': variant === 'red',
  'text-blue-500': variant === 'blue',
});
```

### Custom Extractors for Non-Standard Patterns

```js
export default {
  content: {
    files: ['./src/**/*.{jsx,tsx}'],
    extract: {
      jsx: (content) => {
        // Match classes in template literals with pipe-separated values
        const patterns = [
          /className="([^"]+)"/g,
          /className='([^']+)'/g,
          /className=\{`([^`]+)`\}/g,
        ];
        const classes = [];
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            classes.push(...match[1].split(/\s+/));
          }
        }
        return classes;
      },
    },
  },
};
```

## Safelist Strategies

### Static Safelist

```js
export default {
  safelist: [
    'bg-red-500',
    'bg-green-500',
    'bg-blue-500',
    'text-red-500',
    'text-green-500',
    'text-blue-500',
  ],
};
```

### Pattern Safelist

```js
export default {
  safelist: [
    {
      pattern: /^bg-(red|green|blue|yellow|purple)-(100|200|300|400|500|600|700|800|900)$/,
      variants: ['hover', 'focus', 'dark'],
    },
    {
      pattern: /^text-(xs|sm|base|lg|xl)$/,
    },
  ],
};
```

### Deep Pattern Safelist

```js
export default {
  safelist: [
    {
      pattern: /^(bg|text|border)-(red|green|blue|yellow|purple|gray)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ['hover', 'focus', 'active', 'disabled', 'dark', 'dark:hover'],
    },
  ],
};
```

### Runtime Dynamic Class Safelist

If classes come from a CMS or API:

```js
// Generate safelist from known API values
const apiColors = ['red', 'green', 'blue', 'yellow', 'purple'];
const apiWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const generatedSafelist = apiColors.flatMap((color) =>
  apiWeights.flatMap((weight) => [
    `bg-${color}-${weight}`,
    `text-${color}-${weight}`,
    `border-${color}-${weight}`,
  ])
);

export default {
  safelist: generatedSafelist,
};
```

## v3 vs v4 Performance Comparison

| Metric | v3 | v4 | Improvement |
|--------|----|----|-------------|
| Cold build time (1000 classes) | 800ms | 200ms | 4x |
| Cold build time (5000 classes) | 3.2s | 600ms | 5.3x |
| Warm rebuild (1 file changed) | 50ms | 15ms | 3.3x |
| Output size (same classes) | 52KB | 48KB | 8% |
| Config parsing | JS eval | Native | 10x |
| Minification | cssnano | Lightning CSS | 2x |
| Vendor prefixing | autoprefixer | Lightning CSS | 2x |

### v4 Specific Optimizations

```css
/* v4: @import resolves at build time, not PostCSS time */
@import "tailwindcss";

/* v4: @theme is parsed once and cached */
@theme {
  --color-brand: #3b82f6;
  --spacing-18: 4.5rem;
}

/* v4: no separate PostCSS pipeline needed */
```

## Dark Mode Optimization

### Media Strategy (Default)

```js
darkMode: 'media', // Uses prefers-color-scheme
```
- No additional CSS generated for unused themes
- Dark mode classes are only generated if `dark:` variant is actually used
- Default strategy -- zero overhead if not used

### Class Strategy

```js
darkMode: 'class',
```
- Generates `dark:` variants for EVERY class that has a dark variant specified
- Output is proportional to the number of `dark:` classes in your source
- If you use `dark:` on 200 classes, it generates 200 additional rules

### Optimizing Class Strategy

```js
// BAD -- dark variant on every element
<div class="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 ...">

// GOOD -- CSS custom property at container level
<div class="dark">
  <div class="bg-bg-primary text-text-primary border-border">
```

By using CSS custom properties for theme switching, you avoid generating `dark:` variants for every class. The theme-switching happens at the CSS variable level, not the class level.

## Plugin Performance

### matchUtilities vs addUtilities

```js
// BAD -- generates ALL values at build time, even if unused
plugin(function({ addUtilities }) {
  const utilities = {};
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((n) => {
    utilities[`.grid-cols-${n}`] = { 'grid-template-columns': `repeat(${n}, minmax(0, 1fr))` };
  });
  addUtilities(utilities);
})

// GOOD -- generates on demand, only for used values
plugin(function({ matchUtilities }) {
  matchUtilities({
    'grid-cols': (value) => ({ 'grid-template-columns': `repeat(${value}, minmax(0, 1fr))` }),
  }, { values: { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: '11', 12: '12' } });
})
```

### Plugin Cost Analysis

Each plugin runs on every candidate class during generation. A plugin that iterates over all class names can multiply build time.

| Plugin Type | Cost per class | Total for 1000 classes |
|-------------|---------------|------------------------|
| No plugin | 0ms | 0ms |
| `addUtilities` (static) | 0.01ms | 10ms |
| `addComponents` (static) | 0.01ms | 10ms |
| `matchUtilities` (dynamic) | 0.05ms | 50ms |
| `addVariant` | 0.1ms | 100ms |
| Complex `addVariant` with regex | 0.5ms | 500ms |

## Tree Shaking and Dead Code Elimination

### How Tailwind Eliminates Dead Code

Tailwind's JIT engine uses a multi-pass elimination:

1. **Class scanning**: Only generates CSS for classes found in source files
2. **Variant scanning**: Only generates variant combinations that appear
3. **Keyframe elimination**: Only includes keyframes referenced by used animation classes
4. **Selector deduplication**: Merges identical rules

### What JIT Cannot Eliminate

- CSS in `@layer base` -- always included (Tailwind's base styles are tiny: ~2KB)
- CSS from third-party plugins -- included in full unless the plugin uses `matchUtilities`
- CSS imported via `@import` in non-Tailwind files -- not processed by JIT
- Classes added by JavaScript at runtime that are not in `safelist`

### Manual Dead Code Removal

```bash
# Find unused classes
npx tailwindcss -i src/input.css -o output.css --verbose 2>&1 | Select-String "No classes found"

# Compare used vs. available
Get-ChildItem -Recurse -Include *.tsx,*.jsx,*.html |
  Select-String -Pattern '\b(bg|text|border|p|m|gap|flex|grid)-\w+' |
  Select-Object -ExpandProperty Matches |
  Select-Object -ExpandProperty Value |
  Sort-Object -Unique
```

## CI/CD Pipeline Optimization

### Caching Tailwind Builds

```yaml
# GitHub Actions example
- name: Cache Tailwind build
  uses: actions/cache@v3
  with:
    path: |
      node_modules/.cache/tailwindcss
      .tailwind-cache
    key: tailwind-${{ hashFiles('tailwind.config.*', 'src/**/*.{jsx,tsx}') }}

- name: Build CSS
  run: npx tailwindcss -i src/input.css -o dist/output.css --minify
```

### Cache Invalidation Strategy

Tailwind's cache is invalidated when:
- Any file in `content` paths changes
- `tailwind.config.*` changes
- A plugin file changes
- `postcss.config.*` changes

Use hash-based cache keys that cover all of these:

```yaml
- name: Hash config sources
  id: hash
  run: |
    $hash = Get-ChildItem -Recurse tailwind.config.*,postcss.config.*,src/**/*.{jsx,tsx} | Get-FileHash -Algorithm SHA256 | Select-Object -ExpandProperty Hash
    echo "key=tailwind-$hash" >> $env:GITHUB_OUTPUT
```

### Build Splitting

For very large projects, split Tailwind builds:

```js
// Generate separate CSS for critical and non-critical paths
// Critical: above-the-fold styles
npx tailwindcss -i src/critical.css -o dist/critical.css --content './src/pages/home/**/*.jsx'
// Non-critical: everything else
npx tailwindcss -i src/full.css -o dist/full.css
```

## Bundle Size Monitoring

### Setting Up Size Budgets

```js
// tailwind.config.js
export default {
  // Size budget validation (custom plugin concept)
  _budget: {
    css: {
      maxSize: '50KB',
      exclude: ['base'], // Exclude base styles from budget
    },
  },
};
```

### Automated Size Checking

```bash
# Check CSS size in CI
$size = (Get-Item "dist/output.css").Length / 1KB
echo "CSS size: $([math]::Round($size, 1)) KB"
if ($size -gt 50) { throw "CSS budget exceeded: $size KB > 50 KB" }
```

### Monitoring Over Time

```bash
# Track size per build
$commit = git rev-parse --short HEAD
$size = (Get-Item "dist/output.css").Length / 1KB
"$commit,$([math]::Round($size, 2))" | Out-File -Append -FilePath "css-size-history.csv"
```

## Edge Cases and Debugging

### Debugging Missing Classes

```bash
# Check which classes are being detected
npx tailwindcss -i src/input.css -o /dev/null --dry-run -v 2>&1

# Check if a specific class exists in output
npx tailwindcss -i src/input.css -o output.css
Select-String "bg-blue-500" output.css
```

### Debugging Unexpectedly Large Output

```bash
# List all generated utilities sorted by size
npx tailwindcss -i src/input.css -o output.css
# Sort by rule count
(Get-Content output.css | Select-String '^\.' | Measure-Object).Count
# Check for unexpected class generation
Select-String "^\." output.css | Sort-Object -Unique
```

### Common Build Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `The `content` option in your Tailwind CSS configuration is missing or empty` | No `content` configured | Add `content` array with glob patterns |
| `Class ... does not exist` | Class not in any scanned file | Add file to content, or use safelist |
| `Cannot find module 'tailwindcss'` | Tailwind not installed | `npm install -D tailwindcss` |
| `MITM` error in build | Missing PostCSS config | Create `postcss.config.js` |
| Build very slow | Too many files in content | Narrow content paths |
| Build OOM | Extremely large config or content | Split into multiple builds |

### Profiling with Node Inspector

```bash
# Use Node.js inspector to profile
node --inspect-brk node_modules/.bin/tailwindcss -i src/input.css -o output.css
# Then open Chrome DevTools and connect to inspector
```

## Production Checklist

- [ ] `content` paths cover all template/component files
- [ ] No `@apply` in global CSS files
- [ ] `--minify` applied in production build
- [ ] Dynamic class names use safelist or full-class mapping
- [ ] Third-party component libraries scanned in `content`
- [ ] `purge: false` on any `theme.extend` values that JIT cannot detect
- [ ] PostCSS plugin chain optimized (Tailwind runs first)
- [ ] CSS output size under 50KB uncompressed
- [ ] Build time under 2 seconds in CI
- [ ] Caching configured in CI pipeline
- [ ] Dark mode strategy aligns with framework (class vs media)
- [ ] Arbitrary values used sparingly (< 10 per page)
- [ ] Plugins use `matchUtilities` over `addUtilities`
- [ ] No duplicate content path scanning
