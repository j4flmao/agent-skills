# Stateful Testing (Deep)

## Overview

Stateful testing (also called model-based testing) verifies that a system maintains correct state across a sequence of operations. Instead of testing individual operations in isolation, stateful testing generates random sequences of commands and checks that the system state matches an expected model after each step.

## Core Concepts

### Model-Based Approach

Stateful testing uses a simplified model of the system to predict expected behavior:

`
Real System          Model (Simplified)
    │                       │
    ├── push(1) ────────────┤── push(1) → [1]
    ├── push(2) ────────────┤── push(2) → [1, 2]
    ├── pop()  ─────────────┤── pop() → returns 2, model: [1]
    └── peek() ──────────── ┤── peek() → returns 1, model: [1]
`

If the real system's behavior differs from the model, the test fails and fast-check shrinks the command sequence to the minimal failing case.

## fast-check Stateful Testing

### Basic Setup

`	ypescript
import fc from 'fast-check'
import { Stack } from './stack'

// Model: simplified representation of the system under test
interface StackModel {
  items: number[]
}

// Commands define operations on both the real system and the model
class PushCommand implements fc.Command<StackModel, Stack> {
  constructor(readonly value: number) {}

  check = (m: Readonly<StackModel>): boolean => true

  run = (m: StackModel, r: Stack): void => {
    // Update model
    m.items.push(this.value)
    // Execute on real system
    r.push(this.value)
  }

  toString = () => 'push(' + this.value + ')'
}

class PopCommand implements fc.Command<StackModel, Stack> {
  check = (m: Readonly<StackModel>): boolean => m.items.length > 0

  run = (m: StackModel, r: Stack): void => {
    const expected = m.items.pop()
    const actual = r.pop()
    // Assert: real system matches model
    expect(actual).toBe(expected)
  }

  toString = () => 'pop()'
}

class PeekCommand implements fc.Command<StackModel, Stack> {
  check = (m: Readonly<StackModel>): boolean => m.items.length > 0

  run = (m: StackModel, r: Stack): void => {
    const expected = m.items[m.items.length - 1]
    const actual = r.peek()
    expect(actual).toBe(expected)
  }

  toString = () => 'peek()'
}

class SizeCommand implements fc.Command<StackModel, Stack> {
  check = () => true

  run = (m: StackModel, r: Stack): void => {
    expect(r.size()).toBe(m.items.length)
  }

  toString = () => 'size()'
}

// The test
test('stack should behave correctly for any sequence of operations', () => {
  const allCommands = [
    fc.integer().map((v) => new PushCommand(v)),
    fc.constant(new PopCommand()),
    fc.constant(new PeekCommand()),
    fc.constant(new SizeCommand()),
  ]

  fc.assert(
    fc.property(
      fc.commands(allCommands, { maxCommands: 100 }),
      (cmds) => {
        const s = () => ({
          model: { items: [] as number[] },
          real: new Stack(),
        })
        fc.modelRun(s, cmds)
      }
    )
  )
})
`

## Command Generation

### Command Generators

Commands can return various types of randomly generated values:

`	ypescript
// Commands with no parameters
fc.constant(new LogoutCommand())

// Commands with primitive parameters
fc.integer().map((id) => new GetUserCommand(id))
fc.string().map((name) => new CreateUserCommand(name))

// Commands with complex parameters
fc
  .record({
    name: fc.string({ minLength: 1 }),
    email: fc.emailAddress(),
    role: fc.constantFrom('admin', 'user', 'viewer'),
  })
  .map((data) => new CreateUserCommand(data))

// Conditional commands (guarded by check)
class DeleteUserCommand implements fc.Command<Model, Real> {
  constructor(readonly userId: string) {}

  // Only run if user exists in the model
  check = (m: Readonly<Model>): boolean => m.users.has(this.userId)

  run = (m: Model, r: Real): void => {
    m.users.delete(this.userId)
    r.deleteUser(this.userId)
  }
}
`

## State Machine Models

### Modeling State Transitions

`	ypescript
interface TodoModel {
  todos: Map<string, { text: string; completed: boolean }>
}

class AddTodoCommand implements fc.Command<TodoModel, TodoApp> {
  constructor(readonly text: string) {}

  check = (m: Readonly<TodoModel>): boolean => true

  run = (m: TodoModel, r: TodoApp): void => {
    const id = r.addTodo(this.text)
    m.todos.set(id, { text: this.text, completed: false })
  }

  toString = () => 'addTodo(' + this.text + ')'
}

class ToggleTodoCommand implements fc.Command<TodoModel, TodoApp> {
  constructor(readonly todoId: string) {}

  check = (m: Readonly<TodoModel>): boolean => m.todos.has(this.todoId)

  run = (m: TodoModel, r: TodoApp): void => {
    r.toggleTodo(this.todoId)
    const todo = m.todos.get(this.todoId)!
    todo.completed = !todo.completed
  }
}

class ListTodosCommand implements fc.Command<TodoModel, TodoApp> {
  check = () => true

  run = (m: TodoModel, r: TodoApp): void => {
    const todos = r.listTodos()
    expect(todos.length).toBe(m.todos.size)
    for (const todo of todos) {
      const modelTodo = m.todos.get(todo.id)
      expect(modelTodo).toBeDefined()
      expect(todo.text).toBe(modelTodo!.text)
      expect(todo.completed).toBe(modelTodo!.completed)
    }
  }
}
`

