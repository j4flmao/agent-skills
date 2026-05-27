# Flask Security Reference

## Authentication with Flask-Login

```python
from flask_login import LoginManager, UserMixin, login_user, login_required, current_user

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        login_user(user, remember=data.get('remember', False))
        return jsonify({'message': 'Login successful'})
    return jsonify({'error': 'Invalid credentials'}), 401
```

## JWT Authentication

```python
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
jwt = JWTManager(app)

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'roles': user.get_roles()}
        )
        return jsonify(access_token=access_token)
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=user_id).all()
    return jsonify([o.to_dict() for o in orders])
```

## CORS Configuration

```python
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": os.environ.get('ALLOWED_ORIGINS', '').split(','),
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
```

## Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="redis://localhost:6379"
)

@app.route('/api/login')
@limiter.limit("5 per minute")
def login():
    return jsonify({'message': 'Login endpoint'})

@app.route('/api/orders')
@limiter.limit("100 per minute")
def list_orders():
    return jsonify({'orders': []})
```

## CSRF Protection

```python
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect(app)

# Exempt API routes from CSRF
csrf.exempt(api_bp)
```

## Password Hashing

```python
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt(rounds=12)
    ).decode('utf-8')

def verify_password(password: str, hash: str) -> bool:
    return bcrypt.checkpw(
        password.encode('utf-8'),
        hash.encode('utf-8')
    )
```

## Security Headers

```python
from flask_talisman import Talisman

Talisman(app, 
    content_security_policy={
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
    },
    force_https=not app.debug,
    strict_transport_security=True,
    session_cookie_secure=not app.debug,
    session_cookie_http_only=True
)
```

## Input Validation

```python
from marshmallow import Schema, fields, validate, ValidationError

class OrderSchema(Schema):
    customer_id = fields.UUID(required=True)
    items = fields.List(fields.Nested(lambda: OrderItemSchema()), required=True, validate=validate.Length(min=1))
    coupon_code = fields.String(validate=validate.Length(max=50))

class OrderItemSchema(Schema):
    sku = fields.String(required=True, validate=validate.Length(min=1))
    quantity = fields.Integer(required=True, validate=validate.Range(min=1))
    price = fields.Float(required=True, validate=validate.Range(min=0.01))

@app.route('/api/orders', methods=['POST'])
def create_order():
    schema = OrderSchema()
    try:
        data = schema.load(request.get_json())
        return jsonify({'status': 'created'}), 201
    except ValidationError as err:
        return jsonify({'errors': err.messages}), 400
```

## Key Points

- Flask-Login manages session-based authentication
- Flask-JWT-Extended provides stateless API authentication
- CORS configuration restricts origins for API routes
- Rate limiting protects against brute force and abuse
- CSRF protection exempts API routes from token checks
- bcrypt hashes passwords with 12 rounds minimum
- Talisman sets security headers (CSP, HSTS, X-Frame-Options)
- Marshmallow validates request payloads
- Environment variables configure secrets and origins
- Login required decorator protects session-based routes
