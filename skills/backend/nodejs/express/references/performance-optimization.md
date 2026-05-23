# Express Performance Optimization

## Compression

```typescript
import compression from 'compression';
app.use(compression({ level: 6, threshold: 1024 }));
```

## Cluster Mode

```typescript
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const cpuCount = os.cpus().length;
  for (let i = 0; i < cpuCount; i++) cluster.fork();
  cluster.on('exit', (worker) => cluster.fork());
} else {
  createApp().listen(3000);
}
```

## Connection Pooling

```typescript
// PostgreSQL
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000 });

// Redis
const redis = new Redis({ host: 'localhost', port: 6379, maxRetriesPerRequest: 3, enableReadyCheck: true });
```

## Response Caching

```typescript
import mcache from 'memory-cache';

const cache = (duration: number) => (req: Request, res: Response, next: NextFunction) => {
  const key = `__express__${req.originalUrl}`;
  const cached = mcache.get(key);
  if (cached) return res.json(cached);
  res.sendResponse = res.json;
  res.json = (body) => { mcache.put(key, body, duration * 1000); res.sendResponse(body); };
  next();
};
```

## Additional Optimizations

- Enable gzip/brotli compression.
- Use HTTP/2 for multiplexing.
- Set `express.json({ limit: '1mb' })` to prevent large payload attacks.
- Use response streaming for large datasets.
- Offload CPU-intensive tasks to worker threads or queues.
- Monitor with `express-status-monitor` or APM tools.
- Set `app.set('trust proxy', 1)` behind reverse proxy.
