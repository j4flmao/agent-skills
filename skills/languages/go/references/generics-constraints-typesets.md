# Go: Constraints and Type Sets

## 1. Approximation Constraints (`~`)
When defining constraints, using the tilde `~` allows the constraint to match the *underlying* type, meaning it supports custom type aliases.

```go
// Constraint matching underlying types
type Integer interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64
}

// Custom type
type UserID int

// Because of ~, UserID is allowed here.
func Double[T Integer](val T) T {
    return val * 2
}
```

## 2. The `comparable` Built-in
`comparable` is an interface implemented by all types that can be compared using `==` and `!=`. This is strictly required when writing generic Maps or Sets, as map keys must be comparable.

```go
type Set[T comparable] map[T]struct{}

func (s Set[T]) Add(v T) {
    s[v] = struct{}{}
}
```

## 3. Intersection in Interfaces
An interface in Go generics defines a "Type Set". You can intersect method sets with type approximations.
```go
// T must be an int/string AND must have a String() method
type SpecialStringer interface {
    ~int | ~string
    String() string
}
```
