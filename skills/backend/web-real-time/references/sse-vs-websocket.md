# SSE vs WebSocket vs Long Polling

Comparison of real-time communication protocols and when to use each.

## Protocol Overview

| Feature | Server-Sent Events (SSE) | WebSocket | Long Polling |
|---------|-------------------------|-----------|--------------|
| Direction | Server → Client only | Bidirectional | Client → Server polling |
| Protocol | HTTP | ws:// / wss:// | HTTP |
| Browser Support | All modern browsers | All modern browsers | All browsers |
| Reconnection | Built-in | Manual implementation | N/A |
| Message Overhead | Minimal (text) | Low (binary or text) | High (HTTP headers per request) |
| Binary Data | No (text only) | Yes (binary frames) | No |
| Max Connections (HTTP/1.1) | 6 per browser | Unlimited | 6 per browser |
| HTTP/2 Multiplexing | 100+ concurrent | N/A (separate connection) | 100+ concurrent |
| Firewall Friendly | Yes (uses HTTP) | Sometimes blocked | Yes |

## SSE (Server-Sent Events)

Best for one-way data streams: notifications, live feeds, status updates.

### Server (Node.js)

```typescript
import express from 'express'

const app = express()

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  // Send events
  const interval = setInterval(() => {
    const data = {
      timestamp: new Date().toISOString(),
      value: Math.random(),
    }
    res.write(`event: update\ndata: ${JSON.stringify(data)}\n\n`)
  }, 1000)

  // Send initial connection event
  res.write(`event: connected\ndata: {"status":"ok"}\n\n`)

  req.on('close', () => {
    clearInterval(interval)
    res.end()
  })
})

app.listen(3000)
```

### Client

```typescript
const source = new EventSource('/events')

source.addEventListener('connected', (event) => {
  console.log('Connected:', event.data)
})

source.addEventListener('update', (event) => {
  const data = JSON.parse(event.data)
  updateUI(data)
})

source.onerror = (error) => {
  console.error('SSE error:', error)
  // SSE auto-reconnects (with ~3s delay)
}
```

### SSE Event Format

```
event: update
id: 12345
retry: 5000
data: {"key": "value"}

event: custom
data: {"line1": "first line"}
data: {"line2": "second line"}

:comment (ignored by client)
```

## WebSocket

Best for bidirectional, low-latency communication: chat, gaming, collaborative editing.

### Server (ws library)

```typescript
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws, req) => {
  console.log('Client connected from:', req.socket.remoteAddress)

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString())
    console.log('Received:', message)

    // Echo or broadcast
    ws.send(JSON.stringify({ type: 'echo', data: message }))

    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(JSON.stringify(message))
      }
    })
  })

  ws.on('close', (code, reason) => {
    console.log('Client disconnected:', code, reason.toString())
  })

  // Send welcome
  ws.send(JSON.stringify({ type: 'welcome', id: generateId() }))
})
```

### Client

```typescript
const ws = new WebSocket('wss://example.com')

ws.onopen = () => {
  console.log('Connected')
  ws.send(JSON.stringify({ type: 'join', room: 'general' }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  handleMessage(data)
}

ws.onclose = (event) => {
  if (!event.wasClean) {
    reconnect()
  }
}
```

## Long Polling

Best for legacy clients or simple notification polling.

### Server

```typescript
app.get('/poll', async (req, res) => {
  const waitForNewData = new Promise((resolve) => {
    eventQueue.once('new-data', (data) => resolve(data))
  })

  // Timeout after 30 seconds
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve({ empty: true }), 30000)
  })

  const result = await Promise.race([waitForNewData, timeout])
  res.json(result)
})
```

### Client

```typescript
async function poll() {
  try {
    const response = await fetch('/poll')
    const data = await response.json()
    if (!data.empty) {
      handleData(data)
    }
  } catch (err) {
    console.error('Poll failed:', err)
  }
  // Immediately start next poll
  poll()
}

poll()
```

## Use Case Decision Matrix

| Use Case | Best Protocol | Rationale |
|----------|--------------|-----------|
| Stock ticker / price feed | SSE | Server → client only, auto-reconnect |
| Real-time notifications | SSE | Simple, HTTP-friendly |
| Live chat | WebSocket | Bidirectional, low latency |
| Collaborative editing | WebSocket | Bidirectional, real-time |
| Gaming | WebSocket | Low latency, binary data |
| IoT sensor data | WebSocket | Persistent connection, binary |
| Status updates | SSE | Simple push, auto-reconnect |
| Legacy browser support | Long Polling | Universal compatibility |
| Metrics dashboard | SSE | Server push only |
| File transfer | WebSocket | Binary data support |
| Push to mobile | WebSocket | Persistent, battery efficient |

## Performance Characteristics

```typescript
// SSE: ~50 bytes per message (no HTTP overhead after initial handshake)
// WebSocket: ~30 bytes per message (frame overhead only)
// Long Polling: ~800 bytes per message (full HTTP headers each poll)

// With HTTP/2 multiplexing, SSE can share a single connection
// With HTTP/1.1, SSE limited to 6 concurrent connections per browser
// WebSocket creates a separate connection (no HTTP/2 multiplexing)
```

## Fallback Strategy

```typescript
class RealTimeClient {
  private url: string
  private ws: WebSocket | null = null
  private sse: EventSource | null = null

  constructor(url: string) {
    this.url = url
    this.connect()
  }

  private connect() {
    if (typeof WebSocket !== 'undefined') {
      try {
        this.ws = new WebSocket(this.url)
        this.ws.onmessage = (event) => this.onMessage(event.data)
        return
      } catch {}
    }

    if (typeof EventSource !== 'undefined') {
      try {
        this.sse = new EventSource(this.url.replace('ws', 'http'))
        this.sse.onmessage = (event) => this.onMessage(event.data)
        return
      } catch {}
    }

    this.startLongPolling()
  }

  private onMessage(data: string) { /* handle */ }
  private startLongPolling() { /* fallback */ }
}
```

Choose SSE for simple server-to-client streaming (notifications, feeds), WebSocket for bidirectional interactive apps (chat, collaboration), and Long Polling only when necessary for legacy compatibility.
