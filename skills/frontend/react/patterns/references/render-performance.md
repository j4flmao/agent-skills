# React Render Performance Optimization

## Overview
React re-renders components when state or props change. Performance optimization minimizes unnecessary re-renders and reduces computation. This reference covers memo, useMemo, useCallback, virtualization, code splitting, and profiling.

## Preventing Re-renders

### React.memo
```tsx
import { memo } from 'react';

interface ExpensiveListProps {
  items: Item[];
  onItemClick: (id: string) => void;
}

function ExpensiveList({ items, onItemClick }: ExpensiveListProps) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

// Only re-renders when props change (shallow comparison)
export default memo(ExpensiveList);
```

### Custom Comparison
```tsx
const List = memo(
  ({ items, selectedId }: { items: Item[]; selectedId: string | null }) => {
    return (
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            className={item.id === selectedId ? 'selected' : ''}
          >
            {item.name}
          </li>
        ))}
      </ul>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if items or selectedId changed
    return (
      prevProps.selectedId === nextProps.selectedId &&
      prevProps.items.length === nextProps.items.length &&
      prevProps.items.every(
        (item, i) => item.id === nextProps.items[i].id
      )
    );
  }
);
```

## useMemo and useCallback

### Memoizing Computations
```tsx
import { useMemo, useState } from 'react';

function FilterableList({ items }: { items: Item[] }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');

  // Only recomputes when items, search, or sortBy change
  const filteredItems = useMemo(() => {
    console.log('Filtering items...');
    return items
      .filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) =>
        sortBy === 'name'
          ? a.name.localeCompare(b.name)
          : new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [items, search, sortBy]);

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="name">Name</option>
        <option value="date">Date</option>
      </select>
      <ul>
        {filteredItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Stable Function References
```tsx
import { useCallback, memo, useState } from 'react';

function Parent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Item[]>([]);

  // Stable callback reference - only created once
  const handleIncrement = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  // Stable callback with dependencies
  const handleItemClick = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, clicked: true } : item
      )
    );
  }, []);

  return (
    <div>
      <p>Count: {count}</p>
      <IncrementButton onClick={handleIncrement} />
      <ItemList items={items} onItemClick={handleItemClick} />
    </div>
  );
}

const IncrementButton = memo(function IncrementButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return <button onClick={onClick}>Increment</button>;
});
```

## List Virtualization

### Virtual Scrolling
```tsx
import { useRef, useState, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 50;
const OVERSCAN = 5;

function VirtualList<T>({
  items,
  renderItem,
  height,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * ITEM_HEIGHT;
  const visibleCount = Math.ceil(height / ITEM_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * ITEM_HEIGHT;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
}
```

## Code Splitting

### Dynamic Imports
```tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
const PDFViewer = lazy(() => import('./PDFViewer'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>

      <Suspense fallback={<div>Loading chart...</div>}>
        {showChart && <HeavyChart />}
      </Suspense>
    </div>
  );
}
```

### Route-Based Splitting
```tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}
```

## Profiling

### React DevTools Profiling
```tsx
// Wrap with Profiler to measure render performance
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  console.log(`Component ${id} ${phase}:`, {
    actualDuration,
    baseDuration,
    commitTime,
  });

  // Send to analytics
  if (actualDuration > 16) {
    analytics.recordSlowRender({
      component: id,
      duration: actualDuration,
    });
  }
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

## Key Points
- React.memo prevents re-renders when props haven't changed
- useMemo caches computation results between renders
- useCallback provides stable function references
- Virtual scrolling renders only visible items in long lists
- Code splitting with lazy() reduces initial bundle size
- Route-based splitting loads pages on demand
- Profiler identifies slow components and re-render issues
- Avoid inline functions and objects in render for child components
- Context splitting prevents unnecessary consumer re-renders
- Keys must be stable, unique, and predictable
- State colocation keeps state close to where it's used
- useDeferredValue and useTransition for urgent vs non-urgent updates
- Children prop pattern isolates re-renders to tree segments
- Bundle analysis tools (webpack-bundle-analyzer) identify large dependencies
- SSR and streaming can improve perceived performance
- Avoid premature optimization - profile first, then optimize
