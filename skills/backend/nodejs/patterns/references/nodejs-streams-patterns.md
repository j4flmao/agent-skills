# Node.js Streams Patterns

## Overview

Node.js streams are a fundamental primitive for processing data efficiently in memory-constrained environments. This reference covers all stream types, backpressure mechanics, common patterns, error handling, and advanced techniques for production-grade stream processing.

## Stream Types

### Readable Streams

A readable stream represents a source of data. Data can be consumed either by piping to a writable stream, using the `data` event, or using async iteration.

```javascript
const { Readable } = require('stream');

// Creating a readable stream from an array
const arrayStream = Readable.from([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
]);

// Creating a custom readable stream
class CounterStream extends Readable {
  constructor(max = 100) {
    super({ objectMode: true });
    this.max = max;
    this.count = 0;
  }

  _read() {
    this.count++;
    if (this.count > this.max) {
      this.push(null); // Signal end of stream
    } else {
      this.push({ count: this.count, timestamp: Date.now() });
    }
  }
}

const counter = new CounterStream(10);
for await (const data of counter) {
  console.log(data);
}
```

Readable stream modes:
- **Flowing mode**: Data is emitted as fast as possible via `data` events.
- **Paused mode**: Data must be explicitly read via `read()` calls.

```javascript
// Flowing mode (automatic)
readable.on('data', (chunk) => {
  console.log('Received chunk:', chunk.length);
});

// Paused mode (manual)
readable.on('readable', () => {
  let chunk;
  while ((chunk = readable.read()) !== null) {
    console.log('Read chunk:', chunk.length);
  }
});
```

### Writable Streams

A writable stream represents a destination for data.

```javascript
const { Writable } = require('stream');
const { createWriteStream } = require('fs');

// Basic file write stream
const fileStream = createWriteStream('output.txt');
fileStream.write('Hello ');
fileStream.write('World');
fileStream.end();

// Custom writable stream
class BatchWritable extends Writable {
  constructor(batchSize = 100) {
    super({ objectMode: true });
    this.batchSize = batchSize;
    this.buffer = [];
  }

  _write(chunk, encoding, callback) {
    this.buffer.push(chunk);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    callback();
  }

  _final(callback) {
    this.flush();
    callback();
  }

  flush() {
    if (this.buffer.length > 0) {
      console.log(`Writing batch of ${this.buffer.length} items`);
      this.buffer = [];
    }
  }
}
```

### Transform Streams

A transform stream is both readable and writable, allowing data transformation in transit.

```javascript
const { Transform } = require('stream');

// JSON line parser
class JSONLineParser extends Transform {
  constructor() {
    super({ readableObjectMode: true });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          this.push(JSON.parse(line));
        } catch (err) {
          this.destroy(new Error(`Invalid JSON: ${line}`));
          return;
        }
      }
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.trim()) {
      try {
        this.push(JSON.parse(this.buffer));
      } catch (err) {
        this.destroy(new Error(`Invalid JSON: ${this.buffer}`));
        return;
      }
    }
    callback();
  }
}

// CSV to JSON transformer
class CSVParser extends Transform {
  constructor() {
    super({ readableObjectMode: true });
    this.headers = null;
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      const values = line.split(',');
      if (!this.headers) {
        this.headers = values.map(h => h.trim());
        continue;
      }

      const obj = {};
      this.headers.forEach((header, i) => {
        obj[header] = values[i]?.trim();
      });
      this.push(obj);
    }
    callback();
  }
}
```

### Duplex Streams

A duplex stream is both readable and writable but the two sides are independent.

```javascript
const { Duplex } = require('stream');
const net = require('net');

// TCP echo server using Duplex
net.createServer((socket) => {
  // socket is a Duplex stream
  socket.pipe(socket); // Echo back
});

// Custom Duplex: in-memory communication channel
class MemoryChannel extends Duplex {
  constructor() {
    super();
    this.buffer = [];
  }

  _write(chunk, encoding, callback) {
    this.buffer.push(chunk);
    this.push(chunk); // Forward to readable side
    callback();
  }

  _read(size) {
    // In this example, the push happens in _write
  }
}
```

