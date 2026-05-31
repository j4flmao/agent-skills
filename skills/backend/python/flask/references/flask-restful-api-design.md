# Flask RESTful API Design Reference

## Overview

Comprehensive reference for designing RESTful APIs with Flask: resource modeling, request/response patterns, pagination, filtering, versioning, hypermedia, and documentation.

## Table of Contents

1. API Design Principles
2. Resource Modeling
3. Request Validation
4. Response Formatting
5. Pagination
6. Filtering and Sorting
7. Error Responses
8. API Versioning
9. Hypermedia (HATEOAS)
10. Rate Limiting
11. Authentication
12. API Documentation
13. Testing APIs
14. Performance

---

## 1. API Design Principles

### REST Constraints

```python
# 1. Client-Server Separation
# 2. Stateless (no client context on server)
# 3. Cacheable (responses mark as cacheable or not)
# 4. Uniform Interface (consistent resource naming)
# 5. Layered System (proxies, gateways)
# 6. Code on Demand (optional)
```

### URL Conventions

```
# Resources are nouns, not verbs
GET    /api/orders          # List orders
POST   /api/orders          # Create order
GET    /api/orders/:id      # Get order
PUT    /api/orders/:id      # Update order
PATCH  /api/orders/:id      # Partial update
DELETE /api/orders/:id      # Delete order

# Sub-resources
GET    /api/orders/:id/items      # List order items
POST   /api/orders/:id/items      # Add order item

# Actions (when no CRUD fits)
POST   /api/orders/:id/cancel     # Cancel order
POST   /api/orders/:id/refund     # Refund order

# Not verbs
GET /api/getOrders        # Bad
POST /api/createOrder     # Bad
GET /api/orders/delete/1  # Bad
```

### HTTP Methods

| Method | CRUD | Idempotent | Safe |
|---|---|---|---|
| GET | Read | Yes | Yes |
| POST | Create | No | No |
| PUT | Replace | Yes | No |
| PATCH | Partial Update | No | No |
| DELETE | Delete | Yes | No |

---

## 2. Resource Modeling

### Resource Representation

```python
# app/blueprints/orders/schemas.py
from pydantic import BaseModel, Field, UUID4
from typing import List, Optional
from datetime import datetime


class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    name: str
    quantity: int
    unit_price: float
    subtotal: float

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    status: str
    items: List[OrderItemResponse]
    total_amount: float
    currency: str = "USD"
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CreateOrderRequest(BaseModel):
    customer_id: str = Field(min_length=1, description="Customer identifier")
    items: List[CreateOrderItem] = Field(min_length=1, description="Order items")
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    coupon_code: Optional[str] = None
    notes: Optional[str] = None


class CreateOrderItem(BaseModel):
    product_id: str = Field(min_length=1)
    quantity: int = Field(ge=1, le=100)
    unit_price: float = Field(gt=0)
```

### Resource Controller

```python
# app/blueprints/orders/routes.py
from flask import Blueprint, request, jsonify, url_for
from pydantic import ValidationError
from app.services.order_service import OrderService
from app.blueprints.orders.schemas import (
    CreateOrderRequest,
    OrderResponse,
    OrderItemResponse,
)
from app.utils.pagination import paginate

orders_bp = Blueprint("orders", __name__)
service = OrderService()


@orders_bp.route("", methods=["POST"])
def create_order():
    """Create a new order."""
    try:
        schema = CreateOrderRequest(**request.get_json())
    except ValidationError as e:
        return jsonify({
            "code": "VALIDATION_ERROR",
            "message": "Invalid request data",
            "errors": e.errors(),
        }), 422

    order = service.create(schema.model_dump())
    response = OrderResponse.model_validate(order).model_dump()

    return jsonify(response), 201, {
        "Location": url_for("orders.get_order", order_id=order.id, _external=True),
    }


@orders_bp.route("", methods=["GET"])
def list_orders():
    """List orders with pagination and filtering."""
    query_params = {
        "page": request.args.get("page", 1, type=int),
        "per_page": request.args.get("per_page", 20, type=int),
        "status": request.args.get("status"),
        "customer_id": request.args.get("customer_id"),
        "sort_by": request.args.get("sort_by", "created_at"),
        "sort_order": request.args.get("sort_order", "desc"),
    }

    orders, total = service.list_paginated(**query_params)
    items = [OrderResponse.model_validate(o).model_dump() for o in orders]

    return jsonify(paginate(items, total, query_params["page"], query_params["per_page"]))


@orders_bp.route("/<uuid:order_id>", methods=["GET"])
def get_order(order_id):
    """Get order by ID."""
    order = service.get_by_id(str(order_id))
    if not order:
        return jsonify({
            "code": "NOT_FOUND",
            "message": f"Order {order_id} not found",
        }), 404

    response = OrderResponse.model_validate(order).model_dump()
    return jsonify(response)


@orders_bp.route("/<uuid:order_id>", methods=["DELETE"])
def delete_order(order_id):
    """Delete an order."""
    if not service.delete(str(order_id)):
        return jsonify({
            "code": "NOT_FOUND",
            "message": f"Order {order_id} not found",
        }), 404

    return "", 204


@orders_bp.route("/<uuid:order_id>/cancel", methods=["POST"])
def cancel_order(order_id):
    """Cancel an order (custom action)."""
    try:
        order = service.cancel(str(order_id))
        response = OrderResponse.model_validate(order).model_dump()
        return jsonify(response)
    except ValueError as e:
        return jsonify({
            "code": "INVALID_STATE",
            "message": str(e),
        }), 409
```

