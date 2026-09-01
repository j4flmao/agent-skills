# Design Patterns with Generics in Go (1.18+)

Go introduced generics relatively recently (Go 1.18 in 2022). Prior to this, developers had to use `interface{}` (which bypasses compile-time type checking) or generate code. Generics open up new, type-safe design patterns.

## 1. The Type-Safe Object Pool (Flyweight Pattern)
`sync.Pool` is heavily used in high-performance Go applications to reuse memory allocations. However, `sync.Pool.Get()` returns `any` (interface{}), requiring a runtime type assertion which is verbose and carries a slight performance penalty if it panics.

### The Generic Wrapper
```go
package pool

import "sync"

// GenericPool provides a type-safe wrapper around sync.Pool
type GenericPool[T any] struct {
	pool sync.Pool
}

// New creates a new GenericPool with a type-safe factory function
func New[T any](factory func() T) *GenericPool[T] {
	return &GenericPool[T]{
		pool: sync.Pool{
			New: func() any {
				return factory()
			},
		},
	}
}

func (p *GenericPool[T]) Get() T {
	// The type assertion is hidden and guaranteed to be safe
	return p.pool.Get().(T)
}

func (p *GenericPool[T]) Put(x T) {
	p.pool.Put(x)
}
```

### Usage
```go
type DBConnection struct { /* ... */ }

// Compiler enforces that only DBConnection can be returned/put
connPool := pool.New(func() *DBConnection {
    return &DBConnection{}
})

conn := connPool.Get()
// Use conn...
connPool.Put(conn)
```

## 2. Generic Strategy Pattern (Algorithms)
The Strategy Pattern allows selecting an algorithm at runtime. With Go generics, we can enforce that the strategy implements a specific behavior constraint without forcing the underlying data into a blank interface.

```go
package strategy

import "golang.org/x/exp/constraints"

// Constraint allowing only numbers
type Number interface {
	constraints.Integer | constraints.Float
}

// Generic Strategy Interface
type DiscountStrategy[T Number] interface {
	Apply(price T) T
}

// Concrete Strategies
type PercentageDiscount[T Number] struct {
	Percentage T
}

func (p PercentageDiscount[T]) Apply(price T) T {
	return price - (price * (p.Percentage / 100))
}

type FlatDiscount[T Number] struct {
	Amount T
}

func (f FlatDiscount[T]) Apply(price T) T {
	if price < f.Amount {
		return 0
	}
	return price - f.Amount
}

// Context
type Checkout[T Number] struct {
	Strategy DiscountStrategy[T]
}

func (c *Checkout[T]) CalculateTotal(price T) T {
	return c.Strategy.Apply(price)
}
```
