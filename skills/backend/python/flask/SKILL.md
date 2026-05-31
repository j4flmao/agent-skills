---
name: flask-backend
description: >
  Use this skill when building Flask backend applications — lightweight, extensions, blueprints, Jinja2 templates, SQLAlchemy ORM. This skill enforces: blueprint-based modularization, proper application factory pattern, extension initialization, request context management. Do NOT use for: Django projects, FastAPI applications, Tornado async servers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, python, phase-4]
---

# Flask Backend

## Purpose
Define Flask backend application architecture: lightweight server setup, blueprint organization, extension integration, and WSGI deployment.

## Agent Protocol

### Trigger
User request includes: `flask`, `flask backend`, `flask blueprint`, `flask app factory`, `flask sqlalchemy`, `flask extension`, `flask rest api`, `python flask`.

### Input Context
- Python version (3.10+)
- Flask version (3.x)
- Database ORM (SQLAlchemy, Peewee)
- API style (REST, Flask-RESTx)
- Template engine (Jinja2, none for SPA)
- Deployment (Gunicorn, uWSGI, serverless)

### Output Artifact
A markdown document containing:
- Project structure
- Application factory pattern
- Blueprint organization
- Extension initialization pattern
- Error handling (app.errorhandler)
- Configuration management
- Testing (pytest, app.test_client)
- CLI commands (click integration)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Application factory creates configurable app instances
- Blueprints group related routes and templates
- Extensions initialized via init_app pattern
- Error handlers registered at app level
- Tests use app.test_client fixture

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
pip install flask flask-sqlalchemy flask-migrate pydantic
pip install pytest pytest-cov  # dev
pip install gunicorn  # production
pip install flask-cors flask-limiter redis  # optional
```

### Step 2: Project Structure
```
project/
+-- app/
|   +-- __init__.py
|   +-- extensions.py
|   +-- config.py
|   +-- models/
|   |   +-- __init__.py
|   |   +-- order.py
|   |   +-- user.py
|   +-- blueprints/
|   |   +-- orders/
|   |   |   +-- __init__.py
|   |   |   +-- routes.py
|   |   |   +-- schemas.py
|   |   |   +-- service.py
|   |   +-- products/
|   |   |   +-- __init__.py
|   |   |   +-- routes.py
|   |   |   +-- service.py
|   |   +-- auth/
|   |   |   +-- __init__.py
|   |   |   +-- routes.py
|   |   |   +-- service.py
|   |   +-- health/
|   |       +-- __init__.py
|   |       +-- routes.py
|   +-- services/
|   |   +-- __init__.py
|   |   +-- order_service.py
|   |   +-- payment_service.py
|   +-- utils/
|   |   +-- __init__.py
|   |   +-- errors.py
|   |   +-- pagination.py
|   |   +-- decorators.py
|   +-- templates/
|       +-- base.html
|       +-- orders/
|           +-- list.html
|           +-- detail.html
+-- migrations/
+-- tests/
|   +-- conftest.py
|   +-- test_orders.py
|   +-- test_health.py
|   +-- factories.py
+-- .env
+-- .flaskenv
+-- requirements.txt
+-- wsgi.py
+-- Dockerfile
```

### Step 3: Application Factory
```python
# app/__init__.py
from flask import Flask

def create_app(config_object="app.config.Config") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)
    app.config.from_prefixed_env()

    register_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)
    register_cli_commands(app)

    return app

def register_extensions(app: Flask) -> None:
    from app.extensions import db, migrate
    db.init_app(app)
    migrate.init_app(app, db)
    if app.config.get("SQLALCHEMY_DATABASE_URI"):
        import flask_cors
        flask_cors.CORS(app)

def register_blueprints(app: Flask) -> None:
    from app.blueprints.health.routes import health_bp
    from app.blueprints.orders.routes import orders_bp
    from app.blueprints.auth.routes import auth_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

def register_error_handlers(app: Flask) -> None:
    from app.utils.errors import register_error_handlers as _register
    _register(app)

def register_cli_commands(app: Flask) -> None:
    import click

    @app.cli.command("seed-db")
    def seed_db():
        """Seed database with sample data."""
        click.echo("Seeding database...")
```

### Step 4: Configuration Classes
```python
# app/config.py
import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///" + os.path.join(basedir, "..", "dev.db")
    )

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
```

### Step 5: Blueprint Pattern with Service Layer
```python
# app/blueprints/orders/routes.py
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from app.services.order_service import OrderService
from app.blueprints.orders.schemas import CreateOrderSchema, OrderResponseSchema
from app.utils.decorators import require_auth

orders_bp = Blueprint("orders", __name__)
order_service = OrderService()

@orders_bp.route("", methods=["POST"])
@require_auth
def create_order():
    data = request.get_json()
    try:
        schema = CreateOrderSchema(**data)
    except ValidationError as e:
        return jsonify(error=e.errors()), 400

    order = order_service.create(schema.model_dump())
    response = OrderResponseSchema.model_validate(order).model_dump()
    return jsonify(response), 201

