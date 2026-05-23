# Flask Extensions Guide

## Flask-SQLAlchemy
```python
# app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()

# app/models/order.py
from app.extensions import db
from datetime import datetime, timezone

class Order(db.Model):
  __tablename__ = "orders"

  id = db.Column(db.Integer, primary_key=True)
  customer_id = db.Column(db.String(100), nullable=False)
  status = db.Column(db.String(20), default="pending")
  total_amount = db.Column(db.Numeric(10, 2), default=0)
  created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

  items = db.relationship("OrderItem", backref="order", lazy="dynamic")

  def to_dict(self):
    return {
      "id": self.id,
      "customer_id": self.customer_id,
      "status": self.status,
      "total_amount": float(self.total_amount),
      "created_at": self.created_at.isoformat() if self.created_at else None,
    }
```

## Flask-Migrate (Alembic)
```bash
flask db init
flask db migrate -m "Create orders table"
flask db upgrade
flask db downgrade
```

## Flask-CORS
```python
from flask_cors import CORS

cors.init_app(app, resources={
  r"/api/*": {"origins": ["http://localhost:3000", "https://app.example.com"]}
})
```

## Flask-Login (Auth)
```python
from flask_login import LoginManager, UserMixin, login_required, current_user

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "auth.login"

class User(UserMixin, db.Model):
  id = db.Column(db.Integer, primary_key=True)
  email = db.Column(db.String(120), unique=True, nullable=False)

@login_manager.user_loader
def load_user(user_id):
  return User.query.get(int(user_id))
```

## Flask-Mail
```python
from flask_mail import Mail, Message

mail = Mail(app)

@app.route("/send-confirmation/<order_id>")
def send_confirmation(order_id):
  msg = Message("Order Confirmed", recipients=["customer@example.com"])
  msg.body = f"Your order {order_id} has been confirmed."
  mail.send(msg)
  return "Sent"
```

## Flask-Caching
```python
from flask_caching import Cache

cache = Cache(app, config={"CACHE_TYPE": "RedisCache", "CACHE_REDIS_URL": "redis://localhost:6379/0"})

@cache.cached(timeout=300)
def get_order_stats():
  return expensive_query()

@cache.cached(key_prefix="order_list")
def list_orders():
  return Order.query.all()
```

## Blueprint Extension Pattern
```python
class ExtensionBlueprint:
  def __init__(self, app=None):
    if app is not None:
      self.init_app(app)

  def init_app(self, app):
    app.extensions["my_extension"] = self
    if not hasattr(app, "extensions"):
      app.extensions = {}
```
