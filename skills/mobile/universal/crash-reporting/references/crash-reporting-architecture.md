# Crash Reporting Architecture

## Overview

A well-designed crash reporting architecture captures, processes, and delivers crash data reliably across mobile platforms while respecting privacy, battery life, and network constraints. This guide covers SDK design considerations, crash report format and schema, native crash handling, breadcrumb system design, session-based crash grouping, upload strategies, and privacy compliance.

## SDK Design Considerations

### Core Principles

**Reliability**: The crash reporting SDK must not interfere with the host application's stability. It must be resilient to its own failures.

**Lightweight footprint**: Minimize binary size impact (target < 500KB), memory overhead (target < 1MB), and CPU usage (target < 0.1% CPU).

**Startup priority**: Initialize before any application code runs. Capture crashes that occur during startup.

**Fail-safe**: If the SDK fails, the application must continue functioning normally. Never throw from SDK code.

**Privacy-first**: Never collect PII without explicit user consent. Provide opt-out mechanisms.

### SDK Architecture

```
Application Code
    |
CrashReporting SDK
    |            |              |              |
Signal Handler  Exception     Breadcrumb     Session
(Native)       Handler       Manager         Manager
    |            |              |              |
    └──── Crash Report Builder ───────────────┘
                    |
            Serialization Layer
                    |
            Storage Layer (disk)
                    |
            Upload Manager
                    |
            Crash Reporting Server
```

### Initialization Sequence

```kotlin
// Android SDK initialization
class CrashReportingSdk private constructor(
    private val config: SdkConfig
) {
    companion object {
        @Volatile
        private var instance: CrashReportingSdk? = null

        fun initialize(context: Context, config: SdkConfig) {
            if (instance != null) return
            synchronized(this) {
                if (instance != null) return
                instance = CrashReportingSdk(config)

                // Order matters:
                // 1. Install signal handlers first (catch all signals)
                // 2. Install crash handler
                // 3. Start session
                // 4. Start breadcrumb monitoring
                instance!!.installNativeSignalHandler()
                instance!!.installUncaughtExceptionHandler()
                instance!!.startSession()
                instance!!.startBreadcrumbManager()

                // Only now should user code run
            }
        }
    }

    private fun installNativeSignalHandler() {
        NativeSignalHandler.install(
            signals = intArrayOf(
                Signal.SIGSEGV,  // Invalid memory reference
                Signal.SIGABRT,  // Abort signal
                Signal.SIGBUS,   // Bus error (bad memory access)
                Signal.SIGFPE,   // Floating-point exception
                Signal.SIGILL,   // Illegal instruction
                Signal.SIGTRAP,  // Trace/breakpoint trap
            ),
            handler = this::handleNativeCrash
        )
    }

    private fun installUncaughtExceptionHandler() {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            handleUncaughtException(thread, throwable)
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }
}
```

## Crash Report Format and Schema

### Unified Crash Report Schema

