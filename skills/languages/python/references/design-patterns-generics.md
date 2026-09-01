# Python: Generics and Design Patterns

## 1. The Dynamic Nature of Python
Python is dynamically typed, so at runtime, Generics technically do not exist (they are stripped out, similar to Java Type Erasure). However, with modern tools like `mypy` and `pyright`, **Type Hinting** has transformed Python into a gradually typed language.

## 2. The Generic Registry Pattern
Registries are common in Python (e.g., registering serializers, views, or handlers). Without generics, a registry returns `Any`, killing IDE autocomplete.

By inheriting from `typing.Generic`, we bind the registry to a specific type.

```python
from typing import TypeVar, Generic, Dict, Type

# 1. Define a Type Variable bound to a Base Class
T = TypeVar('T')

# 2. Inherit from Generic[T]
class BaseRegistry(Generic[T]):
    def __init__(self) -> None:
        self._registry: Dict[str, Type[T]] = {}

    def register(self, name: str, cls: Type[T]) -> None:
        self._registry[name] = cls

    def create(self, name: str, **kwargs) -> T:
        if name not in self._registry:
            raise ValueError(f"Unknown component: {name}")
        # Mypy guarantees that the returned instance is of type T
        return self._registry[name](**kwargs)

# 3. Usage
class Animal: pass
class Dog(Animal): pass
class Cat(Animal): pass

# Lock the registry to Animal types
animal_registry = BaseRegistry[Animal]()
animal_registry.register("dog", Dog)

# The IDE knows 'my_pet' is of type Animal
my_pet = animal_registry.create("dog")
```

## 3. The Builder Pattern with `typing.Self`
In Python 3.11+, `typing.Self` was introduced to solve the classic Builder Pattern problem (method chaining in inherited classes). Before 3.11, developers had to use awkward string references `"Builder"` or complex TypeVars.

```python
from typing import Self

class VehicleBuilder:
    def __init__(self) -> None:
        self.engine: str | None = None

    def with_engine(self, engine: str) -> Self:
        self.engine = engine
        return self # Returns the EXACT subclass type!

class CarBuilder(VehicleBuilder):
    def __init__(self) -> None:
        super().__init__()
        self.doors: int = 4

    def with_doors(self, doors: int) -> Self:
        self.doors = doors
        return self

# Perfect Autocomplete & Type Checking
builder = CarBuilder().with_engine("V8").with_doors(2)
```
