# Integration Testing Advanced Topics

## Introduction
Advanced integration testing covers contract-driven integration (consumer-driven contracts + integration), containerized integration test architecture, messaging integration with exactly-once semantics, database test optimization, and integration testing in event-driven architectures.

## Contract-Driven Integration Testing
Combine contract testing with integration tests for a comprehensive strategy:
- Contract tests verify API shape compatibility (fast, deterministic, isolated)
- Integration tests verify real behavior with production-like dependencies (slower, realistic)
- Use contract tests as the fast CI gate; integration tests as the deployment gate

```python
# Integration test that validates against real service with contract awareness
class TestPaymentIntegration:
    """Integration tests that validate behavior, not just contract shape."""

    async def test_full_payment_lifecycle(self, wiremock, payment_client):
        # This tests real behavior beyond what contract tests verify
        wiremock.stub_for_post("/api/charge")
            .with_body({"charge_id": "ch_123", "status": "succeeded", "amount": 5000})

        result = await payment_client.charge(5000, "tok_visa")
        assert result.charge_id == "ch_123"
        assert result.status == "succeeded"

        # Verify full lifecycle — refund
        wiremock.stub_for_post("/api/refund")
            .with_body({"refund_id": "rf_123", "status": "succeeded"})
        refund = await payment_client.refund(result.charge_id)
        assert refund.status == "succeeded"

    async def test_duplicate_charge_idempotency(self, payment_client):
        """Real providers typically have 24-hour idempotency keys."""
        # First attempt succeeds
        result1 = await payment_client.charge(5000, "tok_visa", idempotency_key="key-123")
        assert result1.status == "succeeded"
        # Duplicate with same key returns same result (idempotent)
        result2 = await payment_client.charge(5000, "tok_visa", idempotency_key="key-123")
        assert result2.charge_id == result1.charge_id
```

## Containerized Integration Test Architecture
```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_PASSWORD: testpass
    tmpfs: /var/lib/postgresql/data
    ports:
      - "5433:5432"

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"

  kafka-test:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9093
    ports:
      - "9093:9092"
```

## Database Integration Optimization
### Test Data Factories with SQLAlchemy
```python
# tests/factories.py
import factory
from src.models import Order, OrderItem, Customer

class CustomerFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Customer
        sqlalchemy_session_persistence = "commit"

    id = factory.Sequence(lambda n: f"cust-{n:04d}")
    name = factory.Faker("name")
    email = factory.Faker("email")
    tier = "standard"

class OrderFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Order

    id = factory.Sequence(lambda n: n)
    customer = factory.SubFactory(CustomerFactory)
    total = factory.Faker("pydecimal", left_digits=4, right_digits=2)
    status = "pending"
```

## Messaging Integration Testing
### Kafka Consumer/Producer Testing
```python
# tests/integration/test_order_events.py
from testcontainers.kafka import KafkaContainer

class TestOrderEventProcessing:
    @pytest.fixture(scope="class")
    def kafka(self):
        with KafkaContainer() as kc:
            yield kc

    def test_order_created_event_consumed(self, kafka, order_service):
        producer = kafka.get_producer()
        producer.send("orders", {
            "event": "order.created",
            "order_id": "ord-123",
            "customer_id": "cust-456",
            "total": 99.99,
        })
        producer.flush()

        consumer = kafka.get_consumer("order-processor")
        msg = consumer.poll(timeout=5.0)
        assert msg is not None
        assert msg.value()["event"] == "order.created"

    def test_dead_letter_on_processing_failure(self, kafka, order_service):
        # Send malformed event that processor will fail to handle
        producer = kafka.get_producer()
        producer.send("orders", {"event": "order.created", "bad_field": "..."})
        producer.flush()

        # Verify event ends up in DLQ after retries exhausted
        dlq_consumer = kafka.get_consumer("orders-dlq")
        msg = dlq_consumer.poll(timeout=10.0)
        assert msg is not None
        assert msg.headers()["error"] is not None
```

## Integration Test Anti-Patterns
### Testing Through the Wrong Interface
```python
# BAD — testing database through the web layer (slow, complex)
def test_customer_save_through_api(client):
    response = client.post("/api/customers", json={"name": "John"})
    # Then a GET to verify... slow path for simple DB validation

# GOOD — test database through repository layer (direct, fast)
def test_customer_repository(db_session):
    repo = CustomerRepository(db_session)
    customer = repo.create({"name": "John"})
    assert repo.find_by_id(customer.id).name == "John"
```

### State Leak Between Tests
```python
# BAD — test data accumulates
def test_first_order(db_session):
    repo = OrderRepository(db_session)
    repo.create({"customer_id": "c1"})
    assert len(repo.find_all()) == 1  # Works

def test_second_order(db_session):
    repo = OrderRepository(db_session)
    assert len(repo.find_all()) == 0  # FAILS — still has data from first test

# GOOD — each test gets fresh database
@pytest.fixture(autouse=True)
def clean_db(db_connection):
    yield
    db_connection.execute("TRUNCATE orders, customers CASCADE")
```

## Key Points
- Combine contract tests for API shape + integration tests for real behavior
- Use Testcontainers for disposable, production-like test infrastructure
- Database factories (Factory Boy) simplify test data creation
- Message integration tests verify produce-consume cycles and dead letter handling
- Test through the appropriate layer — database through repository, not API
- Clean up test data between tests for isolation
- Make integration tests as fast as possible to encourage frequent execution