```json
{
  "$schema": "https://crashreporting.dev/schema/crash-report-v2.json",
  "title": "CrashReport",
  "type": "object",
  "required": [
    "id",
    "timestamp",
    "type",
    "app",
    "device",
    "user"
  ],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique crash report identifier"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "UTC timestamp of crash occurrence"
    },
    "type": {
      "type": "string",
      "enum": [
        "uncaught_exception",
        "native_signal",
        "anr",
        "out_of_memory",
        "watchdog_timeout",
        "non_fatal_exception",
        "app_exit_reason"
      ]
    },
    "app": {
      "type": "object",
      "required": ["id", "version", "build"],
      "properties": {
        "id": { "type": "string" },
        "version": { "type": "string", "example": "2.4.1" },
        "build": { "type": "string", "example": "245" },
        "release_stage": { "type": "string", "enum": ["development", "staging", "production"] }
      }
    },
    "device": {
      "type": "object",
      "required": ["arch", "os", "os_version", "model"],
      "properties": {
        "arch": { "type": "string", "enum": ["arm64", "armv7", "x86_64", "i386"] },
        "os": { "type": "string", "enum": ["ios", "android", "flutter", "react_native"] },
        "os_version": { "type": "string", "example": "17.3" },
        "model": { "type": "string", "example": "iPhone 15 Pro" },
        "manufacturer": { "type": "string", "example": "Apple" },
        "memory_total_mb": { "type": "integer" },
        "storage_free_mb": { "type": "integer" },
        "battery_level": { "type": "number", "minimum": 0, "maximum": 1 },
        "low_power_mode": { "type": "boolean" },
        "orientation": { "type": "string", "enum": ["portrait", "landscape"] },
        "locale": { "type": "string", "example": "en_US" },
        "timezone": { "type": "string", "example": "America/New_York" }
      }
    },
    "user": {
      "type": "object",
      "required": ["id"],
      "properties": {
        "id": { "type": "string", "description": "Hashed user identifier" },
        "is_opted_in": { "type": "boolean" }
      }
    },
    "exception": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "example": "NullPointerException" },
        "message": { "type": "string", "example": "Cannot read property of null" },
        "stack_trace": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "library": { "type": "string" },
              "symbol": { "type": "string" },
              "address": { "type": "string" },
              "offset": { "type": "integer" },
              "in_app": { "type": "boolean" },
              "filename": { "type": "string" },
              "line_number": { "type": "integer" }
            }
          }
        }
      }
    },
    "signal": {
      "type": "object",
      "properties": {
        "number": { "type": "integer" },
        "name": { "type": "string" },
        "code": { "type": "integer" },
        "address": { "type": "string" }
      }
    },
    "threads": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "crashed": { "type": "boolean" },
          "priority": { "type": "integer" },
          "state": { "type": "string", "enum": ["running", "runnable", "waiting", "blocked"] },
          "backtrace": { "type": "array", "items": { "$ref": "#/properties/exception/properties/stack_trace/items" } }
        }
      }
    },
    "breadcrumbs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "type": { "type": "string", "enum": ["navigation", "user_action", "network", "state_change", "error", "system", "custom"] },
          "message": { "type": "string" },
          "data": { "type": "object" },
          "level": { "type": "string", "enum": ["debug", "info", "warning", "error"] }
        }
      }
    },
    "session": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "start_time": { "type": "string", "format": "date-time" },
        "duration_ms": { "type": "integer" },
        "launch_type": { "type": "string", "enum": ["cold", "warm", "hot"] },
        "previous_crash": { "type": "boolean" }
      }
    },
    "metadata": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    }
  }
}
```

## Native Crash Handling

### iOS Mach Exception Handler

```c
// ios_crash_handler.c
#include <mach/mach.h>
#include <mach/task.h>
#include <signal.h>
#include <pthread.h>
#include <execinfo.h>

static mach_port_t exception_port;
static pthread_t handler_thread;

// Callback invoked when a Mach exception occurs
kern_return_t catch_mach_exception(
    mach_port_t task,
    mach_port_t thread,
    mach_port_t exception_port,
    exception_type_t exception_type,
    mach_exception_data_t exception_codes,
    mach_msg_type_number_t exception_code_count
) {
    // Collect thread state
    arm_unified_thread_state_t thread_state;
    mach_msg_type_number_t thread_state_count = ARM_UNIFIED_THREAD_STATE_COUNT;
    thread_get_state(thread, ARM_UNIFIED_THREAD_STATE,
                     (thread_state_t)&thread_state, &thread_state_count);

    // Build crash report
    crash_report_t report;
    report.exception_type = exception_type;
    report.exception_code = exception_codes[0];
    report.exception_subcode = exception_codes[1];
    report.pc = thread_state.ts_64.__pc;
    report.lr = thread_state.ts_64.__lr;
    report.sp = thread_state.ts_64.__sp;

    // Collect backtrace
    report.frame_count = 0;
    uint64_t fp = thread_state.ts_64.__fp;
    while (fp != 0 && report.frame_count < MAX_FRAMES) {
        uint64_t *frame = (uint64_t *)fp;
        report.frames[report.frame_count++] = frame[1];  // LR/return address
        fp = frame[0];  // Next frame pointer
    }

    // Save crash report to disk
    save_crash_report(report);

    // Try to handle the exception (return KERN_SUCCESS to claim it)
    // If we cannot handle it, return KERN_FAILURE to let it propagate
    return KERN_FAILURE;  // Let the system handle the actual crash
}

// Install Mach exception handler
void install_exception_handler(void) {
    // Create a receive port for exceptions
    mach_port_allocate(mach_task_self(),
                       MACH_PORT_RIGHT_RECEIVE, &exception_port);

    // Set the exception port for the current task
    task_set_exception_ports(
        mach_task_self(),
        EXC_MASK_BAD_ACCESS |
        EXC_MASK_BAD_INSTRUCTION |
        EXC_MASK_ARITHMETIC |
        EXC_MASK_SOFTWARE |
        EXC_MASK_BREAKPOINT,
        exception_port,
        EXCEPTION_DEFAULT,
        THREAD_STATE_NONE
    );

    // Start handler thread to listen for exceptions
    pthread_create(&handler_thread, NULL, exception_handler_loop, NULL);
}

// Exception handler loop
void *exception_handler_loop(void *arg) {
    mach_msg_server(
        catch_mach_exception,
        sizeof(mach_msg_max_t),
        exception_port,
        MACH_MSG_TIMEOUT_NONE
    );
    return NULL;
}
```