@orders_bp.route("", methods=["GET"])
@require_auth
def list_orders():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    orders, total = order_service.list_paginated(page=page, per_page=per_page)
    items = [OrderResponseSchema.model_validate(o).model_dump() for o in orders]
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})

@orders_bp.route("/<uuid:order_id>", methods=["GET"])
@require_auth
def get_order(order_id):
    order = order_service.get_by_id(str(order_id))
    if not order:
        return jsonify(error="Order not found"), 404
    response = OrderResponseSchema.model_validate(order).model_dump()
    return jsonify(response)

@orders_bp.route("/<uuid:order_id>", methods=["DELETE"])
@require_auth
def delete_order(order_id):
    order_service.delete(str(order_id))
    return "", 204
```

### Step 6: Service Layer
```python
# app/services/order_service.py
from app.extensions import db
from app.models.order import Order
from typing import Optional

class OrderService:
    def create(self, data: dict) -> Order:
        order = Order(**data)
        db.session.add(order)
        db.session.commit()
        return order

    def get_by_id(self, order_id: str) -> Optional[Order]:
        return Order.query.get(order_id)

    def list_paginated(self, page: int = 1, per_page: int = 20):
        pagination = Order.query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        return pagination.items, pagination.total

    def update(self, order_id: str, data: dict) -> Optional[Order]:
        order = self.get_by_id(order_id)
        if not order:
            return None
        for key, value in data.items():
            setattr(order, key, value)
        db.session.commit()
        return order

    def delete(self, order_id: str) -> bool:
        order = self.get_by_id(order_id)
        if not order:
            return False
        db.session.delete(order)
        db.session.commit()
        return True
```

### Step 7: Pydantic Schemas
```python
# app/blueprints/orders/schemas.py
from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime

class OrderItemSchema(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(gt=0)

class CreateOrderSchema(BaseModel):
    customer_id: str = Field(min_length=1)
    items: List[OrderItemSchema] = Field(min_length=1)
    coupon_code: Optional[str] = None

class OrderResponseSchema(BaseModel):
    id: str
    customer_id: str
    status: str
    total_amount: float
    created_at: datetime

    model_config = {"from_attributes": True}
```

### Step 8: Error Handling
```python
# app/utils/errors.py
from flask import jsonify

class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "APP_ERROR"):
        self.message = message
        self.status_code = status_code
        self.code = code

def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(error):
        return jsonify(code=error.code, message=error.message), error.status_code

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify(code="BAD_REQUEST", message="Invalid request"), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify(code="UNAUTHORIZED", message="Authentication required"), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify(code="FORBIDDEN", message="Access denied"), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(code="NOT_FOUND", message="Resource not found"), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify(code="METHOD_NOT_ALLOWED", message="Method not allowed"), 405

    @app.errorhandler(422)
    def unprocessable(error):
        return jsonify(code="UNPROCESSABLE", message="Unprocessable entity"), 422

    @app.errorhandler(429)
    def too_many_requests(error):
        return jsonify(code="RATE_LIMITED", message="Too many requests"), 429

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify(code="INTERNAL", message="Unexpected error"), 500
```

### Step 9: Testing
```python
# tests/conftest.py
import pytest
from app import create_app
from app.config import TestingConfig

@pytest.fixture
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        from app.extensions import db
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    # Create user and get token
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    data = response.get_json()
    return {"Authorization": f"Bearer {data['access_token']}"}

