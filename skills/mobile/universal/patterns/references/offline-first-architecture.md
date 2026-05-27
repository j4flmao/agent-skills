# Offline-First Architecture

## Overview

Offline-first architecture treats the local device as the primary data store, with cloud synchronization occurring in the background. This approach provides instant responsiveness, works without internet connectivity, and handles network interruptions gracefully. This guide covers data models, sync engines, conflict resolution, and local-first storage patterns.

## Architecture Patterns

```yaml
offline_first_patterns:
  local_first:
    description: "Local database is source of truth. Cloud is backup/sync target."
    flow: "Write to local DB → display immediately → queue for sync → sync when online"
    read: "Read from local DB always — no loading states, no network dependency"
    write: "Write to local DB immediately — optimistic, then reconcile with server"
    consistency: "Eventually consistent — local may differ from server temporarily"
    
  remote_first_with_local_cache:
    description: "Cloud is source of truth. Local database is cache for offline."
    flow: "Read from cache → display → fetch from server → update cache and UI"
    write: "Write to server → on success: update local cache"
    offline: "Queue writes locally → sync when online → handle conflicts"
    consistency: "Strong consistency when online, eventual consistency after offline period"
    
  hybrid:
    description: "Some data is local-first (user-generated), some is remote-first (server-provided)"
    local_first_data: "Drafts, notes, preferences, in-progress work"
    remote_first_data: "Shared content, other users' data, reference data"
    sync: "Local-first data syncs to server; remote-first data syncs to device"
```

## Sync Engine Architecture

```yaml
sync_engine:
  components:
    local_store:
      technology: "SQLite (WatermelonDB, drift), Realm, or custom storage"
      schema: "Mirrors server schema with extras: sync_status, revision_id, deleted_at"
      
    change_tracker:
      mechanism: "Append-only changelog or modified_at timestamps"
      fields:
        - "created_at: timestamp of record creation"
        - "updated_at: timestamp of last update"
        - "deleted_at: soft delete timestamp"
        - "sync_status: pending, syncing, synced, conflict"
        - "revision: monotonic revision number per record"
        
    sync_manager:
      push:
        trigger: "Online connectivity change, periodic timer, or immediate"
        process: "Query records with sync_status = pending → send to server → mark as synced"
        batching: "Batch 50-100 records per request — reduce API calls"
      pull:
        trigger: "After successful push, periodic timer, or explicit refresh"
        process: "Send last_sync_timestamp → receive changed records since → apply locally"
        pagination: "Cursor-based pagination for large sync datasets"
        
    conflict_resolver:
      strategies:
        last_write_wins: "Latest timestamp wins — simple but may lose data"
        server_wins: "Server data overwrites local — safe for read-through patterns"
        client_wins: "Local overwrites server — safe for user-generated content"
        manual: "Record conflict, prompt user to resolve — highest data integrity"
        crdt: "Automatic merge via conflict-free data types — complex but correct"
```

## Data Model for Offline

```yaml
offline_data_model:
  schema_patterns:
    sync_metadata:
      created_at: "ISO 8601 timestamp — set locally on creation"
      updated_at: "ISO 8601 timestamp — updated on every local or remote change"
      server_updated_at: "ISO 8601 timestamp — last server-side update"
      deleted_at: "ISO 8601 timestamp or null — soft delete"
      sync_status: "pending | syncing | synced | conflict"
      revision: "Integer — increments on each change"
      created_by_device: "Device ID — identifies the creating device"
      
    example_schema: |
      // WatermelonDB schema example
      { 
        name: 'orders',
        columns: [
          { name: 'customer_name', type: 'string' },
          { name: 'total', type: 'number' },
          { name: 'status', type: 'string' },
          { name: 'created_at', type: 'number' },
          { name: 'updated_at', type: 'number' },
          { name: 'server_updated_at', type: 'number' },
          { name: 'deleted_at', type: 'number', isOptional: true },
          { name: 'sync_status', type: 'string' },
          { name: 'revision', type: 'number' },
        ]
      }
      
  relationship_handling:
    one_to_many:
      offline: "Store both sides locally — load from local DB with joins"
      sync: "Sync parent first, then children — maintain referential integrity"
    many_to_many:
      offline: "Store junction table locally"
      sync: "Sync junction table incrementally based on updated_at"
```

## Conflict Resolution Strategies

