# Mobile SQLite

## Indexing

```kotlin
@Entity(tableName = "orders", indices = [
    Index(value = ["customer_name"]),
    Index(value = ["status", "created_at"])
])
data class OrderEntity(...)
```

## Migration patterns

```dart
// Drift migration
@override
MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async { /* initial tables */ },
    onUpgrade: (m, from, to) async {
        if (from < 2) await m.addColumn(orders, orders.status);
        if (from < 3) await m.createTable(orderItems);
    },
);
```

## Query optimization

```swift
// Core Data: batch limit
let fetchRequest = Order.fetchRequest()
fetchRequest.fetchLimit = 20
fetchRequest.fetchBatchSize = 10      // Faults batches, not all at once

// Use NSFetchedResultsController for lists
```

## Prepackaged DB

```kotlin
// Room: prepackaged database for offline-first
Room.databaseBuilder<AppDatabase>(context, "app.db")
    .createFromAsset("databases/app.db")  // Pre-populated
    .build()
```
