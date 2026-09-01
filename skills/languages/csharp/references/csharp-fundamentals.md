# C# Fundamentals

## 1. Structs vs Classes
Understanding memory is crucial for high-performance C#.
- **`class` (Reference Type)**: Allocated on the Heap. The GC must clean it up. Passed by reference pointer.
- **`struct` (Value Type)**: Allocated on the Stack. Extremely fast allocation/deallocation. Passed by value (copied).

```csharp
// Stack allocation, no GC overhead
public struct Point {
    public int X;
    public int Y;
}

// C# 10 introduced record structs for immutable data
public readonly record struct Vector3(float X, float Y, float Z);
```

## 2. Async/Await State Machine
When you compile an `async` method, the C# compiler transforms it into a complex state machine struct (implementing `IAsyncStateMachine`).

```csharp
public async Task<string> FetchDataAsync() {
    var client = new HttpClient();
    // The thread is released back to the ThreadPool while waiting for I/O!
    // The state machine saves local variables.
    var result = await client.GetStringAsync("http://api.com");
    // Execution resumes here on an available ThreadPool thread.
    return result.ToUpper();
}
```

## 3. Language Integrated Query (LINQ)
LINQ allows declarative data manipulation. It heavily uses `IEnumerable<T>` and Deferred Execution (the query is not executed until you iterate over it or call `.ToList()`).

```csharp
var users = new List<User>();

// Deferred Execution: No filtering happens here.
var activeAdmins = users
    .Where(u => u.IsActive && u.Role == Role.Admin)
    .OrderBy(u => u.CreatedAt)
    .Select(u => new { u.Name, u.Email }); // Anonymous Type Projection

// Immediate Execution: Iterates and executes the query logic
foreach (var admin in activeAdmins) {
    Console.WriteLine(admin.Name);
}
```
