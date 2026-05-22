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

1. **Local data layer** — Local DB (Room/SQLDelight/CoreData) as primary data source. Repository pattern: read from local DB first, refresh from network on cache miss or forced refresh. Write to local DB first, then sync to server.

2. **Sync strategy** — Trigger sync on: app foreground, periodic interval (15-30 min), push notification, user-initiated pull-to-refresh. Bi-directional: push local changes to server, pull server changes to local. Delta sync via timestamp/version cursors.

3. **Conflict resolution** — Last-write-wins for simple fields. CRDT for concurrent list edits. Timestamp-based resolution with server authority. Three-way merge for document-like entities. Manual resolution for critical data (financial, legal) surfaced via UI.

4. **Offline queue** — Pending operation queue persisted in local DB. Each operation: entity type, action (create/update/delete), payload, idempotency key, created timestamp. Sequential replay on connectivity restore. Retry with exponential backoff. Failed queue items surfaced to user.

5. **Connectivity detection** — Android: NetworkCallback via ConnectivityManager. iOS: NWPathMonitor. Cross-platform: reachability library. Graceful degradation: offline badge on nav bar, warning banner, disabled mutation buttons with tooltip.

## Rules

- Local first, network second — local DB is source of truth until sync confirms.
- Cache is never invalidated — stale data shown with staleness indicator.
- Every offline write is queued, never dropped.
- Conflict resolution strategy documented per entity type — no silent overwrites.
- Idempotency key on every write operation to prevent duplicate processing.
- User always informed of offline status via persistent UI indicator.
- Sync progress visible during background sync (count remaining / last synced).
- Failed queue items surface with retry action, not silently discarded.

## References

- `references/offline-sync.md` — Sync strategies, conflict resolution, CRDT, pending queue
- `references/mobile-database.md` — Local DB setup, Room/CoreData/SQLDelight, migration, repository pattern

## Handoff
Hand off to mobile-networking skill when implementing the sync transport layer, or to mobile-storage for advanced local persistence patterns.
