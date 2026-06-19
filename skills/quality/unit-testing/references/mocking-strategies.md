# Mocking Strategies

## When to Mock
Mock at system boundaries only:
- **Network**: HTTP calls, gRPC, WebSocket
- **Database**: SQL queries, Redis, MongoDB
- **Filesystem**: File reads/writes
- **Time**: Date, setTimeout, setInterval
- **Randomness**: Math.random, UUID generation
- **External services**: Payment gateways, email services, third-party APIs

Do NOT mock:
- Pure functions (same input → same output)
- Value objects, DTOs, entities
- Internal service dependencies (use real implementation)
- Language/standard library functions (except time and random)

## Python Mocking (pytest-mock)
```python
# Mocking HTTP calls
def test_order_service_places_order(mocker):
    mock_requests = mocker.patch("src.order_service.requests.post")
    mock_requests.return_value.status_code = 200
    mock_requests.return_value.json.return_value = {"id": "ord-123"}

    service = OrderService()
    result = service.place_order({"items": [{"price": 50}]}, "cust-123")

    assert result["id"] == "ord-123"
    mock_requests.assert_called_once_with(
        "https://api.payments.com/charge",
        json={"customer_id": "cust-123", "amount": 50},
    )
```

## TypeScript/JS Mocking (Vitest)
```typescript
// Module-level mock
vi.mock('../email-service', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({ sent: true }),
  })),
}));

// Partial mock
import * as utils from '../utils';
vi.spyOn(utils, 'generateId').mockReturnValue('fixed-id-123');
```

## Key Points
- Mock only at system boundaries — network, DB, filesystem, time, random
- Use real implementations for pure functions and internal dependencies
- Mock at the module level (vi.mock/jest.mock) for clean mocking
- Use spies (vi.spyOn) for partial mocking of existing objects
- Reset mocks between tests (afterEach restoreAllMocks)
- Avoid mocking third-party library internals (mock at your abstraction boundary)
