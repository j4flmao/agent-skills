# Node.js Event Loop

## Event Loop Phases

```
   ┌───────────────────────────┐
┌─>│           timers          │ ← setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │ ← I/O callbacks deferred
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │ ← internal
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │ ← I/O events, timers due
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │ ← setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │      close callbacks      │ ← socket.on('close')
│  └───────────────────────────┘
└───────────────────────────────┘
```

## Blocking vs Non-blocking

| Operation | Blocking | Non-blocking | Phase |
|-----------|----------|-------------|-------|
| setTimeout(fn, 0) | ❌ | ✅ | timers |
| setImmediate(fn) | ❌ | ✅ | check |
| process.nextTick(fn) | ❌ | ✅ | between phases |
| fs.readFile | ❌ | ✅ | poll |
| JSON.parse(data) | ✅ | ❌ | current |
| crypto.pbkdf2 | ⚠️ | ✅ (libuv) | pending |

## nextTick vs setImmediate

```typescript
// process.nextTick — runs BEFORE next phase
// Use for: error handling, critical cleanup
process.nextTick(() => {
  // Runs after current operation, before any I/O
});

// setImmediate — runs in check phase
// Use for: deferring work to next iteration
setImmediate(() => {
  // Runs after poll phase completes
});

// Order: process.nextTick → ... → setImmediate
```

## Microtasks vs Macrotasks

```typescript
console.log('1: sync');

setTimeout(() => console.log('2: macrotask'), 0);

Promise.resolve().then(() => console.log('3: microtask'));

process.nextTick(() => console.log('4: nextTick'));

queueMicrotask(() => console.log('5: queueMicrotask'));

setImmediate(() => console.log('6: check'));

// Output: 1, 4, 3, 5, 2, 6
// nextTick runs before Promise microtasks
// queueMicrotask runs in microtask queue
```

## Event Loop Blocking Detection

```typescript
import { performance, PerformanceObserver } from 'perf_hooks';

// Detect event loop lag
function detectLag(threshold = 50) {
  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    const diff = now - last;
    if (diff > threshold) {
      console.warn(`Event loop lag: ${diff}ms`);
    }
    last = now;
  }, 100);
}

// Using perf_hooks
const obs = new PerformanceObserver((list) => {
  const [entry] = list.getEntries();
  if (entry.duration > 50) {
    console.warn(`Long task: ${entry.duration}ms`);
  }
});
obs.observe({ entryTypes: ['function'] });
```

## Worker Threads for CPU Work

```typescript
import { Worker } from 'worker_threads';

// Main thread
function runInWorker<T>(data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./cpu-worker.js', {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

// cpu-worker.js
import { parentPort, workerData } from 'worker_threads';
const result = performHeavyComputation(workerData);
parentPort!.postMessage(result);
```

## libuv Thread Pool

```typescript
// Default pool size: 4
// Increase for I/O-bound workloads
process.env.UV_THREADPOOL_SIZE = '8';

// Operations using thread pool:
// - fs.* (all file system operations)
// - crypto.pbkdf2, crypto.randomBytes
// - DNS lookup
// - zlib (compression)

// Network I/O does NOT use thread pool
// It uses OS async I/O facilities (epoll, kqueue, IOCP)
```

## Avoiding Blocking

```typescript
// ❌ Blocking — don't do this
function processOrders(orders: Order[]) {
  orders.forEach(order => {
    const result = heavyComputation(order); // blocks event loop
  });
}

// ✅ Non-blocking — yield to event loop
async function processOrders(orders: Order[]) {
  for (const order of orders) {
    await new Promise(resolve => setImmediate(resolve)); // yield
    const result = heavyComputation(order);
  }
}

// ✅ Better — use worker threads
async function processOrders(orders: Order[]) {
  const results = await Promise.all(
    orders.map(order => runInWorker(order))
  );
}
```

## Best Practices

1. Never block the event loop with synchronous CPU work
2. Use Worker threads for CPU-intensive tasks
3. Use streams for large data processing
4. Avoid deep recursive call stacks
5. Monitor event loop lag with tools like `process.hrtime`
6. Use `setImmediate()` to yield to pending I/O
7. Prefer promises over callbacks for async flow
8. Never `process.nextTick()` recursively (can starve I/O)
