# Message Queue Integration Testing

## TestContainers for Messaging

### Supported Message Brokers

| Broker | TestContainers Module | Image |
|--------|----------------------|-------|
| Kafka | kafka | confluentinc/cp-kafka:7.5 |
| Redpanda | redpanda | redpandadata/redpanda:v23.3 |
| RabbitMQ | rabbitmq | rabbitmq:3.12-management |
| Pulsar | pulsar | apachepulsar/pulsar:3.0 |
| ActiveMQ | activemq | rmohr/activemq:5.18 |

## Kafka Testing

### Basic Producer/Consumer Test (Java)

```java
@SpringBootTest
@Testcontainers
class KafkaIntegrationTest {

    private static final String TOPIC = "test-orders";

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0")
    );

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Autowired
    private OrderEventListener listener;

    @Test
    void shouldProduceAndConsumeMessage() throws InterruptedException {
        OrderEvent event = new OrderEvent("ORD-001", "CREATED", 150.00);

        kafkaTemplate.send(TOPIC, event.getOrderId(), event);

        // Wait for async consumption
        Thread.sleep(2000);

        assertThat(listener.getLastEvent().getOrderId()).isEqualTo("ORD-001");
    }
}
```

### Consumer Test with TestContainers (Python)

```python
import pytest
from testcontainers.kafka import KafkaContainer
from kafka import KafkaConsumer, KafkaProducer
import json

@pytest.fixture(scope="module")
def kafka_container():
    with KafkaContainer() as kc:
        yield kc

def test_order_processing(kafka_container):
    producer = KafkaProducer(
        bootstrap_servers=kafka_container.get_bootstrap_server(),
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    consumer = KafkaConsumer(
        'processed-orders',
        bootstrap_servers=kafka_container.get_bootstrap_server(),
        auto_offset_reset='earliest',
        value_deserializer=lambda v: json.loads(v.decode('utf-8'))
    )

    # Produce test event
    event = {'order_id': 'ORD-001', 'amount': 150.00}
    producer.send('orders', value=event)
    producer.flush()

    # Consume processed event
    messages = consumer.poll(timeout_ms=5000)
    for topic_partition, msgs in messages.items():
        for msg in msgs:
            assert msg.value['order_id'] == 'ORD-001'
```

## RabbitMQ Testing

### Basic Test (Java)

```java
@SpringBootTest
@Testcontainers
class RabbitMQIntegrationTest {

    private static final String QUEUE = "test.order.queue";
    private static final String EXCHANGE = "test.order.exchange";

    @Container
    static RabbitMQContainer rabbit = new RabbitMQContainer("rabbitmq:3.12-management");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", rabbit::getHost);
        registry.add("spring.rabbitmq.port", rabbit::getAmqpPort);
    }

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private OrderMessageListener listener;

    @Test
    void shouldSendAndReceiveMessage() {
        OrderMessage order = new OrderMessage("ORD-002", 250.00);

        rabbitTemplate.convertAndSend(EXCHANGE, "order.created", order);

        await().atMost(5, SECONDS)
            .until(() -> listener.getLastMessage() != null);

        assertThat(listener.getLastMessage().getOrderId()).isEqualTo("ORD-002");
    }
}
```

### Consumer Test (Python)

```python
import pytest
from testcontainers.rabbitmq import RabbitMqContainer
import pika

@pytest.fixture(scope="module")
def rabbit_container():
    with RabbitMqContainer("rabbitmq:3.12-management") as rc:
        yield rc

def test_message_processing(rabbit_container):
    connection = pika.BlockingConnection(
        pika.URLParameters(rabbit_container.get_connection_url())
    )
    channel = connection.channel()

    # Declare queue
    channel.queue_declare(queue='test-queue', durable=True)

    # Published message
    channel.basic_publish(
        exchange='',
        routing_key='test-queue',
        body='{"order_id": "ORD-003", "amount": 99.99}'
    )

    # Consume message
    method_frame, header_frame, body = channel.basic_get('test-queue')
    assert body is not None
    assert b'ORD-003' in body
```

## Producer Testing

### Idempotent Producer

