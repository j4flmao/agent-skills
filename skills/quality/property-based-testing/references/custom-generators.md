# Custom Generators for Property-Based Testing

## Overview

Custom generators are the heart of property-based testing. They define how random data is produced for test inputs, allowing you to explore the full input space of your functions. This reference covers generator design, combinators, constraints, shrinking, and optimization techniques.

## Generator Design Fundamentals

### What is a Generator?

A generator produces random values of a specific type. In fast-check, generators are objects with a generate method that produces random values and a shrink method that produces smaller versions of failing values.

`	ypescript
import fc from 'fast-check'

// Built-in generators
fc.integer()           // Any integer
fc.string()            // Any string
fc.boolean()           // true or false
fc.date()              // Any date
fc.constant('hello')   // Always returns 'hello'
`

## Combinators

### Map

Transform the output of a generator:

`	ypescript
import fc from 'fast-check'

// Transform integer to percentage string
const percentage = fc.integer({ min: 0, max: 100 }).map((n) => n + '%')

fc.assert(
  fc.property(percentage, (p) => {
    expect(p).toMatch(/^\d+%$/)
  })
)

// Transform to a domain object
const userId = fc.uuid().map((id) => ({ id, type: 'user' as const }))
`

### FlatMap

Generate a value that depends on another generated value:

`	ypescript
import fc from 'fast-check'

// Generate an array with size determined by another generator
const sizedArray = fc.integer({ min: 1, max: 10 }).flatMap((size) =>
  fc.array(fc.integer(), { minLength: size, maxLength: size })
)

// Generate a string with a specific prefix
const prefixedString = fc.string().flatMap((s) =>
  fc.constant('prefix_' + s)
)
`

### Filter

Restrict generated values to those meeting a condition:

`	ypescript
import fc from 'fast-check'

// Even numbers only
const evenNumber = fc.integer().filter((n) => n % 2 === 0)

// Non-empty strings
const nonEmptyString = fc.string().filter((s) => s.length > 0)

// Valid email addresses (simplified)
const emailLike = fc
  .string({ minLength: 1 })
  .filter((s) => s.includes('@') && s.includes('.'))

// Warning: aggressive filtering can slow down generation
// Prefer constrained generators over filter when possible
`

### Chaining Combinators

Combinators compose to build complex generators:

`	ypescript
const complexGenerator = fc
  .integer({ min: 1, max: 100 })
  .filter((n) => n % 2 === 0)       // Even only
  .map((n) => n * 10)               // Multiply by 10
  .map((n) => ({ value: n, label: 'Number ' + n }))
`

## Sized Generators

### Controlling Size

`	ypescript
import fc from 'fast-check'

// Default size range
fc.array(fc.integer())                    // 0 to 10 elements by default

// Explicit size constraints
fc.array(fc.integer(), { minLength: 1, maxLength: 100 })  // 1-100 elements
fc.string({ minLength: 5, maxLength: 50 })                // 5-50 chars

// Size progression across test runs
fc.set(fc.integer(), { minLength: 0, maxLength: 20 })     // Sets (unique arrays)
`

### Custom Size Configuration

`	ypescript
// Configure size in test configuration
fc.assert(
  fc.property(fc.array(fc.integer()), (arr) => {
    expect(Array.isArray(arr)).toBe(true)
  }),
  {
    numRuns: 100,
    // Size controls how "large" generated values tend to be
    // 0 = smallest, 100 = largest (default: 100)
    size: '=50',   // Fixed at 50% of max
    // size: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'
  }
)
`

## Biased Generators

### Default Biasing

fast-check uses biased generation by default: it starts with small values and gradually increases complexity:

`	ypescript
// Default: biased toward smaller/shorter values initially
fc.integer()       // More likely to generate 0, 1, -1, etc.
fc.string()        // More likely to generate short strings
fc.array(fc.integer()) // More likely to generate small arrays
`

### Custom Biasing

`	ypescript
import fc from 'fast-check'

// Unbiased (purely random)
fc.integer().noBias()

// Custom bias function
const biasedInteger = fc
  .integer({ min: -1000, max: 1000 })
  .noBias()
  .map((n) => n * 100) // Transform to larger range

// Weighted choice between small and large values
const mixedSizeArray = fc.oneof(
  fc.array(fc.integer(), { minLength: 0, maxLength: 3 }),   // Small arrays
  fc.array(fc.integer(), { minLength: 10, maxLength: 50 }), // Large arrays
)
`

