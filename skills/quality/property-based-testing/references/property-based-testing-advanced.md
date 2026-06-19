# Property-Based Testing Advanced Topics

## Introduction
Advanced PBT covers stateful system testing with command machines, custom generator design with weighted distributions, integration with mutation testing, PBT for distributed systems (CRDTs, consensus), and using PBT for security property verification.

## Stateful Command-Based Testing
Model complex systems as state machines with commands:

```typescript
// fast-check stateful testing for a todo list
import * as fc from 'fast-check';

// Model
class TodoModel {
  todos: Array<{ id: number; text: string; done: boolean }> = [];
  nextId = 1;

  addTodo(text: string) {
    this.todos.push({ id: this.nextId++, text, done: false });
  }
  toggleTodo(id: number) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) todo.done = !todo.done;
  }
  removeTodo(id: number) {
    this.todos = this.todos.filter(t => t.id !== id);
  }
}

// Commands
class AddTodoCommand implements fc.Command<TodoModel, TodoList> {
  constructor(readonly text: string) {}
  check = () => true;
  run(model: TodoModel, real: TodoList) {
    model.addTodo(this.text);
    real.addTodo(this.text);
    // Assert equals
  }
  toString = () => `AddTodo(${this.text})`;
}

class ToggleTodoCommand implements fc.Command<TodoModel, TodoList> {
  constructor(readonly id: number) {}
  check(model: TodoModel) {
    return model.todos.some(t => t.id === this.id);
  }
  run(model: TodoModel, real: TodoList) {
    model.toggleTodo(this.id);
    real.toggleTodo(this.id);
  }
}

fc.assert(
  fc.modelRun(
    () => ({ model: new TodoModel(), real: new TodoList() }),
    fc.commands([
      fc.integer().map(id => new ToggleTodoCommand(id)),
      fc.string().map(text => new AddTodoCommand(text)),
    ])
  )
);
```

## Custom Generator Design
### Weighted and Biased Generators
```python
from hypothesis import strategies as st

# Strategy for valid email addresses
email_strategy = st.emails()

# Strategy for IP addresses (weighted toward common patterns)
ip_strategy = st.sampled_from([
    "192.168.1.1",  # Common private IP
    "10.0.0.1",     # Common private IP
    "172.16.0.1",   # Common private IP
    "8.8.8.8",      # Public DNS
]).map(lambda x: x) | st.ip_addresses()

# Strategy with biased distribution toward edge cases
@st.composite
def user_id_strategy(draw):
    # 20% chance of edge cases
    if draw(st.floats(min_value=0, max_value=1)) < 0.2:
        return draw(st.sampled_from([0, -1, None, "", "admin", "root"]))
    # 80% chance of normal values
    return draw(st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories='L')))
```

## PBT for Security Properties
```python
from hypothesis import given, strategies as st

class TestInputValidation:
    @given(input_string=st.text())
    def test_no_sql_injection_possible(self, input_string):
        """Property: sanitized input never contains SQL injection patterns."""
        sanitized = sanitize_input(input_string)
        dangerous_patterns = ["' OR 1=1", "'; DROP TABLE", "' UNION SELECT"]
        for pattern in dangerous_patterns:
            assert pattern.lower() not in sanitized.lower()

    @given(email=st.emails())
    def test_email_normalization_roundtrip(self, email):
        """Property: normalized then parsed email matches original."""
        normalized = normalize_email(email)
        parsed = parse_email(normalized)
        assert parsed == email
```

## PBT for Distributed Systems (CRDT)
```python
class TestCRDT:
    @given(ops=st.lists(
        st.one_of(
            st.builds(AddOp, value=st.integers()),
            st.builds(RemoveOp, value=st.integers()),
        ),
        min_size=1, max_size=50,
    ))
    def test_crdt_convergence(self, ops):
        """Property: replicas converge after same operations in any order."""
        replica_a = GCounter()
        replica_b = GCounter()

        for op in ops:
            replica_a.apply(op)
            replica_b.apply(op)

        assert replica_a.value() == replica_b.value()
```

## Performance Optimization
```python
from hypothesis import settings, HealthCheck

# Slow generators need more time
@given(...)
@settings(max_examples=1000, stateful_step_count=50,
          suppress_health_check=[HealthCheck.too_slow])
def test_complex_stateful(self, ...):
    ...

# Use deadline=None for slow I/O operations
@given(...)
@settings(deadline=None)
def test_with_database_interaction(self, ...):
    ...
```

## Key Points
- Stateful command-based testing models complex interactions as state machines
- Custom generators with weighted distributions focus testing on high-risk inputs
- PBT can verify security properties: no injection, proper sanitization
- CRDT convergence can be verified with PBT by generating operation sequences
- Profile and optimize slow generators; use settings for performance tuning
- Combine PBT with mutation testing to evaluate property quality