---

## 3. Request Validation

### Pydantic Validation

```python
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from decimal import Decimal


class UpdateOrderRequest(BaseModel):
    """Request model for updating an order."""
    status: Optional[str] = Field(None, pattern=r"^(pending|confirmed|shipped|cancelled)$")
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("status")
    def validate_status_transition(cls, v, info):
        if v == "cancelled" and info.data.get("reason") is None:
            raise ValueError("Cancellation requires a reason")
        return v

    @model_validator(mode="after")
    def validate_at_least_one_field(self):
        if not any([self.status, self.notes]):
            raise ValueError("At least one field must be provided")
        return self


class BatchOrderRequest(BaseModel):
    order_ids: List[str] = Field(min_length=1, max_length=100)
    action: str = Field(pattern=r"^(cancel|refund|archive)$")

    @field_validator("order_ids")
    def validate_uuids(cls, v):
        import uuid
        for order_id in v:
            uuid.UUID(order_id)
        return v
```

### Manual Validation (Alternative)

```python
def validate_order_data(data: dict) -> tuple[Optional[dict], Optional[tuple]]:
    """Validate order request data manually."""
    errors = []

    # Required fields
    customer_id = data.get("customer_id")
    if not customer_id or not isinstance(customer_id, str):
        errors.append({"field": "customer_id", "message": "Required string"})
    elif len(customer_id) < 1:
        errors.append({"field": "customer_id", "message": "Must not be empty"})

    items = data.get("items", [])
    if not items or not isinstance(items, list):
        errors.append({"field": "items", "message": "Required non-empty array"})
    else:
        for i, item in enumerate(items):
            if not item.get("product_id"):
                errors.append({"field": f"items[{i}].product_id", "message": "Required"})
            qty = item.get("quantity", 0)
            if not isinstance(qty, int) or qty < 1:
                errors.append({"field": f"items[{i}].quantity", "message": "Must be positive integer"})

    if errors:
        return None, ({"code": "VALIDATION_ERROR", "errors": errors}, 422)

    return data, None
```

---

## 4. Response Formatting

### Consistent Envelope

```python
# app/utils/response.py
from typing import Any, Optional
from flask import jsonify


def success_response(data: Any, status_code: int = 200, meta: dict = None) -> tuple:
    """Standard success response."""
    response = {"success": True, "data": data}
    if meta:
        response["meta"] = meta
    return jsonify(response), status_code


def error_response(
    code: str,
    message: str,
    status_code: int = 400,
    details: Any = None,
) -> tuple:
    """Standard error response."""
    response = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details:
        response["error"]["details"] = details
    return jsonify(response), status_code


def created_response(data: Any, location: str = None) -> tuple:
    """Created resource response."""
    response = jsonify({"success": True, "data": data})
    if location:
        response.headers["Location"] = location
    return response, 201


def no_content_response() -> tuple:
    """Empty response for DELETE operations."""
    return "", 204


# Usage in routes
@orders_bp.route("", methods=["POST"])
def create_order():
    order = service.create(data)
    return created_response(
        OrderResponse.model_validate(order).model_dump(),
        location=url_for("orders.get_order", order_id=order.id, _external=True),
    )


@orders_bp.route("/<uuid:order_id>", methods=["DELETE"])
def delete_order(order_id):
    service.delete(str(order_id))
    return no_content_response()
```