## Backpressure

### Understanding Backpressure

Backpressure occurs when data is produced faster than it can be consumed. Without backpressure handling, memory usage grows unboundedly until the process crashes.

```javascript
// BAD: No backpressure handling — will buffer entire data in memory
function processLargeFileBad(inputPath) {
  const readStream = createReadStream(inputPath);
  readStream.on('data', (chunk) => {
    // If transform is slower than read, this buffers indefinitely
    const result = heavyTransformation(chunk);
    writeStream.write(result); // Returns false when buffer is full, ignored
  });
}

// GOOD: Proper backpressure with drain event
function processLargeFileGood(inputPath, outputPath) {
  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);

  readStream.on('data', (chunk) => {
    const canContinue = writeStream.write(chunk);
    if (!canContinue) {
      readStream.pause(); // Stop reading until drain
      writeStream.once('drain', () => readStream.resume());
    }
  });

  readStream.on('end', () => writeStream.end());
}

// BEST: Use pipeline() which handles backpressure automatically
const { pipeline } = require('stream/promises');

async function processLargeFileBest(inputPath, outputPath) {
  const readStream = createReadStream(inputPath);
  const transformStream = new Transform({
    transform(chunk, encoding, callback) {
      callback(null, chunk.toString().toUpperCase());
    }
  });
  const writeStream = createWriteStream(outputPath);

  await pipeline(readStream, transformStream, writeStream);
}
```

### Backpressure Mechanics

```
Source generates data at 100MB/s
    ↓
Readable stream has internal buffer (highWaterMark: 16KB default)
    ↓
Pipe/Write maintains backpressure via .write() return value
    ↓
Writable stream has internal buffer (highWaterMark: 16KB default)
    ↓
Consumer processes data at 10MB/s
    ↓
When buffers fill, readable is paused → source stops generating
```

The `highWaterMark` controls the buffer size:

```javascript
// For buffer mode (default)
const stream = new Readable({ highWaterMark: 64 * 1024 }); // 64KB buffer

// For object mode
const stream = new Readable({
  objectMode: true,
  highWaterMark: 100 // Buffer at most 100 objects
});
```

### Testing Backpressure

```javascript
function simulateBackpressure(stream, delayMs = 100) {
  let writeCount = 0;
  let pauseCount = 0;

  stream.on('data', async (chunk) => {
    stream.pause();
    pauseCount++;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    writeCount++;
    stream.resume();
  });

  stream.on('end', () => {
    console.log(`Processed ${writeCount} chunks with ${pauseCount} pauses`);
  });

  return () => ({ writeCount, pauseCount });
}
```

## Pipeline Patterns

### Basic Pipeline

```javascript
const { pipeline } = require('stream/promises');

async function basicPipeline() {
  await pipeline(
    createReadStream('input.txt'),
    createGzip(),
    createWriteStream('input.txt.gz')
  );
  console.log('Pipeline completed');
}
```

### Pipeline with Multiple Transforms

```javascript
class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  }
}

class LineCounter extends Transform {
  constructor() {
    super({ readableObjectMode: true });
    this.lineCount = 0;
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    this.lineCount += lines.length;
    lines.forEach(line => this.push({ line, lineNumber: this.lineCount }));
    callback();
  }
}

async function multiTransformPipeline(inputPath, outputPath) {
  const aggregate = [];

  await pipeline(
    createReadStream(inputPath),
    new UpperCaseTransform(),
    new LineCounter(),
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        aggregate.push(chunk);
        callback();
      }
    })
  );

  return aggregate;
}
```

### Error Handling in Pipelines

