# FastAPI Testing

## Test Client Setup

```python
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        yield ac
```

## Override Dependencies

```python
@pytest.fixture
def mock_order_service():
    service = AsyncMock(spec=OrderService)
    service.get_order.return_value = Order(id=uuid4(), status='pending')
    return service

@pytest.fixture
def override_deps(mock_order_service):
    app.dependency_overrides[get_order_service] = lambda: mock_order_service
    yield
    app.dependency_overrides.clear()
```

## Test Patterns

```python
@pytest.mark.asyncio
async def test_create_order_success(client, override_deps, mock_order_service):
    mock_order_service.place_order.return_value = Order(id=uuid4(), status='pending')

    response = await client.post('/api/v1/orders', json={
        'customer_id': str(uuid4()),
        'items': [{'product_id': str(uuid4()), 'quantity': 2}],
    })

    assert response.status_code == 201
    assert response.json()['status'] == 'pending'

@pytest.mark.asyncio
async def test_create_order_validation_error(client):
    response = await client.post('/api/v1/orders', json={
        'customer_id': str(uuid4()),
        'items': [],  # Empty items should fail validation
    })

    assert response.status_code == 422

@pytest.mark.asyncio
async def test_get_order_not_found(client, override_deps, mock_order_service):
    mock_order_service.get_order.side_effect = HTTPException(status_code=404)

    response = await client.get(f'/api/v1/orders/{uuid4()}')

    assert response.status_code == 404
```

## Integration Test with TestContainers

```python
@pytest.mark.asyncio
async def test_order_persistence():
    # Uses real database via TestContainers
    async with AsyncClient(app=app, base_url='http://test') as client:
        response = await client.post('/api/v1/orders', json={
            'customer_id': str(uuid4()),
            'items': [{'product_id': str(uuid4()), 'quantity': 1, 'price': 100}],
        })
        assert response.status_code == 201
        order_id = response.json()['id']

        fetch = await client.get(f'/api/v1/orders/{order_id}')
        assert fetch.status_code == 200
        assert fetch.json()['id'] == order_id
```
