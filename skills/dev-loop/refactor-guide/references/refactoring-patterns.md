# Advanced Refactoring Patterns

## Extract Class

When a class has too many responsibilities, extract cohesive subsets into their own classes.

```typescript
// Before: UserService handles auth, profile, and notifications
class UserService {
  async login(email: string, password: string) { /* ... */ }
  async updateProfile(userId: string, data: ProfileData) { /* ... */ }
  async sendWelcomeEmail(userId: string) { /* ... */ }
  async sendPasswordReset(email: string) { /* ... */ }
}

// After: extracted into focused classes
class AuthService {
  async login(email: string, password: string) { /* ... */ }
}

class ProfileService {
  async update(userId: string, data: ProfileData) { /* ... */ }
}

class NotificationService {
  async sendWelcome(userId: string) { /* ... */ }
  async sendPasswordReset(email: string) { /* ... */ }
}
```

## Replace Data Value with Object

When a simple value has behavior associated with it.

```typescript
// Before
function isAdult(age: number): boolean {
  return age >= 18
}

function formatUser(name: string, age: number): string {
  return `${name} (${age} years old)`
}

// After
class Age {
  constructor(private readonly value: number) {
    if (value < 0 || value > 150) throw new Error('Invalid age')
  }

  isAdult(): boolean { return this.value >= 18 }
  toString(): string { return `${this.value} years old` }
}

class User {
  constructor(
    readonly name: string,
    readonly age: Age
  ) {}

  format(): string {
    return `${this.name} (${this.age})`
  }
}
```

## Replace Type Code with Subclasses

When a field determines behavior, replace it with polymorphic subclasses.

```typescript
// Before
type EmployeeType = 'engineer' | 'manager' | 'salesman'

class Employee {
  constructor(private type: EmployeeType) {}

  get bonus(): number {
    switch (this.type) {
      case 'engineer': return this.salary * 0.1
      case 'manager': return this.salary * 0.2
      case 'salesman': return this.salary * 0.05 + this.commission
    }
  }
}

// After
abstract class Employee {
  abstract get bonus(): number
}

class Engineer extends Employee {
  get bonus() { return this.salary * 0.1 }
}

class Manager extends Employee {
  get bonus() { return this.salary * 0.2 }
}

class Salesman extends Employee {
  get bonus() { return this.salary * 0.05 + this.commission }
}
```

## Replace Parameter with Explicit Methods

When a method has a boolean flag changing behavior.

```typescript
// Before
class Booking {
  book(customer: Customer, isPremium: boolean) {
    if (isPremium) {
      // Premium booking logic
    } else {
      // Standard booking logic
    }
  }
}

// After
class Booking {
  book(customer: Customer) {
    // Standard booking
  }

  bookPremium(customer: Customer) {
    // Premium booking logic
  }
}
```

## Introduce Null Object

Replace null checks with a null object that implements the same interface.

```typescript
// Before
function getDiscount(customer: Customer | null): number {
  if (customer === null) return 0
  return customer.discount
}

// After
interface Customer {
  get discount(): number
  get name(): string
}

class AnonymousCustomer implements Customer {
  get discount() { return 0 }
  get name() { return 'Guest' }
}

class RegisteredCustomer implements Customer {
  constructor(private data: CustomerData) {}
  get discount() { return this.data.discount }
  get name() { return this.data.name }
}

// No null checks needed
function getDiscount(customer: Customer): number {
  return customer.discount
}
```

## Decompose Conditional

When a complex conditional is hard to understand, extract each branch.

```typescript
// Before
function calculateCharge(date: Date, quantity: number, plan: Plan): number {
  if (!date.isSummer() || date.isWeekend()) {
    return quantity * plan.summerRate + plan.summerServiceCharge
  } else {
    return quantity * plan.regularRate + plan.regularServiceCharge
  }
}

// After
function calculateCharge(date: Date, quantity: number, plan: Plan): number {
  return isSummer(date, plan)
    ? summerCharge(quantity, plan)
    : regularCharge(quantity, plan)
}

function isSummer(date: Date, plan: Plan): boolean {
  return date.isSummer() && !date.isWeekend()
}

function summerCharge(quantity: number, plan: Plan): number {
  return quantity * plan.summerRate + plan.summerServiceCharge
}

function regularCharge(quantity: number, plan: Plan): number {
  return quantity * plan.regularRate + plan.regularServiceCharge
}
```

## Consolidate Duplicate Conditional Fragments

When the same code appears in all branches of a conditional.

