# FastAPI Routing Patterns

## Route Organization

```python
from fastapi import APIRouter, FastAPI

app = FastAPI()

# Users routes
user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("/")
async def list_users(page: int = 1, size: int = 20):
    return await get_users(skip=(page - 1) * size, limit=size)

@user_router.get("/{user_id}")
async def get_user(user_id: str):
    return await get_user_by_id(user_id)

@user_router.post("/")
async def create_user(data: CreateUserDto):
    return await create_user(data)

# Admin routes
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(admin_required)],
)

@admin_router.get("/users")
async def admin_list_users():
    return await get_all_users_with_details()

@admin_router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str):
    await delete_user(user_id)
    return {"message": "User deleted"}

app.include_router(user_router)
app.include_router(admin_router)
```

## Request Validation

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class CreateUserDto(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field(default="user", pattern="^(admin|user|viewer)$")
    metadata: Optional[dict] = None

class UpdateUserDto(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    email: Optional[EmailStr] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class PaginatedResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    size: int
    pages: int
```

## Error Handling

```python
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler

class AppError(Exception):
    def __init__(self, message: str, code: str, status: int = 400):
        self.message = message
        self.code = code
        self.status = status

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )

@app.exception_handler(HTTPException)
async def custom_http_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "http_error",
                "message": exc.detail,
            }
        },
    )
```

## Key Points

- Use APIRouter for modular route organization
- Apply route-level dependencies for authentication
- Use Pydantic models for request validation and responses
- Implement custom exception handlers for consistent errors
- Use path and query parameters for resource identification
- Implement pagination with skip/limit or cursor patterns
- Use dependency injection for database and auth
- Handle file uploads with UploadFile and File
- Use BackgroundTasks for post-response processing
- Implement WebSocket endpoints for real-time features
- Use middleware for request logging and CORS
- Document routes with OpenAPI tags and descriptions
