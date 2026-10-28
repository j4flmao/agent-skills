---
description: "j4flmao/rules — Mandatory standards for Distributed Systems and Network API design"
glob: "*"
---

# Distributed Systems Safeguards

Cursor/AI MUST follow these rules when writing code that involves network requests, distributed state, or microservices.

## 1. Embrace the Fallacies of Distributed Computing
- **Rule**: Never assume the network is reliable, latency is zero, or bandwidth is infinite.
- **Action**: Retry cross-service HTTP/gRPC calls with bounded attempts (e.g. 3), capped exponential backoff, and full jitter. Never retry forever.
- **Retry only what is safe**: retry idempotent operations, or operations carrying an idempotency key. Retry connection errors, `408`, `429`, `502`, `503`, `504` (respect `Retry-After`). Do not retry other `4xx`.
- **Avoid retry storms**: retry at one layer only (not client + gateway + service), use a retry budget, and add a circuit breaker for dependencies that keep failing.

## 2. Strict Idempotency
- **Rule**: Every state-changing operation that can be retried MUST be safe to repeat. `PUT` and `DELETE` are idempotent by HTTP semantics (RFC 9110) and must be implemented that way. `POST` is not, so it needs an explicit mechanism.
- **Action**: Accept an `Idempotency-Key` header and store key → result atomically with the side effect, or rely on a database unique constraint. If a client sends "Charge Credit Card" twice after a timeout, the server must charge once and return the original result.
- **Messaging**: Assume at-least-once delivery. Consumers must deduplicate (message ID / inbox table). Publish events through a transactional outbox, not a dual write.

## 3. Timeouts and Deadlines
- **Rule**: Never make a network request without an explicit timeout.
  ```python
  # BAD: requests has no default timeout and can hang forever
  requests.get("https://api.example.com/data")

  # GOOD: (connect, read) timeouts
  requests.get("https://api.example.com/data", timeout=(3.05, 10))
  ```
- **Action**: Propagate deadlines downstream (gRPC deadlines, `context.Context` in Go, `AbortSignal.timeout()` in JS). An inner timeout must be shorter than the outer one so the caller can still respond.