```typescript
// Before
if (isSpecialDeal()) {
  total = price * 0.95
  sendInvoice()
} else {
  total = price * 0.98
  sendInvoice()
}

// After
if (isSpecialDeal()) {
  total = price * 0.95
} else {
  total = price * 0.98
}
sendInvoice()  // Extracted once
```

## Replace Inheritance with Delegation

When a subclass only uses part of the parent's interface.

```typescript
// Before: A Stack doesn't need all List operations
class Stack<T> extends List<T> {
  push(item: T) { this.add(item) }
  pop(): T { return this.remove(this.size() - 1) }
}

// After: Delegation instead of inheritance
class Stack<T> {
  private items: T[] = []

  push(item: T) { this.items.push(item) }
  pop(): T { return this.items.pop()! }
  get size() { return this.items.length }
}
```

## Choose Your Weapon: Refactoring Decision Matrix

| Situation | Recommended Pattern | Risk |
|-----------|-------------------|------|
| Long method (50+ lines) | Extract Function | Low |
| Large class (500+ lines) | Extract Class | Medium |
| Complex conditionals | Decompose Conditional | Low |
| Switch on type | Replace Conditional with Polymorphism | Medium |
| Magic numbers | Replace Magic Number with Constant | Low |
| Null checks everywhere | Introduce Null Object | Low |
| Boolean parameter | Replace Parameter with Explicit Methods | Low |
| Primitive obsession | Replace Data Value with Object | Low |
| Feature envy | Move Function | Medium |
| Shotgun surgery | Move + Inline + Extract to consolidate | High |

## Refactoring Workflow for Large Codebases

### Incremental Approach

1. **Identify seams** — Find natural boundaries (module borders, interface definitions)
2. **Write characterization tests** — Lock current behavior with broad tests
3. **Extract interface** — Create interface for the component to refactor
4. **Switch consumers** — One by one, switch callers to use the interface
5. **Replace implementation** — Swap old implementation with new one
6. **Remove old code** — Delete original after all consumers migrated

### Strangler Fig Pattern

```typescript
// Phase 1: Add new code alongside old
const newPaymentService = new NewPaymentService()

// Phase 2: Route new consumers to new service
function createPayment(method: string, amount: number) {
  if (featureFlags.isEnabled('new-payment-flow')) {
    return newPaymentService.charge(method, amount)
  }
  return legacyPaymentService.charge(method, amount)
}

// Phase 3: Migrate all consumers to new service
// Phase 4: Remove old service and feature flag
```

### Branch by Abstraction

```typescript
// Step 1: Create abstraction
interface PaymentGateway {
  charge(amount: number): Promise<PaymentResult>
}

// Step 2: Wrap old implementation
class LegacyGateway implements PaymentGateway {
  async charge(amount: number) { return legacyApi.process(amount) }
}

// Step 3: Create new implementation
class StripeGateway implements PaymentGateway {
  async charge(amount: number) { return stripe.charges.create({ amount }) }
}

// Step 4: Switch at runtime
class PaymentService {
  constructor(
    private gateway: PaymentGateway = new LegacyGateway()
  ) {}

  async migrateToStripe() {
    this.gateway = new StripeGateway()
  }
}
```

## Testing Strategies During Refactoring

- **Characterization tests**: Run the code with known inputs, capture outputs as expected values
- **Snapshot tests**: Capture entire output as a snapshot to detect unintended changes
- **Golden file tests**: Compare output against known-good files
- **Approval tests**: Review output changes during refactoring

```typescript
// Characterization test (locks current behavior)
describe('legacy price calculation', () => {
  it('produces expected output for known inputs', () => {
    const result = calculatePrice({ items: 3, coupon: 'SAVE10' })
    expect(result).toMatchSnapshot()  // Captures current behavior
  })
})
```

## Refactoring Anti-Patterns

| Anti-Pattern | Why It's Harmful | Better Approach |
|-------------|-----------------|-----------------|
| Big bang refactor | High risk, long feedback loop, blocks other work | Incremental, strangler fig |
| Gold-plating | Adds complexity without clear benefit | Refactor only when there's a concrete need (Rule of Three) |
| Refactoring without tests | No safety net, behavior changes go undetected | Write characterization tests first |
| Mixing refactoring with features | Diff contains both structural and behavioral changes | Separate PRs for refactoring and features |
| Over-engineering | Premature abstraction, flexibility for imaginary needs | YAGNI — simplest thing that works |
| Rename everything | Cosmetic changes create merge conflicts, obscure real changes | Rename only when names are actively misleading |
