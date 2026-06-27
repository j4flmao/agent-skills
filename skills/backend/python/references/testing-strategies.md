# Testing Strategies in Python

## Overview
A robust testing pyramid ensures stability and developer velocity. This covers Pytest, Mocking, Database Test Containers, and Property-based testing.

## 1. Pytest Fixtures and Parametrization
Pytest fixtures provide dependency injection for tests, managing setup and teardown.

```python
import pytest

@pytest.fixture
def db_session():
    # Setup
    session = create_test_session()
    yield session
    # Teardown
    session.rollback()
    session.close()

@pytest.mark.parametrize("input_val, expected", [
    (1, 2),
    (2, 4),
    (3, 6)
])
def test_doubler(input_val, expected):
    assert input_val * 2 == expected
```

## 2. Mocking (unittest.mock vs responses)
Isolate unit tests from external dependencies.

- **`unittest.mock`:** Built-in. Good for mocking internal classes/functions.
- **`responses` or `respx`:** Best for mocking HTTP requests.

```python
import responses
import requests

@responses.activate
def test_external_api():
    responses.add(responses.GET, 'http://api.example.com/data',
                  json={'key': 'value'}, status=200)
                  
    resp = requests.get('http://api.example.com/data')
    assert resp.json() == {'key': 'value'}
```

## 3. Database Test Containers
Avoid mocking the database for repository/integration tests. Use Docker to spin up real databases.

```python
# Using pytest-testcontainers or testcontainers-python
from testcontainers.postgres import PostgresContainer

with PostgresContainer("postgres:15") as postgres:
    engine = sqlalchemy.create_engine(postgres.get_connection_url())
    # Run DB tests against realistic environment
```

## 4. Property-Based Testing (Hypothesis)
Instead of hardcoding inputs, define properties your code should hold, and let Hypothesis generate edge cases.

```python
from hypothesis import given
from hypothesis.strategies import integers

def my_sort(arr):
    return sorted(arr)

@given(integers(), integers())
def test_sort_properties(a, b):
    result = my_sort([a, b])
    assert result[0] <= result[1]
```

## 5. Coverage Enforcement
Use `pytest-cov` to enforce minimum coverage thresholds. Keep thresholds reasonable (e.g., 80%) to avoid testing implementation details instead of behavior.

```bash
pytest --cov=my_app --cov-report=term-missing --cov-fail-under=85
```
