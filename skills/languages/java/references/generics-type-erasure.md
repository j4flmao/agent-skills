# Java: Type Erasure and Bytecode Internals

## 1. What is Type Erasure?
Java implemented generics in Java 5. To ensure backwards compatibility with older JVMs, the compiler erases all generic type information `<T>` during compilation, replacing it with `Object` (or the bounding class).
- The JVM bytecode has absolutely no concept of generics.
- You cannot perform `new T()` or `instanceof T`.

## 2. Bridge Methods
To preserve polymorphism when extending generic classes, the Java compiler secretly injects synthetic "Bridge Methods" into the `.class` file.

```java
public class Node<T> {
    public void setData(T data) {}
}

public class IntegerNode extends Node<Integer> {
    @Override
    public void setData(Integer data) {}
}
```
**Compiled Bytecode (Decompiled):**
```java
public class IntegerNode extends Node {
    public void setData(Integer data) {}
    
    // Synthetic Bridge Method inserted by the compiler
    public void setData(Object data) {
        this.setData((Integer) data);
    }
}
```

## 3. Heap Pollution and `@SafeVarargs`
Heap pollution occurs when an operation bypasses type checks, often by mixing arrays (which are reified/checked at runtime) and generics (which are erased).
```java
// T... compiles to Object[], opening the door to class cast exceptions.
@SafeVarargs
public static <T> void addToList(List<T> list, T... elements) {
    for (T x : elements) list.add(x);
}
```
