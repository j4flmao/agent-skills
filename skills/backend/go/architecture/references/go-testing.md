# Go Testing

## Test Structure

```go
// Basic test
func TestCreateUser(t *testing.T) {
    t.Parallel() // mark for parallel execution
    // Arrange
    repo := NewInMemoryUserRepository()
    service := NewUserService(repo)

    // Act
    user, err := service.Create("alice@test.com", "Alice")

    // Assert
    assert.NoError(t, err)
    assert.NotEqual(t, uuid.Nil, user.ID)
    assert.Equal(t, "alice@test.com", user.Email)
}
```

## Table-Driven Tests

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {name: "valid email", email: "test@example.com", wantErr: false},
        {name: "missing @", email: "testexample.com", wantErr: true},
        {name: "empty", email: "", wantErr: true},
        {name: "no domain", email: "test@", wantErr: true},
        {name: "no local", email: "@example.com", wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## Subtests

```go
func TestOrderService(t *testing.T) {
    t.Run("create", func(t *testing.T) {
        svc := setupService(t)
        order, err := svc.CreateOrder(ctx, validOrder)
        assert.NoError(t, err)
        assert.NotNil(t, order)
    })

    t.Run("not found", func(t *testing.T) {
        svc := setupService(t)
        _, err := svc.GetOrder(ctx, uuid.Nil)
        assert.ErrorIs(t, err, ErrNotFound)
    })
}
```

## Mocking Interfaces

```go
// Repository interface
type UserRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*User, error)
    Save(ctx context.Context, user *User) error
}

// Mock (no framework needed)
type mockUserRepo struct {
    users map[uuid.UUID]*User
    err   error
}

func (m *mockUserRepo) FindByID(_ context.Context, id uuid.UUID) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    return m.users[id], nil
}

func (m *mockUserRepo) Save(_ context.Context, user *User) error {
    if m.err != nil {
        return m.err
    }
    m.users[user.ID] = user
    return nil
}
```

## Integration Tests

```go
func TestPostgresUserRepo(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    db := setupTestDB(t)
    defer db.Close()

    repo := NewPostgresUserRepository(db)

    t.Run("save and find", func(t *testing.T) {
        user := &User{ID: uuid.New(), Email: "test@test.com"}
        err := repo.Save(ctx, user)
        assert.NoError(t, err)

        found, err := repo.FindByID(ctx, user.ID)
        assert.NoError(t, err)
        assert.Equal(t, user.Email, found.Email)
    })
}
```

## Test Helpers

```go
// testhelper.go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()
    db, err := sql.Open("postgres", os.Getenv("TEST_DATABASE_URL"))
    require.NoError(t, err)
    t.Cleanup(func() { db.Close() })
    return db
}

func setupService(t *testing.T) *OrderService {
    t.Helper()
    repo := NewInMemoryOrderRepository()
    return NewOrderService(repo)
}
```

## HTTP Handler Tests

```go
func TestUserHandler(t *testing.T) {
    repo := &mockUserRepo{users: map[uuid.UUID]*User{
        id: {ID: id, Email: "alice@test.com"},
    }}
    handler := NewUserHandler(repo)

    t.Run("GET /users/{id}", func(t *testing.T) {
        req := httptest.NewRequest("GET", "/users/"+id.String(), nil)
        rec := httptest.NewRecorder()
        handler.GetUser(rec, req)
        assert.Equal(t, 200, rec.Code)
    })
}
```

## Fuzzing

```go
func FuzzValidateEmail(f *testing.F) {
    f.Add("test@example.com")
    f.Add("invalid")
    f.Fuzz(func(t *testing.T, email string) {
        err := ValidateEmail(email)
        if err != nil {
            t.Skip() // not a bug
        }
    })
}
```
