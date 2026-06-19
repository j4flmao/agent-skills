# Integration Testing Fundamentals

## Overview
Integration testing verifies that different modules, services, or components work correctly together. Unlike unit tests that isolate single units, integration tests exercise real interactions — database queries, API calls, message queues, and file systems — to catch interface mismatches, data format errors, and protocol inconsistencies.

## Core Concepts

### Concept 1: Integration Scope
Integration tests sit between unit and E2E tests in the test pyramid. They test interactions between 2-3 real components while mocking external boundaries. Scope options: component-to-component, service-to-database, service-to-message-queue, and service-to-external-API.

### Concept 2: Test Containers
Docker containers for disposable, production-like dependencies in tests. Testcontainers library spins up PostgreSQL, Redis, Kafka, etc. as containers before tests and tears them down after. Provides realistic integration without managing persistent infrastructure.

### Concept 3: Database Testing
Verify data persistence logic: CRUD operations, queries, transactions, migrations, and data integrity. Use testcontainers for the database, seed test data, and verify state changes. Test database-specific behaviors (constraints, triggers, cascading deletes).

### Concept 4: API Integration Testing
Verify HTTP interactions between services: request/response format, status codes, headers, error handling, and timeouts. Use WireMock or MSW for external service stubs. Test happy paths, error responses, and network failures.

### Concept 5: Message Queue Integration
Verify async message passing: produce and consume messages, handle serialization/deserialization, test delivery guarantees (at-least-once, exactly-once), and dead letter handling. Use testcontainers for embedded message brokers.

## Framework Selection

| Feature | pytest + testcontainers (Python) | Jest + Testcontainers (JS) | JUnit + Testcontainers (Java) | xUnit + Testcontainers (.NET) |
|---------|-------------------------------|---------------------------|------------------------------|-------------------------------|
| Language | Python | JS/TS | Java | C# |
| Container lifecycle | Context manager | beforeAll/afterAll | @ClassRule | IClassFixture |
| Database support | Postgres, MySQL, MSSQL, Oracle | Same | Same + more | Same + more |
| Message queues | Kafka, RabbitMQ, Redpanda | Same | Same + ActiveMQ | Same |
| Embedded alternatives | Factory Boy, Faker | DB-local | H2, HSQLDB | Effort.EF |
| Parallel execution | pytest-xdist | Jest workers | Maven/Gradle parallel | xUnit parallel |
| Network mocking | responses, WireMock | MSW, nock | WireMock, MockServer | WireMock.Net |
| Best for | Python monoliths | Node.js microservices | JVM ecosystem | .NET ecosystem |

## Implementation Guide

### Step 1: Identify Integration Points
Map service dependencies: databases, message queues, external APIs, file systems, and other services. Prioritize integration tests by: risk (how critical is the integration), stability (how often does it break), and complexity (how complex is the interaction).

### Step 2: Set Up Testcontainers
```python
# Python/pytest — testcontainers for PostgreSQL
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres

@pytest.fixture
def db_connection(postgres):
    """Create fresh database for each test."""
    connection = psycopg2.connect(
        host=postgres.get_container_host_ip(),
        port=postgres.get_exposed_port(5432),
        user=postgres.USER,
        password=postgres.PASSWORD,
        dbname=postgres.DBNAME,
    )
    connection.autocommit = True
    run_migrations(connection)
    yield connection
    connection.close()
```

### Step 3: Write Database Integration Tests
```python
# tests/integration/test_order_repository.py
import pytest
from datetime import datetime
from src.order_repository import OrderRepository

class TestOrderRepository:
    def test_create_and_find_order(self, db_connection):
        repo = OrderRepository(db_connection)
        order = {
            "customer_id": "cust-123",
            "total": Decimal("99.99"),
            "status": "pending",
            "created_at": datetime.utcnow(),
        }
        order_id = repo.create(order)
        result = repo.find_by_id(order_id)
        assert result["customer_id"] == "cust-123"
        assert result["total"] == Decimal("99.99")
        assert result["status"] == "pending"

    def test_find_orders_by_customer(self, db_connection):
        repo = OrderRepository(db_connection)
        repo.create({"customer_id": "cust-123", "total": Decimal("50.00")})
        repo.create({"customer_id": "cust-123", "total": Decimal("75.00")})
        orders = repo.find_by_customer("cust-123")
        assert len(orders) == 2

    def test_reject_order_with_negative_total(self, db_connection):
        repo = OrderRepository(db_connection)
        with pytest.raises(IntegrityError):
            repo.create({"customer_id": "cust-123", "total": Decimal("-10.00")})
```

### Step 4: Write API Integration Tests
```python
# tests/integration/test_checkout_api.py
import pytest
import httpx
from wiremock import WireMockServer

@pytest.fixture(scope="session")
def wiremock():
    with WireMockServer(port=8089) as wm:
        yield wm

class TestCheckoutAPI:
    async def test_successful_checkout(self, wiremock, test_client):
        # Stub payment gateway
        wiremock.stub_for_post("/api/payments")
            .with_body({"id": "pay-123", "status": "completed"})
            .with_status(200)

        response = await test_client.post("/api/checkout", json={
            "cart_id": "cart-456",
            "payment_method": "credit_card",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] is not None
        assert data["status"] == "confirmed"

    async def test_failed_payment_rejected(self, wiremock, test_client):
        wiremock.stub_for_post("/api/payments")
            .with_body({"error": "insufficient_funds"})
            .with_status(402)

        response = await test_client.post("/api/checkout", json={
            "cart_id": "cart-456",
            "payment_method": "credit_card",
        })

        assert response.status_code == 402
        assert "insufficient funds" in response.json()["error"].lower()
```

## Best Practices
- Use testcontainers for production-like dependencies — avoid H2/test DBs that diverge from production
- Each integration test should test one integration point, not multiple
- Use real dependencies for the component under test — mock only external boundaries
- Clean up test data after each test (truncate tables, delete test entities)
- Keep integration tests in a separate directory/test suite from unit tests
- Run integration tests in CI but not on every commit (schedule or on PR to critical paths)
- Use realistic data volumes to catch performance issues
- Test transaction rollback and error handling paths alongside happy paths
- Version your database migration scripts and test them in CI
- Use retry logic for async integrations to handle timing variability

## Common Pitfalls
- Using in-memory databases (H2, SQLite) that don't match production database behavior
- Integration tests that are too slow (> 30 seconds each) — they won't get run
- Shared mutable state between tests (order-dependent failures)
- Testing through the UI when API-level integration testing is sufficient
- Not testing error paths (network timeout, database failure, validation error)
- Hardcoded connection strings and credentials in test code
- Tests that depend on external services being available (flaky by definition)
- Over-mocking — mirroring production behavior incorrectly in stubs

## Key Points
- Integration tests verify real component interactions with production-like dependencies
- Testcontainers provides disposable, realistic infrastructure for testing
- Database tests validate CRUD, constraints, transactions, and migrations
- API tests validate HTTP contracts, error handling, and edge cases
- Mock external service boundaries with WireMock or MSW
- Keep tests independent — clean up data between tests
- Run integration tests in CI with retry logic for async operations
