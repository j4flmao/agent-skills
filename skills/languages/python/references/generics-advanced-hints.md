# Python: ParamSpec and Overloads

## 1. Decorators with `ParamSpec` (Python 3.10+)
Historically, wrapping a function with a decorator destroyed the type hints for its arguments (you had to type `*args, **kwargs` as `Any`). `ParamSpec` captures and forwards the exact argument signature.

```python
from typing import Callable, TypeVar, ParamSpec
import time

P = ParamSpec('P')
R = TypeVar('R')

def timing_decorator(func: Callable[P, R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.time()
        result = func(*args, **kwargs)
        print(f"Time: {time.time() - start}")
        return result
    return wrapper

@timing_decorator
def complex_math(a: int, b: float) -> float:
    return float(a + b)

# IDE still knows complex_math requires (int, float)!
```

## 2. Function Overloads for Type Narrowing
When a generic return type fundamentally changes based on a literal argument, use `@overload`.

```python
from typing import overload, Literal, Union

@overload
def fetch_data(raw: Literal[True]) -> bytes: ...

@overload
def fetch_data(raw: Literal[False]) -> str: ...

def fetch_data(raw: bool) -> Union[bytes, str]:
    return b"0101" if raw else "string data"
```
