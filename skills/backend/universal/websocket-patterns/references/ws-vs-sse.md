# WebSocket vs SSE (Server-Sent Events)

## Comparison Table

| Feature | WebSocket | SSE |
|---------|-----------|-----|
| Direction | Bidirectional | Server → Client only |
| Protocol | ws:// / wss:// | HTTP |
| Transport | TCP (after HTTP upgrade) | HTTP streaming |
| Message format | Binary or text | Text only (UTF-8) |
| Auto-reconnect | Manual implementation | Built-in (EventSource) |
| Room/broadcast | Manual or library | Manual |
| Browser support | All modern browsers | All modern browsers (except IE) |
| Max concurrent connections | 6 per browser | 6 per browser (HTTP/1.1), unlimited (HTTP/2) |
| Firewall friendliness | May be blocked | Always passes (regular HTTP) |
| Complexity | Higher | Lower |
| Use case | Interactive apps | One-way data feeds |

## When to Use SSE

### Strong fit:
- Live notifications (new email alert, order status)
- Stock tickers, sports scores
- Log streaming
- Progress updates (upload progress, deployment status)
- Any server→client push without client→server messaging

### Example:
```javascript
// Client
const events = new EventSource('/api/v1/notifications/stream');

events.onmessage = (event) => {
  const data = JSON.parse(event.data);
  showNotification(data);
};

events.addEventListener('order_update', (event) => {
  const data = JSON.parse(event.data);
  updateOrderStatus(data);
});

events.onerror = (err) => {
  // EventSource auto-reconnects
  console.error('SSE error:', err);
};
```

```javascript
// Server (Node.js)
app.get('/api/v1/notifications/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',  // nginx: disable buffering
  });

  // Send events
  setInterval(() => {
    res.write(`event: order_update\ndata: ${JSON.stringify(order)}\n\n`);
  }, 5000);

  req.on('close', () => {
    // client disconnected
    clearInterval(interval);
  });
});
```

## When to Use WebSocket

### Strong fit:
- Chat applications (bidirectional)
- Collaborative editing (Google Docs-like)
- Real-time multiplayer games
- Live cursors / typing indicators
- Interactive dashboards with bidirectional controls
- Any app where client sends frequent data

## SSE EventSource API Limitations
- Text-only (no binary). Use base64 for binary data.
- Only supports GET requests. No custom headers.
- Browser limits: 6 concurrent connections per domain (HTTP/1.1).
- No built-in auth mechanism (use token in URL or cookie).
- HTTP/2 eliminates the 6-connection limit (multiplexed streams).

## SSE Event Format
```
event: order_update          ← optional event type (default: message)
data: {"id": 1, "status": "shipped"}   ← required
id: evt_00123                ← optional; sent on reconnect for Last-Event-ID
retry: 3000                  ← optional; reconnection delay in ms

                            ← empty line = end of event
```

## Hybrid Approach
```
SSE for:                    WebSocket for:
- notifications             - chat
- status updates            - collaborative features
- metrics dashboards        - real-time controls
- log streaming             - gaming

Both can coexist in the same application.
```

## Decision Flow
```
Need bidirectional communication?
  YES → WebSocket
  NO  → Need binary data?
         YES → WebSocket
         NO  → Need custom headers or POST?
               YES → WebSocket (or SSE over HTTP/2 with workarounds)
               NO  → SSE
```

## Best Practices
- SSE is simpler and should be the default for unidirectional server→client push.
- Always set `X-Accel-Buffering: no` behind nginx for SSE.
- SSE auto-reconnect sends `Last-Event-ID` header — use it for resume.
- WebSocket is more powerful but requires more infrastructure (heartbeat, reconnect, scaling).
- Both can be scaled with Redis pub/sub in a multi-node setup.
