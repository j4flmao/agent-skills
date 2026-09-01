# Advanced C# & .NET

## 1. High-Performance Memory: `Span<T>` and `Memory<T>`
Historically, substring operations or array slicing allocated new objects on the heap, thrashing the Garbage Collector.
`Span<T>` provides a type-safe, allocation-free window into contiguous memory (Heap, Stack, or Native).

```csharp
string massiveString = "User:Alice,ID:12345";

// Allocation-free slicing!
// AsSpan() creates a ReadOnlySpan<char> pointing to the original memory
ReadOnlySpan<char> span = massiveString.AsSpan();

// Slicing does NOT allocate a new string
ReadOnlySpan<char> user = span.Slice(5, 5); 

Console.WriteLine(user.ToString()); // "Alice"
```
*Limitation*: `Span<T>` is a `ref struct` and cannot live on the heap. Use `Memory<T>` if you need to store it in a class or use it in an `async` method.

## 2. Reflection vs Source Generators
**Reflection** (`typeof(T).GetProperties()`) allows inspecting types at runtime, which is heavily used by ORMs (Entity Framework) and serializers. However, reflection is notoriously slow.

**.NET Source Generators** solve this by shifting the work to compile-time (using the Roslyn compiler API).
Instead of reading attributes at runtime, a Source Generator reads your C# code while typing in Visual Studio and generates new `.cs` files containing hardcoded, hyper-fast serialization logic.

```csharp
// Example: Using the built-in JSON Source Generator in .NET
[JsonSerializable(typeof(User))]
internal partial class AppJsonSerializerContext : JsonSerializerContext
{
}

// Usage: Completely avoids runtime reflection! Zero GC allocations for type info.
var json = JsonSerializer.Serialize(myUser, AppJsonSerializerContext.Default.User);
```

## 3. `ref`, `in`, and `out` Modifiers
- `ref`: Passes a variable by reference. Must be initialized before passing.
- `out`: Passes a variable by reference. Does not need initialization, but the method *must* assign it.
- `in`: Passes a variable by reference, but guarantees the method cannot modify it. Used for performance to avoid copying massive `struct` sizes without risking mutation.
