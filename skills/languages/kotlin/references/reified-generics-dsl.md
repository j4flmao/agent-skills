# Kotlin: Reified Generics and Type-Safe Builders

## 1. Defeating Java's Type Erasure
Because Kotlin runs on the JVM, it suffers from the exact same Type Erasure limitations as Java. 
`if (myList is List<String>)` // COMPILER ERROR: Cannot check for instance of erased type.

However, Kotlin has a powerful weapon Java lacks: **Inline Functions with Reified Type Parameters**.

## 2. The `reified` Keyword
When a function is marked as `inline`, the Kotlin compiler copies the function's bytecode directly into the caller's location. If the generic type parameter is marked as `reified`, the compiler replaces the generic type `T` with the *actual* Class type at compile time.

### The Generic JSON Parser Pattern
In Java, passing `Class<T>` is required: `mapper.readValue(json, User.class)`.
In Kotlin, `reified` makes this beautiful:

```kotlin
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper

val mapper = jacksonObjectMapper()

// 1. Define the inline reified function
inline fun <reified T> String.parseJson(): T {
    // T::class.java is perfectly valid here!
    return mapper.readValue(this, T::class.java)
}

// 2. Usage (The type is inferred from the variable, or explicitly passed)
val json = """{"name": "Alice"}"""
val user: User = json.parseJson() // No User.class needed!
val admin = json.parseJson<Admin>()
```

## 3. Generic Type-Safe Builders (DSLs)
Kotlin is famous for its Domain Specific Languages (DSLs) (like Gradle Kotlin DSL or HTML builders). These heavily rely on Generics and Extension Functions with Receiver Types.

```kotlin
// The generic DSL entry point
fun <T> buildHtml(tag: String, init: Tag<T>.() -> Unit): Tag<T> {
    val element = Tag<T>(tag)
    element.init() // 'this' inside the lambda is the Tag
    return element
}

class Tag<T>(val name: String) {
    val children = mutableListOf<Tag<*>>()
    
    // Generic child builder
    fun <C> child(name: String, init: Tag<C>.() -> Unit) {
        val childTag = Tag<C>(name)
        childTag.init()
        children.add(childTag)
    }
}

// Usage (Looks like declarative markup, but is 100% type-safe Kotlin code)
val page = buildHtml<Page>("html") {
    child<Head>("head") {
        // configure head
    }
    child<Body>("body") {
        // configure body
    }
}
```
