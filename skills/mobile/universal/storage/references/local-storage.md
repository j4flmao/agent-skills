# Local Data Storage

## SQLite Storage

```swift
import SQLite3

class SQLiteManager {
    private var db: OpaquePointer?

    init(path: String) {
        openDatabase(path: path)
        createTables()
    }

    private func openDatabase(path: String) {
        if sqlite3_open(path, &db) != SQLITE_OK {
            print("Error opening database")
        }
    }

    private func createTables() {
        let createTable = """
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            category TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_products_category
            ON products(category);

        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        """

        executeSQL(createTable)
    }

    func insertProduct(_ product: Product) throws {
        let insert = "INSERT OR REPLACE INTO products (id, name, price, description, category) VALUES (?, ?, ?, ?, ?)"
        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, insert, -1, &statement, nil) == SQLITE_OK else {
            throw DatabaseError.prepareFailed
        }

        sqlite3_bind_text(statement, 1, (product.id as NSString).utf8String, -1, nil)
        sqlite3_bind_text(statement, 2, (product.name as NSString).utf8String, -1, nil)
        sqlite3_bind_double(statement, 3, product.price)
        sqlite3_bind_text(statement, 4, (product.description as NSString?)?.utf8String ?? nil, -1, nil)
        sqlite3_bind_text(statement, 5, (product.category as NSString?)?.utf8String ?? nil, -1, nil)

        if sqlite3_step(statement) != SQLITE_DONE {
            throw DatabaseError.executeFailed
        }

        sqlite3_finalize(statement)
    }

    func queryProducts(category: String?) throws -> [Product] {
        var products: [Product] = []

        let query: String
        if let category {
            query = "SELECT * FROM products WHERE category = ? ORDER BY name"
        } else {
            query = "SELECT * FROM products ORDER BY name"
        }

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK else {
            throw DatabaseError.prepareFailed
        }

        if let category {
            sqlite3_bind_text(statement, 1, (category as NSString).utf8String, -1, nil)
        }

        while sqlite3_step(statement) == SQLITE_ROW {
            let id = String(cString: sqlite3_column_text(statement, 0))
            let name = String(cString: sqlite3_column_text(statement, 1))
            let price = sqlite3_column_double(statement, 2)

            products.append(Product(id: id, name: name, price: price))
        }

        sqlite3_finalize(statement)
        return products
    }

    private func executeSQL(_ sql: String) {
        var errorMessage: UnsafeMutablePointer<CChar>?
        sqlite3_exec(db, sql, nil, nil, &errorMessage)

        if let error = errorMessage {
            print("SQLite error: \(String(cString: error))")
            sqlite3_free(errorMessage)
        }
    }

    enum DatabaseError: Error {
        case prepareFailed
        case executeFailed
    }
}
```

## File Storage

```swift
class FileStorageManager {
    private let fileManager = FileManager.default

    private var documentsDirectory: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    private var cacheDirectory: URL {
        fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    }

    func saveToDocuments(data: Data, fileName: String) throws -> URL {
        let url = documentsDirectory.appendingPathComponent(fileName)
        try data.write(to: url, options: .atomic)
        return url
    }

    func readFromDocuments(fileName: String) -> Data? {
        let url = documentsDirectory.appendingPathComponent(fileName)
        return try? Data(contentsOf: url)
    }

    func cacheFile(data: Data, fileName: String) throws -> URL {
        let url = cacheDirectory.appendingPathComponent(fileName)
        try data.write(to: url, options: .atomic)
        return url
    }

    func clearCache() {
        guard let contents = try? fileManager.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: nil
        ) else { return }

        for url in contents {
            try? fileManager.removeItem(at: url)
        }
    }

    func getStorageUsage() -> UInt64 {
        var totalSize: UInt64 = 0

        if let contents = try? fileManager.contentsOfDirectory(
            at: documentsDirectory,
            includingPropertiesForKeys: [.fileSizeKey]
        ) {
            for url in contents {
                if let attrs = try? fileManager.attributesOfItem(atPath: url.path),
                   let size = attrs[.size] as? UInt64 {
                    totalSize += size
                }
            }
        }

        return totalSize
    }
}
```

## Key Points

- Use SQLite for structured data with query requirements
- Use Core Data for object graph management
- Use UserDefaults for simple key-value storage
- Use FileManager for document and cache storage
- Implement storage cleanup for cache management
- Use encryption for sensitive stored data
- Handle storage limits and disk space warnings
- Use background contexts for write operations
- Implement data migration for schema changes
- Store large files in cache directory
- Use atomic writes to prevent data corruption
- Test storage operations on device and simulator
