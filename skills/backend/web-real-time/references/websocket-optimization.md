# WebSocket Optimization

Optimizing WebSocket connections for performance, reliability, and scale.

## Connection Pooling

```typescript
// WebSocket connection pool manager
class WebSocketPool {
  private connections: Map<string, WebSocket[]> = new Map()
  private maxPerEndpoint: number = 10

  getConnection(endpoint: string): WebSocket {
    let pool = this.connections.get(endpoint)
    if (!pool) {
      pool = []
      this.connections.set(endpoint, pool)
    }

    // Find available connection
    let ws = pool.find(conn => conn.readyState === WebSocket.OPEN)
    if (!ws) {
      if (pool.length >= this.maxPerEndpoint) {
        // Wait for a connection to become available
        return this.waitForConnection(endpoint)
      }
      ws = new WebSocket(endpoint)
      ws.on('close', () => {
        const idx = pool.indexOf(ws!)
        if (idx !== -1) pool.splice(idx, 1)
      })
      pool.push(ws)
    }
    return ws
  }

  private async waitForConnection(endpoint: string): Promise<WebSocket> {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        const pool = this.connections.get(endpoint) || []
        const available = pool.find(c => c.readyState === WebSocket.OPEN)
        if (available) {
          clearInterval(check)
          resolve(available)
        }
      }, 100)
    })
  }
}
```

## Backpressure

Handle slow consumers without memory overflow:

```typescript
class BackpressureWebSocket {
  private ws: WebSocket
  private buffer: any[] = []
  private maxBufferSize: number = 1000
  private highWaterMark: number = 800

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.ws.binaryType = 'arraybuffer'
  }

  send(data: any): boolean {
    if (this.buffer.length >= this.maxBufferSize) {
      console.warn('Buffer full, dropping message')
      return false
    }
    this.buffer.push(data)
    this.drain()
    return true
  }

  private drain() {
    while (this.buffer.length > 0) {
      if (this.ws.bufferedAmount > 1024 * 1024) {
        // Backpressure: wait for buffer to drain
        setTimeout(() => this.drain(), 100)
        break
      }
      const data = this.buffer.shift()
      this.ws.send(JSON.stringify(data))
    }
  }

  get isUnderPressure(): boolean {
    return this.buffer.length > this.highWaterMark
  }
}
```

## Compression

Enable per-message compression:

```typescript
// Client side
const ws = new WebSocket('wss://example.com', {
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,  // balance speed vs compression
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024,
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024,  // only compress messages > 1KB
  },
})

// WebSocket server (ws library)
import { WebSocketServer } from 'ws'
const wss = new WebSocketServer({
  port: 8080,
  perMessageDeflate: {
    zlibDeflateOptions: {
      level: 3,
    },
    threshold: 1024,
  },
})
```

## Reconnection Strategies

### Exponential Backoff with Jitter

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private attempts: number = 0
  private maxAttempts: number = 20
  private baseDelay: number = 1000
  private maxDelay: number = 30000

  constructor(url: string) {
    this.url = url
    this.connect()
  }

  connect() {
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      this.attempts = 0
      console.log('Connected')
    }
    this.ws.onclose = (event) => {
      if (event.code !== 1000) {
        this.scheduleReconnect()
      }
    }
    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect() {
    if (this.attempts >= this.maxAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }
    this.attempts++
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts),
      this.maxDelay
    )
    // Add jitter: ±25%
    const jitter = delay * (0.75 + Math.random() * 0.5)
    setTimeout(() => this.connect(), jitter)
  }
}
```

### WebSocketHeartbeat

```typescript
class HeartbeatWebSocket {
  private ws: WebSocket
  private pingInterval: number = 30000
  private pongTimeout: number = 10000
  private pingTimer: NodeJS.Timeout | null = null
  private pongTimer: NodeJS.Timeout | null = null

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.setupHeartbeat()
  }

  private setupHeartbeat() {
    this.ws.onopen = () => this.startHeartbeat()
    this.ws.onclose = () => this.stopHeartbeat()
    this.ws.onmessage = (event) => {
      if (event.data === 'pong') {
        this.clearPongTimeout()
      }
    }
  }

  private startHeartbeat() {
    this.pingTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping')
        this.pongTimer = setTimeout(() => {
          console.warn('No pong received, closing')
          this.ws.close()
        }, this.pongTimeout)
      }
    }, this.pingInterval)
  }

  private stopHeartbeat() {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.clearPongTimeout()
  }

  private clearPongTimeout() {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer)
      this.pongTimer = null
    }
  }
}
```

## Scaling WebSocket Servers Horizontally

Use a pub/sub backend for cross-node message delivery:

```typescript
import { WebSocketServer } from 'ws'
import { createClient } from 'redis'

const wss = new WebSocketServer({ port: 8080 })
const pub = createClient()
const sub = createClient()

// Subscribe to messages from other nodes
sub.subscribe('websocket:messages', (message) => {
  const { channel, data } = JSON.parse(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN &&
        client.subscribedChannels?.has(channel)) {
      client.send(JSON.stringify(data))
    }
  })
})

wss.on('connection', (ws) => {
  ws.subscribedChannels = new Set()

  ws.on('message', (message) => {
    const { type, channel, data } = JSON.parse(message.toString())

    if (type === 'subscribe') {
      ws.subscribedChannels.add(channel)
    } else if (type === 'message') {
      // Publish to all nodes via Redis
      pub.publish('websocket:messages', JSON.stringify({ channel, data }))
    }
  })
})
```

## Message Batching

```typescript
class BatchWebSocket {
  private ws: WebSocket
  private batch: any[] = []
  private batchInterval: number = 50 // ms
  private timer: NodeJS.Timeout | null = null

  send(data: any) {
    this.batch.push(data)
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchInterval)
    }
  }

  private flush() {
    if (this.batch.length === 0) return
    const payload = JSON.stringify(this.batch)
    this.ws.send(payload)
    this.batch = []
    this.timer = null
  }
}
```

## Server-Sent Events Fallback

```typescript
function createWebSocket(url: string): WebSocket | EventSource {
  if (typeof WebSocket !== 'undefined') {
    try {
      return new WebSocket(url)
    } catch {
      // Fallback to SSE
    }
  }
  const es = new EventSource(url.replace('ws://', 'http://').replace('wss://', 'https://'))
  return es as any
}
```

Optimize WebSocket connections for your specific use case: connection pooling for high-frequency messages, backpressure for stream processing, compression for bandwidth-constrained environments.
