# Node.js Clustering

## Cluster Architecture

```
       ┌─────────────┐
       │  Master     │
       │ (IPC, mgmt) │
       └──────┬──────┘
    ┌─────────┼──────────┐
    │         │          │
┌───▼───┐ ┌──▼────┐ ┌───▼───┐
│Worker1│ │Worker2│ │Worker3│
│ :3001 │ │ :3002 │ │ :3003 │
└───────┘ └───────┘ └───────┘
```

## Basic Cluster Setup

```typescript
import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';

const numCPUs = cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Restart worker
    cluster.fork();
  });
} else {
  // Workers share the TCP connection
  import('./app').then(({ app }) => {
    app.listen(3000);
    console.log(`Worker ${process.pid} started`);
  });
}
```

## PM2 Cluster Mode

```bash
# Start with PM2 cluster mode
pm2 start dist/main.js -i max

# Specific number of instances
pm2 start dist/main.js -i 4

# Ecosystem file
pm2 ecosystem
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
  }],
};
```

## Shared State in Clusters

```typescript
// ❌ In-memory state is NOT shared across workers
// Each worker has its own memory space

// ✅ Use external stores for shared state
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});

// Session store
await redis.set(`session:${sid}`, JSON.stringify(userData));
const session = await redis.get(`session:${sid}`);

// Rate limiting
const current = await redis.incr(`rate:${ip}`);
if (current > 100) throw new Error('Rate limit exceeded');
await redis.expire(`rate:${ip}`, 60);
```

## Zero-Downtime Restart

```typescript
// Graceful shutdown in workers
process.on('SIGTERM', async () => {
  console.log('Worker shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000).unref();
});
```

## Inter-Process Communication

```typescript
// Primary sends message to specific worker
if (cluster.isPrimary) {
  const worker = cluster.workers[workerId];
  worker?.send({ type: 'reload', data: { cache: true } });
}

// Worker listens
if (cluster.isWorker) {
  process.on('message', (msg) => {
    if (msg.type === 'reload') {
      clearCache();
    }
  });
}
```

## Cluster vs PM2

| Feature | Built-in Cluster | PM2 |
|---------|-----------------|-----|
| Zero-downtime reload | Manual | `pm2 reload` |
| Monitoring | Manual | Built-in dashboard |
| Log management | Manual | Built-in |
| Startup script | systemd | `pm2 startup` |
| Configuration | Code | ecosystem.config.js |
| Health checks | Manual | Built-in |

## Docker + Clustering

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --production
EXPOSE 3000
# Use PM2 inside container
RUN npm install -g pm2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
```

```yaml
# docker-compose.yml — use K8s instead of in-container cluster
services:
  api:
    build: .
    deploy:
      replicas: 4
    ports:
      - "3000"
```

## Load Balancing Strategies

```typescript
// Round-robin (default on most platforms)
cluster.setupPrimary({ schedulingPolicy: cluster.SCHED_RR });

// OS-based (default on Windows)
cluster.setupPrimary({ schedulingPolicy: cluster.SCHED_NONE });
```

## Monitoring Clusters

```typescript
// Worker health check
if (cluster.isPrimary) {
  setInterval(() => {
    const workers = Object.values(cluster.workers || {});
    console.log(`Active workers: ${workers.length}`);
    workers.forEach(w => {
      w?.send({ type: 'ping' });
      // Worker should reply with 'pong'
    });
  }, 30000);
}
```
