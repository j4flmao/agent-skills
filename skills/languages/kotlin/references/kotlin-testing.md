# Kotlin Testing (MockK & Coroutines)

## 1. JUnit 5 & MockK
While Java devs use Mockito, Kotlin developers prefer **MockK** because it provides idiomatic support for extension functions, top-level functions, and coroutines.

```kotlin
import io.mockk.*
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class UserServiceTest {
    @Test
    fun `should fetch user successfully`() {
        val mockRepo = mockk<UserRepository>()
        
        // every / returns
        every { mockRepo.getUserById(1) } returns User(1, "Alice")
        
        val service = UserService(mockRepo)
        val user = service.getUser(1)
        
        assertEquals("Alice", user.name)
        
        // Verify method was called
        verify(exactly = 1) { mockRepo.getUserById(1) }
    }
}
```

## 2. Testing Coroutines (`runTest`)
Testing code that contains `delay(10000)` would normally pause your test suite for 10 seconds. `kotlinx-coroutines-test` provides `runTest`, which virtualizes time and skips delays instantly.

```kotlin
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.delay
import org.junit.jupiter.api.Test

class AsyncTest {
    @Test
    fun `test delay skips time`() = runTest {
        // This normally takes 10 seconds, but in runTest it executes in 1 millisecond
        val result = fetchWithDelay()
        
        // MockK coEvery for suspending functions
        // coEvery { mockApi.fetch() } returns "Data"
    }
    
    suspend fun fetchWithDelay(): String {
        delay(10000)
        return "Done"
    }
}
```
