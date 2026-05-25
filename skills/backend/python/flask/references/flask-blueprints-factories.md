# Flask Blueprints and Application Factories

## Application Factory Pattern

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(f"app.config.{config_name.capitalize()}Config")

    db.init_app(app)
    migrate.init_app(app, db)

    from app.blueprints.health import health_bp
    from app.blueprints.orders import orders_bp
    from app.blueprints.products import products_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(products_bp, url_prefix="/api/products")

    from app.utils.errors import register_error_handlers
    register_error_handlers(app)

    return app
```

## Blueprint Structure

| Directory | Purpose |
|-----------|---------|
| blueprints/orders/__init__.py | Blueprint creation |
| blueprints/orders/routes.py | Route definitions |
| blueprints/orders/schemas.py | Pydantic schemas |
| blueprints/orders/services.py | Business logic |
| blueprints/orders/models.py | SQLAlchemy models |
| blueprints/orders/templates/ | Jinja2 templates |

### Blueprint Definition
```python
# app/blueprints/orders/__init__.py
from flask import Blueprint

orders_bp = Blueprint(
    "orders",
    __name__,
    template_folder="templates",
    static_folder="static",
    url_prefix="/orders",
)

from app.blueprints.orders import routes  # noqa
```

### Route with Validation
```python
# app/blueprints/orders/routes.py
from pydantic import ValidationError
from app.blueprints.orders import orders_bp
from app.blueprints.orders.schemas import CreateOrderSchema
from app.blueprints.orders.services import OrderService

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

## Flask-SQLAlchemy

```python
# app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

# app/models/order.py
from app.extensions import db
from uuid import uuid4

class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    customer_id = db.Column(db.String(36), nullable=False)
    status = db.Column(db.String(20), default="pending")
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    items = db.relationship("OrderItem", backref="order", lazy="dynamic")

class OrderItem(db.Model):
    __tablename__ = "order_items"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=False)
    sku = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
```

## Configuration Pattern

```python
# app/config.py
import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///dev.db")

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
```
