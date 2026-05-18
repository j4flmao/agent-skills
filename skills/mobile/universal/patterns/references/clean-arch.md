# Clean Architecture for Mobile

## Layer Diagram

```
┌─────────────────────┐
│   Presentation      │  ViewModels, Composables, SwiftUI Views
│   (UI framework)    │  Depends on: domain
├─────────────────────┤
│   Domain            │  Entities, UseCases, Repository interfaces
│   (pure business)   │  Zero framework imports. Pure language only.
├─────────────────────┤
│   Data              │  RepositoryImpl, DTOs, DataSources (API, DB)
│   (infrastructure)  │  Depends on: domain. Implements domain interfaces.
└─────────────────────┘
```

## Dependency Rule

Source code dependencies point INWARD. Outer layers depend on inner. Inner never depends on outer.

## UseCase convention

```kotlin
class GetOrdersUseCase(private val repo: OrderRepository) {
    suspend operator fun invoke(): Result<List<Order>> = repo.getOrders()
}
```

- Single responsibility per UseCase
- Accept repository interfaces (inject)
- Return Result or sealed class
- No framework annotations

## Repository interface (domain)

```kotlin
interface OrderRepository {
    suspend fun getOrders(): Result<List<Order>>
    suspend fun getOrder(id: String): Result<Order>
}
```

## Repository impl (data)

```kotlin
class OrderRepositoryImpl(
    private val remote: OrderRemoteDataSource,
    private val local: OrderLocalDataSource
) : OrderRepository {
    override suspend fun getOrders(): Result<List<Order>> = runCatching {
        remote.fetchOrders().also { local.cache(it) }
    }.getOrElse { local.getCached().map { it.toDomain() } }
}
```
