# Flask Application Factory Pattern Reference

## Overview

Comprehensive reference for the Flask application factory pattern: creating configurable app instances, extension initialization, blueprint registration, and testing with factories.

## Table of Contents

1. Factory Pattern Fundamentals
2. Basic Application Factory
3. Configuration Management
4. Extension Initialization
5. Blueprint Registration
6. Error Handler Registration
7. CLI Commands
8. Request Hooks
9. Multiple Environments
10. Testing with Factory
11. Advanced Patterns
12. Common Pitfalls

---

## 1. Factory Pattern Fundamentals

### Why Application Factory

```python
# Bad: Global app instance
from flask import Flask

app = Flask(__name__)  # Module-level, hard to test

@app.route("/")
def index():
    return "Hello"

# Cannot create multiple app instances
# Cannot easily change configuration per test
# Applications settings are hardcoded

# Good: Application factory
def create_app(config_object: str = "app.config.Config") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)
    # Initialize components
    return app

# Multiple instances with different configs
app_dev = create_app("app.config.DevelopmentConfig")
app_test = create_app("app.config.TestingConfig")
```

### Benefits

```python
# 1. Testability
def test_create_order():
    app = create_app("app.config.TestingConfig")
    client = app.test_client()
    response = client.post("/api/orders", json={...})
    assert response.status_code == 201

# 2. Configuration isolation
app_dev = create_app("app.config.DevelopmentConfig")
app_prod = create_app("app.config.ProductionConfig")

# 3. Lazy initialization
# Extensions not initialized until create_app() called

# 4. Plugability
# Different extensions for different environments
```

---

## 2. Basic Application Factory

### Minimal Factory

```python
# app/__init__.py
from flask import Flask


def create_app(config_object: str = "app.config.Config") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)
    app.config.from_prefixed_env()

    register_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)
    register_cli_commands(app)
    register_request_hooks(app)

    return app


def register_extensions(app: Flask) -> None:
    """Initialize Flask extensions."""
    pass


def register_blueprints(app: Flask) -> None:
    """Register all application blueprints."""
    pass


def register_error_handlers(app: Flask) -> None:
    """Register error handlers."""
    pass


def register_cli_commands(app: Flask) -> None:
    """Register custom CLI commands."""
    pass


def register_request_hooks(app: Flask) -> None:
    """Register before_request/after_request handlers."""
    pass
```

### Entry Point

```python
# wsgi.py
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run()

# For production: gunicorn wsgi:app
# For development: flask --app wsgi:app run
```

### Runner Script

```python
# run.py
import os
from app import create_app

config = os.environ.get("FLASK_CONFIG", "development")
config_map = {
    "development": "app.config.DevelopmentConfig",
    "testing": "app.config.TestingConfig",
    "production": "app.config.ProductionConfig",
}

app = create_app(config_map.get(config, config_map["development"]))

if __name__ == "__main__":
    app.run(debug=app.config.get("DEBUG", False))
```

---

## 3. Configuration Management

### Configuration Classes

```python
# app/config.py
import os
from datetime import timedelta
from typing import Optional

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    JSON_SORT_KEYS: bool = False
    JSON_AS_ASCII: bool = False
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16 MB
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"

    # Database
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # Mail
    MAIL_SERVER: str = os.environ.get("MAIL_SERVER", "localhost")
    MAIL_PORT: int = int(os.environ.get("MAIL_PORT", "25"))
    MAIL_USE_TLS: bool = False

    # Redis
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # Rate limiting
    RATELIMIT_ENABLED: bool = True
    RATELIMIT_DEFAULT: str = "100/hour"
    RATELIMIT_STORAGE_URL: str = REDIS_URL

    # Uploads
    UPLOAD_FOLDER: str = os.path.join(basedir, "..", "uploads")
    ALLOWED_EXTENSIONS: set = {"png", "jpg", "jpeg", "gif", "pdf"}


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(basedir, '..', 'dev.db')}"
    )
    SESSION_COOKIE_SECURE: bool = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING: bool = True
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    WTF_CSRF_ENABLED: bool = False
    RATELIMIT_ENABLED: bool = False
    PRESERVE_CONTEXT_ON_EXCEPTION: bool = False


class StagingConfig(Config):
    """Staging configuration."""
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("DATABASE_URL")
    SESSION_COOKIE_SECURE: bool = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.environ.get("DATABASE_URL")
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Strict"


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "staging": StagingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
```

