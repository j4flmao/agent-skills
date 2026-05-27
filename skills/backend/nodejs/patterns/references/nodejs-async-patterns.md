# Node.js Async Patterns Reference

## Async Error Handling Patterns

### Try/Catch in Async Handlers

```typescript
import { Request, Response, NextFunction } from 'express';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
}));
```

### Result Pattern

```typescript
type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

async function findUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!user) {
    return { success: false, error: new NotFoundError('User', id) };
  }
  return { success: true, value: user };
}

const result = await findUser('123');
if (result.success) {
  console.log(result.value.name);
} else {
  console.error(result.error.message);
}
```

## Promise Patterns

### Promise.all — Parallel Execution

```typescript
async function getDashboardData(userId: string): Promise<Dashboard> {
  const [user, orders, notifications] = await Promise.all([
    userService.findById(userId),
    orderService.findByUser(userId),
    notificationService.findByUser(userId),
  ]);

  return { user, orders, notifications };
}
```

### Promise.allSettled — Graceful Degradation

```typescript
async function getResilientDashboard(userId: string) {
  const results = await Promise.allSettled([
    userService.findById(userId),
    orderService.findByUser(userId),
    recommendationService.getRecommendations(userId),
  ]);

  return {
    user: results[0].status === 'fulfilled' ? results[0].value : null,
    orders: results[1].status === 'fulfilled' ? results[1].value : [],
    recommendations: results[2].status === 'fulfilled' ? results[2].value : [],
  };
}
```

### Promise.race — Timeout Pattern

```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), ms);
  });
  return Promise.race([promise, timeout]);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return withTimeout(fetch(url), 5000);
}
```

## Stream Processing

### Readable Stream

```typescript
import { Readable, Transform, Writable } from 'stream';

const readStream = Readable.from(generateLargeDataset());

const transformStream = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    const processed = transformData(chunk);
    callback(null, processed);
  },
});

const writeStream = new Writable({
  objectMode: true,
  write(chunk, encoding, callback) {
    db.insert(chunk).then(() => callback()).catch(callback);
  },
});

await pipeline(readStream, transformStream, writeStream);
```

### Async Generator

```typescript
async function* paginateUsers(pageSize = 100): AsyncGenerator<User> {
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const users = await db.query(
      'SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2',
      [pageSize, page * pageSize]
    );
    if (users.length === 0) break;
    for (const user of users) yield user;
    page++;
  }
}

for await (const user of paginateUsers()) {
  console.log(user.name);
}
```

## Event Emitter Patterns

```typescript
import { EventEmitter } from 'events';

class OrderService extends EventEmitter {
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    const order = await this.repository.save(Order.create(data));
    this.emit('order:created', order);
    this.emit('notification:send', { type: 'order_confirmation', orderId: order.id });
    return order;
  }
}

const orderService = new OrderService(repo, eventBus);

orderService.on('order:created', async (order) => {
  await inventoryService.reserveStock(order.items);
});

orderService.on('notification:send', async (notification) => {
  await notificationService.send(notification);
});
```

## Queue Processing

```typescript
class AsyncQueue {
  private queue: (() => Promise<void>)[] = [];
  private processing = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });
      if (!this.processing) this.process();
    });
  }

  private async process(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    this.processing = false;
  }
}
```

## Key Points

- Async handler wrapper eliminates try/catch duplication
- Result pattern provides type-safe error handling without exceptions
- Promise.all executes independent operations in parallel
- Promise.allSettled enables graceful degradation
- Promise.race with timeout prevents hanging operations
- Stream pipeline processes large datasets without memory overflow
- Async generators paginate through large result sets
- Event emitter enables decoupled notification flows
- Async queues serialize concurrent operations
- pipeline with promisify handles stream backpressure
