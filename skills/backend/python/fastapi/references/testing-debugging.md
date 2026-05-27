# Testing and Debugging FastAPI Applications

## Overview
FastAPI's TestClient provides an ASGI-compatible test client based on httpx. Combined with pytest, dependency overrides, and async testing patterns, you can thoroughly test all layers of your application.

## TestClient Setup

### Basic TestClient
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_read_user():
    response = client.get("/users/1")
    assert response.status_code == 200
    assert response.json()["id"] == "1"
```

### Async TestClient
```python
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.mark.anyio
async def test_async_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/items/")
        assert response.status_code == 200
```

## Dependency Overrides

### Override Dependencies for Testing
```python
from app.core.dependencies import get_current_user, get_db_session

# Override authentication
async def override_get_current_user():
    return User(id="test-user", email="test@example.com", role="admin")

app.dependency_overrides[get_current_user] = override_get_current_user

# Override database
async def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        await session.close()

app.dependency_overrides[get_db_session] = override_get_db

def test_protected_endpoint():
    response = client.get("/admin/users")
    assert response.status_code == 200

def test_create_with_auth():
    response = client.post(
        "/items/",
        json={"name": "Test Item", "price": 10.0},
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 201
```

### Fixture-Based Overrides
```python
@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}

@pytest.fixture
def test_db():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()

def test_create_item(auth_headers, test_db):
    response = client.post(
        "/items/",
        json={"name": "Test", "price": 10.0},
        headers=auth_headers,
    )
    assert response.status_code == 201
```

## Testing Database Operations

### In-Memory SQLite for Tests
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.infrastructure.database import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

@pytest.fixture
async def async_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
```

### Test Data Factory
```python
from app.domain.entities import User
from app.schemas.user import CreateUserRequest

class UserFactory:
    @staticmethod
    def create(**overrides) -> User:
        data = {
            "email": "test@example.com",
            "name": "Test User",
            "is_active": True,
        }
        data.update(overrides)
        return User.create(**data)

    @staticmethod
    def create_request(**overrides) -> CreateUserRequest:
        data = {
            "email": "new@example.com",
            "name": "New User",
        }
        data.update(overrides)
        return CreateUserRequest(**data)

def test_user_creation(session):
    user = UserFactory.create()
    assert user.email == "test@example.com"
    assert user.name == "Test User"
```

## Testing Pydantic Schemas

### Schema Validation Tests
```python
from app.schemas.user import CreateUserRequest, UserResponse
from pydantic import ValidationError
import pytest

def test_create_user_schema_valid():
    data = {"email": "user@example.com", "name": "Alice"}
    schema = CreateUserRequest(**data)
    assert schema.email == "user@example.com"

def test_create_user_schema_invalid_email():
    with pytest.raises(ValidationError) as exc:
        CreateUserRequest(email="not-an-email", name="Alice")
    assert "email" in str(exc.value)

def test_create_user_schema_missing_field():
    with pytest.raises(ValidationError):
        CreateUserRequest(name="Alice")

def test_user_response_from_domain():
    user = UserFactory.create(id=uuid4(), email="test@test.com")
    response = UserResponse.from_domain(user)
    assert response.id == str(user.id)
    assert response.email == user.email
```

## Testing Use Cases

### Use Case Unit Test
```python
from unittest.mock import AsyncMock, Mock

@pytest.fixture
def user_repo():
    return Mock(
        save=AsyncMock(),
        find_by_id=AsyncMock(),
    )

@pytest.fixture
def create_user_use_case(user_repo):
    return CreateUserUseCase(user_repo)

@pytest.mark.asyncio
async def test_create_user_success(create_user_use_case, user_repo):
    dto = CreateUserDto(email="test@test.com", name="Test")
    user = await create_user_use_case.execute(dto)

    assert user.email == "test@test.com"
    user_repo.save.assert_called_once()

@pytest.mark.asyncio
async def test_create_user_invalid_email(create_user_use_case, user_repo):
    dto = CreateUserDto(email="invalid", name="Test")
    with pytest.raises(ValueError, match="Invalid email"):
        await create_user_use_case.execute(dto)
    user_repo.save.assert_not_called()
```

## Integration Testing

### Full API Integration Test
```python
@pytest.fixture
def test_app():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: User(id="1", role="admin")
    yield app
    app.dependency_overrides.clear()

class TestUserAPI:
    def test_create_user_flow(self, test_app, auth_headers):
        # Create
        create_resp = client.post(
            "/api/v1/users/",
            json={"email": "new@test.com", "name": "New User"},
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        user_id = create_resp.json()["id"]

        # Read
        get_resp = client.get(f"/api/v1/users/{user_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["email"] == "new@test.com"

        # List
        list_resp = client.get("/api/v1/users/", headers=auth_headers)
        assert list_resp.status_code == 200
        assert len(list_resp.json()["data"]) > 0

    def test_unauthorized_access(self):
        response = client.get("/api/v1/users/")
        assert response.status_code == 401
```

## Testing File Uploads

### File Upload Test
```python
def test_upload_file():
    file_content = b"test file content"
    response = client.post(
        "/upload/",
        files={"file": ("test.txt", file_content, "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "test.txt"

def test_multiple_files():
    files = [
        ("files", ("a.txt", b"content a", "text/plain")),
        ("files", ("b.txt", b"content b", "text/plain")),
    ]
    response = client.post("/upload/multiple/", files=files)
    assert response.status_code == 200
    assert len(response.json()["files"]) == 2
```

## Debugging Techniques

### Enable Debug Mode
```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("uvicorn.access")

# In routes
@app.get("/debug")
async def debug_endpoint():
    logger.debug("Debug endpoint called")
    logger.info(f"Request headers: {dict(request.headers)}")
    return {"status": "ok"}
```

### Using PDB with FastAPI
```python
import pdb

@app.get("/debug/{item_id}")
async def debug_item(item_id: str):
    item = await db.get_item(item_id)
    if not item:
        pdb.set_trace()  # Debugger starts here
        # Check the flow
        logger.error(f"Item {item_id} not found")
    return item
```

### Request/Response Logging Middleware
```python
import logging

logger = logging.getLogger("api")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    body = await request.body()
    logger.info(f"Request: {request.method} {request.url.path}")
    if body:
        logger.debug(f"Request body: {body.decode()}")

    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response
```

## Testing Error Responses

### Error Case Tests
```python
def test_not_found():
    response = client.get("/users/nonexistent")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"

def test_validation_error():
    response = client.post("/users/", json={"email": "invalid"})
    assert response.status_code == 422
    assert "email" in str(response.json())

def test_conflict():
    response = client.post("/users/", json={"email": "existing@test.com"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"
```

## Key Points
- TestClient wraps httpx for full request/response testing
- Dependency overrides isolate authentication and database layers
- Factory functions create consistent test data
- Async tests need pytest.mark.anyio or pytest.mark.asyncio
- Integration tests verify the full request pipeline
- Test validation, errors, and edge cases for each schema
- Use in-memory databases for fast, isolated tests
- Debug with logging and conditional breakpoints
- Mock external services to avoid network dependencies
- Clear dependency overrides between tests to avoid leakage
