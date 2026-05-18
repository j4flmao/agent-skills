# Socket.IO Patterns

## Overview
Socket.IO adds automatic reconnection, rooms, namespaces, and fallback transports on top of WebSocket.

### Key Features
- Auto-reconnect with exponential backoff
- Room-based broadcasting
- Namespace isolation
- Event-based messaging (not raw frames)
- Fallback: WebSocket → long-polling
- Built-in heartbeat (ping/pong)
- Packet buffering for offline clients

## Connection
```javascript
// Client
const socket = io('https://api.example.com', {
  path: '/ws/socket.io',
  auth: { token: 'jwt-here' },
  transports: ['websocket'],        // skip long-polling
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
});
```

```javascript
// Server (Node.js)
const io = new Server({
  path: '/ws/socket.io',
  cors: { origin: 'https://app.example.com' },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = verifyJwt(token);
    socket.data.user = user;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log(`user ${socket.data.user.id} connected`);
});
```

## Events
```javascript
// Emit (client → server)
socket.emit('message:send', { text: 'hello' });

// Listen (server → client)
socket.on('message:new', (data) => {
  console.log(data.text);
});

// Ack
socket.emit('message:send', { text: 'hello' }, (ack) => {
  console.log('server received:', ack.id);
});
```

## Rooms
```javascript
// Join room
socket.join(`room:${orderId}`);

// Leave room
socket.leave(`room:${orderId}`);

// Broadcast to room
io.to(`room:${orderId}`).emit('order:updated', orderData);

// Broadcast to room except sender
socket.to(`room:${orderId}`).emit('order:updated', orderData);

// Broadcast to all except sender
socket.broadcast.emit('user:online', { userId });
```

## Namespaces
```javascript
// Server
const chatNsp = io.of('/chat');
const notificationsNsp = io.of('/notifications');

chatNsp.on('connection', (socket) => { /* ... */ });
notificationsNsp.on('connection', (socket) => { /* ... */ });

// Client
const chatSocket = io('https://api.example.com/chat');
const notifSocket = io('https://api.example.com/notifications');
```

## Middleware
```javascript
// Auth middleware (per namespace)
io.use((socket, next) => { /* verify token */ });

// Rate limiting per socket
io.use((socket, next) => {
  socket.rateLimit = new RateLimiter({ points: 100, duration: 60 });
  next();
});

// Event-level middleware
socket.use(([event, data], next) => {
  console.log(`event: ${event}`, data);
  next();
});
```

## Scaling with Redis Adapter
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## Error Handling
```javascript
// Client
socket.on('connect_error', (err) => {
  console.error('connection failed:', err.message);
});

socket.on('error', (err) => {
  console.error('socket error:', err.message);
});

// Server
socket.on('error', (err) => {
  console.error('socket error:', err.message);
});
```

## Best Practices
- Use namespaces to isolate features (chat vs notifications vs metrics).
- Use rooms for targeting specific groups (order room, project room).
- Always authenticate in middleware before allowing connection.
- Set `maxHttpBufferSize` to prevent large message attacks.
- Prefer websocket-only transport in production (skip polling fallback).
- Monitor adapter latency in clustered mode.
