---
name: backend-event-driven-architecture
description: >
  Use this skill when the user says 'event-driven architecture', 'EDA', 'publish domain events', 'kafka producer', 'kafka consumer', 'rabbitmq exchange', 'event broker', 'at-least-once delivery', 'event ordering', 'consumer group'. Designs broker-based event flows (Kafka or RabbitMQ): event shape, topic/exchange layout, partitioning for ordering, delivery guarantees, consumer idempotency, retries and dead-lettering, with working producer/consumer code. Do NOT use for: event sourcing as a persistence model (backend-event-sourcing), broker operations and tuning (backend-message-queue), reliable publish from a DB transaction (backend-transactional-outbox), stream processing with Flink/Kafka Streams (backend-data-streaming).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [backend, event-driven, kafka, rabbitmq, messaging, async]
---

# Event-Driven Architecture

## Purpose
Decouple services by having producers publish facts ("OrderPlaced") to a broker and consumers react independently. The skill covers the design decisions that make this reliable in practice: what goes in an event, how ordering and delivery guarantees work, and how consumers stay correct under redelivery.

## Agent Protocol

### Trigger
Exact user phrases: "event-driven architecture", "EDA", "publish domain events", "kafka producer", "kafka consumer", "rabbitmq exchange", "event broker", "at-least-once delivery", "event ordering", "consumer group".

### Input Context
- Business flow and which services produce/consume.
- Broker in use or candidates (Kafka, RabbitMQ, cloud: SNS/SQS, Pub/Sub, Event Hubs).
- Ordering, latency and replay requirements.
- Language and client library.

### Output Artifact
Event catalogue, topology (topics/exchanges, keys, consumer groups), and producer/consumer code. No files unless requested.

### Response Format
```
Event: {PastTenseName} v{n}   Key: {partition key}
Topic/Exchange: {name}         Producers: {svc}   Consumers: {svc,...}
Delivery: at-least-once        Ordering: per {key}
Consumer idempotency: {dedupe table | natural upsert}
Failure: retry {n} with backoff -> DLQ {name}
```

## Core Concepts

| Concept | Meaning |
|---|---|
| Event notification | Thin event ("OrderPlaced id=42"); consumers call back for details. Low coupling on schema, higher coupling at runtime |
| Event-carried state transfer | Event carries the data consumers need; no callback; larger payloads, schema is a contract |
| Command vs event | Command = request to one handler ("ChargeCard"); event = fact for any number of subscribers ("PaymentCaptured") |
| Delivery guarantee | Brokers give at-most-once or at-least-once to consumers. "Exactly-once" end to end requires idempotent consumers or transactional read-process-write inside one system (Kafka transactions) |

## Broker Choice

| Need | Kafka | RabbitMQ |
|---|---|---|
| Replay history / new consumers reading the past | Yes (retention-based log) | No by default (queues delete on ack); RabbitMQ Streams add a log |
| Per-key ordering at scale | Yes, per partition | Per queue, single active consumer needed for strict order |
| Flexible routing (topic/headers patterns) | Limited (topic per event type) | Rich (direct, topic, fanout, headers exchanges) |
| Per-message TTL, priority, delayed retry | Not native | Native (TTL, priority queues, DLX) |
| Very high throughput fan-out | Strong | Good, lower ceiling |

## Event Design Rules
1. Name events in past tense for facts that already happened (`OrderPlaced`, not `PlaceOrder`).
2. Include an envelope: `event_id` (unique, for dedupe), `type`, `version`, `occurred_at`, `source`, `subject/aggregate_id`, optional `trace_id`. CloudEvents is a standard envelope worth adopting.
3. Choose the partition key = aggregate ID so all events for one entity are ordered.
4. Evolve schemas backward-compatibly (add optional fields only); use a schema registry (Avro/Protobuf/JSON Schema) for Kafka.
5. Publish only after the state change is durable. Writing to the DB and the broker in one request without the outbox pattern creates dual-write inconsistencies.

## Kafka Producer (Go, confluent-kafka-go v2)