### JSON Encoding Customization

```python
# app/__init__.py
from flask import Flask
from datetime import datetime, date, time
from decimal import Decimal
import uuid


class CustomJSONEncoder(Flask.json_encoder):
    """Custom JSON encoder for Flask."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, time):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, bytes):
            return obj.decode("utf-8")
        return super().default(obj)


def create_app():
    app = Flask(__name__)
    app.json_encoder = CustomJSONEncoder
    return app
```

---

## 5. Pagination

### Pagination Utility

```python
# app/utils/pagination.py
from typing import Any
from flask import url_for, request


def paginate(
    items: list[Any],
    total: int,
    page: int,
    per_page: int,
    endpoint: str = None,
) -> dict:
    """Create paginated response with HATEOAS links."""
    total_pages = max(1, (total + per_page - 1) // per_page)

    if endpoint is None:
        endpoint = request.endpoint

    def _link(p: int) -> str:
        args = request.args.copy()
        args["page"] = p
        args["per_page"] = per_page
        return url_for(endpoint, **args, _external=True)

    response = {
        "items": items,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
        "links": {
            "self": _link(page),
            "first": _link(1),
            "last": _link(total_pages),
            "prev": _link(page - 1) if page > 1 else None,
            "next": _link(page + 1) if page < total_pages else None,
        },
    }

    return response


# Usage
@orders_bp.route("", methods=["GET"])
def list_orders():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    orders, total = service.list_paginated(page=page, per_page=per_page)
    items = [OrderResponse.model_validate(o).model_dump() for o in orders]

    return jsonify(paginate(items, total, page, per_page))
```

### Cursor Pagination

```python
# app/utils/cursor_pagination.py
from typing import Any, Optional


def cursor_paginate(
    queryset: Any,
    cursor: Optional[str] = None,
    limit: int = 20,
    cursor_field: str = "created_at",
    direction: str = "desc",
) -> dict:
    """Cursor-based pagination for chronological data."""
    import base64
    import json

    def encode_cursor(value) -> str:
        return base64.urlsafe_b64encode(json.dumps(value).encode()).decode()

    def decode_cursor(value: str):
        return json.loads(base64.urlsafe_b64decode(value.encode()))

    items = []
    next_cursor = None

    if cursor:
        cursor_value = decode_cursor(cursor)
        # Apply cursor filter
        if direction == "desc":
            queryset = queryset.filter(
                getattr(getattr, cursor_field) < cursor_value
            ).order_by(getattr(getattr, cursor_field).desc())
        else:
            queryset = queryset.filter(
                getattr(getattr, cursor_field) > cursor_value
            ).order_by(getattr(getattr, cursor_field).asc())

    queryset = queryset.limit(limit + 1)
    items = list(queryset)

    has_more = len(items) > limit
    if has_more:
        items = items[:limit]
        last_item = items[-1]
        next_cursor = encode_cursor(getattr(last_item, cursor_field))

    return {
        "items": items,
        "cursor": {
            "next": next_cursor,
            "has_more": has_more,
        },
    }
```

---

## 6. Filtering and Sorting

### Query Parameter Filtering

```python
@orders_bp.route("", methods=["GET"])
def list_orders():
    # Build filter dict from query params
    filters = {}

    # Equality filters
    if status := request.args.get("status"):
        filters["status"] = status
    if customer_id := request.args.get("customer_id"):
        filters["customer_id"] = customer_id

    # Range filters
    if min_amount := request.args.get("min_amount", type=float):
        filters["total_amount__gte"] = min_amount
    if max_amount := request.args.get("max_amount", type=float):
        filters["total_amount__lte"] = max_amount

    # Date range filters
    if created_after := request.args.get("created_after"):
        filters["created_at__gte"] = created_after
    if created_before := request.args.get("created_before"):
        filters["created_at__lte"] = created_before

    # Search
    if q := request.args.get("q"):
        filters["search"] = q

    # Sorting
    sort_by = request.args.get("sort_by", "created_at")
    sort_order = request.args.get("sort_order", "desc")

    allowed_sort_fields = {"created_at", "total_amount", "status", "customer_id"}
    if sort_by not in allowed_sort_fields:
        return error_response("INVALID_SORT", f"Invalid sort field: {sort_by}", 400)

    orders, total = service.list_filtered(
        filters=filters, sort_by=sort_by, sort_order=sort_order,
        page=page, per_page=per_page,
    )

    return jsonify(paginate(items, total, page, per_page))
```

