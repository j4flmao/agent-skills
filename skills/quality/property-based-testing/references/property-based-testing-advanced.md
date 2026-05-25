# Advanced Property-Based Testing

## Property Types

### Universal Properties
| Property | Example |
|----------|---------|
| Idempotence | `decode(encode(x)) == x` |
| Invariance | `sort(sort(list)) == sort(list)` |
| Metamorphic | `reverse(reverse(list)) == list` |
| Monotonic | `sort(list)[i] <= sort(list)[i+1]` |
| Associative | `(a + b) + c == a + (b + c)` |

### State Machine Properties
```python
from hypothesis import strategies as st
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

class StackMachine(RuleBasedStateMachine):
    def __init__(self):
        self.stack = []
        self.model = []

    @rule(value=st.integers())
    def push(self, value):
        self.stack.append(value)
        self.model.append(value)
        assert len(self.stack) == len(self.model)

    @rule()
    def pop(self):
        if self.model:
            assert self.stack.pop() == self.model.pop()
        else:
            assert len(self.stack) == 0

    @invariant()
    def size_matches(self):
        assert len(self.stack) == len(self.model)
```

## Advanced Shrinking

### Custom Shrinkers
```haskell
shrink :: Integer -> [Integer]
shrink x = takeWhile (>0) $ iterate (`div` 2) x

shrink x =
  [ x - d | d <- takeWhile (<= x) [1,2,4,8,16,32] ]
  ++ [ 0 | x > 0 ]
```

### Collection Shrinking
- Remove elements from the collection
- Replace elements with simpler values (0, empty, null)
- Shrink the collection size first, then element values
- Try removing elements individually, then in groups

## Integration Strategies

### Complementing Example Tests
```
Example tests (Given-When-Then)
  - Document known behavior
  - Test specific edge cases
  - Serve as documentation

Property-based tests
  - Find unknown edge cases
  - Verify invariants
  - Test at scale (100s of random inputs)
```

### Test Doubles with Properties
```typescript
// Property: All database operations should be consistent
@Property
void crudConsistency(@ForAll @IntRange(min=1, max=1000) int id) {
    repository.save(new Entity(id, "test"))
    assertThat(repository.findById(id)).isPresent()
    repository.deleteById(id)
    assertThat(repository.findById(id)).isEmpty()
}
```

## Performance Properties

### Timing Properties
```java
@Property
void sortingShouldBeFast(@ForAll List<@IntRange(min=0, max=10000) Integer> list) {
    long start = System.nanoTime()
    sort(list)
    long duration = System.nanoTime() - start
    assertTrue(duration < list.size() * 100)
}
```

### Memory Properties
- Verify no memory leaks over repeated operations
- Check object creation rates stay within bounds
- Validate resource cleanup in all code paths