## State Invariance

### Invariant Checks

Invariants are properties that must hold at all times, checked after every command:

`	ypescript
class TotalCountInvariant implements fc.Command<Model, Real> {
  check = () => true

  run = (m: Model, r: Real): void => {
    // Invariant: total count = active + completed
    expect(r.getTotalCount()).toBe(r.getActiveCount() + r.getCompletedCount())
  }
}

class NonNegativeInvariant implements fc.Command<Model, Real> {
  check = () => true

  run = (m: Model, r: Real): void => {
    // Invariant: all counts are non-negative
    expect(r.getTotalCount()).toBeGreaterThanOrEqual(0)
    expect(r.getActiveCount()).toBeGreaterThanOrEqual(0)
    expect(r.getCompletedCount()).toBeGreaterThanOrEqual(0)
  }
}

// Add invariants to the command list
const allCommands = [
  fc.string().map((s) => new AddTodoCommand(s)),
  fc.constant(new ToggleTodoCommand()),
  fc.constant(new DeleteTodoCommand()),
  fc.constant(new TotalCountInvariant()),  // Checked after every command
  fc.constant(new NonNegativeInvariant()), // Checked after every command
]
`

### Post-Invariant Assertions

`	ypescript
test('invariants hold after every operation', () => {
  fc.assert(
    fc.property(
      fc.commands(allCommands, { maxCommands: 50 }),
      (cmds) => {
        const s = () => ({
          model: { todos: new Map(), nextId: 1 },
          real: new TodoApp(),
        })
        fc.modelRun(s, cmds)
      }
    )
  )
})
`

## Transition Testing

### Guarded Transitions

Some commands are only valid in certain states:

`	ypescript
// Can only checkout if cart has items
class CheckoutCommand implements fc.Command<CartModel, Cart> {
  check = (m: Readonly<CartModel>): boolean => m.items.length > 0

  run = (m: CartModel, r: Cart): void => {
    const result = r.checkout()
    expect(result.success).toBe(true)
    // After checkout, cart should be empty
    m.items = []
  }
}

// Can only apply coupon if cart total > minimum
class ApplyCouponCommand implements fc.Command<CartModel, Cart> {
  constructor(readonly code: string) {}

  check = (m: Readonly<CartModel>): boolean => {
    const total = m.items.reduce((s, i) => s + i.price * i.qty, 0)
    return total >= 50 // Minimum for coupon
  }

  run = (m: CartModel, r: Cart): void => {
    r.applyCoupon(this.code)
    m.appliedCoupon = this.code
    m.discount = calculateDiscount(m.items, this.code)
  }
}
`

### State Transition Diagram

`
                  ┌─────────────┐
                  │   Empty     │
                  └──────┬──────┘
                         │ addItem
                  ┌──────▼──────┐
            ┌─────│ Has Items   │◄────┐
            │     └──────┬──────┘     │
            │            │            │
            │     ┌──────▼──────┐     │
            │     │  Checkout   │     │
            │     └──────┬──────┘     │
            │            │            │
            │     ┌──────▼──────┐     │
            └─────│  Paid       │─────┘
                  └─────────────┘
`

## Sequential vs Parallel State Testing

### Sequential Testing (Default)

`	ypescript
// Commands run one after another
test('sequential operations', () => {
  fc.assert(
    fc.property(
      fc.commands(allCommands, { maxCommands: 50 }),
      (cmds) => {
        const s = () => ({
          model: { items: [] as number[] },
          real: new Stack(),
        })
        fc.modelRun(s, cmds)
      }
    )
  )
})
`

### Parallel Testing (Race Condition Detection)

`	ypescript
// Commands run concurrently to detect race conditions
test('parallel operations should be consistent', () => {
  fc.assert(
    fc.property(
      fc.commands(allCommands, { maxCommands: 50 }),
      (cmds) => {
        const s = () => ({
          model: { items: [] as number[] },
          real: new Stack(),
        })
        fc.modelRun(s, cmds)
      }
    )
  )
})

// Use asyncCommands for concurrent execution
test('async operations should be thread-safe', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.commands(allCommands, { maxCommands: 50 }),
      async (cmds) => {
        const s = () => ({
          model: { items: [] as number[] },
          real: new ConcurrentStack(),
        })
        await fc.modelRun(s, cmds)
      }
    )
  )
})
`