### Complex Query Builder

```python
# app/services/query_builder.py
from typing import Any
from sqlalchemy import and_, or_


class QueryBuilder:
    """Build SQLAlchemy queries from request parameters."""

    OPERATORS = {
        "eq": lambda f, v: f == v,
        "neq": lambda f, v: f != v,
        "gt": lambda f, v: f > v,
        "gte": lambda f, v: f >= v,
        "lt": lambda f, v: f < v,
        "lte": lambda f, v: f <= v,
        "in": lambda f, v: f.in_(v),
        "like": lambda f, v: f.like(f"%{v}%"),
        "ilike": lambda f, v: f.ilike(f"%{v}%"),
    }

    def __init__(self, model):
        self.model = model
        self.filters = []
        self.order = None

    def add_filter(self, field: str, op: str, value: Any):
        column = getattr(self.model, field, None)
        if column is None:
            raise ValueError(f"Unknown field: {field}")
        operator_fn = self.OPERATORS.get(op)
        if operator_fn is None:
            raise ValueError(f"Unknown operator: {op}")
        self.filters.append(operator_fn(column, value))
        return self

    def add_order(self, field: str, direction: str = "asc"):
        column = getattr(self.model, field, None)
        if column is None:
            raise ValueError(f"Unknown field: {field}")
        self.order = column.asc() if direction == "asc" else column.desc()
        return self

    def build(self):
        query = self.model.query
        if self.filters:
            query = query.filter(and_(*self.filters))
        if self.order:
            query = query.order_by(self.order)
        return query


# Usage
def list_filtered(filters: dict, sort_by: str, sort_order: str) -> list:
    builder = QueryBuilder(Order)

    for field, value in filters.items():
        if "__" in field:
            field, op = field.split("__", 1)
        else:
            op = "eq"
        builder.add_filter(field, op, value)

    builder.add_order(sort_by, sort_order)
    return builder.build().all()
```

---

## 7. Error Responses

### Standard Error Codes

```python
HTTP_ERRORS = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    410: "GONE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "UNPROCESSABLE_ENTITY",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
}
```

### Detailed Error Response

```python
# app/utils/errors.py
from flask import jsonify, current_app
from werkzeug.exceptions import HTTPException
import logging

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    """Register error handlers for REST API."""

    @app.errorhandler(422)
    def validation_error(error):
        """Handle validation errors."""
        response = {
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "errors": getattr(error, "data", {}).get("messages", []),
        }
        return jsonify(response), 422

    @app.errorhandler(429)
    def rate_limit_error(error):
        """Handle rate limit exceeded."""
        response = {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": "Too many requests. Please slow down.",
            "retry_after": getattr(error, "retry_after", 60),
        }
        return jsonify(response), 429

    @app.errorhandler(HTTPException)
    def http_error(error):
        """Handle HTTP exceptions."""
        code = HTTP_ERRORS.get(error.code, "UNKNOWN")
        response = {
            "code": code,
            "message": error.description or "An error occurred",
        }
        return jsonify(response), error.code

    @app.errorhandler(Exception)
    def unhandled_error(error):
        """Handle unexpected errors."""
        logger.exception("Unhandled exception")
        if current_app.debug:
            raise
        response = {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
        }
        return jsonify(response), 500
```

---

## 8. API Versioning

### URL-Based Versioning

```python
# Register versioned blueprints
def register_blueprints(app: Flask) -> None:
    from app.blueprints.v1 import orders_bp as orders_v1
    from app.blueprints.v2 import orders_bp as orders_v2

    app.register_blueprint(orders_v1, url_prefix="/api/v1/orders")
    app.register_blueprint(orders_v2, url_prefix="/api/v2/orders")


# v1 blueprint
# app/blueprints/v1/orders/routes.py
orders_bp = Blueprint("orders_v1", __name__)


@orders_bp.route("", methods=["GET"])
def list_orders():
    # v1: returns flat order list
    return jsonify({"orders": [...]})


# v2 blueprint
# app/blueprints/v2/orders/routes.py
orders_bp = Blueprint("orders_v2", __name__)


@orders_bp.route("", methods=["GET"])
def list_orders():
    # v2: returns paginated with metadata
    return jsonify({
        "items": [...],
        "meta": {"page": 1, "total": 100},
    })
```

