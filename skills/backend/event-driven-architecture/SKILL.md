---
name: Event Driven Architecture
description: Best practices for Kafka/RabbitMQ message brokering and event sourcing.
---

# Event Driven Architecture

## Core Concepts
- **Message Brokering**: Decouples producers and consumers.
- **Event Sourcing**: State is determined by a sequence of events.

## Diagram
```mermaid
flowchart LR
    A[Producer] --> B(Message Broker)
    B --> C[Consumer 1]
    B --> D[Consumer 2]
    B --> E[(Event Store)]
```

## Go Example (Kafka Producer)
```go
package main

import (
    "github.com/confluentinc/confluent-kafka-go/kafka"
    "log"
)

func produceEvent(topic, message string) {
    p, _ := kafka.NewProducer(&kafka.ConfigMap{"bootstrap.servers": "localhost"})
    defer p.Close()

    p.Produce(&kafka.Message{
        TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
        Value:          []byte(message),
    }, nil)
    p.Flush(15 * 1000)
    log.Println("Event produced")
}
```
