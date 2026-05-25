---
name: backend-webhooks
description: >
  Use this skill when the user says 'webhook', 'webhook receiver', 'webhook delivery', 'signature verification', 'HMAC', 'event delivery', 'outgoing webhook', 'incoming webhook', 'retry webhook', 'webhook endpoint'. This skill implements receiving, verifying, retrying, and delivering webhooks securely. Applies to any backend stack. Do NOT use for: server-sent events (SSE), WebSockets, or long-polling fallbacks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, webhooks, events, integration]
---

# Backend Webhooks

## Purpose
Securely receive, verify, retry, and deliver webhooks between services with guaranteed delivery and tamper-proof signatures.

## Agent Protocol

### Trigger
Exact user phrases: "webhook", "webhook receiver", "webhook delivery", "signature verification", "HMAC", "event delivery", "outgoing webhook", "incoming webhook", "retry webhook", "webhook endpoint", "incoming webhook setup".

### Input Context
- Direction: receiving incoming webhooks or sending outgoing webhooks.
- Security requirements (signing, IP allowlisting).
- Expected volume and payload size.
- Event types and schemas.

### Output Artifact
Webhook handler code or configuration. No file unless requested.

### Response Format
```
Direction: {incoming|outgoing}
Auth: {HMAC|Basic|OAuth|None}
Retry: {strategy}
Delivery Guarantee: {at-least-once|exactly-once}
```

### Completion Criteria
- [ ] Signature verification for incoming webhooks.
- [ ] Payload signing for outgoing webhooks.
- [ ] Retry with exponential backoff for failed deliveries.
- [ ] Dead-letter queue for permanently failed deliveries.
- [ ] At-least-once delivery guaranteed.
- [ ] Idempotency handling for duplicate deliveries.

### Max Response Length
4 lines per webhook. 20 lines for full implementation.

## Workflow

### Step 1: Define Event Types
```yaml
events:
  order.created:
    description: Order has been placed
    schema: OrderCreatedEvent
  order.fulfilled:
    description: Order has been shipped
    schema: OrderFulfilledEvent
```

### Step 2: Sign Outgoing Payloads
```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': `sha256=${signature}`,
    'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
  },
  body: JSON.stringify(payload),
});
```

### Step 3: Verify Incoming Signatures
```javascript
function verifySignature(req, secret, toleranceMs = 300000) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = parseInt(req.headers['x-webhook-timestamp']);
  const age = Date.now() - timestamp * 1000;
  if (age > toleranceMs) throw new Error('Webhook timestamp expired');
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Webhook signature invalid');
  }
}
```

### Step 4: Implement Delivery with Retry
```javascript
async function deliverWebhook(subscription, payload) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(subscription.url, { method: 'POST', body: payload, headers });
      if (res.ok) return;
    } catch {}
    await delay(Math.pow(2, attempt) * 1000 + Math.random() * 1000);
  }
  await deadLetterQueue.send({ subscription, payload });
}
```

### Step 5: Handle Duplicates (Idempotency)
Include `X-Webhook-ID` header. Consumers deduplicate by this ID.

## Rules
- Always sign webhook payloads with HMAC-SHA256 — never send unsigned payloads.
- Include a timestamp in the signature and enforce a tolerance window (5 minutes max).
- Use timing-safe comparison for signature verification.
- Retry at least 5 times with exponential backoff before dead-lettering.
- Log all delivery attempts (success and failure) with timestamps.
- Rotate webhook secrets regularly.
- Allow consumers to unsubscribe — respect opt-out.

## References
- `references/webhook-setup.md` — Webhook setup and delivery infrastructure
- `references/webhook-security.md` — Webhook security best practices
- `references/webhooks-architecture.md` — Webhook service design, routing, delivery, subscription management
- `references/webhooks-delivery.md` — Webhook signing, verification, secret rotation, security

## Handoff
No artifact produced unless requested.
Next skill: api-versioning — manage version transitions for the webhook API.
Carry forward: event types, webhook URL structure, signature format.