### Environment Variable Loading

```python
# app/__init__.py
import os
from dotenv import load_dotenv


def create_app(config_object: str = None) -> Flask:
    app = Flask(__name__)

    # Load .env file
    load_dotenv()

    # Determine config
    if config_object is None:
        env = os.environ.get("FLASK_ENV", "development")
        config_object = f"app.config.{env.capitalize()}Config"

    app.config.from_object(config_object)

    # Override with prefixed env vars
    app.config.from_prefixed_env(prefix="FLASK")

    register_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)

    return app
```

### Dynamic Configuration

```python
# app/config.py
import json
from pathlib import Path


class DynamicConfig:
    """Configuration that can read from files or external sources."""

    @staticmethod
    def from_json_file(path: str) -> dict:
        with open(path) as f:
            return json.load(f)

    @staticmethod
    def from_yaml_file(path: str) -> dict:
        import yaml
        with open(path) as f:
            return yaml.safe_load(f)

    @staticmethod
    def from_vault(path: str) -> dict:
        """Read configuration from HashiCorp Vault."""
        import hvac
        client = hvac.Client(url=os.environ["VAULT_URL"])
        client.token = os.environ["VAULT_TOKEN"]
        secret = client.secrets.kv.v2.read_secret_version(path=path)
        return secret["data"]["data"]


# Usage in create_app
def create_app(config_class=None, extra_config: dict = None):
    app = Flask(__name__)
    app.config.from_object(config_class or Config)

    if extra_config:
        app.config.update(extra_config)

    # Load external config file
    if config_path := os.environ.get("APP_CONFIG_FILE"):
        config_data = DynamicConfig.from_json_file(config_path)
        app.config.update(config_data)

    return app
```

---

## 4. Extension Initialization

### Lazy Extension Pattern

```python
# app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_mail import Mail
from flask_login import LoginManager

# Initialize extensions without app
db = SQLAlchemy()
migrate = Migrate()
cache = Cache()
limiter = Limiter(key_func=get_remote_address)
cors = CORS()
mail = Mail()
login_manager = LoginManager()


def init_extensions(app: Flask) -> None:
    """Initialize all Flask extensions with the app instance."""
    db.init_app(app)
    migrate.init_app(app, db)
    cache.init_app(app)
    limiter.init_app(app)
    cors.init_app(app)
    mail.init_app(app)
    login_manager.init_app(app)

    # Custom initialization
    login_manager.login_view = "auth.login"
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id: str):
        from app.models import User
        return User.query.get(int(user_id))
```

### Extension Module Pattern

```python
# app/extensions/database.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


def init_database(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)

    # Configure engine options
    app.config.setdefault("SQLALCHEMY_ENGINE_OPTIONS", {
        "pool_size": 10,
        "pool_recycle": 3600,
        "pool_pre_ping": True,
    })


# app/extensions/cache.py
from flask_caching import Cache

cache = Cache()


def init_cache(app: Flask) -> None:
    cache_config = {
        "CACHE_TYPE": app.config.get("CACHE_TYPE", "RedisCache"),
        "CACHE_REDIS_URL": app.config.get("REDIS_URL", "redis://localhost:6379/0"),
        "CACHE_DEFAULT_TIMEOUT": 300,
    }
    app.config.update(cache_config)
    cache.init_app(app)


# app/extensions/auth.py
from flask_login import LoginManager

login_manager = LoginManager()


def init_auth(app: Flask) -> None:
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Please log in to access this page."
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id: str):
        from app.models.user import User
        return User.query.get(int(user_id))
```

### Conditional Extensions

```python
# app/__init__.py
def register_extensions(app: Flask) -> None:
    """Register extensions based on configuration."""
    from app.extensions import db, migrate, cache, limiter, cors, mail

    # Always initialize
    db.init_app(app)
    migrate.init_app(app, db)

    # Conditional extensions
    if app.config.get("CACHE_ENABLED", True):
        cache.init_app(app)

    if app.config.get("RATELIMIT_ENABLED", True):
        limiter.init_app(app)

    if app.config.get("CORS_ENABLED", True):
        cors.init_app(app, resources={
            r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}
        })

    if app.config.get("MAIL_ENABLED", False):
        mail.init_app(app)
```

