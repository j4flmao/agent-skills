# Code Organization

## Purpose
Directory structures, modules, and domain-driven design in Vapor.

## Section 1: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 2: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 3: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 4: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 5: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 6: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 7: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 8: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 9: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 10: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 11: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 12: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 13: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

## Section 14: Advanced Patterns and Techniques

### Overview
When scaling Swift backend applications, particularly those leveraging the Vapor framework, a deep understanding of concurrency, memory management, and architectural boundaries is critical. By employing `async/await` and structured concurrency, developers can achieve high throughput and low latency.

### Implementation Example
```swift
import Vapor
// Registering domain-specific route collections
func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    try api.register(collection: UserController())
    try api.register(collection: PostController())
}
```

### Architecture Diagram
```text
+-----------------+
| Client / App    |
+-----------------+
        |
        v
+-----------------+
| Vapor Framework |
+-----------------+
        |
        v
+-----------------+
| Database Layer  |
+-----------------+
```

### Best Practices & Guidelines
1. **Structured Concurrency**: Ensure all database queries and network calls utilize `async/await`.
2. **Dependency Injection**: Decouple components using protocols.
3. **Error Handling**: Use `AbortError` and custom middlewares for standardized API errors.
4. **Performance**: Monitor memory leaks by profiling with Instruments.
5. **Security**: Validate all inputs at the boundary using Vapor's `Validatable`.

### Data Schema & Configuration
```json
{
  "framework": "Vapor 4",
  "language": "Swift 5.9",
  "architecture": "Clean Architecture",
  "environment": "production"
}
```

### Common Pitfalls and Anti-patterns
- **Blocking the Event Loop**: Using synchronous I/O operations will stall the entire event loop, leading to disastrous performance. Always use the non-blocking SwiftNIO APIs.
- **Mass Assignment Vulnerabilities**: Directly decoding incoming JSON to Fluent models without using DTOs (Data Transfer Objects).
- **N+1 Query Problems**: Failing to use `.with()` for eager-loading relations, resulting in hundreds of database queries instead of one.

