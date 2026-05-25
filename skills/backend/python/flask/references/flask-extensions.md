# Flask Extensions

## Extension Initialization Pattern

```python
# app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_caching import Cache
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
cache = Cache()
cors = CORS()

# app/__init__.py
def create_app(config_object="app.config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_object)

    # init_app pattern — extensions are testable
    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app)
    cors.init_app(app)

    register_blueprints(app)
    return app
```

## Common Extensions

| Extension | Purpose | Installation |
|-----------|---------|------------|
| **Flask-SQLAlchemy** | ORM | `pip install flask-sqlalchemy` |
| **Flask-Migrate** | Alembic migrations | `pip install flask-migrate` |
| **Flask-Caching** | Cache backends | `pip install flask-caching` |
| **Flask-CORS** | CORS headers | `pip install flask-cors` |
| **Flask-Login** | User sessions | `pip install flask-login` |
| **Flask-Mail** | Email sending | `pip install flask-mail` |
| **Flask-Limiter** | Rate limiting | `pip install flask-limiter` |
| **Flask-HTTPAuth** | HTTP auth | `pip install flask-httpauth` |
| **Flask-Admin** | Admin interface | `pip install flask-admin` |
| **Flask-RESTx** | REST + Swagger | `pip install flask-restx` |
| **Flask-Talisman** | Security headers | `pip install flask-talisman` |
| **Flask-SocketIO** | WebSocket | `pip install flask-socketio` |

## SQLAlchemy Models

```python
# app/models/order.py
from app.extensions import db
from datetime import datetime, timezone
import uuid

class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))

    items = db.relationship("OrderItem", backref="order", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "status": self.status,
            "total_amount": float(self.total_amount),
            "created_at": self.created_at.isoformat(),
        }

class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=False)
    sku = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
```

## CLI Commands

```python
# app/cli.py
import click
from flask.cli import with_appcontext

@click.command("seed-db")
@with_appcontext
def seed_db_command():
    from app.models.order import Order
    from app.extensions import db

    order = Order(customer_id="seed-cust", status="pending", total_amount=99.99)
    db.session.add(order)
    db.session.commit()
    click.echo(f"Seeded order {order.id}")

# app/__init__.py
def register_cli_commands(app):
    app.cli.add_command(seed_db_command)
```

## Custom Extension Pattern

```python
# app/extensions/logger.py
import logging
from flask import current_app, g

class LoggerExtension:
    def __init__(self, app=None):
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        if not hasattr(app, "extensions"):
            app.extensions = {}
        app.extensions["logger"] = self

        @app.before_request
        def setup_logging():
            g.request_id = str(uuid.uuid4())

    def get_logger(self, name):
        return logging.getLogger(f"app.{name}")
```

## Extension Selection Guide

| Need | Recommended Extension |
|------|----------------------|
| ORM | Flask-SQLAlchemy |
| Migrations | Flask-Migrate |
| Caching | Flask-Caching (Redis) |
| Auth | Flask-Login + Flask-HTTPAuth |
| Rate limiting | Flask-Limiter |
| API docs | Flask-RESTx or Flasgger |
| Background tasks | Flask-SocketIO or Celery |
| File uploads | Flask-Uploads |
