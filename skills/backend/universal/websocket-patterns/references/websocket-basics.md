# WebSocket Basics

## Protocol Overview
WebSocket provides full-duplex communication over a single TCP connection after an HTTP upgrade handshake.

```
Client                              Server
  |                                   |
  |--- HTTP Upgrade request -------->|   Handshake
  |<--- 101 Switching Protocols -----|
  |                                   |
  |--- WebSocket frame ------------>|   Bidirectional
  |<--- WebSocket frame ------------|   messages
  |                                   |
  |--- Close frame ---------------->|   Teardown
```

## Handshake
Client request:
```
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Server response:
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

## Frame Structure
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data (continued)                  |
+---------------------------------------------------------------+
```

## Opcodes
| Opcode | Value | Description |
|--------|-------|-------------|
| Continuation | 0x0 | Continuation frame for fragmented message |
| Text | 0x1 | UTF-8 text payload |
| Binary | 0x2 | Binary payload |
| Close | 0x8 | Connection close |
| Ping | 0x9 | Keepalive ping |
| Pong | 0xA | Keepalive pong response |

## Close Codes
| Code | Description |
|------|-------------|
| 1000 | Normal closure |
| 1001 | Going away (server restart, client nav) |
| 1002 | Protocol error |
| 1003 | Unsupported data |
| 1008 | Policy violation |
| 1009 | Message too big |
| 1011 | Internal server error |
| 1012 | Service restart |
| 1013 | Try again later |

## URL Scheme
```
ws://example.com/ws          → unencrypted
wss://example.com/ws         → encrypted (WebSocket over TLS)
ws://example.com/ws?token=x  → auth via query param
```

## Key Considerations
- Max message size: configure on server (defaults vary; set explicit limit).
- Masking: client-to-server frames must be masked (security against cache poisoning).
- Fragmentation: large messages can be split into multiple frames.
- Subprotocols: negotiate protocol via `Sec-WebSocket-Protocol` header.
- Extensions: `permessage-deflate` for compression.
