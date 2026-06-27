# Code Organization & DDD in Python

## Overview
Scaling a Python codebase requires strict organization, static typing, and clear architectural boundaries.

## 1. Standard Project Layout
A standard modular structure, avoiding the flat "all files in root" anti-pattern.

```text
my_project/
├── pyproject.toml
├── src/
│   ├── main.py
│   ├── config.py
│   ├── domain/         # Core business logic and entities
│   ├── infrastructure/ # DB connections, external API clients
│   └── interfaces/     # REST/GraphQL controllers, CLI
└── tests/
```

## 2. Domain-Driven Design (DDD)
Focus on the Domain Model. Entities should contain business logic, not just be dumb data containers.

```python
from dataclasses import dataclass

@dataclass
class Account:
    id: int
    balance: float

    def withdraw(self, amount: float):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
```

## 3. Dependency Injection
Use DI to decouple components. Frameworks like `dependency-injector` or FastAPI's `Depends` are standard.

```python
# FastAPI Example
from fastapi import Depends

def get_repository():
    return UserRepository()

def get_service(repo: UserRepository = Depends(get_repository)):
    return UserService(repo)
```

## 4. Type Hinting (mypy, pyright)
Python 3.10+ makes type hinting powerful and ergonomic. Use `pyright` or `mypy` in strict mode.

```python
from typing import Protocol

# Protocol (Structural Subtyping)
class EmailSender(Protocol):
    def send(self, to: str, body: str) -> bool: ...

class SmtpEmailSender:
    def send(self, to: str, body: str) -> bool:
        return True

def notify_user(sender: EmailSender):
    sender.send("user@example.com", "Hello!")
```

## 5. Strict Linting with Ruff
Replace flake8, black, isort, and pylint with a single, blazing-fast Rust-based tool: Ruff.

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
select = ["E", "F", "I", "B", "UP"] # pycodestyle, pyflakes, isort, flake8-bugbear, pyupgrade
```

## 6. Pre-commit Hooks
Enforce code organization and formatting before code is even committed.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.0.280
    hooks:
      - id: ruff
        args: [ --fix, --exit-non-zero-on-fix ]
```
