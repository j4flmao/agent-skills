# Offline-First Architecture

## Local Storage

```swift
import Foundation
import CoreData

class OfflineStorageManager {
    private let persistentContainer: NSPersistentContainer
    private let cache = NSCache<NSString, NSData>()

    init(modelName: String) {
        persistentContainer = NSPersistentContainer(name: modelName)
        persistentContainer.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Core Data error: \(error)")
            }
        }
    }

    func save<T: Encodable>(_ object: T, forKey key: String) throws {
        let data = try JSONEncoder().encode(object)
        cache.setObject(data as NSData, forKey: key as NSString)

        let context = persistentContainer.newBackgroundContext()
        let entity = LocalCacheEntity(context: context)
        entity.key = key
        entity.data = data
        entity.timestamp = Date()

        try context.save()
    }

    func load<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        if let cachedData = cache.object(forKey: key as NSString) {
            return try? JSONDecoder().decode(type, from: cachedData as Data)
        }

        let context = persistentContainer.viewContext
        let request = LocalCacheEntity.fetchRequest()
        request.predicate = NSPredicate(format: "key == %@", key)
        request.fetchLimit = 1

        guard let result = try? context.fetch(request).first,
              let data = result.data else { return nil }

        cache.setObject(data as NSData, forKey: key as NSString)
        return try? JSONDecoder().decode(type, from: data)
    }
}
```

## Sync Engine

```swift
class SyncEngine {
    private let apiClient: APIClient
    private let storage: OfflineStorageManager
    private let reachability: ReachabilityManager
    private var syncQueue: [SyncOperation] = []

    struct SyncOperation: Codable {
        let id: String
        let type: String
        let payload: Data
        let timestamp: Date
        var retryCount: Int
    }

    func enqueueOperation(type: String, payload: Encodable) throws {
        let operation = SyncOperation(
            id: UUID().uuidString,
            type: type,
            payload: try JSONEncoder().encode(payload),
            timestamp: Date(),
            retryCount: 0
        )
        syncQueue.append(operation)
        try persistQueue()

        if reachability.isConnected {
            processQueue()
        }
    }

    func processQueue() {
        guard reachability.isConnected, !syncQueue.isEmpty else { return }

        let batch = syncQueue.prefix(10)

        Task {
            for var operation in batch {
                do {
                    try await apiClient.send(type: operation.type, data: operation.payload)
                    syncQueue.removeAll { $0.id == operation.id }
                } catch {
                    operation.retryCount += 1
                    if operation.retryCount >= 5 {
                        syncQueue.removeAll { $0.id == operation.id }
                    }
                }
            }

            try persistQueue()
        }
    }

    private func persistQueue() throws {
        let data = try JSONEncoder().encode(syncQueue)
        try storage.save(data, forKey: "sync_queue")
    }
}
```

## Conflict Resolution

```swift
enum ConflictResolution {
    case localWins
    case remoteWins
    case lastWriteWins
    case merge
}

protocol ConflictResolvable {
    func resolve(conflict local: Self, remote: Self, strategy: ConflictResolution) -> Self
}

struct Document: ConflictResolvable, Codable {
    let id: String
    var content: String
    var version: Int
    var updatedAt: Date

    func resolve(conflict local: Document, remote: Document, strategy: ConflictResolution) -> Document {
        switch strategy {
        case .localWins: return local
        case .remoteWins: return remote
        case .lastWriteWins:
            return local.updatedAt > remote.updatedAt ? local : remote
        case .merge:
            var merged = local
            merged.content = "\(local.content)\n\n\(remote.content)"
            merged.version = max(local.version, remote.version) + 1
            merged.updatedAt = Date()
            return merged
        }
    }
}
```

## Key Points

- Implement local-first data architecture
- Use Core Data or SQLite for local persistence
- Queue operations when offline
- Sync in background when connectivity returns
- Use conflict resolution strategies
- Implement optimistic UI updates
- Handle partial sync with incremental changes
- Use reachability monitoring for connectivity
- Show offline indicators in the UI
- Cache API responses for offline reading
- Use background fetch for periodic sync
- Handle sync errors with retry and exponential backoff