### Version Router

```python
# app/versioning.py
from functools import wraps
from flask import request, jsonify


def api_version(min_version: str = None, max_version: str = None):
    """Decorator to restrict API version."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            version = request.headers.get("Accept-Version", "1.0")
            if min_version and version < min_version:
                return jsonify({
                    "code": "MIN_VERSION_REQUIRED",
                    "message": f"Minimum API version {min_version} required",
                }), 400
            if max_version and version > max_version:
                return jsonify({
                    "code": "VERSION_DEPRECATED",
                    "message": f"API version {version} is deprecated",
                }), 410
            return f(*args, **kwargs)
        return wrapper
    return decorator
```

---

## 9. Hypermedia (HATEOAS)

### Resource Links

```python
def order_to_resource(order) -> dict:
    """Convert order to hypermedia response."""
    base_url = url_for("orders.get_order", order_id=order.id, _external=True)

    response = {
        "id": order.id,
        "customer_id": order.customer_id,
        "status": order.status,
        "total_amount": order.total_amount,
        "created_at": order.created_at.isoformat(),
        "_links": {
            "self": {"href": base_url, "method": "GET"},
            "items": {"href": f"{base_url}/items", "method": "GET"},
            "cancel": {"href": f"{base_url}/cancel", "method": "POST"},
            "update": {"href": base_url, "method": "PUT"},
            "delete": {"href": base_url, "method": "DELETE"},
        },
    }

    # Conditional links based on state
    if order.status == "pending":
        response["_links"]["confirm"] = {
            "href": f"{base_url}/confirm",
            "method": "POST",
        }

    return response


@orders_bp.route("", methods=["GET"])
def list_orders():
    """List orders with hypermedia links."""
    orders, total = service.list_paginated(page=page, per_page=per_page)

    items = [order_to_resource(order) for order in orders]

    response = paginate(items, total, page, per_page)
    response["_links"]["create"] = {
        "href": url_for("orders.create_order", _external=True),
        "method": "POST",
    }

    return jsonify(response)
```

---

## 10. Rate Limiting

### Flask-Limiter Configuration

```python
# app/__init__.py
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])


def create_app():
    app = Flask(__name__)
    limiter.init_app(app)
    return app


# Route-level limits
@orders_bp.route("", methods=["GET"])
@limiter.limit("100 per minute")
def list_orders():
    return jsonify([])


@orders_bp.route("", methods=["POST"])
@limiter.limit("10 per minute")
def create_order():
    return jsonify({}), 201


# Per-user rate limiting
def get_user_key():
    from flask import g
    return f"user:{g.user.id}" if hasattr(g, "user") else get_remote_address()


user_limiter = Limiter(key_func=get_user_key)
user_limiter.limit("100 per minute")(orders_bp)
```

---

## 11. Authentication

### JWT Authentication

```python
# app/auth.py
from functools import wraps
from flask import request, jsonify, g
import jwt
from datetime import datetime, timedelta


def generate_token(user_id: str, secret: str, expiry_minutes: int = 15) -> str:
    """Generate JWT access token."""
    payload = {
        "sub": user_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=expiry_minutes),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid authorization header",
            }), 401

        token = auth_header.split(" ", 1)[1]

        try:
            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"],
            )
            g.current_user_id = payload["sub"]
        except jwt.ExpiredSignatureError:
            return jsonify({
                "code": "TOKEN_EXPIRED",
                "message": "Token has expired",
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "code": "INVALID_TOKEN",
                "message": "Invalid token",
            }), 401

        return f(*args, **kwargs)
    return decorated


# Usage
@orders_bp.route("", methods=["POST"])
@require_auth
def create_order():
    user_id = g.current_user_id
    # Create order for authenticated user
    return jsonify({}), 201
```

---

## 12. API Documentation

### Flask-RESTx (Swagger)

