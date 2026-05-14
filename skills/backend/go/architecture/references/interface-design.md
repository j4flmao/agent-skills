# Go Interface Design

## Interface at Consumer
```go
// consumer.go — defines what IT needs
type OrderRepository interface {
  FindByID(ctx context.Context, id string) (*domain.Order, error)
  Save(ctx context.Context, order *domain.Order) error
}

// implementation.go — satisfies the interface
type PostgresOrderRepository struct {
  db *sql.DB
}
func (r *PostgresOrderRepository) FindByID(ctx context.Context, id string) (*domain.Order, error) { ... }
func (r *PostgresOrderRepository) Save(ctx context.Context, order *domain.Order) error { ... }
```

## Interface Size
- Keep interfaces small (1-3 methods)
- Prefer many small interfaces over one large interface
- Accept interfaces, return structs

## Repository Pattern
```go
// Domain layer defines the interface
type UserRepository interface {
  FindByID(ctx context.Context, id string) (*User, error)
  FindByEmail(ctx context.Context, email string) (*User, error)
  Save(ctx context.Context, user *User) error
}

// Infrastructure implements it
type PostgresUserRepository struct {
  db *sql.DB
}
```

## Service Interface
```go
type OrderService interface {
  PlaceOrder(ctx context.Context, cmd PlaceOrderCommand) (*Order, error)
  GetOrder(ctx context.Context, id string) (*Order, error)
}
```
