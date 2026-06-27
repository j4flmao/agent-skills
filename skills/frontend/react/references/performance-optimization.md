# React Performance Optimization Strategies

Performance optimization in React is about minimizing unnecessary re-renders, reducing bundle sizes, and optimizing the critical rendering path.

## Table of Contents
1. [Core Principles of React Rendering](#core-principles-of-react-rendering)
2. [useMemo and useCallback Pitfalls](#usememo-and-usecallback-pitfalls)
3. [React Compiler (Forget)](#react-compiler)
4. [Streaming Server-Side Rendering (SSR)](#streaming-ssr)
5. [Code Splitting and Lazy Loading](#code-splitting-and-lazy-loading)
6. [Bundle Size Reduction](#bundle-size-reduction)
7. [Measuring Performance with Core Web Vitals](#measuring-performance)

---

## 1. Core Principles of React Rendering

React updates the DOM in two phases:
1. **Render Phase:** React calls component functions to figure out what the UI should look like.
2. **Commit Phase:** React applies the changes to the DOM.

A component re-renders when:
- Its state changes.
- Its parent re-renders.
- A context it consumes changes.

**Crucial Note:** Props changing is *not* the sole cause of re-renders. A component will re-render if its parent re-renders, regardless of whether its props changed, unless wrapped in `React.memo`.

---

## 2. useMemo and useCallback Pitfalls

`useMemo` caches the result of a calculation. `useCallback` caches a function definition.

### The Pitfall: Overuse
Using these hooks everywhere actually *degrades* performance because:
1. The hooks themselves have an overhead.
2. The dependency array must be evaluated on every render.
3. They prevent garbage collection of memoized values.

### When to use `useMemo`:
- For computationally expensive operations (e.g., sorting large arrays, complex math).
- To maintain referential equality of an object/array passed as a prop to a `React.memo` component, or used in another hook's dependency array.

```tsx
// GOOD: Expensive calculation
const sortedData = useMemo(() => expensiveSort(largeArray), [largeArray]);

// GOOD: Maintaining referential equality for a child component
const memoizedConfig = useMemo(() => ({ showHeader: true, layout: 'grid' }), []);
return <HeavyChildComponent config={memoizedConfig} />;

// BAD: Primitives don't need memoization
const isEven = useMemo(() => count % 2 === 0, [count]); // Just do: count % 2 === 0
```

### When to use `useCallback`:
- When passing a callback as a prop to a highly optimized child component (wrapped in `React.memo`).
- When a function is used as a dependency in `useEffect`.

---

## 3. React Compiler (React Forget)

The React Compiler (currently in development/experimental stages) aims to automate memoization. By analyzing your code, the compiler will automatically apply the equivalent of `useMemo`, `useCallback`, and `React.memo` at build time.

**Preparation:**
- Write idiomatic React.
- Avoid mutating props or state directly.
- Ensure your components are pure functions of their props and state.

---

## 4. Streaming Server-Side Rendering (SSR)

Streaming allows you to send HTML chunks to the browser as they are generated, rather than waiting for the entire page to render on the server.

### Next.js App Router (Suspense)
In Next.js, `Suspense` boundaries automatically enable streaming.

```tsx
import { Suspense } from 'react';
import ProductDetails from './ProductDetails';
import ProductReviews from './ProductReviews';
import Skeleton from './Skeleton';

export default function Page({ productId }) {
  return (
    <div>
      {/* This renders immediately if it doesn't await data */}
      <h1>Product Page</h1>
      
      {/* Streaming boundary */}
      <Suspense fallback={<Skeleton />}>
        {/* Server component that fetches data */}
        <ProductDetails id={productId} />
      </Suspense>

      {/* Another streaming boundary */}
      <Suspense fallback={<Skeleton />}>
        <ProductReviews id={productId} />
      </Suspense>
    </div>
  );
}
```

---

## 5. Code Splitting and Lazy Loading

### React.lazy
Dynamically import components only when they are needed.

```tsx
import React, { Suspense } from 'react';

// The component code won't be loaded until HeavyComponent is rendered
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  const [showHeavy, setShowHeavy] = React.useState(false);

  return (
    <div>
      <button onClick={() => setShowHeavy(true)}>Load Heavy Feature</button>
      
      {showHeavy && (
        <Suspense fallback={<div>Loading component...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </div>
  );
}
```

### Lazy Loading Images
Always use `loading="lazy"` for images below the fold, or use frameworks' optimized image components.

```tsx
// Standard HTML
<img src="/hero.jpg" alt="Hero" loading="lazy" />

// Next.js Image Component (automatically handles optimization, sizing, and lazy loading)
import Image from 'next/image';

<Image 
  src="/hero.jpg" 
  alt="Hero" 
  width={800} 
  height={600} 
  placeholder="blur" 
/>
```

---

## 6. Bundle Size Reduction Techniques

1. **Tree Shaking:** Ensure you are using ES Modules (import/export).
2. **Import Cost:** Avoid importing entire libraries.
   ```javascript
   // BAD
   import { isEmpty } from 'lodash';
   
   // GOOD
   import isEmpty from 'lodash/isEmpty';
   // OR use lodash-es
   ```
3. **Analyze Bundles:** Use tools like `webpack-bundle-analyzer` or `@next/bundle-analyzer` to identify large dependencies.
4. **Dynamic Imports for Heavy Libraries:** Load charting or PDF generation libraries only when the user clicks the relevant button.

---

## 7. Measuring Performance with Core Web Vitals

Focus on optimizing:
- **LCP (Largest Contentful Paint):** Loading performance. Optimize images, use SSR, reduce server response time.
- **FID (First Input Delay) / INP (Interaction to Next Paint):** Interactivity. Break up long Javascript tasks, use Web Workers, avoid heavy computations on the main thread.
- **CLS (Cumulative Layout Shift):** Visual stability. Always set `width` and `height` attributes on images, reserve space for dynamic content like ads or loaded lists.

### Using web-vitals library
```typescript
import { onCLS, onINP, onLCP } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send metric to your analytics service
  console.log(metric.name, metric.value);
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

*End of Document*
