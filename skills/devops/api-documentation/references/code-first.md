# Code-First API Documentation

## NestJS + @nestjs/swagger

```bash
npm install @nestjs/swagger
```

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

const config = new DocumentBuilder()
  .setTitle("User API")
  .setDescription("API for managing users")
  .setVersion("1.0.0")
  .addBearerAuth()
  .addServer("https://api.example.com/v1", "Production")
  .addServer("https://staging-api.example.com/v1", "Staging")
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup("docs", app, document);
```

```typescript
// users.controller.ts
import { ApiProperty, ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com", description: "User email" })
  email!: string;

  @ApiProperty({ example: "John Doe", description: "Full name" })
  name!: string;

  @ApiProperty({ enum: ["user", "viewer"], default: "user" })
  role!: "user" | "viewer";
}

export class UserResponse {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ["admin", "user", "viewer"] })
  role!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

@ApiTags("Users")
@Controller("users")
export class UsersController {
  @Get()
  @ApiOperation({ summary: "List users", operationId: "listUsers" })
  async listUsers() {
    return [];
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create user", operationId: "createUser" })
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return {} as UserResponse;
  }
}
```

## FastAPI (Python)

```python
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum

app = FastAPI(
    title="User API",
    version="1.0.0",
    description="API for managing users",
)


class Role(str, Enum):
    admin = "admin"
    user = "user"
    viewer = "viewer"


class User(BaseModel):
    id: str = Field(..., examples=["123e4567-e89b-12d3-a456-426614174000"])
    email: EmailStr
    name: str
    role: Role
    created_at: str


class CreateUser(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: Role = Role.user


@app.get("/users", operation_id="listUsers", summary="List users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return {"data": [], "pagination": {"page": page, "limit": limit}}


@app.post("/users", operation_id="createUser", summary="Create user")
async def create_user(user: CreateUser):
    return User(id="uuid", email=user.email, name=user.name, role=user.role, created_at="2025-01-01T00:00:00Z")
```

## Spring Boot (Java/Kotlin)

```kotlin
// build.gradle.kts
// implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

@Configuration
class OpenApiConfig {
    @Bean
    fun openAPI(): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("User API")
                .version("1.0.0")
                .description("API for managing users")
        )
        .addSecurityItem(SecurityRequirement().addList("bearerAuth"))
        .components(
            Components().addSecuritySchemes(
                "bearerAuth",
                SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
            )
        )
}

data class CreateUserDto(
    @Schema(example = "user@example.com")
    val email: String,
    @Schema(example = "John Doe")
    val name: String,
    @Schema(defaultValue = "user")
    val role: String = "user"
)

@RestController
@RequestMapping("/users")
@Tag(name = "Users")
class UserController {
    @GetMapping
    @Operation(summary = "List users", operationId = "listUsers")
    fun listUsers(
        @Parameter(description = "Page number")
        @RequestParam(defaultValue = "1") page: Int,
        @Parameter(description = "Items per page")
        @RequestParam(defaultValue = "20") limit: Int
    ) = mapOf("data" to listOf<User>(), "pagination" to mapOf("page" to page, "limit" to limit))

    @PostMapping
    @Operation(summary = "Create user", operationId = "createUser")
    fun createUser(@RequestBody dto: CreateUserDto) = User("uuid", dto.email, dto.name, dto.role)
}
```

## Go (ogen)

```go
// go get -u github.com/ogen-go/ogen

// Design-first for Go is recommended — ogen generates code from OpenAPI spec
// However, you can embed spec in Go:

//go:embed openapi.yaml
var spec embed.FS

func setupSwagger(mux *http.ServeMux) {
    mux.HandleFunc("/docs/openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
        data, _ := spec.ReadFile("openapi.yaml")
        w.Header().Set("Content-Type", "text/yaml")
        w.Write(data)
    })
}
```

## Code-First vs Design-First

| Aspect | Code-First | Design-First |
|--------|-----------|-------------|
| Source of truth | Code | Spec file |
| Workflow | Code → Generate spec | Design → Generate code |
| Collaboration | Developer-driven | API designer + developer |
| Breaking changes | Detected at runtime | Detected at spec review |
| Client generation | Possible but coupled | First-class |
| Mock servers | Not easily | From spec |
| Best for | Internal APIs, small teams | Public APIs, large teams |
