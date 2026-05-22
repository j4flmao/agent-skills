# Bottleneck Analysis Reference

## Database Bottlenecks

### Symptoms
- Slow queries in slow query log
- High connection pool utilization
- High CPU on database server
- Lock contention / deadlocks

### Fixes
```sql
-- Missing index
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);

-- N+1 query in ORM
-- Before: Order.find_each { |o| o.line_items.load }
-- After:  Order.includes(:line_items).find_each

-- Query optimization
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';
```

## CPU Bottlenecks

### Symptoms
- High CPU utilization (>80% sustained)
- Long GC pauses (Java, Go, .NET)
- Event loop lag (Node.js)

### Fixes
```javascript
// CPU-heavy task offloaded to worker thread
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-compute.js');

// Cache repeated computations
const memo = new Map();
function expensiveFn(input) {
  if (memo.has(input)) return memo.get(input);
  const result = compute(input);
  memo.set(input, result);
  return result;
}
```

## Memory Bottlenecks

### Symptoms
- Increasing heap over time (leak)
- High GC frequency
- OOM kills
- Swap usage

### Fixes
```javascript
// Node.js: avoid accidental global references
function leak() {
  leaked.push(new Array(1000).fill('*')); // BAD — leaked is global
}

// Fix: local scope or explicit cleanup
function noLeak() {
  const local = new Array(1000).fill('*');
  processResults(local);
}
```

## Network Bottlenecks

### Symptoms
- High latency on network calls
- Connection pool exhaustion
- Socket timeouts
- Retransmissions

### Fixes
```javascript
// Connection pooling
const http = require('http');
const agent = new http.Agent({ keepAlive: true, maxSockets: 25 });

// Batch requests instead of sequential
const results = await Promise.all(urls.map(fetch));

// Compression
// Enable gzip/brotli on API responses
```

## I/O Bottlenecks

### Symptoms
- High disk I/O wait
- Slow file operations
- Sync I/O in async context

### Fixes
```javascript
// Use streams instead of loading entire files
const rs = fs.createReadStream('large-file.csv');
const ws = fs.createWriteStream('output.csv');
rs.pipe(transformer).pipe(ws);

// Async I/O, never blocking:
// fs.readFileSync() — BAD in event-loop languages
// await fs.readFile() — GOOD
```

## Amdahl's Law

`Speedup = 1 / ((1 - P) + P/S)`

Where:
- P = proportion of execution time that can be parallelized
- S = speedup factor of the parallelized portion

Example: 50% parallelizable at 2x speedup → overall speedup = 1 / (0.5 + 0.5/2) = 1.33x

## Bottleneck Priority

1. Fix the biggest bottleneck first — measure, don't guess
2. Database queries > Network calls > CPU > Memory > I/O
3. If p95 >> p50, look for tail latency (GC pauses, queueing, hot keys)
4. Profile in production — dev environment is not representative