## Generating Complex Objects

### Records and Objects

`	ypescript
import fc from 'fast-check'

// Simple object
const point = fc.record({
  x: fc.integer(),
  y: fc.integer(),
})

// Nested object
const user = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  age: fc.integer({ min: 0, max: 150 }),
  address: fc.record({
    street: fc.string(),
    city: fc.string(),
    zipCode: fc.string(),
  }),
  roles: fc.array(fc.constantFrom('admin', 'user', 'viewer')),
  createdAt: fc.date(),
  isActive: fc.boolean(),
})
`

### Partially Defined Objects

`	ypescript
// Optional fields with fc.option
const config = fc.record({
  host: fc.string(),
  port: fc.option(fc.integer({ min: 1024, max: 65535 })),
  timeout: fc.option(fc.integer({ min: 1000, max: 30000 })),
  retries: fc.option(fc.integer({ min: 0, max: 5 })),
})

// One of several shapes
const shape = fc.union(
  fc.record({ type: fc.constant('circle'), radius: fc.float({ min: 0 }) }),
  fc.record({ type: fc.constant('rectangle'), width: fc.float({ min: 0 }), height: fc.float({ min: 0 }) }),
  fc.record({ type: fc.constant('triangle'), base: fc.float({ min: 0 }), height: fc.float({ min: 0 }) }),
)
`

## Constrained Generation

### Valid Email Addresses

`	ypescript
import fc from 'fast-check'

// Built-in email generator
fc.emailAddress()

// Custom email with specific domain
const companyEmail = fc
  .string({ minLength: 3, maxLength: 20 })
  .filter((s) => /^[a-z0-9._%+-]+$/.test(s))
  .map((local) => local + '@company.com')
`

### Specific Formats

`	ypescript
// IPv4 address
const ipv4 = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([a, b, c, d]) => a + '.' + b + '.' + c + '.' + d)

// Hex color
const hexColor = fc
  .hexadecimal({ minLength: 6, maxLength: 6 })
  .map((hex) => '#' + hex)

// ISO date string
const isoDate = fc
  .date()
  .map((d) => d.toISOString().split('T')[0])

// URL path
const urlPath = fc.array(fc.string({ minLength: 1, maxLength: 10 })).map(
  (parts) => '/' + parts.join('/')
)
`

## Generating Collections with Constraints

### Arrays with Constraints

`	ypescript
import fc from 'fast-check'

// Unique items
const uniqueItems = fc.set(fc.integer(), { minLength: 1, maxLength: 20 })

// Sorted array
const sortedArray = fc
  .array(fc.integer())
  .map((arr) => [...arr].sort((a, b) => a - b))

// Array with no duplicates in a specific field
interface Item { id: number; name: string }
const uniqueById = fc
  .array(
    fc.record({ id: fc.uuid(), name: fc.string() }),
    { minLength: 1, maxLength: 10 }
  )
  .map((items) => {
    // Ensure unique IDs
    const unique = new Map(items.map((item) => [item.id, item]))
    return Array.from(unique.values())
  })
`

### Matrices

`	ypescript
// Generate a matrix of integers
const matrix = fc
  .integer({ min: 1, max: 10 })
  .chain((rows) =>
    fc
      .integer({ min: 1, max: 10 })
      .chain((cols) =>
        fc.array(fc.array(fc.integer(), { minLength: cols, maxLength: cols }), {
          minLength: rows,
          maxLength: rows,
        })
      )
  )
`

## Random vs Deterministic Seeds

### Seed Control

`	ypescript
import fc from 'fast-check'

// Test with a specific seed for reproducibility
fc.assert(
  fc.property(fc.integer(), fc.integer(), (a, b) => {
    return a + b === b + a
  }),
  { seed: 123456, path: '0:1:2' }
)

// Get the seed from a failing test to reproduce
// fast-check outputs: "Encountered failures on seed: 123456"
// Re-run with the same seed to debug
`

### Reproducing Failures