### Android NDK Signal Handler

```cpp
// android_signal_handler.cpp
#include <signal.h>
#include <unwind.h>
#include <dlfcn.h>
#include <android/log.h>

struct sigaction old_actions[NSIG];

// Unwind callback for stack trace collection
struct UnwindState {
    uintptr_t* frames;
    size_t max_frames;
    size_t frame_count;
};

_Unwind_Reason_Code unwind_callback(struct _Unwind_Context* context, void* arg) {
    UnwindState* state = (UnwindState*)arg;
    if (state->frame_count >= state->max_frames) {
        return _URC_END_OF_STACK;
    }
    uintptr_t pc = _Unwind_GetIP(context);
    if (pc == 0) {
        return _URC_END_OF_STACK;
    }
    state->frames[state->frame_count++] = pc;
    return _URC_NO_REASON;
}

void signal_handler(int signum, siginfo_t* info, void* context) {
    // Prevent recursive crashes
    static std::atomic<bool> handling{false};
    if (handling.exchange(true)) {
        // Recursive crash - restore default handler and re-raise
        signal(signum, SIG_DFL);
        raise(signum);
        return;
    }

    // Collect stack trace
    const size_t max_frames = 128;
    uintptr_t frames[max_frames];
    UnwindState state = {frames, max_frames, 0};
    _Unwind_Backtrace(unwind_callback, &state);

    // Resolve symbol names
    char report[4096];
    int offset = snprintf(report, sizeof(report),
        "Signal: %d (%s)\n",
        signum, strsignal(signum));

    for (size_t i = 0; i < state.frame_count; i++) {
        Dl_info info;
        if (dladdr((void*)frames[i], &info)) {
            offset += snprintf(report + offset, sizeof(report) - offset,
                "  #%02zu  %s  %s + %zu\n",
                i, info.dli_fname ? info.dli_fname : "?",
                info.dli_sname ? info.dli_sname : "?",
                (uint8_t*)frames[i] - (uint8_t*)info.dli_saddr);
        } else {
            offset += snprintf(report + offset, sizeof(report) - offset,
                "  #%02zu  0x%" PRIxPTR "\n", i, frames[i]);
        }
    }

    // Write crash report to app's cache directory
    write_report(report);

    // Restore old handler and re-raise
    sigaction(signum, &old_actions[signum], nullptr);
    handling.store(false);
    raise(signum);
}

void install_signal_handlers() {
    struct sigaction action;
    action.sa_sigaction = signal_handler;
    sigemptyset(&action.sa_mask);
    action.sa_flags = SA_SIGINFO | SA_ONSTACK;

    // Install alternate stack for signal handling
    stack_t stack;
    stack.ss_sp = malloc(SIGSTKSZ);
    stack.ss_size = SIGSTKSZ;
    stack.ss_flags = 0;
    sigaltstack(&stack, NULL);

    // Catch common crash signals
    int signals[] = {SIGSEGV, SIGABRT, SIGBUS, SIGFPE, SIGILL, SIGTRAP};
    for (int sig : signals) {
        sigaction(sig, &action, &old_actions[sig]);
    }
}
```

## Breadcrumb System Design

### Ring Buffer Implementation

