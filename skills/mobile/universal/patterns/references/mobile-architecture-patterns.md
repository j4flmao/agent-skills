# Mobile Architecture Patterns

## MVVM (Model-View-ViewModel)

### Structure
```
View (Composable/SwiftUI/XIB) ←→ ViewModel ←→ Model/Repository
                                    ↓
                                State (StateFlow/ObservableObject)
```

### ViewModel Pattern
```typescript
class UserViewModel {
  private _state = MutableStateFlow(UserState())
  val state: StateFlow<UserState> = _state.asStateFlow()

  fun loadUser(id: String) {
    viewModelScope.launch {
      _state.update { it.copy(isLoading = true) }
      try {
        val user = userRepository.getUser(id)
        _state.update { it.copy(user = user, isLoading = false) }
      } catch (e: Exception) {
        _state.update { it.copy(error = e.message, isLoading = false) }
      }
    }
  }
}
```

## MVI (Model-View-Intent)

### Unidirectional Data Flow
```
User Intent → Processor → State → View (Render)
                ↓
           Side Effects
```

### Implementation
```typescript
sealed class HomeIntent {
  object LoadFeed : HomeIntent()
  data class Refresh(val force: Boolean) : HomeIntent()
  data class SelectItem(val id: String) : HomeIntent()
}

data class HomeState(
  val feed: List<FeedItem> = emptyList(),
  val isLoading: Boolean = false,
  val error: String? = null,
)
```

## Clean Architecture

### Layer Separation
```
Presentation (UI + ViewModel)
    ↓
Domain (Use Cases + Entities)
    ↓
Data (Repositories + Data Sources)
```

### Use Case Pattern
```typescript
class GetUserFeedUseCase(
  private val feedRepo: FeedRepository,
  private val userRepo: UserRepository,
) {
  suspend operator fun invoke(userId: String): Result<Feed> {
    val user = userRepo.getUser(userId) ?: return Result.failure(NotFound)
    return feedRepo.getFeed(user.preferences)
  }
}
```

## State Management

### Unidirectional State
- Single source of truth
- State is immutable
- State changes through intents/actions only
- Side effects handled separately

### State Consolidation
- Combine multiple state sources into single view state
- Transform repository data for UI consumption
- Map domain errors to user-facing messages
- Handle loading, success, error states uniformly

## Dependency Injection

### Manual DI
```typescript
class AppContainer {
  val apiClient = ApiClient()
  val userRepo = UserRepository(apiClient)
  val feedRepo = FeedRepository(apiClient)
}
```

### Service Locator (for simple apps)
- Register dependencies at app start
- Resolve from global container
- Test by replacing implementations
- Avoid in large apps — hides dependencies
