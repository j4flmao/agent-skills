# Java: Super Type Tokens and Reified Generics

## 1. The Deserialization Problem
When using JSON parsers like Jackson or Gson, you cannot pass `List<User>.class` to the deserializer because Type Erasure destroys the `List<User>` signature at runtime, turning it into `List.class`.

```java
// FAILS: Syntax error
List<User> list = mapper.readValue(json, List<User>.class);
```

## 2. Super Type Tokens (Neal Gafter's Pattern)
While the JVM erases generic parameters from *instances*, it legally retains generic signatures in *subclass declarations* within the compiled bytecode's constant pool.

By creating an anonymous inner subclass `{}` of a generic abstract class, the compiler burns the generic signature into the `.class` file forever.

```java
// The {} creates an anonymous subclass!
TypeReference<List<User>> typeRef = new TypeReference<List<User>>() {};

// The parser uses Reflection (getClass().getGenericSuperclass()) to extract it.
List<User> users = mapper.readValue(json, typeRef);
```

## 3. Libraries using this Pattern
- **Jackson**: `TypeReference<T>`
- **Guava**: `TypeToken<T>`
- **Spring**: `ParameterizedTypeReference<T>`
