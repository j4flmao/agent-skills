# Android Fundamentals

## Overview
Android is Google's mobile operating system based on the Linux kernel. Android apps are primarily written in Kotlin (preferred) or Java, compiled to bytecode, and run on the Android Runtime (ART). The modern Android development stack uses Jetpack Compose for UI, Kotlin coroutines for concurrency, and Gradle for builds.

## Core Concepts

### Activity & Fragment Lifecycle
Activities and Fragments have well-defined lifecycle callbacks: `onCreate`, `onStart`, `onResume`, `onPause`, `onStop`, `onDestroy`. Use `LifecycleObserver` or `repeatOnLifecycle` for lifecycle-aware coroutines. Avoid logic in lifecycle methods — delegate to ViewModel.

### Intents and Navigation
Explicit intents navigate within the app; implicit intents invoke system actions. Use Navigation Compose with `NavHost` and `NavController` for declarative navigation. Define routes as sealed classes for type safety. Support deep links via intent filters in the manifest.

### Resources and Configuration
Resources (`res/`) are separated by qualifiers: layout, drawable, values, strings. Configuration qualifiers (language, screen size, orientation, night mode) allow resource overrides. Use `R.java` generated references. For Compose, use `MaterialTheme` and `LocalConfiguration` for runtime configuration.

### Manifest and App Components
`AndroidManifest.xml` declares all app components (activities, services, broadcast receivers, content providers), permissions, features, and the application class. Every component except broadcast receivers must be explicitly registered.

## Architecture Patterns

### MVVM with Compose
The standard architecture for modern Android apps: UI (Composable functions) observes ViewModel state via `StateFlow`. ViewModel exposes state and handles actions. Repository abstracts data sources. Use `hiltViewModel()` in Compose for DI integration.

### Clean Architecture with Modules
Domain layer (pure Kotlin): use cases, repository interfaces, models. Data layer: repository implementations, API services, DAOs. Presentation layer: Compose screens, ViewModels. Each layer is a Gradle module for strict dependency boundaries.

### Repository Pattern
Repository is the single entry point for data access. Returns `Flow` for reactive reads, `suspend` functions for one-shot operations. Repository decides data source (network vs cache) based on offline strategy and staleness TTL.

## Data Management

### Room Database
Room is an abstraction layer over SQLite. Define entities with `@Entity`, DAOs with `@Dao`, database with `@Database`. Room provides compile-time SQL verification, Flow-based reactive queries, and migration support. Use `@Transaction` for complex operations.

### DataStore
Jetpack DataStore replaces SharedPreferences for key-value storage. `Preferences DataStore` for simple settings (type-safe, async). `Proto DataStore` for typed objects with schema evolution. DataStore uses `Flow` for reactive reads and runs on `Dispatchers.IO`.

### File Storage
Use `context.filesDir` for app-private files, `context.cacheDir` for temporary data, `context.getExternalFilesDir()` for external storage. MediaStore API for shared media. SAF (Storage Access Framework) for user-selected files.

## Security Fundamentals

### EncryptedSharedPreferences
Wrap sensitive key-value data with `EncryptedSharedPreferences` using AES256 encryption. Master key stored in Android KeyStore (hardware-backed on supported devices). Mark the key as `KeyProperties.PURPOSE_ENCRYPT | PURPOSE_DECRYPT`.

### Network Security Config
Use `network_security_config.xml` to enforce HTTPS, pin certificates, and disable cleartext traffic. Reference in `AndroidManifest.xml` via `android:networkSecurityConfig`. Include backup pins with expiration dates.

### Biometric Authentication
Use `BiometricPrompt` with `BIOMETRIC_STRONG` for sensitive operations. Always allow `DEVICE_CREDENTIAL` fallback. Check `BiometricManager.canAuthenticate()` before showing prompt.

## Build & Dependency Management

### Gradle Build System
Android uses Gradle with Kotlin DSL (`build.gradle.kts`). Key configurations: `compileSdk`, `minSdk`, `targetSdk`, `applicationId`, `versionCode`, `versionName`. Use `libs.version.toml` for centralized version catalog.

### Dependency Injection with Hilt
Hilt is the standard DI framework for Android. Annotate Application with `@HiltAndroidApp`, Activities with `@AndroidEntryPoint`, ViewModels with `@HiltViewModel`. Define modules with `@Module` and `@InstallIn`.

## Testing

### Unit Testing
JUnit 5 + MockK for Kotlin mocking. Test ViewModels with `MainDispatcherRule` and `runTest`. Test use cases with mocked repositories. Aim for 80%+ coverage on domain and ViewModel layers.

### UI Testing
Compose UI tests with `createComposeRule()`. Use `onNodeWithText`, `onNodeWithTag`, `performClick`, `assertIsDisplayed`. Paparazzi for golden/snapshot tests. Espresso for legacy View-based tests.

## Key Points
- Kotlin is the preferred language for new Android development
- Jetpack Compose is the modern UI toolkit (replaces XML layouts)
- ViewModel survives configuration changes (rotation, locale switch)
- Lifecycle-aware components prevent memory leaks
- Room provides compile-time SQL verification and reactive queries
- Hilt manages dependency injection with compile-time validation
- Gradle with Kotlin DSL and version catalogs for build management
- Test with JUnit + MockK + Compose UI tests
- ProGuard/R8 for release build optimization and obfuscation
- Android App Bundle (AAB) for Play Store distribution
