# Composition over Inheritance

## Guideline

Favor object composition over class inheritance. Inheritance creates rigid taxonomies. Composition enables runtime flexibility.

## When to Use Inheritance

- True `is-a` relationship (a Cat is an Animal).
- Subclass does not alter base class behavior negatively.
- No need to change behavior at runtime.
- Class hierarchy is shallow (<3 levels).
- No need to share behavior across unrelated classes.

## When to Use Composition

- `has-a` or `uses-a` relationship.
- Need runtime behavior swap.
- Cross-cutting concerns (logging, caching, auth).
- Class hierarchy would be deep or complex.
- Sharing behavior across unrelated classes.

## Example

### Inheritance (rigid)
```typescript
class Duck {
  quack() { console.log('quack'); }
  fly() { console.log('flying'); }
  swim() { console.log('swimming'); }
}

class RubberDuck extends Duck {
  fly() { throw new Error('Rubber ducks cannot fly'); } // LSP violation
}
```

### Composition (flexible)
```typescript
interface QuackBehavior { quack(): void; }
interface FlyBehavior { fly(): void; }

class Duck {
  constructor(
    private quackBehavior: QuackBehavior,
    private flyBehavior: FlyBehavior
  ) {}

  performQuack() { this.quackBehavior.quack(); }
  performFly() { this.flyBehavior.fly(); }

  setFlyBehavior(fb: FlyBehavior) { this.flyBehavior = fb; } // Runtime swap
}

// Behaviors
class NormalQuack implements QuackBehavior { quack() { console.log('quack'); } }
class Squeak implements QuackBehavior { quack() { console.log('squeak'); } }
class FlyWithWings implements FlyBehavior { fly() { console.log('flying'); } }
class NoFly implements FlyBehavior { fly() { /* no-op */ } }

// Usage
const duck = new Duck(new NormalQuack(), new FlyWithWings());
const rubberDuck = new Duck(new Squeak(), new NoFly());
```

## Composition Patterns

| Pattern | Description |
|---------|-------------|
| Strategy | Composable algorithms |
| Decorator | Wrapping to add behavior |
| State | Behavior changes with state |
| Bridge | Decouple abstraction from implementation |
| Composite | Tree structures with uniform operations |
