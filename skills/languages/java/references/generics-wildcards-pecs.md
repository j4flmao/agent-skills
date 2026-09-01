# Java: Wildcards and PECS

## 1. Invariance of Generics
Unlike arrays (`Integer[]` is a subtype of `Number[]`), Java Generics are **Invariant**.
`List<Integer>` is NOT a subtype of `List<Number>`.

## 2. The PECS Principle
To achieve covariance and contravariance, use **Producer Extends, Consumer Super (PECS)**.

- **Producer (`? extends T`)**: Use when reading data from the structure. You get Covariance.
- **Consumer (`? super T`)**: Use when writing data into the structure. You get Contravariance.

### Complex Example: Merging Collections
```java
public class CollectionUtils {
    // source is a PRODUCER (extends)
    // dest is a CONSUMER (super)
    public static <T> void copyData(
        List<? extends Iterable<? extends T>> sources, 
        Collection<? super T> dest
    ) {
        for (Iterable<? extends T> producer : sources) {
            for (T item : producer) {
                dest.add(item);
            }
        }
    }
}
```
If you tried to read from `dest` in the above code, it would return `Object`, because the compiler only guarantees it accepts `T` or superclasses of `T`, meaning the only safe read type is the absolute root: `Object`.