```kotlin
// BreadcrumbManager.kt
class BreadcrumbManager(private val maxBreadcrumbs: Int = 200) {
    private val ringBuffer = CircularBuffer<Breadcrumb>(maxBreadcrumbs)
    private val filters = mutableListOf<BreadcrumbFilter>()

    fun addBreadcrumb(
        message: String,
        type: BreadcrumbType = BreadcrumbType.CUSTOM,
        level: BreadcrumbLevel = BreadcrumbLevel.INFO,
        data: Map<String, Any>? = null
    ) {
        val breadcrumb = Breadcrumb(
            timestamp = System.currentTimeMillis(),
            type = type,
            level = level,
            message = message.truncate(512),
            data = data?.filterValues { it.isSerializable() }
        )

        if (filters.all { it.allow(breadcrumb) }) {
            synchronized(ringBuffer) {
                ringBuffer.add(breadcrumb)
            }
        }
    }

    fun getBreadcrumbs(): List<Breadcrumb> {
        synchronized(ringBuffer) {
            return ringBuffer.toList()
        }
    }

    fun addFilter(filter: BreadcrumbFilter) {
        filters.add(filter)
    }

    fun clear() {
        synchronized(ringBuffer) {
            ringBuffer.clear()
        }
    }
}

data class Breadcrumb(
    val timestamp: Long,
    val type: BreadcrumbType,
    val level: BreadcrumbLevel,
    val message: String,
    val data: Map<String, Any>?
)

enum class BreadcrumbType {
    NAVIGATION,
    USER_ACTION,
    NETWORK_REQUEST,
    NETWORK_RESPONSE,
    STATE_CHANGE,
    ERROR,
    SYSTEM_EVENT,
    ANR,
    MEMORY_WARNING,
    CUSTOM
}

enum class BreadcrumbLevel { DEBUG, INFO, WARNING, ERROR }

// Automatic breadcrumbs
class AutomaticBreadcrumbPlugin(
    private val breadcrumbManager: BreadcrumbManager
) {
    fun trackNavigation(currentScreen: String) {
        breadcrumbManager.addBreadcrumb(
            message = "Navigated to $currentScreen",
            type = BreadcrumbType.NAVIGATION,
            level = BreadcrumbLevel.INFO
        )
    }

    fun trackNetworkRequest(url: String, method: String) {
        breadcrumbManager.addBreadcrumb(
            message = "Network request: $method $url",
            type = BreadcrumbType.NETWORK_REQUEST,
            level = BreadcrumbLevel.DEBUG
        )
    }

    fun trackNetworkResponse(url: String, statusCode: Int, durationMs: Long) {
        val level = when {
            statusCode in 200..299 -> BreadcrumbLevel.DEBUG
            statusCode in 400..499 -> BreadcrumbLevel.WARNING
            else -> BreadcrumbLevel.ERROR
        }
        breadcrumbManager.addBreadcrumb(
            message = "Network response: $statusCode $url (${durationMs}ms)",
            type = BreadcrumbType.NETWORK_RESPONSE,
            level = level
        )
    }

    fun trackError(error: Throwable, context: String) {
        breadcrumbManager.addBreadcrumb(
            message = "${error::class.simpleName}: ${error.message}",
            type = BreadcrumbType.ERROR,
            level = BreadcrumbLevel.ERROR,
            data = mapOf("context" to context)
        )
    }
}
```

## Session-Based Crash Grouping

### Session Manager

```kotlin
// SessionManager.kt
class SessionManager(private val config: SessionConfig) {
    private var currentSession: Session? = null
    private val sessionStore = SessionStore()

    fun startSession(launchType: LaunchType) {
        val session = Session(
            id = generateSessionId(),
            startTime = System.currentTimeMillis(),
            launchType = launchType,
            previousCrash = hasPreviousSessionCrashed()
        )
        currentSession = session
        sessionStore.save(session)
    }

    fun endSession() {
        currentSession?.let { session ->
            session.durationMs = System.currentTimeMillis() - session.startTime
            sessionStore.update(session)
        }
    }

    fun markSessionAsCrashed() {
        currentSession?.let { session ->
            session.crashed = true
            sessionStore.update(session)
        }
    }

    fun getCurrentSession(): Session? = currentSession

    fun getRecentSessions(count: Int): List<Session> {
        return sessionStore.getRecent(count)
    }

    private fun hasPreviousSessionCrashed(): Boolean {
        return sessionStore.getLast()?.crashed == true
    }

    private fun generateSessionId(): String {
        return UUID.randomUUID().toString()
    }
}

data class Session(
    val id: String,
    val startTime: Long,
    val launchType: LaunchType,
    val previousCrash: Boolean = false,
    var durationMs: Long = 0,
    var crashed: Boolean = false
)

enum class LaunchType { COLD, WARM, HOT }
```

## Upload Strategies

### Batched Upload with Retry

