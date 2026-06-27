# Architecture Patterns in Python Backend Engineering

## Overview
This document covers structural paradigms for Python backends, evaluating framework tradeoffs and complex system designs like Hexagonal Architecture, Event-Driven Architecture, CQRS, and Microservices vs. Majestic Monoliths.

## 1. Framework Tradeoffs: FastAPI vs Django vs Flask

### FastAPI
- **Paradigm:** Asynchronous, type-hint driven, highly performant.
- **Best For:** Microservices, high-throughput IO-bound APIs, heavily typed codebases.
- **Pros:** Automatic OpenAPI docs, high performance (Starlette/Pydantic), async-native.
- **Cons:** Younger ecosystem, fewer built-in batteries (ORM, auth) compared to Django.

### Django
- **Paradigm:** Batteries-included, MTV (Model-Template-View) pattern, synchronous (with async support).
- **Best For:** Majestic monoliths, content-heavy sites, rapid prototyping requiring standard features (admin panel, ORM, Auth).
- **Pros:** Feature-rich, highly stable, incredible ORM, built-in admin panel.
- **Cons:** Heavy, opinionated, async support is bolted on.

### Flask
- **Paradigm:** Micro-framework, unopinionated, extension-driven.
- **Best For:** Small to medium APIs, highly customized architectures.
- **Pros:** Minimalist, flexible.
- **Cons:** Requires stitching many libraries together, less performant out-of-the-box than FastAPI.

## 2. Hexagonal Architecture (Ports and Adapters)
Hexagonal architecture isolates the core domain logic from external concerns (databases, APIs, UI).

```text
       +----------------------------------------------------+
       |                  External Systems                  |
       |  +----------+                       +----------+   |
       |  | REST API |                       | Database |   |
       |  +----+-----+                       +-----+----+   |
       |       |                                   |        |
       |       v                                   v        |
       |  +----------+                       +----------+   |
       |  | Port     |                       | Port     |   |
       |  | (Input)  |                       | (Output) |   |
       |  +----+-----+                       +-----+----+   |
       |       |           +-------------+         |        |
       |       +---------> | Core Domain | <-------+        |
       |                   +-------------+                  |
       +----------------------------------------------------+
```

### Implementation Example
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

# Domain Entity
@dataclass
class User:
    id: int
    name: str

# Port (Output)
class UserRepository(ABC):
    @abstractmethod
    def save(self, user: User) -> None:
        pass

# Adapter (Output)
class PostgresUserRepository(UserRepository):
    def save(self, user: User) -> None:
        # SQL execution logic here
        print(f"Saving {user} to Postgres")

# Core Service
class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo
        
    def create_user(self, name: str) -> User:
        user = User(id=1, name=name)
        self.repo.save(user)
        return user
```

## 3. Event-Driven Architecture
Using message brokers (Kafka, RabbitMQ) or task queues (Celery) to decouple services.

### Celery Task Example
```python
from celery import Celery

app = Celery('tasks', broker='redis://localhost:6379/0')

@app.task
def process_payment(order_id: int):
    # Process payment asynchronously
    pass
```

## 4. CQRS (Command Query Responsibility Segregation)
Separating read and write models to optimize performance and scale independently.

- **Command:** Mutates state (Create, Update, Delete). Often asynchronous.
- **Query:** Returns state. Often highly optimized reads from a denormalized database or cache.

```python
# Command Model
class CreateOrderCommand:
    def execute(self, data):
        # Write to primary PostgreSQL DB
        pass

# Query Model
class GetOrderSummaryQuery:
    def execute(self, order_id):
        # Read from Redis cache or ElasticSearch
        pass
```

## 5. Majestic Monolith vs Microservices

### Majestic Monolith
- Single repository, single deployment unit.
- Simpler ops, easier refactoring, less network latency.
- Modularize via domain boundaries (modular monolith).

### Microservices
- Multiple independent deployment units.
- Independent scaling, polyglot persistence.
- Higher operational complexity, distributed tracing required.

**Decision Matrix:**
1. Start with a Modular Monolith.
2. Break out microservices only when independent scaling or organizational scaling (multiple teams) demands it.
