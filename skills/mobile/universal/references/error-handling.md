# Mobile Error Handling

Handling failures in mobile apps end to end: classifying errors, modelling them in the data and presentation layers, retry and offline behaviour, user-facing messaging, crash reporting, and platform-specific traps (cancellation, process death, background limits).

## Error Taxonomy

| Class | Examples | Typical handling |
|-------|----------|------------------|
| Connectivity | No network, DNS failure, timeout | Show offline state, queue writes, retry when online |
| Server transient | 429, 502, 503, 504 | Bounded retry with backoff (respect `Retry-After`) |
| Client / validation | 400, 409, 422 | Show field or conflict message; do not retry |
| Auth | 401, 403, refresh-token failure | Refresh once; on failure sign out cleanly |
| Data | JSON decoding, schema mismatch | Report to crash/telemetry, show generic error, keep app usable |
| Device | Storage full, permission denied, camera unavailable | Explain and link to settings |
| Programming bugs | Null dereference, index out of range | Crash reporting; do not swallow |

Expected failures (network, validation) are values to handle. Programming errors should crash in debug and be reported in release.

## Modelling Errors

### Kotlin
```kotlin
sealed interface AppError {
    data object Offline : AppError
    data class Server(val code: Int, val retryAfterSeconds: Long?) : AppError
    data class Validation(val fieldErrors: Map<String, String>) : AppError
    data object Unauthorized : AppError
    data class Unexpected(val cause: Throwable) : AppError
}

suspend fun <T> safeCall(block: suspend () -> T): Result<T> =
    try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e                                  // never swallow coroutine cancellation
    } catch (e: IOException) {
        Result.failure(AppException(AppError.Offline, e))
    } catch (e: HttpException) {
        Result.failure(AppException(mapHttp(e), e))
    }
```

### Swift
```swift
enum AppError: Error, Equatable {
    case offline
    case server(status: Int, retryAfter: TimeInterval?)
    case validation([String: String])
    case unauthorized
    case unexpected(String)
}

func map(_ error: Error) -> AppError {
    if error is CancellationError { return .unexpected("cancelled") } // usually filtered before UI
    if let urlError = error as? URLError {
        switch urlError.code {
        case .notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotFindHost: return .offline
        case .cancelled: return .unexpected("cancelled")
        default: return .unexpected(urlError.localizedDescription)
        }
    }
    return .unexpected(String(describing: error))
}
```

### Dart
```dart
sealed class AppError implements Exception {
  const AppError();
}
class Offline extends AppError { const Offline(); }
class ServerError extends AppError { const ServerError(this.status); final int status; }
class ValidationError extends AppError { const ValidationError(this.fields); final Map<String, String> fields; }
```

### TypeScript (React Native)
```ts
export type AppError =
  | { kind: 'offline' }
  | { kind: 'server'; status: number; retryAfter?: number }
  | { kind: 'validation'; fields: Record<string, string> }
  | { kind: 'unauthorized' }
  | { kind: 'unexpected'; error: unknown }
```

Map transport errors to `AppError` in the data layer; presentation code never inspects HTTP libraries' exception types.

## UI State for Errors

| State | Presentation |
|-------|--------------|
| Initial load failed, no cache | Full-screen error with retry |
| Refresh failed, cache present | Keep content, show non-blocking banner/snackbar, mark data as stale |
| Action failed (submit) | Inline message near the control; keep user input |
| Validation | Field-level messages |
| Offline | Persistent offline indicator; queue writes if supported |

Never clear a form or navigate away on failure. Make retry idempotent (see below).

## Retry and Backoff

```kotlin
suspend fun <T> retrying(
    maxAttempts: Int = 3,
    baseDelayMs: Long = 500,
    maxDelayMs: Long = 8_000,
    isRetryable: (Throwable) -> Boolean,
    block: suspend () -> T,
): T {
    var attempt = 0
    while (true) {
        try {
            return block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            attempt++
            if (attempt >= maxAttempts || !isRetryable(e)) throw e
            val cap = minOf(maxDelayMs, baseDelayMs shl (attempt - 1))
            delay(Random.nextLong(0, cap + 1))   // full jitter
        }
    }
}
```

- Retry only idempotent requests, or POSTs carrying an `Idempotency-Key` header generated once per user action.
- Retry at one layer only (e.g. the HTTP client), not in every layer.
- For offline writes, persist to a queue and process with WorkManager (Android), `BGTaskScheduler`/background URLSession (iOS), or workmanager/background fetch plugins on cross-platform stacks.

## Auth Failures

- On 401, perform a single token refresh guarded by a mutex so parallel requests do not trigger multiple refreshes.
- If refresh fails, clear credentials, cancel in-flight work, and route to sign-in with a clear message.
- 403 is not fixed by refreshing; show a permission message.

## Global Handlers and Crash Reporting

| Platform | Unhandled errors | Reporter |
|----------|------------------|----------|
| Android | `Thread.setDefaultUncaughtExceptionHandler` (installed by SDKs), coroutine `CoroutineExceptionHandler` | Firebase Crashlytics, Sentry |
| iOS | Signal/exception handlers installed by SDK | Crashlytics, Sentry |
| Flutter | `FlutterError.onError`, `PlatformDispatcher.instance.onError` | Crashlytics (`recordFlutterFatalError`), Sentry |
| React Native | `ErrorUtils.setGlobalHandler`, React error boundaries | Sentry, Crashlytics (RN Firebase) |

```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };
  runApp(const App());
}
```

Report handled-but-unexpected errors as non-fatal with context (screen, operation, anonymized IDs). Do not send personal data, tokens or full request bodies.

## Platform Traps

- **Cancellation**: Kotlin `CancellationException`, Swift `CancellationError`/`URLError.cancelled`, aborted fetches. Treat as normal flow, never as an error to show.
- **Process death (Android)**: state not saved in `SavedStateHandle`/persistent storage is lost; restore gracefully instead of crashing on missing data.
- **Background execution limits**: network work started in the foreground may be suspended; use proper background APIs.
- **Main-thread violations**: disk/network on the main thread cause ANRs (Android) or watchdog terminations (iOS).

## User-Facing Messages

- Say what happened and what the user can do: "Couldn't load orders. Check your connection and try again."
- Avoid raw exception text, status codes and stack traces in UI.
- Localize all messages; include a support/error reference ID for unexpected errors.

## Checklist

- [ ] Transport errors mapped to a typed `AppError` in the data layer
- [ ] Cancellation rethrown/ignored, never shown
- [ ] Retries bounded, jittered, idempotent, single-layer
- [ ] Cached content kept on refresh failure; input kept on submit failure
- [ ] Global handlers + crash reporting with symbol/mapping upload; no PII in reports
