# BFF Performance

## Overview
Optimize BFF performance through response caching, parallel service calls, response compression, and efficient data aggregation strategies.

## Parallel Service Calls

```typescript
class ParallelAggregator {
  async fetchAll<T extends Record<string, unknown>>(
    requests: { key: string; fetch: () => Promise<unknown> }[]
  ): Promise<T> {
    const results = await Promise.allSettled(
      requests.map(r => r.fetch())
    );

    const aggregated = {} as T;
    const errors: string[] = [];

    for (let i = 0; i < requests.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        aggregated[requests[i].key] = result.value;
      } else {
        errors.push(result.reason?.message || `Service ${requests[i].key} failed`);
      }
    }

    return aggregated;
  }
}

class CheckoutBFF {
  async getCheckoutData(cartId: string): Promise<CheckoutData> {
    const start = performance.now();

    const aggregator = new ParallelAggregator();
    const data = await aggregator.fetchAll([
      { key: 'cart', fetch: () => this.orderService.getCart(cartId) },
      { key: 'paymentMethods', fetch: () => this.paymentService.getMethods() },
      { key: 'shippingRates', fetch: () => this.shippingService.getRates(cartId) },
      { key: 'userPreferences', fetch: () => this.userService.getPreferences() },
    ]);

    const duration = performance.now() - start;
    metrics.recordBffLatency('checkout', duration);

    return {
      items: data.cart?.items || [],
      total: data.cart?.total || 0,
      paymentMethods: data.paymentMethods || [],
      shippingOptions: data.shippingRates || [],
      userPrefs: data.userPreferences || {},
    };
  }
}
```

## Response Caching

```typescript
class BffCache {
  constructor(
    private redis: Redis,
    private readonly defaultTtl = 30 // seconds
  ) {}

  async getOrFetch<T>(
    key: string,
    fetch: () => Promise<T>,
    ttl?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = await this.redis.get(this.key(key));
    if (cached) {
      return { data: JSON.parse(cached), fromCache: true };
    }

    const data = await fetch();
    await this.redis.setex(this.key(key), ttl || this.defaultTtl, JSON.stringify(data));
    return { data, fromCache: false };
  }

  async invalidate(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const keys = await this.redis.keys(this.key(pattern));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  private key(key: string): string {
    return `bff:cache:${key}`;
  }
}

class ProductBFF {
  async getProductPage(productId: string): Promise<ProductPage> {
    const start = performance.now();
    const [product, reviews, related] = await Promise.all([
      this.cache.getOrFetch(`product:${productId}`,
        () => this.productService.getProduct(productId), 60),
      this.cache.getOrFetch(`reviews:${productId}`,
        () => this.reviewService.getReviews(productId), 120),
      this.cache.getOrFetch(`related:${productId}`,
        () => this.productService.getRelated(productId), 300),
    ]);

    metrics.recordBffLatency('product-page', performance.now() - start);
    metrics.recordBffCacheHit('product', product.fromCache);
    metrics.recordBffCacheHit('reviews', reviews.fromCache);
    metrics.recordBffCacheHit('related', related.fromCache);

    return {
      ...product.data,
      reviews: reviews.data,
      relatedProducts: related.data,
    };
  }
}
```

## Response Compression

```typescript
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

class BffCompressionMiddleware {
  async compress(req: Request, res: Response, next: NextFunction): Promise<void> {
    const originalJson = res.json.bind(res);
    const acceptEncoding = req.headers['accept-encoding'] || '';

    res.json = async function (body: any) {
      const serialized = JSON.stringify(body);
      const buffer = Buffer.from(serialized);

      let compressed: Buffer;
      let encoding: string;

      if (acceptEncoding.includes('br') && serialized.length > 1024) {
        compressed = await brotliCompress(buffer);
        encoding = 'br';
      } else if (acceptEncoding.includes('gzip')) {
        compressed = await gzip(buffer);
        encoding = 'gzip';
      } else {
        return originalJson(body);
      }

      res.set('Content-Encoding', encoding);
      res.set('Content-Type', 'application/json');
      res.set('X-Compressed-Size', compressed.length.toString());
      res.set('X-Original-Size', buffer.length.toString());
      res.status(res.statusCode).send(compressed);
    };

    next();
  }
}
```

## Data Shape Optimization

```typescript
// Mobile BFF — lightweight response, minimal fields
class MobileOrderBFF {
  async getOrderList(userId: string): Promise<MobileOrderList> {
    const orders = await this.orderService.getOrders(userId);
    return {
      orders: orders.map(o => ({
        id: o.id,
        status: o.status,
        total: o.total,
        itemCount: o.items.length,
        lastUpdated: o.updatedAt,
      })),
    };
  }
}

// Web BFF — rich response with all details
class WebOrderBFF {
  async getOrderList(userId: string): Promise<WebOrderList> {
    const orders = await this.orderService.getOrders(userId);
    return {
      orders: orders.map(o => ({
        id: o.id,
        status: o.status,
        total: o.total,
        items: o.items.map(i => ({
          productId: i.productId,
          name: i.name,
          image: i.image,
          quantity: i.quantity,
          price: i.price,
        })),
        shipping: o.shipping,
        payment: { method: o.paymentMethod, last4: o.cardLast4 },
        timeline: o.events.map(e => ({ event: e.type, at: e.timestamp })),
        actions: {
          canCancel: o.status === 'pending',
          canReturn: o.status === 'delivered' && this.isWithinReturnWindow(o),
        },
      })),
    };
  }
}
```

## Connection Pooling

```typescript
class BffConnectionPool {
  private pools: Map<string, http.Agent> = new Map();

  getAgent(serviceName: string, maxSockets = 50): http.Agent {
    if (!this.pools.has(serviceName)) {
      this.pools.set(serviceName, new http.Agent({
        keepAlive: true,
        maxSockets,
        keepAliveMsecs: 30000,
        timeout: 5000,
      }));
    }
    return this.pools.get(serviceName);
  }

  async request(serviceName: string, options: http.RequestOptions): Promise<unknown> {
    const agent = this.getAgent(serviceName);
    return new Promise((resolve, reject) => {
      const req = http.request({ ...options, agent }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timeout')); });
      req.end();
    });
  }
}
```

## Key Points
- Make parallel service calls using Promise.allSettled for resilience
- Cache aggregated responses with appropriate TTLs per data type
- Use Brotli compression for large responses to mobile clients
- Optimize data shapes per client type: minimal for mobile, rich for web
- Use connection pooling with keep-alive for downstream service calls
