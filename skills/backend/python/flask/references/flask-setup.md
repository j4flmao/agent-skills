# Flask Setup Guide

## Installation
```bash
pip install flask python-dotenv pydantic
pip install flask-sqlalchemy flask-migrate flask-cors
pip install gunicorn[gevent]     # production
pip install pytest pytest-cov     # testing
```

## Project Configuration
```python
# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
  SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
  SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///app.db")
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  JSON_SORT_KEYS = False

class DevConfig(Config):
  DEBUG = True

class ProdConfig(Config):
  DEBUG = False
  SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
```

## Application Factory
```python
# app/__init__.py
from flask import Flask
from .extensions import db, migrate, cors
from .config import Config

def create_app(config_object=None):
  app = Flask(__name__)
  app.config.from_object(config_object or Config)

  db.init_app(app)
  migrate.init_app(app, db)
  cors.init_app(app)

  from .blueprints.health.routes import health_bp
  from .blueprints.orders.routes import orders_bp

  app.register_blueprint(health_bp)
  app.register_blueprint(orders_bp, url_prefix="/api/orders")

  register_error_handlers(app)

  return app
```

## WSGI Entry
```python
# wsgi.py
from app import create_app

app = create_app()

if __name__ == "__main__":
  app.run()
```

## CLI Commands
```python
# app/cli.py
import click
from flask.cli import with_appcontext

@click.command("seed-db")
@with_appcontext
def seed_db_command():
  from app.models import Order
  db.session.add(Order(customer_id="cust-1", status="pending"))
  db.session.commit()
  click.echo("Seeded database")

def register_cli_commands(app):
  app.cli.add_command(seed_db_command)
```

## Running
```bash
# Development
flask run --port 8080

# Production
gunicorn wsgi:app -w 4 -b 0.0.0.0:8080

# With environment
FLASK_ENV=production DATABASE_URL=postgres://... gunicorn wsgi:app
```

## Blueprint Structure
```python
# app/blueprints/orders/routes.py
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from .schemas import CreateOrderSchema
from app.services.order_service import OrderService

orders_bp = Blueprint("orders", __name__)

@orders_bp.route("", methods=["GET"])
def list_orders():
  page = request.args.get("page", 1, type=int)
  orders = OrderService.list(page=page)
  return jsonify([o.to_dict() for o in orders])

@orders_bp.route("/<int:order_id>", methods=["GET"])
def get_order(order_id):
  order = OrderService.get_by_id(order_id)
  if not order:
    return jsonify(error="Order not found"), 404
  return jsonify(order.to_dict())
```

## Testing Setup
```python
# tests/conftest.py
import pytest
from app import create_app
from app.config import Config

class TestConfig(Config):
  TESTING = True
  SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

@pytest.fixture
def app():
  app = create_app(TestConfig)
  with app.app_context():
    db.create_all()
    yield app
    db.drop_all()

@pytest.fixture
def client(app):
  return app.test_client()
```
