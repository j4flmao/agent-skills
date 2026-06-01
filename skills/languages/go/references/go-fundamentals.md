# Go Fundamentals

## What is Go?

Go (Golang) is a statically typed, compiled language designed for systems programming, cloud services, and CLI tools. It has built-in concurrency (goroutines, channels), fast compilation, and a focus on simplicity.

## Core Concepts

### Packages
Every Go file belongs to a package. `package main` defines the entrypoint. Import with `import "fmt"` or grouped:
```go
import (
    "fmt"
    "net/http"
    "github.com/gin-gonic/gin"
)
```

### Exported vs Unexported
Capitalized names are exported (public): `fmt.Println`. Lowercase names are unexported (package-private): `parseInput`.

### The `main` Function
```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
    os.Exit(0)
}
```

### Zero Values
Variables declared without initialization get zero values: `0` for numbers, `false` for bool, `""` for string, `nil` for pointers/slices/maps/channels/interfaces.

## Variables & Types

### Declaration
```go
var name string = "Alice"        // Explicit type
var age = 30                      // Type inferred
count := 5                        // Short declaration (inside functions)
var x, y int = 1, 2               // Multiple variables
const pi = 3.14159                // Constants
```

### Basic Types
```go
bool                    // true, false
string                  // UTF-8 encoded
int, int8, int16, int32, int64    // Signed integers
uint, uint8, uint16, uint32, uint64 // Unsigned
float32, float64        // Floating point
complex64, complex128   // Complex numbers
byte                    // uint8 alias
rune                    // int32 alias (Unicode code point)
```

### Composite Types
```go
// Array (fixed size)
var arr [5]int
arr := [3]int{1, 2, 3}

// Slice (dynamic)
var slice []int
slice := []int{1, 2, 3}
slice = append(slice, 4)

// Map
m := map[string]int{"a": 1, "b": 2}
value, exists := m["a"]

// Struct
type User struct {
    Name string
    Age  int
}
u := User{Name: "Alice", Age: 30}
```

## Control Flow

### If/Else
```go
if score >= 90 {
    grade = "A"
} else if score >= 80 {
    grade = "B"
} else {
    grade = "C"
}

// With statement (variable scoped to block)
if err := doSomething(); err != nil {
    return err
}
```

### For (Go has only `for`, no `while`)
```go
// Classic
for i := 0; i < 10; i++ { }

// While-like
for condition { }

// Infinite
for { }

// Range
for index, value := range slice { }
for key, value := range map { }
```

### Switch
```go
switch status {
case "active":
    return true
case "inactive", "suspended":
    return false
default:
    return false
}

// No-fallthrough by default (use `fallthrough` to continue)
```

## Functions

### Multiple Return Values
```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

### Named Returns
```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    return  // naked return
}
```

### Variadic Functions
```go
func sum(numbers ...int) int {
    total := 0
    for _, n := range numbers {
        total += n
    }
    return total
}
result := sum(1, 2, 3, 4)
```

### Defer
```go
func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil { return err }
    defer f.Close()  // Runs when function returns
    // Use f...
    return nil
}
```

## Pointers

Go is pass-by-value, but pointers allow sharing:
```go
func increment(x *int) {
    *x++
}

n := 10
increment(&n)
fmt.Println(n)  // 11
```

## Interfaces

Interfaces are satisfied implicitly (no `implements` keyword):
```go
type Writer interface {
    Write([]byte) (int, error)
}

type ConsoleWriter struct{}

func (c ConsoleWriter) Write(data []byte) (int, error) {
    return fmt.Println(string(data))
}

func process(w Writer) {
    w.Write([]byte("hello"))
}
```

## Error Handling

Go uses explicit error returns (not exceptions):
```go
func readConfig(path string) (Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return Config{}, fmt.Errorf("read config %s: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return Config{}, fmt.Errorf("parse config: %w", err)
    }
    return cfg, nil
}
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `go mod init <module>` | Create new module |
| `go mod tidy` | Clean dependencies |
| `go build ./...` | Build all packages |
| `go run main.go` | Run without building |
| `go test ./...` | Run all tests |
| `go test -v ./...` | Verbose test output |
| `go vet ./...` | Static analysis |
| `go fmt ./...` | Format code |
| `go generate ./...` | Run code generators |
