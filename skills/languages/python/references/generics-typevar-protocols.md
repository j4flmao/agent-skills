# Python: TypeVar and Structural Subtyping

## 1. Defining Generics
Python is dynamically typed, but the `typing` module allows static analysis (via `mypy` or `pyright`).

```python
from typing import TypeVar, Generic, List

T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: List[T] = []
    
    def push(self, item: T) -> None:
        self._items.append(item)
```

## 2. Bound TypeVars vs Constrained TypeVars
- **Constrained**: `TypeVar('T', str, bytes)` means T must be strictly `str` or `bytes`.
- **Bound**: `TypeVar('T', bound=Animal)` means T can be `Animal` or any subclass of `Animal`.

## 3. Structural Subtyping (`Protocol`)
Python 3.8 introduced `Protocol` to implement Go-like "duck typing" interfaces.

```python
from typing import Protocol, TypeVar

class Closable(Protocol):
    def close(self) -> None: ...

# T is bound to anything that implements .close()
TResource = TypeVar('TResource', bound=Closable)

def cleanup(resource: TResource) -> None:
    resource.close()

# Natively works with `open()` because file objects have a .close() method.
```
