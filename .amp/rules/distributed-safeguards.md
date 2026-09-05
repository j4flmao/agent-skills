---
description: "j4flmao/rules — Mandatory standards for Distributed Systems and Network API design"
glob: "*"
---

# Distributed Systems Safeguards

Cursor/AI MUST follow these rules when writing code that involves network requests, distributed state, or microservices.

## 1. Embrace the Fallacies of Distributed Computing
- **Rule**: Never assume the network is reliable, latency is zero, or bandwidth is infinite. 
- **Action**: All cross-service HTTP/gRPC calls MUST be wrapped in Retries with Exponential Backoff and Jitter. Never use a hardcoded infinite retry.

## 2. Strict Idempotency
- **Rule**: If a system performs a state-changing operation (POST, PUT, DELETE), it MUST be designed to be idempotent. 
- **Action**: Use `Idempotency-Key` headers or database unique constraints. If a client sends a "Charge Credit Card" request twice due to a network timeout, the server must not charge the user twice.

## 3. Timeout Definitions
- **Rule**: Never make a network request without explicitly defining a Timeout.
  ```python
  # BAD
  requests.get("https://api.example.com/data")
  
  # GOOD
  requests.get("https://api.example.com/data", timeout=5.0)
  ```