```kotlin
// UploadManager.kt
class UploadManager(
    private val endpoint: String,
    private val maxRetries: Int = 5,
    private val maxBatchSize: Int = 10,
    private val maxStorageBytes: Long = 5 * 1024 * 1024 // 5MB
) {
    private val uploadQueue = mutableListOf<CrashReport>()
    private var isUploading = false
    private val crashStore = CrashStore(maxStorageBytes)

    fun enqueue(report: CrashReport) {
        synchronized(uploadQueue) {
            crashStore.save(report)
            uploadQueue.add(report)
        }
        attemptUpload()
    }

    private fun attemptUpload() {
        if (isUploading) return
        isUploading = true

        Thread {
            while (true) {
                val batch = getNextBatch()
                if (batch.isEmpty()) break

                uploadBatch(batch)
            }
            isUploading = false
        }.apply {
            priority = Thread.MIN_PRIORITY
            start()
        }
    }

    private fun getNextBatch(): List<CrashReport> {
        synchronized(uploadQueue) {
            val batch = uploadQueue.take(maxBatchSize)
            uploadQueue.removeAll(batch)
            return batch
        }
    }

    private fun uploadBatch(batch: List<CrashReport>) {
        var retryCount = 0
        var success = false

        while (!success && retryCount < maxRetries) {
            try {
                // Serialize and compress batch
                val json = Json.encodeToString(batch)
                val compressed = Gzip.compress(json.toByteArray())

                // Upload
                val response = httpClient.post(endpoint) {
                    setBody(compressed)
                    contentType(ContentType.Application.OctetStream)
                    header("Content-Encoding", "gzip")
                }

                if (response.status.isSuccess()) {
                    success = true
                    // Remove successfully uploaded reports from persistent storage
                    batch.forEach { crashStore.delete(it.id) }
                }
            } catch (e: Exception) {
                retryCount++
                if (retryCount < maxRetries) {
                    // Exponential backoff
                    Thread.sleep((1000L * Math.pow(2.0, retryCount.toDouble())).toLong())
                }
            }
        }

        // Re-queue failed uploads
        if (!success) {
            synchronized(uploadQueue) {
                uploadQueue.addAll(batch)
            }
        }
    }
}
```

## Privacy Compliance

### PII Scrubbing

```kotlin
// PrivacyScrubber.kt
class PrivacyScrubber(private val rules: List<ScrubRule>) {

    fun scrub(report: CrashReport): CrashReport {
        var scrubbed = report

        // Apply each scrub rule
        for (rule in rules) {
            scrubbed = when (rule) {
                is ScrubRule.Email -> scrubEmail(scrubbed)
                is ScrubRule.Phone -> scrubPhone(scrubbed)
                is ScrubRule.SSN -> scrubSSN(scrubbed)
                is ScrubRule.IPAddress -> scrubIPAddress(scrubbed)
                is ScrubRule.CreditCard -> scrubCreditCard(scrubbed)
                is ScrubRule.CustomField -> scrubCustomField(scrubbed, rule.fieldName)
                is ScrubRule.BreadcrumbData -> scrubBreadcrumbData(scrubbed, rule.keys)
            }
        }

        return scrubbed
    }

    private fun scrubEmail(report: CrashReport): CrashReport {
        val emailPattern = Regex("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}")
        return report.copy(
            breadcrumbs = report.breadcrumbs.map { bc ->
                bc.copy(message = emailPattern.replace(bc.message, "[EMAIL]"))
            }
        )
    }

    private fun scrubCustomField(report: CrashReport, fieldName: String): CrashReport {
        val scrubbedMetadata = report.metadata.toMutableMap()
        scrubbedMetadata.remove(fieldName)
        return report.copy(metadata = scrubbedMetadata)
    }

    private fun scrubBreadcrumbData(report: CrashReport, keys: List<String>): CrashReport {
        return report.copy(
            breadcrumbs = report.breadcrumbs.map { bc ->
                val scrubbedData = bc.data?.toMutableMap()
                keys.forEach { key -> scrubbedData?.remove(key) }
                bc.copy(data = scrubbedData)
            }
        )
    }
}

sealed class ScrubRule {
    object Email : ScrubRule()
    object Phone : ScrubRule()
    object SSN : ScrubRule()
    object IPAddress : ScrubRule()
    object CreditCard : ScrubRule()
    data class CustomField(val fieldName: String) : ScrubRule()
    data class BreadcrumbData(val keys: List<String>) : ScrubRule()
}
```

## Key Points

- SDK architecture follows a layered design: signal/exception handlers, breadcrumb manager, session manager, serialization, storage, and upload manager
- Initialization order matters: install signal handlers first, then exception handlers, then session and breadcrumb managers
- Unified crash report schema covers all crash types (uncaught exception, native signal, ANR, OOM, watchdog timeout) with app, device, user, exception, threads, breadcrumbs, and session data
- Native crash handling requires platform-specific code: Mach exceptions on iOS, signal handlers on Android NDK with alternate stack and async-signal-safe operations
- Breadcrumb system uses a ring buffer with configurable max size, automatic tracking of navigation, network, errors, and manual custom breadcrumbs
- Session-based grouping links crashes to launch type, duration, and prior crash state for context
- Upload strategy uses batched delivery with Gzip compression, exponential backoff retry, and persistent storage with storage size limits
- Privacy scrubbing removes PII (email, phone, SSN, IP, credit card) from crash reports before upload using configurable scrub rules
- Consent management and opt-out mechanisms must be built into the SDK from the start, not added later
