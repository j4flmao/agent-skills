# Reconnection Strategy

## Why Reconnection Matters
WebSocket connections drop. Network blips, server restarts, proxy timeouts, idle disconnects. A robust reconnection strategy is essential for production real-time systems.

## Reconnection Flow
```
1. Connection lost (onclose / onerror)
2. Wait (backoff delay)
3. Attempt reconnect
4. If success:
     - Re-authenticate
     - Resume subscriptions (rooms)
     - Request missed events (last event ID)
     - Continue normal operation
5. If fail:
     - Increase backoff delay
     - If max attempts reached → emit "permanently disconnected"
     - Else → goto step 2
```

## Backoff Algorithms

### Exponential Backoff (Recommended)
```
delay = min(base * 2^attempt, max_delay)
delay = randomize(delay, jitter_factor)
```

| Attempt | Base=1s | Jitter=50% | Actual range |
|---------|---------|------------|--------------|
| 1 | 1s | 0.5-1.5s | 0.5-1.5s |
| 2 | 2s | 1-3s | 1-3s |
| 3 | 4s | 2-6s | 2-6s |
| 4 | 8s | 4-12s | 4-12s |
| 5 | 16s | 8-24s | 8-24s |
| 6 | 30s (max) | 15-45s | 15-45s |

### Fibonacci Backoff
```
delay = fib(attempt) * base
fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
```
Slower ramp-up than exponential. Useful when you want gentler retries.

### Linear Backoff (Simple)
```
delay = attempt * base
```
Simple but can overwhelm servers during mass disconnection events.

## Client Implementation
```javascript
class ReconnectingSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.maxAttempts = options.maxAttempts || 10;
    this.jitter = options.jitter || 0.5;
    this.attempts = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.onOpen();
    this.ws.onclose = (e) => this.onClose(e);
    this.ws.onerror = (e) => this.onError(e);
    this.ws.onmessage = (e) => this.onMessage(e);
  }

  onClose(event) {
    if (event.code === 1000) return; // intentional close
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.attempts >= this.maxAttempts) {
      this.onPermanentFailure();
      return;
    }
    const delay = this.calculateDelay();
    setTimeout(() => {
      this.attempts++;
      this.connect();
    }, delay);
  }

  calculateDelay() {
    const base = this.baseDelay * Math.pow(2, this.attempts);
    const capped = Math.min(base, this.maxDelay);
    const jitterRange = capped * this.jitter;
    return capped - jitterRange + Math.random() * jitterRange * 2;
  }

  onPermanentFailure() {
    // alert ops, show UI error, fall back to polling
  }
}
```

## Server-Side Support

### Resume Mechanism
```
Client sends on reconnect:
  { lastEventId: "evt_00123" }

Server:
  - Buffers events per client (configurable TTL: 30s, max: 1000 events)
  - On reconnect, replays events after lastEventId
  - If buffer expired → full re-sync required
```

### Graceful Shutdown
```javascript
process.on('SIGTERM', () => {
  wss.close(); // stop accepting new connections
  for (const ws of wss.clients) {
    ws.close(1001, 'Server restart');
  }
  // wait for pending messages to drain
  setTimeout(() => process.exit(0), 5000);
});
```

## Best Practices
- Always use jitter to prevent thundering herd on reconnect.
- Never reconnect indefinitely — set max attempts or max total time.
- Distinguish intentional close (1000) from error close — don't reconnect on 1000.
- Buffer events server-side for a configurable window (TTL + max count).
- On reconnect, re-authenticate. Tokens may have expired.
- Implement exponential backoff with reasonable caps (1s min, 30s max).
- Log reconnection attempts separately for monitoring.
