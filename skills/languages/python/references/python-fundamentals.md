# Python Fundamentals

## What is Python?

Python is a dynamically-typed, interpreted language known for readability and versatility. It's used for web development (Django, FastAPI), data science (pandas, numpy), automation, and scripting. Python 3.11+ offers significant performance improvements with the faster CPython interpreter.

## Project Structure

```
myproject/
├── src/
│   └── myproject/
│       ├── __init__.py
│       ├── main.py
│       ├── models.py
│       ├── services.py
│       └── config.py
├── tests/
│   ├── __init__.py
│   ├── test_services.py
│   └── conftest.py
├── pyproject.toml        # Modern build config
├── README.md
└── .gitignore
```

## Virtual Environments

```bash
# Standard venv
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate      # Windows

# uv (fastest)
uv venv
uv sync

# Conda
conda create -n myproject python=3.11
conda activate myproject
```

## Package Management

### pip
```bash
pip install fastapi uvicorn
pip install -r requirements.txt
pip freeze > requirements.txt
```

### pyproject.toml (Modern Standard)
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "myproject"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.100",
    "pydantic>=2.0",
    "sqlalchemy>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8",
    "mypy>=1.0",
    "ruff>=0.1",
]
```

## Core Types

```python
# Basic types
int: 42
float: 3.14
str: "hello"
bool: True
NoneType: None

# Collections
list: [1, 2, 3]
tuple: (1, 2, 3)
dict: {"key": "value"}
set: {1, 2, 3}
frozenset: frozenset([1, 2, 3])
```

## Functions

```python
# Basic function
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

# *args and **kwargs
def log(message: str, *args, **kwargs) -> None:
    print(f"{message}: args={args}, kwargs={kwargs}")

# Lambda
square = lambda x: x ** 2

# Decorator
def timer(func):
    import time
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.perf_counter() - start:.3f}s")
        return result
    return wrapper
```

## Classes

```python
from dataclasses import dataclass

# Modern dataclass (Python 3.7+)
@dataclass(slots=True)  # slots=True from 3.10+
class User:
    id: int
    name: str
    email: str
    is_active: bool = True

    def __post_init__(self):
        if not self.email:
            raise ValueError("Email is required")

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(id=data["id"], name=data["name"], email=data["email"])

# Traditional class
class UserService:
    def __init__(self, repository: UserRepository):
        self._repository = repository

    def get_user(self, user_id: int) -> User | None:
        return self._repository.find_by_id(user_id)
```

## Type Hints

```python
from collections.abc import Sequence, Callable
from typing import TypeAlias, Literal

# Type aliases
UserID: TypeAlias = int
JSON: TypeAlias = dict[str, "JSON"] | list["JSON"] | str | int | float | bool | None

# Union types (3.10+)
def process(value: int | str) -> str: ...

# Optional
def find_user(id: int) -> User | None: ...

# Generics
def first[T](items: list[T]) -> T:
    return items[0]
```

## Common Standard Library Modules

```python
import os           # Operating system interface
import sys          # System-specific parameters
import json         # JSON encoder/decoder
import re           # Regular expressions
import datetime     # Date and time
import pathlib      # Object-oriented filesystem paths
import collections  # Specialized container datatypes
import itertools    # Iterator functions
import functools    # Higher-order functions
import logging      # Logging facility
import urllib.request  # URL handling
import csv          # CSV file reading/writing
import hashlib      # Secure hashes
```

## File I/O

```python
# Modern pathlib
from pathlib import Path

config = Path("config.json")
data = config.read_text()
config.write_text('{"key": "value"}')

for py_file in Path("src").rglob("*.py"):
    print(py_file)

# Context manager
with open("data.txt", "r") as f:
    content = f.read()

with open("output.txt", "w") as f:
    f.write("Hello, world!")
```

## Error Handling

```python
class OrderError(Exception):
    """Base exception for order-related errors"""

class InsufficientStockError(OrderError):
    def __init__(self, product_id: str, requested: int, available: int):
        self.product_id = product_id
        self.requested = requested
        self.available = available
        super().__init__(f"Insufficient stock for {product_id}: {requested} > {available}")

def create_order(items: list[Item]) -> Order:
    try:
        validate_stock(items)
        return process_payment(items)
    except InsufficientStockError as e:
        log.warning(f"Stock insufficient: {e}")
        raise
    except PaymentError:
        raise OrderError("Payment processing failed")
    except Exception:
        log.exception("Unexpected order error")
        raise
    else:
        log.info("Order created successfully")
    finally:
        cleanup_resources()
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `python -V` | Check version |
| `python -m venv .venv` | Create virtual env |
| `python -m pip install <pkg>` | Install package |
| `python -m pytest` | Run tests |
| `python -m mypy src/` | Type check |
| `python -m ruff check .` | Lint |
| `python -m ruff format .` | Format |
| `python -m cProfile script.py` | Profile |
| `python -m http.server 8000` | Simple HTTP server |