---

## 5. Blueprint Registration

### Blueprint Organization

```python
# app/blueprints/__init__.py
from flask import Blueprint


# Import all blueprints
from app.blueprints.health.routes import health_bp
from app.blueprints.orders.routes import orders_bp
from app.blueprints.auth.routes import auth_bp
from app.blueprints.users.routes import users_bp
from app.blueprints.admin.routes import admin_bp


def register_blueprints(app: Flask) -> None:
    """Register all blueprints with URL prefixes."""
    app.register_blueprint(health_bp)

    # API blueprints
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")

    # Admin (requires authentication)
    app.register_blueprint(admin_bp, url_prefix="/admin")

    # Conditional blueprints
    if app.config.get("FEATURE_PAYMENTS_ENABLED", False):
        from app.blueprints.payments.routes import payments_bp
        app.register_blueprint(payments_bp, url_prefix="/api/payments")


# app/blueprints/orders/routes.py
from flask import Blueprint

orders_bp = Blueprint(
    "orders",
    __name__,
    template_folder="templates",
    static_folder="static",
    url_prefix=None  # Prefix applied at registration
)


@orders_bp.route("", methods=["GET"])
def list_orders():
    return {"orders": []}


@orders_bp.route("/<uuid:order_id>", methods=["GET"])
def get_order(order_id):
    return {"id": str(order_id)}


# Blueprint with subdomain
admin_bp = Blueprint(
    "admin",
    __name__,
    subdomain="admin",
)
```

### Blueprint Factories

```python
# app/blueprints/orders/__init__.py
from flask import Blueprint


def create_order_blueprint() -> Blueprint:
    """Create order blueprint with all routes."""
    bp = Blueprint("orders", __name__)

    # Import routes module to register decorators
    from app.blueprints.orders import routes
    routes.register_routes(bp)

    return bp


# app/blueprints/orders/routes.py
from flask import Blueprint, jsonify


def register_routes(bp: Blueprint) -> None:
    @bp.route("", methods=["GET"])
    def list_orders():
        return jsonify([])

    @bp.route("/<uuid:order_id>", methods=["GET"])
    def get_order(order_id):
        return jsonify({"id": str(order_id)})


# Registration in factory
bp = create_order_blueprint()
app.register_blueprint(bp, url_prefix="/api/orders")
```

### Blueprint with Resources

```python
# app/blueprints/orders/routes.py
from flask import Blueprint, request, jsonify, current_app
from app.services.order_service import OrderService
from app.blueprints.orders.schemas import CreateOrderSchema, OrderResponseSchema
from app.utils.decorators import require_auth

orders_bp = Blueprint("orders", __name__)


@orders_bp.route("", methods=["POST"])
@require_auth
def create_order():
    service = OrderService()
    schema = CreateOrderSchema(**request.get_json())
    order = service.create(schema.model_dump())
    result = OrderResponseSchema.model_validate(order).model_dump()
    return jsonify(result), 201


@orders_bp.route("", methods=["GET"])
@require_auth
def list_orders():
    service = OrderService()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    orders, total = service.list_paginated(page=page, per_page=per_page)
    items = [OrderResponseSchema.model_validate(o).model_dump() for o in orders]
    return jsonify({
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
    })
```

---

## 6. Error Handler Registration

### Global Error Handlers

