# Refactoring Techniques

## Composing Methods

### Extract Method
```typescript
// Before
function processOrder(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = subtotal * 0.08
  const discount = order.coupon ? subtotal * 0.1 : 0
  return subtotal + tax - discount
}

// After
function processOrder(order) {
  const subtotal = calculateSubtotal(order.items)
  const tax = calculateTax(subtotal)
  const discount = calculateDiscount(subtotal, order.coupon)
  return subtotal + tax - discount
}

function calculateSubtotal(items) { return items.reduce((s, i) => s + i.price * i.qty, 0) }
function calculateTax(subtotal) { return subtotal * 0.08 }
function calculateDiscount(subtotal, coupon) { return coupon ? subtotal * 0.1 : 0 }
```

### Inline Method
- Use when a method is thin and just delegates
- Only if the method name is no clearer than the body

### Extract Variable
- Replace complex expression with named variable
- Especially useful for repeated sub-expressions

## Moving Features

### Move Field/Method
- When a field is used more by another class than its own
- When a method references another class more than its own

### Extract Class
- When a class has too many responsibilities
- Group related fields and methods into a new class

## Organizing Data

### Replace Magic Number with Constant
```typescript
// Before
if (user.age >= 65) { return price * 0.8 }

// After
const SENIOR_DISCOUNT_AGE = 65
const SENIOR_DISCOUNT_RATE = 0.8
if (user.age >= SENIOR_DISCOUNT_AGE) { return price * SENIOR_DISCOUNT_RATE }
```

### Encapsulate Collection
- Return read-only views of internal collections
- Provide add/remove methods instead of direct access

## Simplifying Conditionals

### Decompose Conditional
```typescript
// Before
if (date.isAfter(expiry) || (user.tier === 'free' && usage > 1000)) {
  // block
}

// After
if (isSubscriptionExpired(date, expiry) || isFreeTierExceeded(user, usage)) {
  // block
}
```

### Replace Nested Conditional with Guard Clauses
```typescript
function process(data) {
  if (!data) return { error: 'No data' }
  if (!data.isValid()) return { error: 'Invalid data' }
  if (data.isProcessed()) return { status: 'already_processed' }
  return transform(data)
}
```

## Refactoring by Abstraction

### Extract Interface
```typescript
interface PaymentProcessor {
  charge(amount: number, token: string): Promise<PaymentResult>
  refund(transactionId: string): Promise<RefundResult>
}
```

### Replace Inheritance with Delegation
- Prefer composition over inheritance
- Extract shared behavior into separate strategy objects

## Code Smell Severity Matrix

| Smell | Severity | Frequency | Refactor Priority |
|-------|----------|-----------|-------------------|
| Long Method | High | Medium | Immediate |
| Large Class | High | Low | Sprint planning |
| Feature Envy | Medium | Medium | Next sprint |
| Switch Statements | Medium | Medium | Next sprint |
| Primitive Obsession | Low | High | Ongoing |
| Data Clumps | Low | High | Ongoing |
| Comments | Low | Very High | During changes |
