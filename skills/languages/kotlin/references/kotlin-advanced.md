# Advanced Kotlin

## 1. Coroutines (Structured Concurrency)
Coroutines are lightweight threads. You can run 100,000 coroutines on a single JVM thread without out-of-memory errors because they suspend execution rather than blocking the OS thread.

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // Launch a new coroutine on the background thread pool
    launch(Dispatchers.IO) {
        val data = fetchNetworkData() // Suspend function
        
        // Switch to main thread to update UI
        withContext(Dispatchers.Main) {
            updateUI(data)
        }
    }
}

// Suspend marks this function as asynchronous
suspend fun fetchNetworkData(): String {
    delay(1000) // Non-blocking sleep
    return "Data"
}
```

## 2. Kotlin Flows (Reactive Streams)
`Flow` is Kotlin's answer to RxJava. It represents a cold asynchronous stream of data.

```kotlin
fun getTemperatureStream(): Flow<Int> = flow {
    for (i in 1..5) {
        delay(1000)
        emit(i * 10)
    }
}

suspend fun collectData() {
    getTemperatureStream()
        .filter { it > 20 }
        .map { it.toString() + "C" }
        .collect { println(it) } // Terminal operator
}
```

## 3. Value Classes (Inline Classes)
Wrapper classes provide type safety (e.g., `Password` instead of `String`), but allocating a new object on the JVM heap for every wrapper degrades performance.
`value class` tells the Kotlin compiler to erase the wrapper at compile time, meaning the JVM only sees the raw primitive.

```kotlin
@JvmInline
value class Password(val value: String)

// No heap allocation occurs here, the JVM treats it as a raw String!
val myPassword = Password("secret123") 
```
