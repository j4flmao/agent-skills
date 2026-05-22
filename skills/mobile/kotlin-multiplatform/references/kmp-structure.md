# KMP Module Structure

## Source Set Layout

```
shared/
  src/
    commonMain/kotlin/com/app/
      domain/          # Models, repo interfaces, use cases
      network/         # Ktor client, API DTOs
      database/        # SQLDelight schema, queries
      di/              # expect DI module declarations
    androidMain/kotlin/com/app/
      di/              # actual DI modules (Koin/ Kodein)
      platform/        # actual implementations (file system, UUID)
    iosMain/kotlin/com/app/
      di/              # actual DI modules
      platform/        # actual implementations
```

## build.gradle.kts — KMP Plugin

```kotlin
plugins {
  id("org.jetbrains.kotlin.multiplatform")
  id("org.jetbrains.kotlin.plugin.serialization")
  id("app.cash.sqldelight")
}

kotlin {
  androidTarget()
  iosX64()
  iosArm64()
  iosSimulatorArm64()

  sourceSets {
    commonMain.dependencies {
      implementation("io.ktor:ktor-client-core:2.3.12")
      implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
      implementation("app.cash.sqldelight:runtime:2.0.2")
    }
    androidMain.dependencies {
      implementation("io.ktor:ktor-client-okhttp:2.3.12")
      implementation("app.cash.sqldelight:android-driver:2.0.2")
    }
    iosMain.dependencies {
      implementation("io.ktor:ktor-client-darwin:2.3.12")
      implementation("app.cash.sqldelight:native-driver:2.0.2")
    }
  }
}
```

## expect/actual Pattern

```kotlin
// commonMain
expect class PlatformContext
expect fun createSqlDriver(context: PlatformContext): SqlDriver

// androidMain
actual typealias PlatformContext = android.content.Context
actual fun createSqlDriver(context: PlatformContext): SqlDriver =
  AndroidSqliteDriver(Database.Schema, context, "app.db")

// iosMain
actual class PlatformContext
actual fun createSqlDriver(context: PlatformContext): SqlDriver =
  NativeSqliteDriver(Database.Schema, "app.db")
```

## Dependency Injection

Use Koin for cross-platform DI. Declare common modules in commonMain, platform-specific modules in platform source sets. Use expect/actual for factory functions that require platform types.

## Framework Export for iOS

```kotlin
kotlin {
  listOf(iosX64(), iosArm64(), iosSimulatorArm64()).forEach {
    it.binaries.framework {
      baseName = "shared"
      isStatic = true
    }
  }
}
```

Integrate via CocoaPods (`id("org.jetbrains.kotlin.native.cocoapods")`) or SPM.