```java
@Test
void shouldHandleIdempotentPublishing() {
    OrderEvent event = new OrderEvent("ORD-004", "UPDATED", 75.00);

    // Publish same event twice
    kafkaTemplate.send(TOPIC, event.getOrderId(), event);
    kafkaTemplate.send(TOPIC, event.getOrderId(), event);

    await().atMost(5, SECONDS)
        .until(() -> consumer.listener.getMessageCount() == 1);

    // Consumer should deduplicate based on orderId + event type
    assertThat(consumer.listener.getMessageCount()).isEqualTo(1);
}
```

### Error Handling

```java
@Test
void shouldRetryOnTransientError() {
    // Simulate consumer throwing transient error
    willThrow(new TransientException("DB timeout"))
        .given(consumer).processMessage(any());

    OrderEvent event = new OrderEvent("ORD-005", "CREATED", 300.00);
    kafkaTemplate.send(TOPIC, event.getOrderId(), event);

    await().atMost(10, SECONDS)
        .until(() -> consumer.callCount.get() >= 3);

    // Should have retried 3 times (default retry policy)
    assertThat(consumer.callCount.get()).isGreaterThanOrEqualTo(3);
}
```

## Consumer Testing

### Dead Letter Queue

```java
@Test
void shouldSendToDLQAfterMaxRetries() {
    // Configure consumer with 3 retries then DLQ
    willThrow(new RuntimeException("Permanent failure"))
        .given(consumer).processMessage(any());

    OrderEvent event = new OrderEvent("ORD-006", "CREATED", 50.00);
    kafkaTemplate.send(TOPIC, event.getOrderId(), event);

    await().atMost(15, SECONDS)
        .until(() -> dlqConsumer.receivedEvents.size() == 1);

    assertThat(dlqConsumer.receivedEvents.get(0).getOrderId())
        .isEqualTo("ORD-006");
}
```

### Batch Consumer

```java
@Test
void shouldProcessBatchMessages() {
    List<OrderEvent> events = IntStream.range(0, 10)
        .mapToObj(i -> new OrderEvent("ORD-" + i, "CREATED", 100.0 * i))
        .toList();

    events.forEach(e ->
        kafkaTemplate.send(TOPIC, e.getOrderId(), e));

    await().atMost(10, SECONDS)
        .until(() -> batchConsumer.batchesProcessed.get() >= 1);

    // Verify batch processing
    assertThat(batchConsumer.lastBatch).hasSize(10);
}
```

## Schema Registry Testing

### Confluent Schema Registry

```java
@SpringBootTest
@Testcontainers
class SchemaRegistryTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.5.0")
    );

    @Container
    static SchemaRegistryContainer schemaRegistry =
        new SchemaRegistryContainer("confluentinc/cp-schema-registry:7.5.0")
            .withKafka(kafka);

    @Test
    void shouldRegisterAndValidateSchema() {
        String subject = "order-value";

        // Register Avro schema
        String schema = """
            {
                "type": "record",
                "name": "OrderValue",
                "fields": [
                    {"name": "orderId", "type": "string"},
                    {"name": "amount", "type": "double"}
                ]
            }
            """;

        restTemplate.postForEntity(
            schemaRegistry.getUrl() + "/subjects/" + subject + "/versions",
            Map.of("schema", schema),
            String.class
        );

        // Validate message against schema
        ResponseEntity<Object> response = restTemplate.postForEntity(
            schemaRegistry.getUrl() + "/subjects/" + subject + "/versions",
            Map.of("schema", schema.replace("double", "int")),
            Object.class
        );

        // Schema change is backward compatible (double → int)
        assertThat(response.getStatusCode()).is2xxSuccessful();
    }
}
```

## Best Practices

| Practice | Why |
|----------|-----|
| Use unique topics/queues per test | Avoid cross-test interference |
| Test both producer and consumer | End-to-end message flow validation |
| Test error and retry paths | Resilience is critical in async systems |
| Test message ordering | Many consumers depend on ordering guarantees |
| Test schema evolution | Schema changes should not break consumers |
| Set reasonable timeouts | Async tests need await, not sleep |
| Clean up topics after tests | Prevents resource leaks |

## References
- TestContainers Kafka Module — https://testcontainers.com/modules/kafka/
- TestContainers RabbitMQ Module — https://testcontainers.com/modules/rabbitmq/
- Spring Kafka Testing — https://docs.spring.io/spring-kafka/reference/testing.html
- Confluent Schema Registry — https://docs.confluent.io/platform/current/schema-registry/
- Kafka: The Definitive Guide — Neha Narkhede, Gwen Shapira, Todd Palino
