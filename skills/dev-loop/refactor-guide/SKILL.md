---
name: dev-loop-refactor-guide
description: >
  Use when the user asks about code refactoring, refactoring strategies, code smells, improving code structure, extracting functions/classes, or legacy code modernization. Do NOT use for: debugging (dev-loop-debugging-strategy), or performance optimization (dev-loop-performance-profiler).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, refactoring, code-quality]
---

# Refactoring Guide

## Purpose
Systematically improve code structure, readability, maintainability, and extensibility without changing external behavior — applying proven refactoring techniques, identifying code smells, and establishing refactoring workflows that reduce technical debt safely.

## Agent Protocol

### Trigger
Exact user phrases: "refactor", "code smell", "technical debt", "improve code", "clean up code", "extract method", "restructure", "modernize", "legacy code", "refactoring strategy", "decouple", "extract class".

### Input Context
- Codebase size and age (new project → legacy codebase)
- Language and framework (affects available refactoring tools)
- Current pain points (duplication, long methods, tight coupling, slow tests)
- Test coverage (% and quality)
- Refactoring goal (improve readability, enable new feature, reduce bugs, pay down debt)
- Risk tolerance (safety-critical, high-traffic, low-risk internal tool)

### Output Artifact
Refactoring plan with prioritized code smells, technique application, and verification strategy.

### Completion Criteria
- [ ] Code smells identified and cataloged
- [ ] Refactoring techniques selected for each smell
- [ ] Refactoring order prioritized (high value, low risk first)
- [ ] Test coverage verified for code being refactored
- [ ] Refactoring applied incrementally (one change at a time)
- [ ] Behavior preserved (tests pass before/after)
- [ ] Code review completed for refactoring PRs
- [ ] Documentation updated if API changed

### Max Response Length
200 lines.

## Framework/Methodology

### Refactoring Decision Tree
```
What is the primary code quality issue?
├── Duplicated code → Extract method / Extract class
├── Long method (>20 lines) → Extract method / Replace temp with query
├── Large class (>300 lines) → Extract class / Extract interface
├── Too many parameters (>3) → Introduce parameter object
├── Feature envy → Move method / Extract class
├── Switch/if-else chain → Replace with strategy / polymorphism
├── Data clump → Introduce parameter object / Extract class
├── Shotgun surgery (one change = many files) → Move method / Inline class
├── Divergent change (file changes for multiple reasons) → Extract class per concern
├── Speculative generality → Inline class / Collapse hierarchy
├── Message chain (a.b().c().d()) → Hide delegate / Extract method
└── Primitive obsession → Replace primitive with value object
```

### Refactoring Rule of Three
```
First time:   Do it (get it working)
Second time:  Duplicate it (get it working again)
Third time:   Refactor it (eliminate duplication)

Don't refactor on first occurrence — you don't understand the pattern yet.
```

### The Cambrian Explosion Trap
When refactoring, resist the urge to create the "perfect" abstraction immediately.
Instead, make the simplest change that improves the code, then iterate.

```
Strategy:
1. Identify the smell
2. Apply the minimal refactoring technique
3. Run tests (verify behavior preserved)
4. Commit
5. Repeat
```

## Workflow

### Step 1: Identify Code Smells

```typescript
// SMELL: Long method (>20 lines)
// SMELL: Deep nesting (arrow code)
function processOrder(order: Order, user: User, config: Config): Promise<Result> {
  if (order && order.items && order.items.length > 0) {
    if (user && user.isActive) {
      if (config && config.enabled) {
        let total = 0;
        for (const item of order.items) {
          if (item.price && item.quantity) {
            total += item.price * item.quantity;
            if (item.discount) {
              total -= item.discount;
            }
          }
        }
        if (total > 0) {
          if (user.balance >= total) {
            user.balance -= total;
            return saveOrder(order, user, total);
          } else {
            throw new Error('Insufficient balance');
          }
        } else {
          throw new Error('Invalid total');
        }
      } else {
        throw new Error('Config not enabled');
      }
    } else {
      throw new Error('User not active');
    }
  } else {
    throw new Error('Invalid order');
  }
}
```

```typescript
// SMELL: Primitive obsession (using string for concept)
function sendEmail(to: string, from: string, subject: string, body: string, cc?: string, bcc?: string, replyTo?: string) {
  // ...
}

// SMELL: Feature envy (method uses more from other class)
class OrderService {
  generateInvoice(order: Order): Invoice {
    const invoice = new Invoice();
    invoice.customerName = order.customer.name;
    invoice.customerEmail = order.customer.email; // Uses Customer fields
    invoice.customerAddress = order.customer.shippingAddress; // More Customer
    invoice.items = order.items;
    invoice.total = order.calculateTotal();
    return invoice;
  }
}

// SMELL: Shotgun surgery
// Changing shipping logic requires editing: OrderService, ShippingCalculator,
// ShippingController, ShippingValidator, ShippingRepository
```

### Step 2: Apply Refactoring Techniques

```typescript
// REFACTOR 1: Extract method + guard clauses
async function processOrder(order: Order, user: User, config: Config): Promise<Result> {
  validateOrderInputs(order, user, config);

  const total = calculateOrderTotal(order);
  validateUserBalance(user, total);

  user.balance -= total;
  return saveOrder(order, user, total);
}

function validateOrderInputs(order: Order | null, user: User | null, config: Config | null): void {
  if (!order?.items?.length) throw new Error('Invalid order');
  if (!user?.isActive) throw new Error('User not active');
  if (!config?.enabled) throw new Error('Config not enabled');
}

function calculateOrderTotal(order: Order): number {
  return order.items.reduce((total, item) => {
    const lineTotal = (item.price ?? 0) * (item.quantity ?? 0);
    return total + lineTotal - (item.discount ?? 0);
  }, 0);
}

function validateUserBalance(user: User, requiredAmount: number): void {
  if (user.balance < requiredAmount) {
    throw new Error('Insufficient balance');
  }
}
```