```python
# app/utils/errors.py
from flask import jsonify, current_app
from werkzeug.exceptions import HTTPException
import logging

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application error."""
    def __init__(self, message: str, status_code: int = 400, code: str = "APP_ERROR", details: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}


def register_error_handlers(app) -> None:
    """Register all error handlers."""

    @app.errorhandler(AppError)
    def handle_app_error(error: AppError):
        response = {
            "code": error.code,
            "message": error.message,
        }
        if error.details:
            response["details"] = error.details
        return jsonify(response), error.status_code

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        responses = {
            400: ("BAD_REQUEST", "Invalid request"),
            401: ("UNAUTHORIZED", "Authentication required"),
            403: ("FORBIDDEN", "Access denied"),
            404: ("NOT_FOUND", "Resource not found"),
            405: ("METHOD_NOT_ALLOWED", "Method not allowed"),
            409: ("CONFLICT", "Resource conflict"),
            410: ("GONE", "Resource no longer available"),
            422: ("UNPROCESSABLE", "Unprocessable entity"),
            429: ("RATE_LIMITED", "Too many requests"),
            500: ("INTERNAL_ERROR", "An unexpected error occurred"),
        }
        code, message = responses.get(error.code, ("UNKNOWN", "Unknown error"))
        return jsonify(code=code, message=message), error.code

    @app.errorhandler(500)
    def handle_internal_error(error):
        logger.exception("Internal server error")
        return jsonify(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred"
        ), 500

    @app.errorhandler(Exception)
    def handle_unhandled(error):
        logger.exception("Unhandled exception")
        if current_app.debug:
            raise
        return jsonify(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred"
        ), 500
```

### Blueprint-Specific Error Handlers

```python
# app/blueprints/orders/routes.py
orders_bp = Blueprint("orders", __name__)


@orders_bp.errorhandler(404)
def order_not_found(error):
    return jsonify(code="ORDER_NOT_FOUND", message="Order not found"), 404


@orders_bp.errorhandler(AppError)
def handle_order_error(error):
    return jsonify(code=error.code, message=error.message), error.status_code
```

---

## 7. CLI Commands

### Registering Commands

```python
# app/cli.py
import click
from flask import Flask
from flask.cli import with_appcontext


def register_commands(app: Flask) -> None:
    """Register CLI commands."""

    @app.cli.command("seed-db")
    @with_appcontext
    def seed_db():
        """Seed database with sample data."""
        from app.extensions import db
        from app.models.user import User

        user = User(email="admin@example.com", name="Admin")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()
        click.echo(f"Created user: {user.email}")

    @app.cli.command("create-admin")
    @click.argument("email")
    @click.argument("password")
    @with_appcontext
    def create_admin(email: str, password: str):
        """Create admin user."""
        from app.extensions import db
        from app.models.user import User

        if User.query.filter_by(email=email).first():
            click.echo(f"User {email} already exists")
            return

        user = User(email=email, name="Admin", is_admin=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        click.echo(f"Admin user created: {email}")

    @app.cli.command("list-routes")
    @with_appcontext
    def list_routes():
        """List all registered routes."""
        rules = sorted(app.url_map.iter_rules(), key=lambda r: r.rule)
        for rule in rules:
            methods = ",".join(sorted(rule.methods - {"HEAD", "OPTIONS"}))
            click.echo(f"{methods:8s} {rule.rule:50s} {rule.endpoint}")
```

### Group Commands

```python
# app/cli.py
import click
from flask.cli import AppGroup

user_cli = AppGroup("user", help="User management commands.")


@user_cli.command("create")
@click.argument("email")
@click.password_option()
def create_user(email, password):
    """Create a new user."""
    from app.extensions import db
    from app.models.user import User

    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    click.echo(f"Created user: {email}")


@user_cli.command("activate")
@click.argument("email")
def activate_user(email):
    """Activate a user."""
    from app.extensions import db
    from app.models.user import User

    user = User.query.filter_by(email=email).first_or_fail()
    user.is_active = True
    db.session.commit()
    click.echo(f"Activated user: {email}")


def register_commands(app: Flask) -> None:
    app.cli.add_command(user_cli)


# Usage:
# flask user create admin@example.com
# flask user activate admin@example.com
```

---

## 8. Request Hooks

### Before/After Request

