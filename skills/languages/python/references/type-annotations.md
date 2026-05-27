# Python Type Annotations

## Overview
Python type annotations enable static type checking, improve code documentation, and catch bugs at development time. Modern Python versions (3.10+) have significantly improved the typing system with union syntax, structural typing, and more.

## Basic Annotations

### Variable and Function Annotations
```python
from typing import Optional, Union, Any

# Variable annotations
name: str = "Alice"
age: int = 30
is_active: bool = True
height: float = 1.75

# Function annotations
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

def process_items(items: list[int]) -> dict[str, int]:
    return {str(i): i for i in items}

# Union types
def find_user(id: Union[int, str]) -> Optional[dict]:
    # Python 3.10+: id: int | str
    ...

# Any type (escape hatch)
def log_message(message: Any) -> None:
    print(message)
```

## Collection Types

### Typing Collections
```python
from typing import List, Dict, Set, Tuple, Optional

# Python 3.9+ built-in generics
names: list[str] = ["Alice", "Bob"]
scores: dict[str, int] = {"Alice": 95, "Bob": 87}
unique_ids: set[int] = {1, 2, 3}
coordinate: tuple[float, float] = (40.7128, -74.0060)

# Variable-length tuples
args: tuple[int, ...] = (1, 2, 3)

# Optional types
maybe_name: str | None = None  # Python 3.10+
def get_user(id: int) -> Optional[dict]: ...
```

## Custom Types

### Type Aliases
```python
from typing import TypeAlias

# Simple aliases
UserId: TypeAlias = int
JsonDict: TypeAlias = dict[str, Any]

# Complex aliases
UserList: TypeAlias = list[dict[str, str | int]]

def get_user_name(uid: UserId) -> str:
    ...

# NewType for distinct types
from typing import NewType

UserId = NewType("UserId", int)
ProductId = NewType("ProductId", int)

def get_user(uid: UserId) -> dict: ...
def get_product(pid: ProductId) -> dict: ...

user_id = UserId(123)
product_id = ProductId(456)
```

### TypedDict
```python
from typing import TypedDict, NotRequired

class UserDict(TypedDict):
    id: int
    name: str
    email: str
    is_active: bool

# Python 3.11+ NotRequired
class ConfigDict(TypedDict):
    host: str
    port: int
    timeout: NotRequired[float]  # Optional key

# Total flag
class PartialUser(TypedDict, total=False):
    id: int
    name: str

# Usage
user: UserDict = {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "is_active": True,
}
```

## Protocols

### Structural Subtyping
```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...

class Circle:
    def draw(self) -> None:
        print("Drawing circle")

class Square:
    def draw(self) -> None:
        print("Drawing square")

# Any object with draw() method qualifies
def render(shape: Drawable) -> None:
    shape.draw()

render(Circle())  # OK - has draw()
render(Square())  # OK - has draw()
```

### Protocol with Attributes
```python
class HasName(Protocol):
    name: str

def greet(obj: HasName) -> str:
    return f"Hello, {obj.name}!"

class Person:
    name: str

    def __init__(self, name: str) -> None:
        self.name = name

greet(Person("Alice"))  # OK
```

## Generics

### Generic Functions and Classes
```python
from typing import TypeVar, Generic

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

# Generic function
def first_element(items: list[T]) -> T | None:
    return items[0] if items else None

# Generic class
class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# Constrained TypeVar
Number = TypeVar("Number", int, float)

def add(a: Number, b: Number) -> Number:
    return a + b

# Bounded TypeVar
class Animal:
    def make_sound(self) -> str: ...

TAnimal = TypeVar("TAnimal", bound=Animal)

def process_animals(animals: list[TAnimal]) -> list[TAnimal]:
    for animal in animals:
        animal.make_sound()
    return animals
```

## Decorator Patterns

### Typed Decorators
```python
from typing import Callable, TypeVar, ParamSpec
import functools

P = ParamSpec("P")
R = TypeVar("R")

# Decorator that preserves signature
def log_call(func: Callable[P, R]) -> Callable[P, R]:
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

# Decorator with arguments
def retry(max_attempts: int = 3) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == max_attempts - 1:
                        raise
            raise
        return wrapper
    return decorator

@log_call
@retry(max_attempts=2)
def fetch_data(url: str) -> dict:
    ...
```

## Runtime Type Checking

### Pydantic for Runtime
```python
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

class User(BaseModel):
    id: int
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    created_at: datetime = Field(default_factory=datetime.now)
    tags: list[str] = []

    @field_validator("name")
    @classmethod
    def name_must_be_valid(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip()

# Automatic validation
user = User(id=1, name="Alice", email="alice@example.com")
data = user.model_dump()
json_data = user.model_dump_json()
```

## Key Points
- Type hints improve IDE support and catch bugs early
- Python 3.10+ supports | union syntax (str | None)
- Python 3.9+ supports built-in generics (list[str])
- TypedDict defines dictionary structures
- Protocols enable structural subtyping (duck typing)
- TypeVar creates generic type parameters
- ParamSpec types variadic function signatures
- NewType creates distinct types from primitives
- Final prevents subclassing or reassignment
- @overload defines multiple type signatures
- Literal restricts values to specific literals
- Self (3.11+) types methods returning self
- Never (3.11+) marks unreachable code paths
- TypeGuard narrows types in conditional blocks
- TypeAlias gives descriptive names to complex types
- Pydantic provides runtime validation of type annotations
- mypy, pyright, pytype, and pyre check static types
- Type stubs (.pyi files) type existing C extensions
- Generics improve code reuse with type safety
- Runtime type checking complements static analysis
