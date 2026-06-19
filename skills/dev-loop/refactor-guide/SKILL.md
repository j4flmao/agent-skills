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
## Implementation Patterns

### Code Smell Detector

```python
import ast
import re
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class CodeSmell:
    type: str
    location: str
    description: str
    severity: str
    suggestion: str

class PythonSmellDetector:
    def __init__(self, source_code: str, filepath: str = "<unknown>"):
        self.source = source_code
        self.filepath = filepath
        self.tree = ast.parse(source_code)
        self.smells: List[CodeSmell] = []

    def detect_all(self) -> List[CodeSmell]:
        self.detect_long_function()
        self.detect_too_many_params()
        self.detect_god_class()
        self.detect_duplicated_code()
        self.detect_magic_numbers()
        self.detect_dead_code()
        return self.smells

    def detect_long_function(self, max_lines: int = 50):
        for node in ast.walk(self.tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                lines = node.end_lineno - node.lineno if hasattr(node, 'end_lineno') else 0
                if lines > max_lines:
                    self.smells.append(CodeSmell(
                        type="long_function",
                        location=f"{self.filepath}:{node.lineno} in {node.name}()",
                        description=f"Function {node.name}() is {lines} lines (max: {max_lines})",
                        severity="medium",
                        suggestion=f"Extract {lines - max_lines} lines into helper functions. "
                                   f"Look for groups of related logic (validation, formatting, I/O).",
                    ))

    def detect_too_many_params(self, max_params: int = 5):
        for node in ast.walk(self.tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                params = [a for a in node.args.args if a.arg != 'self']
                if len(params) > max_params:
                    self.smells.append(CodeSmell(
                        type="too_many_parameters",
                        location=f"{self.filepath}:{node.lineno} in {node.name}()",
                        description=f"{node.name}() has {len(params)} parameters (max: {max_params})",
                        severity="medium",
                        suggestion="Group related parameters into a dataclass or configuration object. "
                                   f"Params: {', '.join(p.arg for p in params)}",
                    ))

    def detect_god_class(self, max_methods: int = 20):
        for node in ast.walk(self.tree):
            if isinstance(node, ast.ClassDef):
                methods = [n for n in ast.walk(node) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                if len(methods) > max_methods:
                    self.smells.append(CodeSmell(
                        type="god_class",
                        location=f"{self.filepath}:{node.lineno} in class {node.name}",
                        description=f"Class {node.name} has {len(methods)} methods (max: {max_methods})",
                        severity="high",
                        suggestion=f"Split into {len(methods) // 10 + 1} focused classes. "
                                   f"Group methods by responsibility.",
                    ))

    def detect_magic_numbers(self):
        for node in ast.walk(self.tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                if node.value not in (0, 1, -1, 100) and node.col_offset is not None:
                    # Check if it's used in a comparison or assignment
                    parent = self._find_parent(node)
                    if parent and not isinstance(parent, ast.Assign):
                        self.smells.append(CodeSmell(
                            type="magic_number",
                            location=f"{self.filepath}:{node.lineno}",
                            description=f"Magic number {node.value}",
                            severity="low",
                            suggestion=f"Replace {node.value} with a named constant.",
                        ))

    def detect_dead_code(self):
        for node in ast.walk(self.tree):
            if isinstance(node, ast.FunctionDef):
                # Check if function has no calls anywhere
                name = node.name
                if name.startswith('_') and not self._is_called(name):
                    pass  # Private methods may be unused — flag only for public
                elif not name.startswith('_') and not self._is_called(name):
                    self.smells.append(CodeSmell(
                        type="dead_code",
                        location=f"{self.filepath}:{node.lineno}",
                        description=f"Public function {name}() appears to be unused",
                        severity="low",
                        suggestion=f"Remove {name}() or add a caller. If it's a public API, add a usage comment.",
                    ))

    def detect_duplicated_code(self):
        lines = self.source.split("\n")
        seen_blocks: Dict[str, List[int]] = {}
        for i in range(len(lines) - 4):
            # Check 4-line blocks for similarity
            block = "\n".join(lines[i:i+4])
            # Normalize whitespace
            normalized = re.sub(r'\s+', ' ', block.strip())
            if len(normalized) > 40:
                if normalized not in seen_blocks:
                    seen_blocks[normalized] = []
                seen_blocks[normalized].append(i + 1)
        for block, locations in seen_blocks.items():
            if len(locations) > 1:
                self.smells.append(CodeSmell(
                    type="duplicated_code",
                    location=f"{self.filepath}:{locations[0]}",
                    description=f"Duplicated block found at lines {locations}",
                    severity="medium",
                    suggestion="Extract the duplicated block into a shared function.",
                ))

    def _find_parent(self, target_node) -> Optional[ast.AST]:
        for node in ast.walk(self.tree):
            for child in ast.iter_child_nodes(node):
                if child is target_node:
                    return node
        return None

    def _is_called(self, name: str) -> bool:
        for node in ast.walk(self.tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == name:
                    return True
                if isinstance(node.func, ast.Attribute) and node.func.attr == name:
                    return True
        return False
```