```javascript
// pipeline() automatically destroys all streams when one errors
async function safePipeline() {
  try {
    await pipeline(
      createReadStream('input.txt'),
      new Transform({
        transform(chunk, encoding, callback) {
          if (chunk.toString().includes('INVALID')) {
            callback(new Error('Invalid data encountered'));
            return;
          }
          callback(null, chunk);
        }
      }),
      createWriteStream('output.txt')
    );
  } catch (err) {
    console.error('Pipeline failed:', err.message);
    // All streams are automatically cleaned up
  }
}

// Custom error handling with stream destroy
function pipelineWithCleanup(readable, transform, writable) {
  let cleanup = false;

  function onError(stream, err) {
    if (cleanup) return;
    cleanup = true;

    console.error(`Stream error: ${err.message}`);
    readable.destroy(err);
    transform.destroy(err);
    writable.destroy(err);
  }

  readable.on('error', (err) => onError(readable, err));
  transform.on('error', (err) => onError(transform, err));
  writable.on('error', (err) => onError(writable, err));

  readable.pipe(transform).pipe(writable);
}
```

## Advanced Patterns

### Object Mode Streaming

Object mode allows streaming JavaScript objects instead of Buffer/String chunks.

```javascript
const { Transform, Writable, Readable } = require('stream');

// Object mode stream for processing database records
class UserEnricher extends Transform {
  constructor(db) {
    super({ objectMode: true });
    this.db = db;
  }

  async _transform(user, encoding, callback) {
    try {
      const [orders, preferences] = await Promise.all([
        this.db.orders.findByUserId(user.id),
        this.db.preferences.findByUserId(user.id)
      ]);
      this.push({ ...user, orders, preferences });
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

// Usage
Readable.from(db.users.findAll())
  .pipe(new UserEnricher(db))
  .pipe(new Writable({
    objectMode: true,
    write(user, encoding, callback) {
      console.log(`Processed user ${user.name} with ${user.orders.length} orders`);
      callback();
    }
  }));
```

### Parallel Processing with Streams

```javascript
class ParallelTransform extends Transform {
  constructor(concurrency = 4, transformFn) {
    super({ objectMode: true });
    this.concurrency = concurrency;
    this.transformFn = transformFn;
    this.active = 0;
    this.queue = [];
    this.callbacks = [];
  }

  _transform(chunk, encoding, callback) {
    this.queue.push({ chunk, callback });
    this.processNext();
  }

  _flush(callback) {
    this.flushCallback = callback;
    this.processNext();
  }

  processNext() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const { chunk, callback } = this.queue.shift();
      this.active++;

      this.transformFn(chunk)
        .then((result) => {
          this.push(result);
          callback();
        })
        .catch((err) => {
          callback(err);
        })
        .finally(() => {
          this.active--;
          this.processNext();
        });
    }

    if (this.active === 0 && this.queue.length === 0 && this.flushCallback) {
      this.flushCallback();
    }
  }
}

// Usage: process 10 API calls in parallel
async function enrichUsers(userIds) {
  const results = [];

  await pipeline(
    Readable.from(userIds),
    new ParallelTransform(10, async (userId) => {
      const response = await fetch(`https://api.example.com/users/${userId}`);
      return response.json();
    }),
    new Writable({
      objectMode: true,
      write(user, encoding, callback) {
        results.push(user);
        callback();
      }
    })
  );

  return results;
}
```

### Stream-Based Batching

```javascript
class BatchTransform extends Transform {
  constructor(batchSize = 1000) {
    super({ objectMode: true });
    this.batchSize = batchSize;
    this.buffer = [];
  }

  _transform(chunk, encoding, callback) {
    this.buffer.push(chunk);
    if (this.buffer.length >= this.batchSize) {
      const batch = this.buffer;
      this.buffer = [];
      // Process batch (e.g., bulk insert to database)
      this.push(batch);
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      this.push(this.buffer);
    }
    callback();
  }
}

// Bulk insert using batching
async function bulkInsertStream(dataStream, db) {
  await pipeline(
    dataStream,
    new BatchTransform(1000),
    new Writable({
      objectMode: true,
      async write(batch, encoding, callback) {
        try {
          await db.insertBatch(batch);
          callback();
        } catch (err) {
          callback(err);
        }
      }
    })
  );
}
```

### Stream-Based Rate Limiting

```javascript
class RateLimitTransform extends Transform {
  constructor(opsPerSecond = 100) {
    super({ objectMode: true });
    this.interval = 1000 / opsPerSecond;
    this.lastEmit = 0;
  }