`	ypescript
// When a test fails, fast-check outputs:
// "Seed: 123456, Path: 2:4:6:..."

// Reproduce the exact failing case
fc.assert(
  fc.property(myGenerator, (value) => {
    expect(myFunction(value)).toBe(true)
  }),
  {
    seed: 123456,     // From the failure output
    path: '2:4:6:...', // From the failure output
    // This will generate the exact same sequence that failed
  }
)
`

## Shrinking Custom Generators

### How Shrinking Works

When a property fails, fast-check tries to find the smallest failing value. For custom generators, shrinking behavior must be defined:

`	ypescript
import fc from 'fast-check'

// Built-in shinking: integers shrink toward 0, strings shrink in length, etc.
// Custom generators built with map() shrink automatically
const positiveInt = fc.integer({ min: 0, max: 1000 })
// Shrinks toward 0

// Filter-based generators preserve shrinking
const evenInt = fc.integer().filter((n) => n % 2 === 0)
// Shrinks toward 0 but only produces even numbers

// FlatMap generators shrink through the first dimension first
const sizedString = fc.integer({ min: 1, max: 100 }).flatMap(
  (size) => fc.string({ minLength: size, maxLength: size })
)
// Shrinks size first, then string content
`

### Custom Shrinking with fc.convertFromNext

For full control over shrinking:

`	ypescript
const customShrinkingGenerator = fc.convertFromNext(
  fc.createGen(
    (context) => {
      // Generate a value
      const value = context.random.nextInt(0, 100)
      return context.valueAuthority(value)
    },
    (value, context) => {
      // Shrink: produce smaller values
      // Returns an iterator of smaller values
      const shrunk = []
      for (let i = value - 1; i >= 0; i -= Math.max(1, Math.floor(value / 10))) {
        shrunk.push(context.valueAuthority(i))
      }
      return shrunk[Symbol.iterator]()
    }
  )
)
`

### Shrinking Tips

- **map**: Preserves parent shrinking
- **filter**: Preserves shrinking but may fail to shrink if filter rejects too many
- **flatMap**: Shrinks first dimension first
- **chain**: Similar to flatMap but with different semantics
- **oneof**: Tries shrinking within the selected branch first
- Avoid heavy ilter usage — it can break shrinking
- Use constrained generators instead of filter when possible

## Context-Dependent Generators

### Generating Values Based on Previous Values

`	ypescript
// Generate strictly increasing integers
const increasingSequence = fc
  .array(fc.integer(), { minLength: 1, maxLength: 10 })
  .map((arr) => {
    let current = 0
    return arr.map((n) => {
      current += Math.abs(n) + 1  // Ensure strictly positive increments
      return current
    })
  })
`

### Generating Valid State Transitions

`	ypescript
// Generate operations that form a valid sequence
type Op = { type: 'push'; value: number } | { type: 'pop' }

const validOps = fc
  .array(
    fc.oneof(
      { depth: 3 }, // Prefer push earlier
      fc.record({ type: fc.constant('push'), value: fc.integer() }),
      fc.record({ type: fc.constant('pop') })
    ),
    { minLength: 1, maxLength: 20 }
  )
  .map((ops) => {
    // Ensure pops never exceed pushes
    let depth = 0
    const valid: Op[] = []
    for (const op of ops) {
      if (op.type === 'pop' && depth === 0) continue // Skip invalid pop
      if (op.type === 'push') depth++
      if (op.type === 'pop') depth--
      valid.push(op)
    }
    return valid
  })
`

## Arbitraries for Domain Objects

### Complex Domain Generator Example

