# Event-Driven Architecture (EDA)

## 1. Skill Context
**Focus**: Decoupling microservices, asynchronous communication, scalable systems, and message brokers (Kafka, RabbitMQ, AWS SQS/SNS).
**Triggers**: architecture, event-driven, eda, async, pub-sub, messages, outbox-pattern.

## 2. Core Concepts
Traditional microservices communicate via synchronous REST/gRPC. If Service A calls Service B, and Service B is down, Service A fails (tight coupling). 
In **Event-Driven Architecture**, Service A simply emits an event ("Order Created") to an Event Broker. It does not care who listens to it, nor if they are online. Service B (Billing) and Service C (Inventory) consume the event independently.

### Events vs. Commands
- **Command**: "Create an Order". Directed at a specific service. Expected to fail or succeed. (Synchronous or Queue).
- **Event**: "Order Was Created". A historical fact. Directed at no one in particular. Cannot be rejected because it already happened. (Pub/Sub).

## 3. The Dual-Write Problem & The Outbox Pattern
**The Anti-pattern**: 
```javascript
// Extremely dangerous! What if the DB commits, but Kafka crashes?
await db.execute("INSERT INTO orders (id) VALUES (1)");
await kafka.send("OrderCreated", { id: 1 });
```
**The Solution (Transactional Outbox)**:
Instead of sending the event directly to Kafka, you write the event into an `outbox` table in the *same* database transaction as the order.
```sql
BEGIN TRANSACTION;
INSERT INTO orders (id) VALUES (1);
INSERT INTO outbox (event_type, payload) VALUES ('OrderCreated', '{"id":1}');
COMMIT;
```
A separate background process (e.g., Debezium / Change Data Capture) continuously reads the `outbox` table and pushes the messages to Kafka. This guarantees 100% at-least-once delivery.

## 4. Architectural Hazards
- **Event Pinball**: Service A fires Event X. Service B listens to X and fires Y. Service C listens to Y and fires Z. When a bug occurs, tracing the "pinball" across 10 services is impossible without strict **Distributed Tracing** (OpenTelemetry, W3C Trace Context).
- **Eventual Consistency**: The UI will say "Order Successful", but the user's invoice might not appear in the billing tab for 3 seconds. The Frontend must be designed to handle eventual consistency (Polling, WebSockets, or Optimistic UI).

## 5. References
- `references/cqrs-event-sourcing.md` — Deep dive into CQRS and Event Sourcing.
