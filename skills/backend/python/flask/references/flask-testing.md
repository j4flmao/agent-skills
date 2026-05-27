# Flask Testing Reference

## Test Setup with pytest

```python
import pytest
from app import create_app
from app.extensions import db as _db

@pytest.fixture(scope='session')
def app():
    app = create_app('testing')
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    return app.test_client()

@pytest.fixture(scope='function')
def db(app):
    _db.create_all()
    yield _db
    _db.session.remove()
    _db.drop_all()
```

## API Testing

```python
class TestOrderAPI:
    def test_create_order(self, client, db):
        response = client.post('/api/orders', json={
            'customer_id': '550e8400-e29b-41d4-a716-446655440000',
            'items': [{'sku': 'SKU-001', 'quantity': 2, 'price': 29.99}]
        })
        assert response.status_code == 201
        data = response.get_json()
        assert 'id' in data

    def test_get_order_not_found(self, client):
        response = client.get('/api/orders/nonexistent')
        assert response.status_code == 404
        assert response.get_json()['error'] == 'Order not found'
```

## Authentication Testing

```python
class TestAuth:
    @pytest.fixture
    def auth_headers(self, client, db):
        user = User(email='test@test.com', password_hash=hash_password('testPass123!'))
        db.session.add(user)
        db.session.commit()
        
        response = client.post('/api/login', json={
            'email': 'test@test.com',
            'password': 'testPass123!'
        })
        token = response.get_json()['access_token']
        return {'Authorization': f'Bearer {token}'}

    def test_protected_route(self, client, auth_headers):
        response = client.get('/api/orders', headers=auth_headers)
        assert response.status_code == 200

    def test_unauthenticated(self, client):
        response = client.get('/api/orders')
        assert response.status_code == 401
```

## Validation Testing

```python
class TestValidation:
    def test_invalid_json(self, client):
        response = client.post('/api/orders', 
            data='not json',
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_missing_required_field(self, client):
        response = client.post('/api/orders', json={})
        assert response.status_code == 400
        errors = response.get_json()['errors']
        assert 'customer_id' in errors

    def test_invalid_field_type(self, client):
        response = client.post('/api/orders', json={
            'customer_id': 'not-a-uuid',
            'items': []
        })
        assert response.status_code == 400
```

## Database Testing

```python
class TestDatabase:
    def test_create_and_retrieve_order(self, db):
        order = Order(customer_id='cust-123', total=99.99)
        db.session.add(order)
        db.session.commit()
        
        saved = Order.query.first()
        assert saved.customer_id == 'cust-123'
        assert saved.total == 99.99

    def test_rollback_on_error(self, db):
        with pytest.raises(Exception):
            order = Order(customer_id=None)
            db.session.add(order)
            db.session.commit()
        
        assert Order.query.count() == 0
```

## Mocking External Services

```python
from unittest.mock import patch

class TestExternalService:
    @patch('app.services.inventory.check_availability')
    def test_inventory_check(self, mock_check, client):
        mock_check.return_value = {'available': True, 'quantity': 10}
        
        response = client.post('/api/orders', json={
            'customer_id': 'cust-123',
            'items': [{'sku': 'SKU-001', 'quantity': 2, 'price': 29.99}]
        })
        
        assert response.status_code == 201
        mock_check.assert_called_once_with('SKU-001', 2)
```

## Key Points

- pytest fixtures create isolated app and database per test
- Test client sends requests without running a server
- Auth headers fixture obtains JWT token via login endpoint
- Validation tests cover invalid JSON, missing fields, wrong types
- Database tests verify CRUD operations and rollback
- Mocking external services isolates unit tests
- Each test function receives fresh database session
- Configuration override sets testing environment variables
- Response assertions check status codes and JSON body
- Coverage reporting identifies untested code paths
