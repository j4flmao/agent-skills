# Stateful Property-Based Testing

## State Machine Model
`	ypescript
class CounterModel {
    count = 0;

    increment() { this.count++; }
    decrement() { this.count--; }
    getValue() { return this.count; }
}

// Model-based testing
const counterModel = new CounterModel();
// Commands: Increment, Decrement, GetValue
// Run commands on both model and real implementation
// Compare results after each command
`

## When to Use Stateful PBT
- Complex state machines
- Database operations (CRUD)
- Queue/stack operations
- Transaction processing
- Cache consistency

## Key Pattern: Command Model
1. Generate sequence of commands
2. Execute on both model (simplified) and real implementation
3. Compare states or outputs
4. Shrink to minimal failing sequence