```python
# app/hooks.py
import time
import uuid
from flask import Flask, g, request, current_app


def register_request_hooks(app: Flask) -> None:
    """Register request lifecycle hooks."""

    @app.before_request
    def assign_request_id():
        g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    @app.before_request
    def start_timer():
        g.start_time = time.perf_counter()

    @app.before_request
    def open_database_session():
        from app.extensions import db
        g.db_session = db.session

    @app.after_request
    def log_request(response):
        if hasattr(g, "start_time"):
            duration = time.perf_counter() - g.start_time
            current_app.logger.info(
                "%s %s %s %.3fms",
                request.method,
                request.path,
                response.status_code,
                duration * 1000,
            )
        return response

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Request-ID"] = g.get("request_id", "")
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

    @app.teardown_request
    def close_database_session(exception=None):
        if hasattr(g, "db_session"):
            if exception:
                g.db_session.rollback()
            g.db_session.close()
```

### Blueprint Hooks

```python
# Blueprint-specific hooks
orders_bp = Blueprint("orders", __name__)


@orders_bp.before_request
def check_order_api_key():
    if not request.headers.get("X-API-Key"):
        return jsonify(error="API key required"), 401


@orders_bp.after_request
def add_order_headers(response):
    response.headers["X-Orders-Version"] = "1.0"
    return response
```

---

## 9. Multiple Environments

### Factory with Environment Detection

```python
# app/__init__.py
import os

def create_app(config_name: str = None) -> Flask:
    app = Flask(__name__)

    if config_name is None:
        config_name = os.environ.get("FLASK_CONFIG", "development")

    config_map = {
        "development": "app.config.DevelopmentConfig",
        "testing": "app.config.TestingConfig",
        "staging": "app.config.StagingConfig",
        "production": "app.config.ProductionConfig",
    }

    config_object = config_map.get(config_name)
    if not config_object:
        raise ValueError(f"Invalid config name: {config_name}")

    app.config.from_object(config_object)

    # Env-specific initialization
    if config_name == "development":
        init_development_tools(app)
    elif config_name == "production":
        init_production_tools(app)

    return app


def init_development_tools(app: Flask) -> None:
    """Initialize development-only tools."""
    from flask_debugtoolbar import DebugToolbarExtension
    DebugToolbarExtension(app)


def init_production_tools(app: Flask) -> None:
    """Initialize production-only tools."""
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration

    if dsn := os.environ.get("SENTRY_DSN"):
        sentry_sdk.init(dsn=dsn, integrations=[FlaskIntegration()])
```

### .flaskenv

```
# .flaskenv
FLASK_APP=wsgi:app
FLASK_ENV=development
FLASK_DEBUG=1
```

---

## 10. Testing with Factory

### Test Configuration

```python
# tests/conftest.py
import pytest
from app import create_app


@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    app = create_app("app.config.TestingConfig")

    with app.app_context():
        from app.extensions import db
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create CLI test runner."""
    return app.test_cli_runner()


@pytest.fixture(autouse=True)
def app_context(app):
    """Provide application context for each test."""
    with app.app_context():
        yield


@pytest.fixture
def db_session(app):
    """Provide database session for each test."""
    from app.extensions import db

    with app.app_context():
        db.create_all()
        yield db.session
        db.drop_all()
```

### Testing With Factory

```python
# tests/test_orders.py
import json
import pytest
from app import create_app


class TestOrdersAPI:
    """Test orders API endpoints."""

    def test_create_order(self, client, db_session):
        """Test creating an order."""
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
        data = response.get_json()
        assert data["customer_id"] == "cust-1"
        assert data["total_amount"] == 39.98

    def test_create_order_validation_error(self, client):
        """Test validation error on invalid input."""
        response = client.post(
            "/api/orders",
            json={"customer_id": ""},
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["code"] == "VALIDATION"

    def test_list_orders_pagination(self, client, db_session):
        """Test paginated order listing."""
        response = client.get("/api/orders?page=1&per_page=10")
        assert response.status_code == 200
        data = response.get_json()
        assert "items" in data
        assert "total" in data
        assert "page" in data

    def test_get_order_not_found(self, client):
        """Test 404 for non-existent order."""
        response = client.get("/api/orders/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404
```

### Testing CLI Commands

```python
# tests/test_cli.py
def test_seed_db_command(runner):
    """Test database seeding command."""
    result = runner.invoke(args=["seed-db"])
    assert result.exit_code == 0
    assert "Created user" in result.output


def test_create_admin_command(runner):
    """Test admin user creation."""
    result = runner.invoke(
        args=["create-admin", "admin@test.com", "testpass123"]
    )
    assert result.exit_code == 0
    assert "Admin user created" in result.output
```

