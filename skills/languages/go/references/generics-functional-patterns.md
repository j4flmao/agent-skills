# Go: Generic Functional Patterns & Traps

## 1. Type-Safe Functional Options
The Functional Options pattern is heavily used in Go for configuration. Generics make this type-safe across different modules.

```go
type Option[T any] func(*T)

func WithTimeout[T interface{ SetTimeout(int) }](seconds int) Option[T] {
    return func(obj *T) {
        (*obj).SetTimeout(seconds)
    }
}
```

## 2. The Pointer Receiver Trap
A massive pain point in Go generics: constraints that require pointer methods fail when instantiating generic base values.

```go
type Setter interface { Set(string) }

// FAILS: If T is passed, it creates `var item T`.
// If T is *Config, item is nil pointer -> panic.
// If T is Config, Set() is a pointer method -> compile error.
func ApplyConfig_Bad[T Setter](data string) T { ... }
```

### The Solution: Decoupling Base and Pointer
You must split the type parameters.
```go
func ApplyConfig[T any, PT interface {
    *T
    Setter
}](data string) PT {
    var item T       // Allocates safely
    ptr := PT(&item) // Converts to pointer type
    ptr.Set(data)
    return ptr
}
```
