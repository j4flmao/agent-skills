# Cloud Storage Integration

## CloudKit Setup

```swift
import CloudKit

class CloudKitManager {
    private let container: CKContainer
    private let database: CKDatabase

    init(containerIdentifier: String) {
        container = CKContainer(identifier: containerIdentifier)
        database = container.privateCloudDatabase
    }

    func saveRecord(_ record: CKRecord) async throws -> CKRecord {
        return try await database.save(record)
    }

    func fetchRecords(type: String, predicate: NSPredicate = .init(value: true)) async throws -> [CKRecord] {
        let query = CKQuery(recordType: type, predicate: predicate)
        let result = try await database.records(matching: query)

        return result.matchResults.compactMap { try? $0.1.get() }
    }

    func subscribeToChanges(recordType: String) async throws {
        let subscription = CKQuerySubscription(
            recordType: recordType,
            predicate: .init(value: true),
            subscriptionID: "\(recordType)_changes",
            options: [.firesOnRecordCreation, .firesOnRecordUpdate, .firesOnRecordDeletion]
        )

        let notification = CKSubscription.NotificationInfo()
        notification.alertBody = "Data updated"
        notification.shouldBadge = true
        subscription.notificationInfo = notification

        try await database.save(subscription)
    }

    func syncWithCloud() async throws {
        let changes = try await fetchRecordChanges()

        for change in changes {
            switch change {
            case .save(let record):
                try await saveRecord(record)
            case .delete(let recordID):
                try await database.deleteRecord(withID: recordID)
            }
        }
    }

    private func fetchRecordChanges() async throws -> [CKRecordChange] {
        var changes: [CKRecordChange] = []

        let zoneChanges = try await database.recordZoneChanges()

        for change in zoneChanges {
            switch change {
            case .record(let record):
                changes.append(.save(record))
            case .recordDeleted(let recordID):
                changes.append(.delete(recordID))
            default:
                break
            }
        }

        return changes
    }

    enum CKRecordChange {
        case save(CKRecord)
        case delete(CKRecord.ID)
    }
}
```

## Firebase Firestore

```swift
import FirebaseFirestore

class FirestoreManager {
    private let db = Firestore.firestore()

    func saveDocument<T: Encodable>(_ object: T, collection: String, documentId: String? = nil) async throws {
        let collectionRef = db.collection(collection)
        let data = try Firestore.Encoder().encode(object)

        if let docId = documentId {
            try await collectionRef.document(docId).setData(data)
        } else {
            try await collectionRef.addDocument(data: data)
        }
    }

    func listenToCollection<T: Decodable>(
        collection: String,
        type: T.Type,
        completion: @escaping ([T]) -> Void
    ) -> ListenerRegistration {
        return db.collection(collection).addSnapshotListener { snapshot, error in
            guard let documents = snapshot?.documents else {
                completion([])
                return
            }

            let objects = documents.compactMap { doc in
                try? doc.data(as: T.self)
            }
            completion(objects)
        }
    }

    func queryDocuments<T: Decodable>(
        collection: String,
        type: T.Type,
        field: String,
        operator op: String = "==",
        value: Any
    ) async throws -> [T] {
        let query = db.collection(collection).whereField(field, isEqualTo: value)
        let snapshot = try await query.getDocuments()

        return snapshot.documents.compactMap { try? $0.data(as: T.self) }
    }

    func deleteDocument(collection: String, documentId: String) async throws {
        try await db.collection(collection).document(documentId).delete()
    }
}
```

## Key Points

- Use CloudKit for Apple ecosystem integration
- Use Firebase Firestore for cross-platform sync
- Implement offline persistence for Firestore
- Use subscription for real-time updates
- Handle sync conflicts with timestamps
- Use batch operations for bulk changes
- Implement pagination for large datasets
- Handle network errors with retry logic
- Monitor sync bandwidth and storage usage
- Use security rules for data access control
- Implement data migration for schema changes
- Test sync with multiple devices simultaneously
