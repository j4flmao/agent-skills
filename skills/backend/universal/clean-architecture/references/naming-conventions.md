# Naming Conventions

## By Language

### TypeScript / NestJS
| Concept | Convention | Example |
|---------|------------|---------|
| Domain Entity | PascalCase | `Order`, `User` |
| Value Object | PascalCase | `Money`, `EmailAddress` |
| Domain Event | PascalCase + past tense | `OrderPlacedEvent` |
| Repository Interface | PascalCase + `Repository` | `OrderRepository` |
| Use Case / Handler | PascalCase | `PlaceOrderHandler` |
| DTO | PascalCase + `Dto` | `CreateOrderDto` |
| Controller | PascalCase + `Controller` | `OrderController` |
| Service | PascalCase + `Service` | `OrderService` |

### Go
| Concept | Convention | Example |
|---------|------------|---------|
| Interface | PascalCase + `er` or domain name | `UserRepository`, `Storer` |
| Struct | PascalCase | `PostgresUserRepository` |
| Function | PascalCase (exported), camelCase (private) | `CreateUser`, `parseEmail` |
| Variable | camelCase | `userRepo`, `dbConn` |
| Error vars | `Err` + PascalCase | `ErrUserNotFound` |

### Rust
| Concept | Convention | Example |
|---------|------------|---------|
| Types | PascalCase | `Order`, `UserId` |
| Traits | PascalCase | `UserRepository` |
| Functions | snake_case | `place_order` |
| Variables | snake_case | `user_repo` |
| Error types | PascalCase + `Error` | `ValidationError` |
| Modules | snake_case | `user_repository` |

### Python
| Concept | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `Order`, `UserRepository` |
| Functions | snake_case | `place_order` |
| Variables | snake_case | `user_repo` |
| Constants | UPPER_SNAKE_CASE | `MAX_ITEMS` |
| Private | Prefix with `_` | `_validate_email` |

### Java / Spring
| Concept | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `Order`, `UserRepository` |
| Interfaces | PascalCase | `OrderRepository` |
| Methods | camelCase | `placeOrder` |
| Constants | UPPER_SNAKE_CASE | `MAX_ITEMS` |
| Packages | lowercase | `com.project.user` |

## Universal Rules
- Repository interfaces are named by what they abstract: `UserRepository`, `PaymentGateway`
- Use cases are named by the action: `PlaceOrder`, `CreateUser`
- Domain events are past tense: `OrderPlaced`, `UserRegistered`
- DTOs are data-only — no behavior
- Test files mirror source: `user.test.ts`, `user_test.go`, `test_user.py`
