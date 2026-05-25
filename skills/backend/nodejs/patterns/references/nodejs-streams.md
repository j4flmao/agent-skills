# Node.js Streams

## Stream Types

| Type | Purpose | Example |
|------|---------|---------|
| **Readable** | Source of data | `fs.createReadStream` |
| **Writable** | Destination | `fs.createWriteStream` |
| **Transform** | Modify data | zlib, crypto cipher |
| **Duplex** | Both directions | TCP sockets |

## Reading Streams

```typescript
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// Stream a file line by line
async function processFile(path: string) {
  const lines = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    await processLine(line); // Process one line at a time
  }
}

// Stream with backpressure
const readStream = createReadStream('large-file.csv', {
  highWaterMark: 64 * 1024, // 64KB chunks
});

readStream.on('data', (chunk) => {
  const canContinue = readStream.push(chunk);
  if (!canContinue) {
    readStream.pause(); // Backpressure
  }
});

readStream.on('drain', () => {
  readStream.resume();
});
```

## Piping Streams

```typescript
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

// Pipe with error handling
async function compressFile(input: string, output: string) {
  await pipeline(
    createReadStream(input),
    createGzip(),
    createWriteStream(output),
  );
  console.log('Compression complete');
}

// Multiple transforms
await pipeline(
  createReadStream('data.csv'),
  createGzip(),
  createWriteStream('data.csv.gz'),
);
```

## Transform Streams

```typescript
import { Transform, TransformCallback } from 'stream';

// CSV to JSON transformer
class CsvToJsonTransform extends Transform {
  private header: string[] = [];
  private first = true;

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback) {
    const lines = chunk.toString().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      if (this.first) {
        this.header = line.split(',');
        this.first = false;
        continue;
      }

      const values = line.split(',');
      const obj = Object.fromEntries(
        this.header.map((h, i) => [h, values[i]])
      );
      this.push(JSON.stringify(obj) + '\n');
    }

    callback();
  }
}

// Usage
await pipeline(
  createReadStream('data.csv'),
  new CsvToJsonTransform(),
  createWriteStream('data.jsonl'),
);
```

## Backpressure Handling

```typescript
// Writable stream with backpressure-aware writes
async function writeLargeFile(data: AsyncIterable<string>, path: string) {
  const writable = createWriteStream(path);

  for await (const chunk of data) {
    const canContinue = writable.write(chunk + '\n');
    if (!canContinue) {
      await new Promise((resolve) => writable.once('drain', resolve));
    }
  }

  writable.end();
}

// Check if stream is draining
function isWritable(writable: NodeJS.WritableStream): boolean {
  return (writable as any).writableLength < (writable as any).highWaterMark;
}
```

## Object Mode Streams

```typescript
import { Transform } from 'stream';

// Stream objects instead of buffers
class OrderTransform extends Transform({
  objectMode: true,
}) {
  _transform(order: Order, _encoding: string, callback: TransformCallback) {
    if (order.status === 'pending') {
      this.push({ ...order, priority: 'high' });
    }
    callback();
  }
}

// Usage
const orders = [/* array of order objects */];
const readStream = Readable.from(orders);

await pipeline(
  readStream,
  new OrderTransform(),
  new Writable({
    objectMode: true,
    write(order, _encoding, callback) {
      console.log('Processed:', order.id);
      callback();
    },
  }),
);
```

## Web Streams API (Node 18+)

```typescript
// Native Web Streams API
async function handleRequest(req: Request) {
  const readableStream = req.body!; // ReadableStream
  const reader = readableStream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Process chunk
  }
}
```

## Memory Comparison

| Approach | Memory | Throughput | When |
|----------|--------|------------|------|
| Buffer entire file | File size | Fast | Small files (<100MB) |
| Stream | Chunk size | Steady | Large files |
| Line-by-line | Line size | Slower | Processing per line |
| Object stream | Object count | Moderate | Transform pipelines |