```yaml
conflict_resolution:
  last_write_wins_lww:
    description: "Latest timestamp overwrites older data"
    implementation: "Compare updated_at timestamps — higher wins"
    risk: "Data loss if two users edit the same field simultaneously"
    use_case: "Non-critical data, personal data (only one user edits)"
    
  first_write_wins_fww:
    description: "First write preserved, subsequent writes rejected"
    implementation: "Server rejects if base revision doesn't match"
    use_case: "Voting, survey responses, limited-quantity purchases"
    
  merge:
    field_level: "Merge per-field — newer timestamp per field wins"
    list_merge: "Union of list items — deduplicate by ID"
    operational_transform: "Transform concurrent edits to apply in sequence — Google Docs-style"
    
  manual:
    flow:
      - "Detect conflict during sync"
      - "Store both versions locally (local_v1, server_v1)"
      - "Present conflict to user with diff view"
      - "User selects which version to keep or merges manually"
    use_case: "High-stakes data (legal documents, financial records, medical data)"
```

## State Management for Offline

```yaml
state_management_offline:
  connectivity_state:
    states:
      online: "Full sync capability — push and pull"
      limited: "Cellular data — sync metadata only, defer media downloads"
      offline: "No connectivity — local operations only, queue sync"
    transitions:
      online_to_offline: "Show offline indicator, disable sync-dependent features"
      offline_to_online: "Trigger sync, hide offline indicator, resolve conflicts"
      
  optimistic_updates:
    pattern: "Apply change locally immediately, sync to server, rollback on conflict"
    implementation:
      - "Mutate local state optimistically"
      - "Queue mutation for server sync"
      - "On server success: update revision and sync_status"
      - "On server conflict: rollback local state to server version, notify user"
      
  pending_queue:
    storage: "Local SQLite table or in-memory queue persisted to disk"
    operations:
      - "mutation_id (UUID)"
      - "mutation_type (create, update, delete)"
      - "table_name"
      - "record_id"
      - "payload (JSON — full mutation data)"
      - "created_at"
      - "retry_count"
      - "status (pending, processing, failed)"
```

## Platform-Specific Implementation

```yaml
platform_implementation:
  ios:
    sync_framework: "NSManagedObjectContext with persistent history tracking"
    background: "BGTaskScheduler for periodic background sync"
    conflict: "NSMergePolicy with custom merge logic"
    libraries: ["CloudKit", "Realm", "Couchbase Lite", "Firebase Firestore"]
    
  android:
    sync_framework: "Room with Flow for reactive local queries"
    background: "WorkManager for guaranteed background sync"
    conflict: "Custom conflict resolver in repository layer"
    libraries: ["Room + Firebase Firestore", "Realm", "Couchbase Lite"]
    
  flutter:
    sync_framework: "drift (SQLite) with streaming queries"
    background: "workmanager package for background sync"
    conflict: "Repository layer with custom merge strategy"
    libraries: ["drift + Firebase Firestore", "Realm Dart", "objectbox"]
    
  react_native:
    sync_framework: "WatermelonDB with sync adapter"
    background: "react-native-background-fetch"
    conflict: "WatermelonDB sync adapter with custom conflict resolver"
    libraries: ["WatermelonDB", "Realm JS"]
```

## Testing Offline Scenarios

```yaml
testing_offline:
  unit_tests:
    - "Local CRUD operations — verify data persists correctly offline"
    - "Sync queue — operations queued correctly when offline"
    - "Conflict resolution — each strategy produces expected output"
    - "Connectivity state machine — state transitions correct"
    
  integration_tests:
    - "Write offline → come online → verify data synced"
    - "Sync conflict → verify resolution strategy applied"
    - "Multiple devices sync same data → verify consistency"
    - "Delete while offline → sync → verify deletion propagated"
    
  e2e_tests:
    - "Full offline session: create, read, update, delete without network"
    - "Network flakiness: intermittent connectivity during sync"
    - "Conflict scenario: two devices edit same record offline, come online simultaneously"
    - "App killed mid-sync: verify data integrity on next launch"
    
  tools:
    network_conditioner: "iOS Network Link Conditioner, Android Network Profiler"
    proxy_tools: "Charles Proxy, Proxyman, mitmproxy — simulate network failures"
    flight_mode: "Toggle device flight mode during test execution"
```
