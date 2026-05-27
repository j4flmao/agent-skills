---
name: mobile-offline-first
description: >
  Use this skill when the user says 'offline-first', 'offline mode', 'offline sync', 'local storage', 'offline cache', 'sync strategy', 'conflict resolution', 'offline queue', 'mobile offline', 'local database'. Design offline-capable mobile apps with local storage, sync strategies, conflict resolution, and connectivity detection. Do NOT use for: web offline/PWA or server-side caching.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, offline, phase-7, universal]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Offline First

## Purpose
Guide for building mobile apps with offline-first architecture: local-first data, background sync, conflict resolution, and connectivity-aware UX.

## Agent Protocol

### Trigger
Phrases: "offline-first", "offline mode", "offline sync", "local storage", "offline cache", "sync strategy", "conflict resolution", "offline queue", "mobile offline", "local database"

### Input Context
- Data models and entity relationships
- API endpoints and data flow patterns
- Conflict resolution requirements per entity
- Sync frequency and triggers

### Output Artifact
Offline architecture: local DB schema, repository pattern with cache-first strategy, sync engine with queue/retry, conflict resolution rules, connectivity detection.

### Response Format
```
<offline-first>
<local-db>{schema, repository, cache-first reads}</local-db>
<sync>{triggers, queue, replay, idempotency}</sync>
<conflicts>{strategy per entity, manual resolution}</conflicts>
<connectivity>{detection, UI states}</connectivity>
</offline-first>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Local DB reads return data without network call (cache hit)
- Offline writes queued and replayed on connectivity restore
- Conflict resolution produces deterministic result per entity
- User sees clear offline/online status indicator
- Sync progress is visible during background sync

### Max Response Length
8000 tokens

## Workflow

1. **Offline-first architecture** — The local database is the single source of truth. All reads go to local DB first. All writes go to local DB first, then sync to server. The network is treated as a sync mechanism, not a data source. Three layers: (a) Local data layer — Room (Android), CoreData (iOS), SQLDelight (KMP), or SQLite (cross-platform) with repository pattern. (b) Sync engine — monitors connectivity, replays queued writes, pulls remote changes, resolves conflicts. (c) UI layer — observes local DB via reactive streams (Flow, Combine, LiveData), displays connectivity state, shows staleness indicators. The architecture must account for: app termination during sync, partial sync failures, concurrent sync from multiple devices.

2. **Local database selection** — Room (Android): compile-time SQL verification, Flow-based reactive queries, migration support, type converters for custom types. SQLDelight (KMP): cross-platform schema in commonMain, type-safe Kotlin queries, generates drivers for Android/iOS/JVM. CoreData (iOS native): integration with SwiftUI @FetchRequest, iCloud sync, lightweight migration, but iOS-only. Realm (cross-platform): real-time sync via MongoDB Atlas Device Sync, automatic object notifications, simpler API than SQLite, but larger binary size. SQLite directly (via FMDB, sqldelight native): lowest overhead, full SQL control, best for simple key-value or document stores. Selection criteria: cross-platform needs, team expertise, sync requirements, binary size constraints.

3. **Repository pattern with cache-first strategy** — Repository is the single entry point for data access. Read flow: (a) return cached data from local DB immediately, (b) check if cache is stale (based on staleness TTL per entity), (c) if stale and online, fetch from network, update local DB, notify observers, (d) if offline, return cached data with staleness indicator. Write flow: (a) validate data, (b) write to local DB, (c) enqueue sync operation in pending queue, (d) if online, trigger immediate sync, (e) update UI from local DB change. This pattern ensures the app works fully offline while keeping data eventually consistent.

4. **Sync triggers and frequency** — App foreground (onResume/applicationDidBecomeActive): immediate sync to refresh data. Periodic: WorkManager (Android) with minimum interval 15 min, BGTaskScheduler (iOS) with `BGProcessingTask` or `BGAppRefreshTask`. Silent push notification: server sends silent push to wake the app for sync. Pull-to-refresh: user gesture triggers on-demand sync. After queue drain: after replaying queued local writes, fetch remote changes. Adaptive sync: increase frequency when on WiFi, decrease on cellular, pause when battery low. Consider sync budget: only sync changed data (delta sync), not full dataset. Use timestamp cursors or version vectors for delta sync.

5. **Conflict resolution strategies** — Last-write-wins (LWW): simplest, use server timestamp as authority. Acceptable for independent entities (user profile fields that don't conflict). Timestamp-based: each update includes a client timestamp, server compares and keeps the latest. Works for single-writer scenarios. CRDT (Conflict-free Replicated Data Types): mathematically guaranteed convergence. Use for concurrent edits (collaborative lists, counters, text). Implemented correctly, CRDTs never conflict. Three-way merge: base version + local changes + remote changes = merged result. Works for document-like entities with well-defined merge rules. Manual resolution: surface conflict to user with side-by-side comparison, let user choose. Required for financial/legal data where automatic merge could cause harm. Document conflict resolution strategy per entity type — never mix strategies within an entity.

6. **Offline queue management** — Persistent queue stored in local DB. Each operation: id, entity type, entity ID, action (create/update/delete), payload (full entity snapshot), idempotency key (UUID based on content hash), created timestamp, retry count, last error. Queue replay order: FIFO by creation timestamp. On connectivity restore: (a) take all pending operations ordered by timestamp, (b) send each with idempotency key in request header, (c) server deduplicates using idempotency key (returns 200 if already processed), (d) on success, remove from queue, (e) on 409 Conflict, trigger resolution handler, (f) on 5xx, implement exponential backoff (1s, 2s, 5s, 15s, 30s, 60s capped), (g) after max retries, mark as failed and surface to user with retry action.

7. **Connectivity detection and UX** — Android: `ConnectivityManager.NetworkCallback` with `registerDefaultNetworkCallback`. iOS: `NWPathMonitor` from Network framework. Cross-platform: reachability libraries. Detect connectivity type (WiFi vs cellular) to adjust sync behavior. UI states: persistent offline banner at top of screen when disconnected, sync status indicator (last synced timestamp, pending count), disable mutation buttons with tooltip explaining offline state, auto-dismiss banner when connectivity restored. Avoid showing full-screen offline errors — inline indicators are less disruptive. Test connectivity transitions: turn off/on airplane mode while app in foreground, background, and during sync.

## Conflict Resolution Strategies

| Strategy | Use Case | Complexity | Data Loss Risk |
|----------|----------|-----------|---------------|
| Last-write-wins | Independent entities, timestamps | Low | Medium |
| Timestamp authority | Single-user-per-resource | Low | Low |
| CRDT | Concurrent edits, lists, counters | High | None |
| Three-way merge | Collaborative documents | Medium | Low |
| Manual | Financial, legal, medical | High | None (user decides) |

## Best Practices

- Local DB is source of truth until server confirms the write
- Cache is never invalidated — show stale data with staleness indicator (last updated timestamp + badge)
- Every offline write is queued — never drop writes under any circumstance
- Idempotency key on every write to prevent duplicate processing
- User always informed of offline status via persistent UI indicator
- Sync progress visible during background sync (count remaining, last synced)
- Failed queue items surface with retry action, not silently discarded

## Common Pitfalls

- **Offline writes conflict with server-side validation**: Queue a write offline, then server rejects it on sync. Keep validation rules in the local model too.
- **Background sync killed by OS**: iOS may terminate background tasks. Save sync cursor and resume from last checkpoint.
- **Idempotency key collision**: Same content + same entity = same key, causing legitimate duplicate writes to be skipped. Include a nonce or timestamp in the key.
- **Conflict resolution inconsistency**: Different devices resolving the same conflict differently leads to data divergence. Resolution must be deterministic.

## Configuration Reference

```kotlin
// Sync configuration
data class SyncConfig(
    val intervalMs: Long = 15 * 60 * 1000L, // 15 min periodic
    val retryDelays: List<Long> = listOf(1000, 2000, 5000, 15000, 30000, 60000),
    val maxRetries: Int = retryDelays.size,
    val deltaSyncWindow: Long = 7 * 24 * 60 * 60 * 1000L, // 7 days
    val stalenessTtl: Map<String, Long> = mapOf("product" to 300_000, "user" to 60_000)
)
```

## References
  - references/conflict-resolution.md — Conflict Resolution — Offline-First
  - references/local-storage.md — Local Storage
  - references/mobile-database.md — Mobile Local Database
  - references/offline-first-architecture.md — Offline-First Architecture
  - references/offline-sync.md — Offline Sync
  - references/sync-strategies.md — Sync Strategies
## Handoff
Hand off to mobile-networking skill when implementing the sync transport layer, or to mobile-storage for advanced local persistence patterns.