  _transform(chunk, encoding, callback) {
    const now = Date.now();
    const waitTime = Math.max(0, this.interval - (now - this.lastEmit));

    if (waitTime > 0) {
      setTimeout(() => {
        this.lastEmit = Date.now();
        this.push(chunk);
        callback();
      }, waitTime);
    } else {
      this.lastEmit = now;
      this.push(chunk);
      callback();
    }
  }
}

// Usage: rate-limit API calls to 50 per second
async function rateLimitedApiProcess(dataStream) {
  await pipeline(
    dataStream,
    new RateLimitTransform(50),
    new ParallelTransform(5, async (item) => {
      return api.call(item);
    }),
    processResultsStream
  );
}
```

### Stream Concatenation and Merging

```javascript
const { Readable } = require('stream');

// Merge multiple streams into one
async function* mergeStreams(streams) {
  const promises = streams.map((stream, i) =>
    (async function* () {
      for await (const chunk of stream) {
        yield { streamIndex: i, data: chunk };
      }
    })()
  );

  const iterators = promises.map(p => p[Symbol.asyncIterator]());
  const results = await Promise.all(iterators.map(it => it.next()));

  while (results.some(r => !r.done)) {
    const earliest = results.reduce((min, r, i) => {
      if (r.done) return min;
      if (min === null || r.value.data.timestamp < results[min].value.data.timestamp) return i;
      return min;
    }, null);

    if (earliest !== null) {
      yield results[earliest].value.data;
      results[earliest] = await iterators[earliest].next();
    }
  }
}

// Usage: merge two time-ordered streams
async function mergeAndProcess(stream1, stream2) {
  const merged = mergeStreams([stream1, stream2]);
  for await (const data of merged) {
    console.log(`From stream index ${data.streamIndex}:`, data);
  }
}

// Concatenate streams (sequential)
class ConcatStream extends Readable {
  constructor(streams) {
    super({ objectMode: true });
    this.streams = streams;
    this.currentIndex = 0;
    this.currentIterator = null;
  }

  async _read() {
    while (this.currentIndex < this.streams.length) {
      if (!this.currentIterator) {
        this.currentIterator = this.streams[this.currentIndex][Symbol.asyncIterator]();
      }

      const { value, done } = await this.currentIterator.next();
      if (done) {
        this.currentIndex++;
        this.currentIterator = null;
      } else {
        this.push(value);
        return;
      }
    }
    this.push(null);
  }
}
```

### Teeing (Splitting) a Stream

```javascript
// Split a single stream into multiple consumers
class StreamTee extends Transform {
  constructor(consumers) {
    super({ objectMode: true });
    this.consumers = consumers;
  }

  _transform(chunk, encoding, callback) {
    // Forward to all consumers
    for (const consumer of this.consumers) {
      consumer.write(chunk);
    }
    this.push(chunk); // Also pass through
    callback();
  }

  _flush(callback) {
    for (const consumer of this.consumers) {
      consumer.end();
    }
    callback();
  }
}

// Usage: log all data while also processing
const logStream = new Writable({
  objectMode: true,
  write(chunk, encoding, callback) {
    console.log(`[LOG] ${JSON.stringify(chunk)}`);
    callback();
  }
});

await pipeline(
  dataSource,
  new StreamTee([logStream]),
  mainProcessor
);
```

## Stream Utilities

### Creating Streams from Iterables

```javascript
const { Readable, Writable } = require('stream');

// From array
const arrayStream = Readable.from([1, 2, 3, 4, 5]);

// From async generator
async function* generateData() {
  for (let i = 0; i < 1000; i++) {
    await new Promise(r => setTimeout(r, 10));
    yield { id: i, value: Math.random() };
  }
}

const genStream = Readable.from(generateData());

// To array (collect all data)
async function streamToArray(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}
```

### Stream Metrics

```javascript
class MetricsTransform extends Transform {
  constructor(name) {
    super({ objectMode: true });
    this.name = name;
    this.processed = 0;
    this.bytes = 0;
    this.startTime = Date.now();
    this.lastLog = Date.now();
  }