## Shrinking in Stateful Tests

### How Shrinking Works

When a stateful test fails, fast-check shrinks the command sequence by:

1. Removing commands that don't contribute to the failure
2. Shrinking parameter values within commands
3. Finding the shortest sequence that still causes the failure

### Example of Shrunk Failure

`
Original failing sequence (50 commands):
  push(500), push(300), pop(), push(700), pop(), push(100), pop(), ...

Shrunk to minimal failing sequence (3 commands):
  push(1), push(0), pop()
  // Returns 0 instead of expected 1
`

### Debugging Shrunk Sequences

`	ypescript
// Print the shrunk command sequence
test('stack should pop in LIFO order', () => {
  fc.assert(
    fc.property(
      fc.commands(allCommands, { maxCommands: 100 }),
      (cmds) => {
        const s = () => ({
          model: { items: [] as number[] },
          real: new Stack(),
        })
        fc.modelRun(s, cmds)
      }
    ),
    { verbose: 2 } // Print generated and shrunk sequences
  )
})
`

## Real-World Examples

### Database Transaction Testing

`	ypescript
interface DatabaseModel {
  users: Map<number, { name: string; email: string }>
  nextId: number
}

class InsertUserCommand implements fc.Command<DatabaseModel, Database> {
  constructor(
    readonly name: string,
    readonly email: string
  ) {}

  check = () => true

  async run(m: DatabaseModel, r: Database): Promise<void> {
    const id = await r.insertUser(this.name, this.email)
    m.users.set(id, { name: this.name, email: this.email })
    m.nextId = Math.max(m.nextId, id + 1)
  }
}

class UpdateUserCommand implements fc.Command<DatabaseModel, Database> {
  constructor(
    readonly id: number,
    readonly name: string
  ) {}

  check = (m: Readonly<DatabaseModel>): boolean => m.users.has(this.id)

  async run(m: DatabaseModel, r: Database): Promise<void> {
    await r.updateUser(this.id, { name: this.name })
    const user = m.users.get(this.id)!
    user.name = this.name
  }
}

class GetUserCommand implements fc.Command<DatabaseModel, Database> {
  constructor(readonly id: number) {}

  check = () => true

  async run(m: DatabaseModel, r: Database): Promise<void> {
    const user = await r.getUser(this.id)
    const expected = m.users.get(this.id)
    if (expected) {
      expect(user).toEqual(expected)
    } else {
      expect(user).toBeNull()
    }
  }
}

class TransactionRollbackCommand implements fc.Command<DatabaseModel, Database> {
  check = () => true

  async run(m: DatabaseModel, r: Database): Promise<void> {
    // Start a transaction, make changes, then rollback
    await r.beginTransaction()
    await r.insertUser('rollback-user', 'rollback@test.com')
    await r.rollback()
    // Model should be unchanged
    const user = await r.getUser('rollback-user')
    expect(user).toBeNull()
  }
}
`

### File System Testing

`	ypescript
interface FileSystemModel {
  files: Map<string, string>
  directories: Set<string>
}

class CreateFileCommand implements fc.Command<FileSystemModel, FileSystem> {
  constructor(
    readonly path: string,
    readonly content: string
  ) {}

  check = (m: Readonly<FileSystemModel>): boolean => !m.files.has(this.path)

  run(m: FileSystemModel, r: FileSystem): void {
    r.createFile(this.path, this.content)
    m.files.set(this.path, this.content)
    // Ensure parent directory exists
    const parent = this.path.substring(0, this.path.lastIndexOf('/'))
    if (parent) m.directories.add(parent)
  }
}

class ReadFileCommand implements fc.Command<FileSystemModel, FileSystem> {
  constructor(readonly path: string) {}

  check = (m: Readonly<FileSystemModel>): boolean => m.files.has(this.path)

  run(m: FileSystemModel, r: FileSystem): void {
    const content = r.readFile(this.path)
    expect(content).toBe(m.files.get(this.path))
  }
}

class DeleteFileCommand implements fc.Command<FileSystemModel, FileSystem> {
  constructor(readonly path: string) {}

  check = (m: Readonly<FileSystemModel>): boolean => m.files.has(this.path)

  run(m: FileSystemModel, r: FileSystem): void {
    r.deleteFile(this.path)
    m.files.delete(this.path)
    // File read should now fail
    expect(() => r.readFile(this.path)).toThrow()
  }
}

class ListDirectoryCommand implements fc.Command<FileSystemModel, FileSystem> {
  constructor(readonly dirPath: string) {}

  check = (m: Readonly<FileSystemModel>): boolean => m.directories.has(this.dirPath)

  run(m: FileSystemModel, r: FileSystem): void {
    const files = r.listDirectory(this.dirPath)
    // Check files in this directory match model
    const expectedFiles = Array.from(m.files.keys())
      .filter((f) => f.startsWith(this.dirPath + '/'))
    expect(files.sort()).toEqual(expectedFiles.sort())
  }
}
`

