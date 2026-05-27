# Go Testing and Benchmarking

## Overview
Go includes a built-in testing package with support for unit tests, benchmarks, fuzzing, and coverage analysis. The testing toolchain provides table-driven tests, subtests, test helpers, and profiling capabilities.

## Unit Tests

### Basic Test Structure
```go
// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5

    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}

func TestSubtract(t *testing.T) {
    result := Subtract(10, 4)
    expected := 6

    if result != expected {
        t.Fatalf("Subtract(10, 4) = %d; want %d", result, expected)
    }
}
```

### Table-Driven Tests
```go
func TestDivide(t *testing.T) {
    tests := []struct {
        name     string
        a, b     float64
        expected float64
        wantErr  bool
    }{
        {name: "positive division", a: 10, b: 2, expected: 5, wantErr: false},
        {name: "negative division", a: -10, b: 2, expected: -5, wantErr: false},
        {name: "division by zero", a: 10, b: 0, expected: 0, wantErr: true},
        {name: "decimal result", a: 7, b: 3, expected: 2.3333333333333335, wantErr: false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Divide(tt.a, tt.b)

            if tt.wantErr {
                if err == nil {
                    t.Error("expected error but got none")
                }
                return
            }

            if err != nil {
                t.Errorf("unexpected error: %v", err)
            }

            if result != tt.expected {
                t.Errorf("Divide(%v, %v) = %v; want %v",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### Setup and Teardown
```go
func TestDatabase(t *testing.T) {
    // Setup
    db, err := setupTestDatabase()
    if err != nil {
        t.Fatalf("failed to setup database: %v", err)
    }

    // Cleanup
    t.Cleanup(func() {
        db.Close()
        cleanupTestDatabase()
    })

    // Run tests
    t.Run("insert", func(t *testing.T) {
        err := db.Insert("key", "value")
        if err != nil {
            t.Errorf("Insert failed: %v", err)
        }
    })

    t.Run("query", func(t *testing.T) {
        value, err := db.Query("key")
        if err != nil {
            t.Errorf("Query failed: %v", err)
        }
        if value != "value" {
            t.Errorf("got %q, want %q", value, "value")
        }
    })
}
```

## Test Helpers

### Helper Functions
```go
func TestUserValidation(t *testing.T) {
    tests := []struct {
        name  string
        email string
        valid bool
    }{
        {name: "valid email", email: "user@example.com", valid: true},
        {name: "missing @", email: "userexample.com", valid: false},
        {name: "empty", email: "", valid: false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            got := err == nil
            if got != tt.valid {
                t.Errorf("ValidateEmail(%q) = valid=%v; want %v",
                    tt.email, got, tt.valid)
            }
        })
    }
}

func createTestUser(t *testing.T, email string) *User {
    t.Helper() // Marks as helper - excluded from stack traces in failures

    user, err := CreateUser(email)
    if err != nil {
        t.Fatalf("CreateUser(%q) failed: %v", email, err)
    }
    return user
}
```

## Mocking

### Interface-Based Mocking
```go
// repository.go
type UserRepository interface {
    FindByID(id string) (*User, error)
    Save(user *User) error
}

// mock_repository.go
type MockUserRepository struct {
    FindByIDFunc func(id string) (*User, error)
    SaveFunc     func(user *User) error
}

func (m *MockUserRepository) FindByID(id string) (*User, error) {
    return m.FindByIDFunc(id)
}

func (m *MockUserRepository) Save(user *User) error {
    return m.SaveFunc(user)
}

func TestUserService_GetUser(t *testing.T) {
    mockRepo := &MockUserRepository{
        FindByIDFunc: func(id string) (*User, error) {
            return &User{ID: id, Name: "Alice"}, nil
        },
    }

    service := NewUserService(mockRepo)
    user, err := service.GetUser("123")

    if err != nil {
        t.Fatalf("GetUser failed: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("got name %q, want %q", user.Name, "Alice")
    }
}
```

## Benchmarking

### Benchmark Functions
```go
func BenchmarkStringConcat(b *testing.B) {
    str1 := "Hello"
    str2 := "World"
    str3 := "!"

    for i := 0; i < b.N; i++ {
        result := str1 + " " + str2 + str3
        _ = result
    }
}

func BenchmarkStringBuilder(b *testing.B) {
    str1 := "Hello"
    str2 := "World"
    str3 := "!"

    for i := 0; i < b.N; i++ {
        var sb strings.Builder
        sb.WriteString(str1)
        sb.WriteString(" ")
        sb.WriteString(str2)
        sb.WriteString(str3)
        _ = sb.String()
    }
}

func BenchmarkStringSprintf(b *testing.B) {
    str1 := "Hello"
    str2 := "World"
    str3 := "!"

    for i := 0; i < b.N; i++ {
        result := fmt.Sprintf("%s %s%s", str1, str2, str3)
        _ = result
    }
}
```

### Running Benchmarks
```bash
# Run all benchmarks
go test -bench=.

# Run specific benchmark
go test -bench=BenchmarkStringConcat

# Run benchmarks with memory allocation stats
go test -bench=. -benchmem

# Run benchmarks with custom time
go test -bench=. -benchtime=10s

# Profile CPU
go test -bench=. -cpuprofile=cpu.prof

# Profile memory
go test -bench=. -memprofile=mem.prof
```

## Fuzzing

### Fuzz Tests
```go
func FuzzReverse(f *testing.F) {
    testcases := []string{"Hello, world", " ", "12345!?@#$"}
    for _, tc := range testcases {
        f.Add(tc)
    }

    f.Fuzz(func(t *testing.T, orig string) {
        rev := Reverse(orig)
        doubleRev := Reverse(rev)
        if orig != doubleRev {
            t.Errorf("Before: %q, after: %q", orig, doubleRev)
        }
        if utf8.ValidString(orig) && !utf8.ValidString(rev) {
            t.Errorf("Reverse produced invalid UTF-8 string %q", rev)
        }
    })
}
```

## Coverage

### Code Coverage
```bash
# Run tests with coverage
go test -cover

# Generate coverage profile
go test -coverprofile=coverage.out

# View coverage in browser
go tool cover -html=coverage.out

# Coverage by function
go tool cover -func=coverage.out
```

## Key Points
- Test functions start with Test and accept *testing.T
- Table-driven tests reduce code duplication
- Subtests with t.Run enable hierarchical organization
- t.Helper() marks test helper functions
- t.Cleanup() registers teardown functions
- Interface-based mocking enables test isolation
- Benchmark functions start with Benchmark and accept *testing.B
- b.N is adjusted by the framework for statistical significance
- benchmem flag reports memory allocation statistics
- Fuzz tests automatically discover edge cases
- go test -cover reports code coverage percentages
- -race flag detects data races during testing
- Test caching speeds up repeated test runs
- Parallel tests with t.Parallel()
- Skip long-running tests with testing.Short()
- Example functions serve as documentation and tests
- Test main with TestMain for package-level setup/teardown
- Golden files for complex output comparison
- Cross-compilation doesn't affect test execution
- go vet catches common test issues
- Test fixtures in testdata/ directory
