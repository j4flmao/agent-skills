# Python: Runtime Generic Validation (Pydantic)

## 1. Static vs Runtime Types
Standard `typing` generics in Python are purely for static analyzers (`mypy`). At runtime, Python ignores them entirely. 
`BaseModel` from `pydantic` allows you to bridge this gap, evaluating generic constraints at runtime to parse and validate JSON.

## 2. GenericModels
```python
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    data: T
    status_code: int

class User(BaseModel):
    id: int
    email: str

# Validate JSON payload recursively!
json_str = '{"data": {"id": 1, "email": "bob@t.com"}, "status_code": 200}'

# Instantiates the Generic model.
response = APIResponse[User].model_validate_json(json_str)

# response.data is successfully parsed as a User instance!
assert isinstance(response.data, User)
```