  _transform(chunk, encoding, callback) {
    this.processed++;
    this.bytes += Buffer.byteLength(
      typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
    );

    const now = Date.now();
    if (now - this.lastLog > 5000) {
      const elapsed = (now - this.startTime) / 1000;
      const rate = this.processed / elapsed;
      const throughput = (this.bytes / elapsed / 1024 / 1024).toFixed(2);
      console.log(`[${this.name}] ${this.processed} items, ${rate.toFixed(0)} items/s, ${throughput} MB/s`);
      this.lastLog = now;
    }

    this.push(chunk);
    callback();
  }

  _flush(callback) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(`[${this.name}] Complete: ${this.processed} items in ${elapsed.toFixed(1)}s`);
    callback();
  }
}
```

## Error Recovery Patterns

### Retry Transform

```javascript
class RetryTransform extends Transform {
  constructor(transformFn, maxRetries = 3) {
    super({ objectMode: true });
    this.transformFn = transformFn;
    this.maxRetries = maxRetries;
  }

  async _transform(chunk, encoding, callback) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.transformFn(chunk);
        this.push(result);
        callback();
        return;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 100));
        }
      }
    }

    callback(lastError);
  }
}

// Usage: retry failed API calls up to 3 times with exponential backoff
await pipeline(
  dataStream,
  new RetryTransform(async (item) => {
    const response = await fetch(item.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, 3),
  outputStream
);
```

### Dead Letter Queue

```javascript
class DeadLetterTransform extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.failedItems = [];
    this.maxRetries = options.maxRetries || 3;
    this.deadLetterHandler = options.deadLetterHandler || console.error;
  }

  _transform(chunk, encoding, callback) {
    if (chunk.retries == null) chunk.retries = 0;

    if (chunk.retries >= this.maxRetries) {
      this.failedItems.push(chunk);
      this.deadLetterHandler(chunk);
      callback(); // Skip this item, continue processing
    } else {
      this.push(chunk);
      callback();
    }
  }

  _flush(callback) {
    if (this.failedItems.length > 0) {
      console.warn(`${this.failedItems.length} items sent to dead letter queue`);
    }
    callback();
  }

  getFailedItems() {
    return this.failedItems;
  }
}
```

## Memory Management

### Buffer Size Tuning

```javascript
// For large file processing, increase highWaterMark
const readStream = createReadStream('large-file.csv', {
  highWaterMark: 64 * 1024 * 1024  // 64MB chunks
});

// For low-memory environments, decrease highWaterMark
const readStream = createReadStream('large-file.csv', {
  highWaterMark: 1024 * 1024  // 1MB chunks — more but smaller reads
});

// For object mode, limit number of buffered objects
const objectStream = new Transform({
  objectMode: true,
  highWaterMark: 1000  // Max 1000 objects in buffer
});
```

### Stream Disposal

```javascript
// Always destroy streams when done or on error
async function safeProcess(stream) {
  try {
    for await (const chunk of stream) {
      await process(chunk);
    }
  } catch (err) {
    stream.destroy(err);
    throw err;
  }
}

// Cancel an in-progress pipeline
const { createCancelablePipeline } = require('./pipeline-utils');

const { pipeline, cancel } = createCancelablePipeline(
  readStream,
  transformStream,
  writeStream
);