```typescript
// REFACTOR 2: Introduce parameter object
interface EmailConfig {
  to: string;
  from: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}

function sendEmail(config: EmailConfig): void {
  // ...
}
```

```typescript
// REFACTOR 3: Move method (feature envy fix)
class Customer {
  // ... fields ...
  generateInvoice(order: Order): Invoice {
    return new Invoice({
      name: this.name,
      email: this.email,
      address: this.shippingAddress,
      items: order.items,
      total: order.calculateTotal(),
    });
  }
}
```

```typescript
// REFACTOR 4: Replace primitive with value object
class Email {
  constructor(private readonly value: string) {
    if (!value.includes('@')) throw new Error('Invalid email');
  }

  toString(): string { return this.value; }
  get domain(): string { return this.value.split('@')[1]; }
  get local(): string { return this.value.split('@')[0]; }
}

function sendEmail(to: Email, from: Email, ...): void { ... }
```

### Step 3: Refactoring Workflow

```yaml
refactoring_workflow:
  step_1:
    action: "Identify the smell"
    output: "Clear understanding of what's wrong"
    example: "This function has 7 responsibilities"
  step_2:
    action: "Ensure test coverage"
    check: "Existing tests cover the behavior being refactored"
    fallback: "Write characterization tests first"
  step_3:
    action: "Apply ONE refactoring technique"
    rule: "Only one structural change per commit"
    example: "Extract method for validation logic only"
  step_4:
    action: "Run tests"
    expectation: "All tests pass (behavior preserved)"
    if_fails: "Undo the change (the technique was wrong)"
  step_5:
    action: "Commit"
    message: "refactor: extract validation logic from processOrder"
  step_6:
    action: "Repeat"
    next: "Next smell or next technique on same code"
```

### Step 4: Legacy Code Refactoring Strategy

```yaml
legacy_refactoring:
  principles:
    - "Never refactor without tests (write characterization tests first)"
    - "Sprout method/class — add new code in new structure, then redirect"
    - "Wrap existing code before extracting"
    - "Change structure and behavior one at a time, never both"

  characterization_tests:
    - "Write tests that capture CURRENT behavior"
    - "Include edge cases that might seem wrong (known bugs)"
    - "Test at API boundaries, not internals"
    - "Accept current behavior as 'correct' for test purposes"

  sprout_method:
    - "1. Identify where new code would go"
    - "2. Write the new code in a NEW method"
    - "3. Call the new method from the existing code"
    - "4. The old code stays unchanged"

  sprout_class:
    - "1. Identify the new responsibility"
    - "2. Create a new class with the new code"
    - "3. Pass existing dependencies to the new class"
    - "4. Replace inline logic with delegated call"

  wrap_method:
    - "1. Rename the existing method to oldMethod"
    - "2. Create new method with original name"
    - "3. New method calls oldMethod with any pre/post processing"
    - "4. Gradually inline oldMethod calls into newMethod"
```

### Step 5: Verify Behavior Preservation

```typescript
// Tests MUST pass before and after refactoring (same tests)
describe('processOrder', () => {
  it('should reject null order', async () => {
    await expect(processOrder(null, user, config)).rejects.toThrow('Invalid order');
  });

  it('should reject inactive user', async () => {
    await expect(processOrder(validOrder, inactiveUser, config)).rejects.toThrow('User not active');
  });

  it('should reject insufficient balance', async () => {
    await expect(processOrder(validOrder, poorUser, config)).rejects.toThrow('Insufficient balance');
  });

  it('should deduct from user balance', async () => {
    const result = await processOrder(validOrder, richUser, config);
    expect(richUser.balance).toBe(initialBalance - expectedTotal);
  });

  // All characterizations of behavior preserved
});
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Refactoring without tests | Can't verify behavior preserved | Write characterization tests first |
| Too big a refactoring | Many changes at once = many bugs | One technique per commit |
| Refactoring AND adding features | Confuse structural and behavioral changes | Dedicated refactoring sessions/commits |
| Perfect abstraction syndrome | Over-engineering for hypothetical needs | Rule of three — wait for the third occurrence |
| Renaming while restructuring | Impossible to review diff | One commit for rename, another for restructure |
| Missing API documentation | Nobody knows the new interface | Update docs in same PR as refactoring |
| Refactoring hot code | High-traffic production code without safety net | Use feature flags, canary deploy |
| Not getting review | Missed behavioral changes | Always PR refactoring changes |
| Pre-mature optimization couched as refactoring | "Refactoring to make it faster" without data | Measure first, optimize second |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| One refactoring per commit | Atomic, reviewable, reversible |
| Test before and after | Verify behavior is preserved |
| Smaller, more frequent refactorings | Less risk, easier to review |
| Don't mix refactor and feature | Two different concerns in one PR |
| Use IDE refactoring tools (rename, extract) | Automated, less error-prone |
| Write characterization tests for legacy code | Capture behavior before changing structure |
| Follow the Scout Rule | Leave code cleaner than you found it |
| Document the motivation | Why this refactoring, what problem it solves |
| Involve the team | Shared understanding of code quality standards |

## References
  - references/refactor-guide-advanced.md — Refactoring Advanced Topics
  - references/refactor-guide-code-smells.md — Code Smells Reference
  - references/refactor-guide-fundamentals.md — Refactoring Fundamentals
  - references/refactor-guide-techniques.md — Refactoring Techniques Reference
## Handoff
Hand off to `dev-loop-code-review` for refactoring PR review. Hand off to `dev-loop-tech-debt-tracker` for debt tracking.
