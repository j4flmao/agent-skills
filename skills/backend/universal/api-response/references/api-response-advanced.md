# API Response Advanced

## Problem Details (RFC 9457)

Standard error format for HTTP APIs:

```json
{
  "type": "https://api.example.com/errors/out-of-credit",
  "title": "You do not have enough credit.",
  "status": 403,
  "detail": "Current balance is 30, but required is 50.",
  "instance": "/account/12345/msgs/abc",
  "balance": 30,
  "accounts": ["/account/12345", "/account/67890"]
}
```

### TypeScript Implementation
```typescript
class ProblemDetails extends Error {
  constructor(
    public type: string,
    public title: string,
    public status: number,
    public detail: string,
    public instance?: string,
    public extensions?: Record<string, unknown>,
  ) {
    super(detail);
    this.name = 'ProblemDetails';
  }

  toJSON() {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance,
      ...this.extensions,
    };
  }
}
```

## Content Negotiation

Serve different response formats based on `Accept` header:

```typescript
app.get('/api/users/:id', (req, res) => {
  const user = getUser(req.params.id);
  res.format({
    'application/json': () => res.json(user),
    'application/xml': () => res.xml(toXml(user)),
    'text/csv': () => res.csv(toCsv(user)),
    default: () => res.status(406).end(),
  });
});
```

## Conditional Requests

Use ETags and Last-Modified to reduce bandwidth:

```typescript
app.get('/api/users/:id', async (req, res) => {
  const user = await getUser(req.params.id);
  const etag = `"${hash(user)}"`;

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Not Modified
  }

  res.set('ETag', etag);
  res.set('Last-Modified', user.updatedAt.toUTCString());
  res.json(user);
});
```

## Response Compression

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6, // zlib level (0-9), 6 = balance
  threshold: 1024, // minimum response size in bytes
}));
```

## Streaming Responses

For large datasets or real-time data:

```typescript
// JSON streaming — NDJSON format
app.get('/api/events', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson');
  for await (const event of eventStream) {
    res.write(JSON.stringify(event) + '\n');
  }
  res.end();
});

// Server-Sent Events
app.get('/api/events/sse', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  for await (const event of eventStream) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
});
```

## Response Versioning

```typescript
// Content-Type versioning
app.get('/api/users/:id', (req, res) => {
  const accepts = req.accepts(['application/vnd.api+json;version=1', 'application/vnd.api+json;version=2']);

  if (accepts === 'application/vnd.api+json;version=2') {
    return res.json(userV2(getUser(req.params.id)));
  }
  return res.json(userV1(getUser(req.params.id)));
});
```