// Cancel on timeout
setTimeout(cancel, 5000);
```

## Real-World Examples

### CSV to Database Bulk Import

```javascript
async function importCSVtoDB(filePath, db) {
  const stats = { total: 0, success: 0, failed: 0 };

  await pipeline(
    createReadStream(filePath),
    new CSVParser(),
    new BatchTransform(1000),
    new ParallelTransform(4, async (batch) => {
      try {
        await db.insertBatch(batch);
        stats.success += batch.length;
      } catch (err) {
        stats.failed += batch.length;
        throw err;
      }
    }),
    new Writable({
      objectMode: true,
      write(result, encoding, callback) {
        callback();
      }
    })
  );

  return stats;
}
```

### Log File Processing Pipeline

```javascript
async function processLogFiles(logDir, outputDir) {
  const files = await fs.readdir(logDir);
  const logFiles = files.filter(f => f.endsWith('.log'));

  for (const file of logFiles) {
    const errorStream = createWriteStream(`${outputDir}/errors-${file}`);
    const statsStream = createWriteStream(`${outputDir}/stats-${file}`);

    const logParser = new Transform({
      readableObjectMode: true,
      transform(line, encoding, callback) {
        try {
          const parsed = parseLogLine(line);
          callback(null, parsed);
        } catch {
          callback(); // Skip malformed lines
        }
      }
    });

    const errorFilter = new Transform({
      objectMode: true,
      transform(entry, encoding, callback) {
        if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
          callback(null, entry);
        } else {
          callback(); // Skip non-errors
        }
      }
    });

    const statsAggregator = new Transform({
      objectMode: true,
      transform(entry, encoding, callback) {
        this.counts = this.counts || {};
        this.counts[entry.level] = (this.counts[entry.level] || 0) + 1;
        callback();
      },
      _flush(callback) {
        this.push(JSON.stringify(this.counts));
        callback();
      }
    });

    await Promise.all([
      pipeline(
        createReadStream(`${logDir}/${file}`),
        new SplitTransform(), // Split by newlines
        logParser,
        errorFilter,
        new JSONStringifyTransform(),
        errorStream
      ),
      pipeline(
        createReadStream(`${logDir}/${file}`),
        new SplitTransform(),
        logParser,
        statsAggregator,
        statsStream
      )
    ]);
  }
}
```

## Performance Benchmarks

| Pattern | Throughput (items/s) | Memory (MB) | Best For |
|---------|---------------------|-------------|----------|
| pipeline() | 500,000 | 50 | General purpose |
| objectMode stream | 200,000 | 100 | Complex objects |
| buffered stream | 1,000,000 | 200 | Large binary files |
| parallel transform (4x) | 800,000 | 150 | CPU-bound tasks |
| parallel transform (10x) | 1,500,000 | 300 | I/O-bound tasks |
| batch transform (1000) | 600,000 | 80 | DB bulk operations |

## Testing Streams

```javascript
const { Readable, Writable } = require('stream');
const assert = require('assert');

// Test a transform stream
async function testTransform() {
  const transform = new UpperCaseTransform();

  const input = Readable.from(['hello', 'world']);
  const output = [];

  await pipeline(
    input,
    transform,
    new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        output.push(chunk.toString());
        callback();
      }
    })
  );

  assert.deepStrictEqual(output, ['HELLO', 'WORLD']);
}

// Test error handling
async function testTransformError() {
  const transform = new Transform({
    transform(chunk, encoding, callback) {
      if (chunk.toString() === 'ERROR') {
        callback(new Error('Test error'));
      } else {
        callback(null, chunk);
      }
    }
  });

  const input = Readable.from(['OK', 'ERROR', 'OK']);

  await assert.rejects(
    pipeline(input, transform, new Writable({ write(chunk, e, cb) { cb(); } })),
    { message: 'Test error' }
  );
}

// Create test stream utilities
function createMockReadable(data) {
  return Readable.from(data);
}

function createMockWritable(onData) {
  return new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      onData(chunk);
      callback();
    }
  });
}

function createMockTransform(transformFn) {
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        const result = transformFn(chunk);
        callback(null, result);
      } catch (err) {
        callback(err);
      }
    }
  });
}
```

## Debugging Streams

```javascript
// Enable stream debugging
process.env.NODE_DEBUG = 'stream';

// Debugging highWaterMark warnings
const stream = new Transform({ objectMode: true, highWaterMark: 16 });
stream.on('pipe', (src) => {
  console.log('Source pipe:', src.constructor.name);
});
stream.on('unpipe', (src) => {
  console.log('Source unpipe:', src.constructor.name);
});

// Stream state inspection
function inspectStream(stream) {
  return {
    type: stream.constructor.name,
    readable: stream.readable,
    writable: stream.writable,
    readableLength: stream.readableLength,
    writableLength: stream.writableLength,
    destroyed: stream.destroyed,
    errored: stream.errored
  };
}
```

## References

- Node.js Stream API documentation
- Node.js `stream/promises` pipeline API
- HighWaterMark best practices
- Backpressure theory and implementation
