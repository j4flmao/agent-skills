# KMP Module Structure

## Source Set Layout

```
shared/
  src/
    commonMain/kotlin/com/app/
      domain/
        model/           # Domain entities, value objects
        repository/      # Repository interfaces
        usecase/         # Business logic use cases
      network/
        api/             # Ktor API service interfaces
        dto/             # Network DTOs with @Serializable
        interceptor/     # HTTP interceptors (auth, logging)
      database/
        schema/          # SQLDelight .sq files
        dao/             # Query wrappers
      platform/          # expect declarations
      di/                # Koin module declarations
      util/              # Shared utilities (extensions, date formatting)
    androidMain/kotlin/com/app/
      platform/          # actual implementations (Context, UUID, FileSystem)
      di/                # actual Koin modules (platform bindings)
      util/              # Android-specific utilities
    iosMain/kotlin/com/app/
      platform/          # actual implementations (NSUUID, NSFileManager)
      di/                # actual Koin modules
      util/              # iOS-specific utilities
  commonTest/kotlin/com/app/   # Shared tests
  androidUnitTest/kotlin/com/app/
  iosTest/kotlin/com/app/
```

## build.gradle.kts Configuration

```kotlin
plugins {
    id("org.jetbrains.kotlin.multiplatform") version "2.0.21"
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21"
    id("org.jetbrains.compose") version "1.7.1"       // Compose Multiplatform
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21"
    id("app.cash.sqldelight") version "2.0.2"
    id("org.jetbrains.kotlin.native.cocoapods") version "2.0.21" // iOS CocoaPods
}

kotlin {
    androidTarget {
        compilations.all {
            kotlinOptions { jvmTarget = "17" }
        }
    }

    // iOS targets
    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach {
        it.binaries.framework {
            baseName = "shared"
            isStatic = true
            export(project(":shared")) // Export transitive API
        }
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                // Ktor HTTP client
                implementation("io.ktor:ktor-client-core:3.0.3")
                implementation("io.ktor:ktor-client-content-negotiation:3.0.3")
                implementation("io.ktor:ktor-serialization-kotlinx-json:3.0.3")
                implementation("io.ktor:ktor-client-logging:3.0.3")
                implementation("io.ktor:ktor-client-auth:3.0.3")

                // Serialization
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.1")

                // Database
                implementation("app.cash.sqldelight:runtime:2.0.2")
                implementation("app.cash.sqldelight:coroutines-extensions:2.0.2")

                // DI
                implementation("io.insert-koin:koin-core:4.0.0")

                // Coroutines
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
            }
        }
        val androidMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-okhttp:3.0.3")
                implementation("app.cash.sqldelight:android-driver:2.0.2")
                implementation("io.insert-koin:koin-android:4.0.0")
            }
        }
        val iosMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-darwin:3.0.3")
                implementation("app.cash.sqldelight:native-driver:2.0.2")
            }
        }
    }
}
```

## expect/actual Pattern — Complete Examples

```kotlin
// commonMain/com/app/platform/Platform.kt
expect fun createHttpClient(): HttpClient
expect fun generateUuid(): String
expect fun currentTimeMillis(): Long
expect class PlatformContext

expect object Platform {
    val appVersion: String
    val osName: String
    val deviceName: String
}

// androidMain/com/app/platform/Platform.kt
actual fun createHttpClient(): HttpClient = HttpClient(OkHttp) {
    engine { config { retryOnConnectionFailure(true) } }
}
actual fun generateUuid(): String = java.util.UUID.randomUUID().toString()
actual fun currentTimeMillis(): Long = System.currentTimeMillis()
actual class PlatformContext
actual object Platform {
    actual val appVersion: String = BuildConfig.VERSION_NAME
    actual val osName: String = "Android ${Build.VERSION.SDK_INT}"
    actual val deviceName: String = "${Build.MANUFACTURER} ${Build.MODEL}"
}

// iosMain/com/app/platform/Platform.kt
actual fun createHttpClient(): HttpClient = HttpClient(Darwin) {
    engine { configureRequest { setAllowsCellularAccess(true) } }
}
actual fun generateUuid(): String = platform.Foundation.NSUUID().UUIDString()
actual fun currentTimeMillis(): Long = (platform.Foundation.NSDate().timeIntervalSince1970 * 1000).toLong()
actual class PlatformContext
actual object Platform {
    actual val appVersion: String = NSBundle.mainBundle.infoDictionary?["CFBundleShortVersionString"] as? String ?: ""
    actual val osName: String = platform.Platform.currentPlatform().name
    actual val deviceName: String = platform.Platform.currentPlatform().model
}
```

## Dependency Injection with Koin

```kotlin
// commonMain — Shared module
val sharedModule = module {
    single { createHttpClient() }
    single<Database> { createDatabase() }
    single<ProductRepository> { ProductRepositoryImpl(get(), get()) }
    factory<GetProductsUseCase> { GetProductsUseCase(get()) }
}

// androidMain — Platform module (provides context)
val androidModule = module {
    single { PlatformContext } // Provided by Android Application
    single { createProductDao(get<PlatformContext>()) }
}

// App initialization
fun initKoin(platformContext: PlatformContext) {
    startKoin {
        modules(sharedModule, platformModule(platformContext))
    }
}
```

## SQLDelight Schema

```sql
-- shared/src/commonMain/sqldelight/com/app/database/Product.sq
CREATE TABLE ProductEntity (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image_url TEXT,
    category TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);

getAll:
SELECT * FROM ProductEntity ORDER BY updated_at DESC;

getById:
SELECT * FROM ProductEntity WHERE id = ?;

search:
SELECT * FROM ProductEntity WHERE name LIKE '%' || ? || '%' ORDER BY name;

insertOrReplace:
INSERT OR REPLACE INTO ProductEntity VALUES (?, ?, ?, ?, ?, ?, ?, ?);

deleteById:
DELETE FROM ProductEntity WHERE id = ?;

deleteAll:
DELETE FROM ProductEntity;

countByCategory:
SELECT category, COUNT(*) as cnt FROM ProductEntity GROUP BY category;
```

No preamble. No postamble. No explanations.