```python
from flask_restx import Api, Resource, fields

api = Api(
    title="Order API",
    version="1.0",
    description="Order management API",
    doc="/docs/",
)

order_model = api.model("Order", {
    "id": fields.String(required=True, description="Order identifier"),
    "customer_id": fields.String(required=True, description="Customer identifier"),
    "status": fields.String(required=True, enum=["pending", "confirmed", "cancelled"]),
    "total_amount": fields.Float(required=True),
    "created_at": fields.DateTime,
})

create_order_model = api.model("CreateOrder", {
    "customer_id": fields.String(required=True),
    "items": fields.List(fields.Nested(api.model("Item", {
        "product_id": fields.String(required=True),
        "quantity": fields.Integer(min=1),
        "unit_price": fields.Float(min=0),
    }))),
})


@api.route("/api/orders")
class OrderList(Resource):
    @api.marshal_list_with(order_model)
    @api.param("page", "Page number", type=int, default=1)
    def get(self):
        """List all orders."""
        return []

    @api.expect(create_order_model)
    @api.marshal_with(order_model, code=201)
    @api.response(400, "Validation error")
    def post(self):
        """Create a new order."""
        return {}, 201
```

---

## 13. Testing APIs

### API Test Patterns

```python
# tests/test_orders_api.py
import json


class TestOrdersAPI:
    """Test orders REST API endpoints."""

    def test_create_order_success(self, client):
        response = client.post(
            "/api/orders",
            json={
                "customer_id": "cust-1",
                "items": [
                    {"product_id": "prod-1", "quantity": 2, "unit_price": 19.99}
                ],
            },
        )
        assert response.status_code == 201
        assert response.headers.get("Location") is not None
        data = response.get_json()
        assert data["customer_id"] == "cust-1"
        assert data["total_amount"] == 39.98

    def test_create_order_validation(self, client):
        response = client.post(
            "/api/orders",
            json={"customer_id": ""},
        )
        assert response.status_code == 422
        data = response.get_json()
        assert data["code"] == "VALIDATION_ERROR"

    def test_list_orders_pagination(self, client):
        response = client.get("/api/orders?page=1&per_page=10")
        assert response.status_code == 200
        data = response.get_json()
        assert "items" in data
        assert "meta" in data
        assert "links" in data
        assert data["meta"]["page"] == 1

    def test_get_order_not_found(self, client):
        response = client.get("/api/orders/non-existent-id")
        assert response.status_code == 404
        data = response.get_json()
        assert data["code"] == "NOT_FOUND"

    def test_delete_order(self, client):
        response = client.delete("/api/orders/valid-id")
        assert response.status_code == 204

    def test_unauthorized_access(self, client):
        response = client.get("/api/protected-orders")
        assert response.status_code == 401
```

---

## 14. Performance

### Caching API Responses

```python
from flask_caching import Cache

cache = Cache()


@orders_bp.route("/<uuid:order_id>", methods=["GET"])
@cache.cached(timeout=60, query_string=True)
def get_order(order_id):
    order = service.get_by_id(str(order_id))
    if not order:
        return jsonify(code="NOT_FOUND", message="Order not found"), 404
    return jsonify(OrderResponse.model_validate(order).model_dump())


@orders_bp.route("", methods=["GET"])
@cache.cached(timeout=30, query_string=True)
def list_orders():
    # Expensive query
    return jsonify(paginate(items, total, page, per_page))


# Cache invalidation on write
@orders_bp.route("", methods=["POST"])
def create_order():
    order = service.create(data)
    cache.delete_memoized(list_orders)  # Invalidate list cache
    return jsonify(order_response), 201
```

### Response Compression

```python
from flask_compress import Compress

compress = Compress()

def create_app():
    app = Flask(__name__)
    app.config["COMPRESS_ALGORITHM"] = "gzip"
    app.config["COMPRESS_LEVEL"] = 6
    app.config["COMPRESS_MIN_SIZE"] = 500
    compress.init_app(app)
    return app
```

---

## References

- REST API Design: https://restfulapi.net/
- Microsoft REST API Guidelines: https://github.com/microsoft/api-guidelines
- JSON:API Specification: https://jsonapi.org/
- Flask RESTful: https://flask-restful.readthedocs.io/
- Flask-RESTx: https://flask-restx.readthedocs.io/
- Pydantic: https://docs.pydantic.dev/