# tests/test_orders.py
def test_create_order(client, auth_headers):
    response = client.post("/api/orders", json={
        "customer_id": "cust-1",
        "items": [{"product_id": "prod-1", "quantity": 2, "unit_price": 19.99}]
    }, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["customer_id"] == "cust-1"
    assert data["total_amount"] == 39.98

def test_get_nonexistent_order(client, auth_headers):
    response = client.get("/api/orders/nonexistent-id", headers=auth_headers)
    assert response.status_code == 404
```

## Architecture Decision Trees

### Blueprint Organization
```
Domain features > 5?
  +-- Yes -> One blueprint per bounded context (orders, users, payments)
  +-- No  -> One blueprint for all routes, but still use blueprint() for testability
```

### Database ORM
```
Need async performance?
  +-- Yes -> SQLAlchemy 2.0 async with asyncio. Flask async support experimental.
  +-- No  -> Need migration support?
      +-- Yes -> SQLAlchemy + Alembic (flask-migrate)
      +-- No  -> Peewee (simpler, less boilerplate)
```

### Template vs SPA
```
Server-rendered HTML?
  +-- Yes -> Jinja2 templates with layout inheritance, macros
  +-- No  -> Flask as pure JSON API, SPA handles rendering
```

## Common Pitfalls

1. **Global flask app instance**: Creating `app = Flask(__name__)` at module level prevents multiple app instances for testing. Always use application factory.

2. **Circular imports with db and models**: Defining `db` in models and importing models in extensions creates cycles. Solution: `extensions.py` for db, models import db.

3. **Request context outside of request**: Accessing `request`, `g`, `current_app` outside of request context raises RuntimeError. Push context explicitly for background tasks.

4. **Session per request not configured correctly**: Flask-SQLAlchemy session scoped to request by default. Manual session management needed for background thread work.

5. **Not closing database connections**: Flask-SQLAlchemy handles this, but raw connections from `psycopg2` or direct engine usage must be closed.

6. **Storing secrets in config files**: Environment variables for secrets. Use `.env` with python-dotenv. Never commit secrets.

7. **No CORS configuration for API**: API consumed by browser-based SPA needs `flask-cors` with proper origin whitelist.

8. **Overusing before_request**: Complex logic in `@app.before_request` makes testing difficult. Extract into middleware or decorators.

9. **Blueprint with duplicate endpoint names**: Endpoint names must be unique across blueprints. Use blueprint name prefix.

10. **JSON serialization errors**: Custom types (UUID, datetime) not JSON serializable. Override `json.JSONEncoder` or use `model_dump()` with Pydantic.

## Best Practices

1. **Application factory for every project** — never create Flask() at module level.
2. **Blueprints for all route grouping** — never free-floating @app.route.
3. **Extensions initialized via init_app pattern** for testability.
4. **Config from class hierarchy (Config, DevConfig, ProdConfig)** + env override.
5. **Pydantic for request validation** — never manual dict parsing.
6. **pytest fixtures for app and client** — never global app instance.
7. **Service layer between routes and models** for business logic isolation.
8. **Type hints on all function signatures** for IDE support and static analysis.
9. **Alembic migrations for all schema changes**, never Flask.create_all() in production.
10. **Before/after request hooks for request-scoped concerns** (DB session, auth context).

## Compared With

| Feature | Flask | FastAPI | Django |
|---|---|---|---|
| Async support | Limited | Native | Limited (3.0+) |
| Performance | ~5k req/s | ~25k req/s | ~4k req/s |
| Built-in ORM | No (SQLAlchemy) | No (SQLAlchemy) | Yes (Django ORM) |
| Admin interface | No (Flask-Admin) | No | Built-in |
| Validation | Pydantic/Manual | Pydantic (built-in) | Django Forms/DRF |
| API documentation | No | OpenAPI (auto) | DRF (manual) |
| Template engine | Jinja2 (built-in) | Jinja2 | Django Templates |
| Learning curve | Low | Low | Moderate |
| Deployment | WSGI (Gunicorn) | ASGI (Uvicorn) | WSGI/ASGI |
| Extensions | 1000+ | Growing | Batteries-included |

## Performance

- Flask handles ~5,000 req/s on basic hardware (single worker). Scale with Gunicorn workers (2-4 x CPU cores).
- SQLAlchemy connection pooling: configure `SQLALCHEMY_ENGINE_OPTIONS` with pool_size and max_overflow.
- Jinja2 template caching: `app.jinja_env.auto_reload = False` in production.
- Response compression: Add Flask-Compress for gzip/brotli.
- Redis caching with Flask-Caching for expensive queries.
- Database query optimization: eager loading with `joinedload()`, indexing on foreign keys.
- Gunicorn with gevent workers for I/O-bound workloads.

## Tooling

| Tool | Purpose |
|---|---|
| **Flask-SQLAlchemy** | ORM integration |
| **Flask-Migrate (Alembic)** | Database migrations |
| **Pydantic** | Request/response validation |
| **Flask-CORS** | Cross-origin requests |
| **Flask-Limiter** | Rate limiting |
| **Pytest** | Testing framework |
| **Black** | Code formatting |
| **Ruff** | Linting (replaces Flake8) |
| **Mypy** | Type checking |
| **Gunicorn** | Production WSGI server |
| **Docker** | Containerization |
| **Poetry / pip-tools** | Dependency management |
| **Flask-DebugToolbar** | Development debugging |

## Rules

- Application factory for every project — never create Flask() at module level.
- Blueprints for all route grouping — never free-floating @app.route.
- Extensions initialized via init_app pattern for testability.
- Config from class hierarchy (Config, DevConfig, ProdConfig) + env override.
- Pydantic for request validation — never manual dict parsing.
- pytest fixtures for app and client — never global app instance.
- Alembic migrations for schema changes — never create_all in production.
- Service layer isolates business logic from route handlers.
- Error handlers registered at app level for consistent error responses.
- Type hints required on all public function signatures.
- CORS configured explicitly per environment, never wide open.
- Rate limiting on authentication endpoints to prevent brute force.

## References
  - references/flask-application-factory.md — Flask Application Factory Pattern
  - references/flask-restful-api-design.md — Flask RESTful API Design
  - references/flask-blueprints-factories.md — Flask Blueprints and Application Factories
  - references/flask-deployment.md — Flask Deployment
  - references/flask-extensions.md — Flask Extensions
  - references/flask-security.md — Flask Security Reference
  - references/flask-setup.md — Flask Setup Guide
  - references/flask-testing.md — Flask Testing Reference

## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