### Strangler Fig Pattern Implementation

```python
from typing import Dict, Any, Callable, Optional
import re

class StranglerFigRouter:
    """
    Route traffic to new or legacy implementation based on migration state.
    Gradually replaces legacy code with new implementation.
    """
    def __init__(self):
        self.routes: Dict[str, Dict] = {}

    def register_route(
        self,
        pattern: str,
        new_impl: Callable,
        legacy_impl: Callable,
        migration_pct: float = 0.0,
    ):
        self.routes[pattern] = {
            "new": new_impl,
            "legacy": legacy_impl,
            "migration_pct": migration_pct,
            "active": False,
        }

    def set_migration_percentage(self, pattern: str, pct: float):
        if pattern in self.routes:
            self.routes[pattern]["migration_pct"] = pct
            self.routes[pattern]["active"] = pct > 0

    def route(self, request_path: str, context: Dict[str, Any] = None) -> Any:
        for pattern, route in self.routes.items():
            if re.match(pattern, request_path):
                if self._should_route_to_new(route, context):
                    return route["new"](context)
                return route["legacy"](context)
        raise ValueError(f"No route for {request_path}")

    def _should_route_to_new(self, route: Dict, context: Dict = None) -> bool:
        if route["migration_pct"] >= 100:
            return True
        if route["migration_pct"] <= 0:
            return False
        # Use request ID or user ID for deterministic routing
        identifier = str(context.get("request_id", context.get("user_id", "")))
        hash_val = sum(ord(c) for c in identifier)
        return (hash_val % 100) < route["migration_pct"]

    def get_migration_status(self) -> Dict[str, float]:
        return {
            pattern: route["migration_pct"]
            for pattern, route in self.routes.items()
        }
```

## Architecture Decision Trees

### Refactoring Approach Selection

```
What's the goal and risk level?
├── Improve readability (low risk)
│   └── Micro-refactoring: rename, extract, inline
│       ├── Works within a single function
│       ├── No behavior change
│       ├── Safe to do during feature work
│       └── Review: quick scan, no behavioral testing needed
│
├── Improve structure (medium risk)
│   ├── Extract class/module → Strangler Fig
│   ├── Split god function → Facade + delegates
│   ├── Replace conditional with polymorphism → Strategy pattern
│   └── Review: behavioral tests must pass, feature parity check
│
├── Improve performance (high risk)
│   ├── Algorithm replacement → Dual implementation with comparison
│   ├── Caching layer → Strangler Fig with shadow read
│   ├── Database optimization → Migration with rollback plan
│   └── Review: performance tests + behavioral tests + canary
│
└── Architecture change (very high risk)
    └── Strangler Fig Pattern
        ├── Monolith → Microservice
        ├── Synchronous → Async/event-driven
        ├── Old DB → New DB (dual-write + compare)
        └── Review: full integration tests, canary, rollback plan
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Big bang rewrite | Extremely high risk, months with no value | Incremental refactoring with Strangler Fig |
| Mixing refactor with feature | Can't distinguish bug in refactor vs feature | Separate PRs: refactor first, feature second |
| No tests before refactoring | Can't verify behavior preserved | Write characterization tests first |
| Over-engineering during refactor | Replacing simple with "clean" but complex | Keep it simple — refactor for clarity, not purity |
| Refactoring without business value | Wasted effort on code nobody touches | Refactor code that changes frequently |
| Changing public API without deprecation | Breaks all consumers | Deprecate, migration period, then remove |
| Ignoring the "why" | Team doesn't understand the motivation | Document motivation in PR description |
| One massive refactoring PR | Impossible to review | Multiple small PRs, each independently deployable |

## Performance Optimization

- **Characterization test generation**: Use AST analysis to auto-generate tests that capture current behavior. Run generated tests before and after refactoring to verify no behavioral change.
- **Incremental type annotation**: Use gradual type checking (e.g., mypy in non-strict mode). Add types to functions being refactored first. Let type checker catch regressions during refactoring.

## References
  - references/refactor-guide-advanced.md — Refactoring Advanced Topics
  - references/refactor-guide-code-smells.md — Code Smells Reference
  - references/refactor-guide-fundamentals.md — Refactoring Fundamentals
  - references/refactor-guide-techniques.md — Refactoring Techniques Reference

## Handoff
Hand off to `dev-loop-code-review` for refactoring PR review. Hand off to `dev-loop-tech-debt-tracker` for debt tracking.