### Stateful API Testing

`	ypescript
interface SessionModel {
  loggedIn: boolean
  cart: Map<string, number>
  orders: string[]
}

class LoginCommand implements fc.Command<SessionModel, ApiClient> {
  constructor(readonly username: string) {}

  check = (m: Readonly<SessionModel>): boolean => !m.loggedIn

  async run(m: SessionModel, r: ApiClient): Promise<void> {
    const result = await r.login(this.username)
    expect(result.success).toBe(true)
    m.loggedIn = true
  }
}

class LogoutCommand implements fc.Command<SessionModel, ApiClient> {
  check = (m: Readonly<SessionModel>): boolean => m.loggedIn

  async run(m: SessionModel, r: ApiClient): Promise<void> {
    await r.logout()
    m.loggedIn = false
    m.cart.clear()
  }
}

class AddToCartCommand implements fc.Command<SessionModel, ApiClient> {
  constructor(
    readonly productId: string,
    readonly quantity: number
  ) {}

  check = (m: Readonly<SessionModel>): boolean => m.loggedIn

  async run(m: SessionModel, r: ApiClient): Promise<void> {
    await r.addToCart(this.productId, this.quantity)
    const current = m.cart.get(this.productId) ?? 0
    m.cart.set(this.productId, current + this.quantity)
  }
}
`

## Combining Property-Based with Stateful Testing

### Precondition Properties

`	ypescript
// Before running stateful commands, verify base properties
test('initial state should be valid', () => {
  fc.assert(
    fc.property(fc.integer(), (seed) => {
      const stack = new Stack()
      expect(stack.size()).toBe(0)
      expect(() => stack.pop()).toThrow()
    })
  )
})
`

### Postcondition Properties

`	ypescript
// After stateful test, verify additional properties
test('final state should satisfy invariants', () => {
  fc.assert(
    fc.property(
      fc.commands(allCommands, { maxCommands: 50 }),
      (cmds) => {
        const setup = () => ({
          model: { items: [] as number[] },
          real: new Stack(),
        })
        const { model, real } = fc.modelRun(setup, cmds)

        // Postcondition: model and real should still match
        expect(real.size()).toBe(model.items.length)

        // Empty stack invariant: pop should fail
        if (model.items.length === 0) {
          expect(() => real.pop()).toThrow()
        }
      }
    )
  )
})
`

### Generators for Command Parameters

`	ypescript
// Dedicated generators for command parameters
const productIdGenerator = fc
  .string({ minLength: 8, maxLength: 8 })
  .map((s) => 'PROD-' + s.toUpperCase())

const quantityGenerator = fc.integer({ min: 1, max: 10 })

const emailGenerator = fc.emailAddress()

// Combine generators with commands
const userCommands = [
  emailGenerator.map((email) => new RegisterCommand(email)),
  fc.constant(new LoginCommand()),
  fc.constant(new LogoutCommand()),
  productIdGenerator
    .chain((id) =>
      quantityGenerator.map((qty) => new AddToCartCommand(id, qty))
    ),
  fc.constant(new ViewCartCommand()),
  fc.constant(new CheckoutCommand()),
]
`

## Best Practices

1. **Keep the model simple**: The model should be simpler than the real system by definition
2. **Check preconditions**: Use check() to ensure commands only run in valid states
3. **Test invariants as commands**: Create commands that only verify invariants
4. **Start small**: Begin with 10-20 commands maxCommands, increase as needed
5. **Test empty states**: Ensure commands handle empty/null/zero states correctly
6. **Include error paths**: Add commands that test error conditions
7. **Use unique identifiers**: Generate UUIDs for entities to avoid ID collisions
8. **Async stateful tests**: Use c.asyncProperty for systems with async operations
9. **Shrinking is your friend**: Minimal failing sequences make debugging easier
10. **Combine with property tests**: Use regular property tests for stateless functions alongside stateful tests

## Key Points

- Stateful testing models system state and verifies operations preserve correctness
- Commands define operations on both the real system and the model
- check() guards command preconditions; un() executes and compares
- Invariants are special commands verified after every operation
- Sequential testing checks single-threaded correctness
- Parallel (async) testing reveals race conditions
- Shrinking finds the minimal command sequence that causes failure
- Real-world examples: databases, file systems, APIs, data structures
- Stateful testing catches bugs that individual unit tests miss
- The model must be simpler than the real system — otherwise you're reimplementing the system