---

## 11. Advanced Patterns

### Factory with Dependency Injection

```python
# app/di.py
from typing import Any


class Container:
    """Simple dependency injection container."""

    def __init__(self):
        self._services: dict[str, Any] = {}

    def set(self, name: str, service: Any) -> None:
        self._services[name] = service

    def get(self, name: str) -> Any:
        if name not in self._services:
            raise KeyError(f"Service '{name}' not registered")
        return self._services[name]


def create_app(config_object: str = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or "app.config.Config")

    # Create and configure container
    container = Container()
    container.set("order_service", OrderService())
    container.set("payment_service", PaymentService())
    app.container = container

    return app


# Usage in route
@orders_bp.route("", methods=["POST"])
def create_order():
    order_service = current_app.container.get("order_service")
    return order_service.create(request.get_json())
```

### Factory with Plugins

```python
# app/plugins.py
from typing import Protocol


class AppPlugin(Protocol):
    """Plugin interface."""
    name: str

    def init_app(self, app: Flask) -> None:
        ...


class CorsPlugin:
    name = "cors"

    def init_app(self, app: Flask) -> None:
        from flask_cors import CORS
        CORS(app)


class SentryPlugin:
    name = "sentry"

    def __init__(self, dsn: str):
        self.dsn = dsn

    def init_app(self, app: Flask) -> None:
        import sentry_sdk
        sentry_sdk.init(dsn=self.dsn)


def create_app(config_object: str = None, plugins: list[AppPlugin] = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or "app.config.Config")

    for plugin in plugins or []:
        plugin.init_app(app)
        app.extensions[plugin.name] = plugin

    return app


# Usage
plugins = [CorsPlugin(), SentryPlugin(dsn=os.environ["SENTRY_DSN"])]
app = create_app(plugins=plugins)
```

---

## 12. Common Pitfalls

### Pitfall 1: Circular Imports

```python
# BAD: Circular import between models and extensions
# app/extensions.py
from app.models import User  # Circular!

db = SQLAlchemy()

# app/models.py
from app.extensions import db

class User(db.Model):
    pass

# GOOD: Extensions first, then models
# app/extensions.py
db = SQLAlchemy()  # No model imports

# app/models.py
from app.extensions import db

class User(db.Model):
    pass
```

### Pitfall 2: Import Order in Factory

```python
# BAD: Importing inside factory function
def register_blueprints(app):
    from app.blueprints.orders.routes import orders_bp
    app.register_blueprint(orders_bp)

# GOOD: Import at module level, register in factory
from app.blueprints.orders.routes import orders_bp

def register_blueprints(app):
    app.register_blueprint(orders_bp)
```

### Pitfall 3: Request Context Outside Request

```python
# BAD: Using request outside request context
def send_async_email():
    with current_app.app_context():
        user = User.query.first()  # Works
        print(request.url)  # RuntimeError: Working outside of request context

# GOOD: Pass needed data explicitly
def send_async_email(user_id, email_type):
    with current_app.app_context():
        user = User.query.get(user_id)
        # No request context needed
```

### Pitfall 4: Testing Configuration Leak

```python
# BAD: Tests modifying global config
app = create_app("app.config.TestingConfig")
app.config["DATABASE_URL"] = "sqlite:///test.db"  # Modifies config class

# GOOD: Using config objects per-test
@pytest.fixture
def app():
    config = TestingConfig()
    config.DATABASE_URL = "sqlite:///test.db"
    app = create_app(config)
    return app
```

---

## References

- Flask Application Factories: https://flask.palletsprojects.com/en/3.0.x/patterns/appfactories/
- Flask Configuration: https://flask.palletsprojects.com/en/3.0.x/config/
- Flask Blueprints: https://flask.palletsprojects.com/en/3.0.x/blueprints/
- Flask Extensions: https://flask.palletsprojects.com/en/3.0.x/extensions/
- Flask CLI: https://flask.palletsprojects.com/en/3.0.x/cli/
- Flask Testing: https://flask.palletsprojects.com/en/3.0.x/testing/