`	ypescript
import fc from 'fast-check'

// Define domain types
interface Order {
  id: string
  customerId: string
  items: OrderItem[]
  shippingAddress: Address
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  createdAt: Date
}

interface OrderItem {
  productId: string
  quantity: number
  unitPrice: number
}

interface Address {
  street: string
  city: string
  country: string
  zipCode: string
}

// Build generators for each type
const addressArbitrary: fc.Arbitrary<Address> = fc.record({
  street: fc.string({ minLength: 5, maxLength: 50 }),
  city: fc.string({ minLength: 2, maxLength: 30 }),
  country: fc.constantFrom('US', 'UK', 'CA', 'DE', 'JP'),
  zipCode: fc.string({ minLength: 5, maxLength: 10 }),
})

const orderItemArbitrary: fc.Arbitrary<OrderItem> = fc.record({
  productId: fc.uuid(),
  quantity: fc.integer({ min: 1, max: 100 }),
  unitPrice: fc.float({ min: 0.01, max: 9999.99 }),
})

const orderArbitrary: fc.Arbitrary<Order> = fc.record({
  id: fc.uuid(),
  customerId: fc.uuid(),
  items: fc.array(orderItemArbitrary, { minLength: 1, maxLength: 20 }),
  shippingAddress: addressArbitrary,
  status: fc.constantFrom('pending', 'paid', 'shipped', 'delivered', 'cancelled'),
  total: fc.float({ min: 0, max: 999999 }),
  createdAt: fc.date(),
})

// Use in property tests
describe('Order Processing', () => {
  it('should calculate total correctly', () => {
    fc.assert(
      fc.property(orderArbitrary, (order) => {
        const expectedTotal = order.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        )
        expect(calculateTotal(order)).toBeCloseTo(expectedTotal, 2)
      })
    )
  })

  it('should validate shipping address for paid orders', () => {
    fc.assert(
      fc.property(orderArbitrary, (order) => {
        const paidOrder = { ...order, status: 'paid' as const }
        const result = validateOrder(paidOrder)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    )
  })
})
`

## Performance Optimizations

### Generator Performance Tips

`	ypescript
// SLOW: Heavy filtering
const slowGen = fc.integer({ min: 1, max: 1000000 })
  .filter((n) => isPrime(n))

// FAST: Constrain at generation time
const fastGen = fc.integer({ min: 1, max: 100 }).map((n) => nthPrime(n))

// SLOW: Deep flatMap chains with dependencies
const slowChain = fc.integer().flatMap((a) =>
  fc.integer().flatMap((b) =>
    fc.integer().flatMap((c) =>
      fc.constant([a, b, c])
    )
  )
)

// FAST: Use tuple for independent values
const fastChain = fc
  .tuple(fc.integer(), fc.integer(), fc.integer())
  .map(([a, b, c]) => [a, b, c])
`

### Reducing Test Runs

`	ypescript
// Default: 100 runs per test
fc.assert(fc.property(gen, (v) => true))

// Fewer runs for expensive tests
fc.assert(fc.property(gen, (v) => true), { numRuns: 20 })

// More runs for thorough testing
fc.assert(fc.property(gen, (v) => true), { numRuns: 1000 })
`

## Property-Based Testing with Custom Generators in Other Languages

### jqwik (Java)

`java
import net.jqwik.api.*;

class CustomGeneratorsExample {
    @Provide
    Arbitrary<Point> points() {
        return Combinators.combine(
            Arbitraries.integers().between(-100, 100),
            Arbitraries.integers().between(-100, 100)
        ).as(Point::new);
    }

    @Property
    boolean distanceIsCommutative(@ForAll("points") Point a, @ForAll("points") Point b) {
        return a.distanceTo(b) == b.distanceTo(a);
    }
}
`

### scalacheck (Scala)

`scala
import org.scalacheck._

object CustomGenerators {
  val evenInt: Gen[Int] = for {
    n <- Gen.choose(-1000, 1000)
  } yield n * 2

  val user: Gen[User] = for {
    id <- Gen.uuid
    name <- Gen.alphaStr.suchThat(_.nonEmpty)
    age <- Gen.choose(0, 150)
    roles <- Gen.listOf(Gen.oneOf("admin", "user", "viewer"))
  } yield User(id, name, age, roles)
}
`

## Key Points

- Generators produce random values; combinators (map, flatMap, filter) transform them
- Map preserves shrinking; filter can degrade shrinking performance
- Use constrained generators over aggressive filtering for better performance
- Size controls how large generated values tend to be
- Biased generation starts with small values, gradually increasing complexity
- Custom objects use c.record with field-specific generators
- Optional fields use c.option; unions use c.oneof
- Seeds enable reproducible test failures for debugging
- Shrinking finds minimal failing values — design generators with good shrink behavior
- Performance vs thoroughness: adjust numRuns and maxLength for the test context
