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
```

### Step 2: Project Structure
```
project/
├── app/
│   ├── __init__.py
│   ├── extensions.py
│   ├── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── order.py
│   ├── blueprints/
│   │   ├── orders/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── schemas.py
│   │   ├── products/
│   │   │   ├── __init__.py
│   │   │   └── routes.py
│   │   └── health/
│   │       ├── __init__.py
│   │       └── routes.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── order_service.py
│   └── utils/
│       ├── __init__.py
│       └── errors.py
├── migrations/
├── tests/
│   ├── conftest.py
│   ├── test_orders.py
│   └── test_health.py
├── .env
├── requirements.txt
└── wsgi.py
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

def register_blueprints(app: Flask) -> None:
  from app.blueprints.health.routes import health_bp
  from app.blueprints.orders.routes import orders_bp
  app.register_blueprint(health_bp)
  app.register_blueprint(orders_bp, url_prefix="/api/orders")
```

### Step 4: Blueprint Pattern
```python
# app/blueprints/orders/routes.py
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from app.services.order_service import OrderService
from app.blueprints.orders.schemas import CreateOrderSchema

orders_bp = Blueprint("orders", __name__)

@orders_bp.route("", methods=["POST"])
def create_order():
  data = request.get_json()
  try:
    schema = CreateOrderSchema(**data)
  except ValidationError as e:
    return jsonify(error=e.errors()), 400

  order = OrderService.create(schema.model_dump())
  return jsonify(order.to_dict()), 201

@orders_bp.route("/<uuid:order_id>", methods=["GET"])
def get_order(order_id):
  order = OrderService.get_by_id(str(order_id))
  if not order:
    return jsonify(error="Order not found"), 404
  return jsonify(order.to_dict())
```

### Step 5: Error Handling
```python
# app/utils/errors.py
class AppError(Exception):
  def __init__(self, message: str, status_code: int = 400, code: str = "APP_ERROR"):
    self.message = message
    self.status_code = status_code
    self.code = code

def register_error_handlers(app):
  @app.errorhandler(AppError)
  def handle_app_error(error):
    return jsonify(code=error.code, message=error.message), error.status_code

  @app.errorhandler(404)
  def not_found(error):
    return jsonify(code="NOT_FOUND", message="Resource not found"), 404

  @app.errorhandler(500)
  def internal_error(error):
    return jsonify(code="INTERNAL", message="Unexpected error"), 500
```

## Rules
- Application factory for every project — never create Flask() at module level.
- Blueprints for all route grouping — never free-floating @app.route.
- Extensions initialized via init_app pattern for testability.
- Config from class hierarchy (Config, DevConfig, ProdConfig) + env override.
- Pydantic for request validation — never manual dict parsing.
- pytest fixtures for app and client — never global app instance.

## References
  - references/flask-blueprints-factories.md — Flask Blueprints and Application Factories
  - references/flask-deployment.md — Flask Deployment
  - references/flask-extensions.md — Flask Extensions
  - references/flask-security.md — Flask Security Reference
  - references/flask-setup.md — Flask Setup Guide
  - references/flask-testing.md — Flask Testing Reference
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