```go
package events

import (
	"encoding/json"
	"fmt"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

type OrderPlaced struct {
	EventID    string `json:"event_id"`
	OrderID    string `json:"order_id"`
	CustomerID string `json:"customer_id"`
	TotalCents int64  `json:"total_cents"`
	OccurredAt string `json:"occurred_at"`
}

func NewProducer(brokers string) (*kafka.Producer, error) {
	return kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers":  brokers,
		"acks":               "all", // wait for in-sync replicas
		"enable.idempotence": true,  // no duplicates from producer retries
		"linger.ms":          5,
	})
}

// PublishOrderPlaced blocks until the broker acknowledges the write.
func PublishOrderPlaced(p *kafka.Producer, topic string, evt OrderPlaced) error {
	payload, err := json.Marshal(evt)
	if err != nil {
		return fmt.Errorf("marshal event %s: %w", evt.EventID, err)
	}
	delivery := make(chan kafka.Event, 1)
	err = p.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Key:            []byte(evt.OrderID), // per-order ordering
		Value:          payload,
		Headers:        []kafka.Header{{Key: "type", Value: []byte("OrderPlaced.v1")}},
	}, delivery)
	if err != nil {
		return fmt.Errorf("enqueue event %s: %w", evt.EventID, err)
	}
	m := (<-delivery).(*kafka.Message)
	if m.TopicPartition.Error != nil {
		return fmt.Errorf("deliver event %s: %w", evt.EventID, m.TopicPartition.Error)
	}
	return nil
}
```

Create one producer per process and reuse it; call `p.Flush(timeoutMs)` and `p.Close()` on shutdown.

## Kafka Consumer With Manual Commit

```go
func Consume(brokers, group, topic string, handle func(*kafka.Message) error) error {
	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":  brokers,
		"group.id":           group,
		"auto.offset.reset":  "earliest",
		"enable.auto.commit": false, // commit only after successful handling
	})
	if err != nil {
		return fmt.Errorf("create consumer for group %s: %w", group, err)
	}
	defer c.Close()
	if err := c.SubscribeTopics([]string{topic}, nil); err != nil {
		return fmt.Errorf("subscribe %s: %w", topic, err)
	}
	for {
		msg, err := c.ReadMessage(-1)
		if err != nil {
			if kerr, ok := err.(kafka.Error); ok && kerr.IsFatal() {
				return fmt.Errorf("fatal consumer error: %w", err)
			}
			continue // transient errors are retried by the client
		}
		if err := handle(msg); err != nil {
			// Hand off to retry/DLQ topic rather than blocking the partition forever.
			return fmt.Errorf("handle offset %v: %w", msg.TopicPartition, err)
		}
		if _, err := c.CommitMessage(msg); err != nil {
			return fmt.Errorf("commit offset %v: %w", msg.TopicPartition, err)
		}
	}
}
```

## Idempotent Consumer

At-least-once means duplicates will arrive (rebalances, crashes before commit). Make the handler safe:

```sql
CREATE TABLE processed_events (
  consumer   text        NOT NULL,
  event_id   text        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, event_id)
);
-- In the same transaction as the side effect:
INSERT INTO processed_events (consumer, event_id) VALUES ('billing', $1)
ON CONFLICT DO NOTHING;   -- 0 rows affected => duplicate, skip side effect
```

## Retries and Dead-Lettering
- Kafka: on failure publish to `orders.retry.1m`, `orders.retry.10m`, then `orders.dlq`, committing the original offset. Blocking retries in place stall the whole partition.
- RabbitMQ: `basic.nack` with `requeue=false` routes to the queue's dead-letter exchange (`x-dead-letter-exchange`); use TTL queues for delayed retry.
- Classify errors: validation/poison messages go straight to DLQ; transient (timeouts) retry with exponential backoff and jitter.
- Alert on DLQ depth and provide a replay tool.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Publishing before DB commit, or DB + broker dual write | Transactional outbox or CDC |
| Random/null keys when order matters | Key by aggregate ID |
| Auto-commit with slow handlers | Manual commit after processing |
| Events that are disguised RPC ("PleaseSendEmail" awaiting reply) | Use a command queue or synchronous call |
| Breaking schema changes on an existing topic | Version the event type; dual-publish during migration |
| One giant "events" topic for everything | Topic per event type or bounded context |

## Checklist
- [ ] Event catalogue with owners, schema versions and keys.
- [ ] Producer: `acks=all`, idempotence on, publish via outbox.
- [ ] Consumers idempotent; offsets committed after processing.
- [ ] Retry topics/queues and DLQ with alerting and replay.
- [ ] Consumer lag, DLQ depth and end-to-end latency monitored.
- [ ] Trace context propagated in message headers.

## References
- Related skills: `skills/backend/universal/event-driven/SKILL.md`, `skills/backend/universal/message-queue/SKILL.md`, `skills/backend/universal/transactional-outbox/SKILL.md`, `skills/backend/universal/event-sourcing/SKILL.md`.
