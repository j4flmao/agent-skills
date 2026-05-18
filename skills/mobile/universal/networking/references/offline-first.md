# Offline-First Architecture

## Strategy

```
Online:   Network → Cache → UI
Offline:  Cache → UI → Queue mutations → Sync when online
```

## Write-back queue

```dart
class SyncQueue {
  final List<Mutation> pending = [];

  Future<void> enqueue(Mutation mutation) async {
    pending.add(mutation);
    await persistQueue();
    trySync();
  }

  Future<void> trySync() async {
    while (pending.isNotEmpty) {
      try {
        await execute(pending.first);
        pending.removeAt(0);
      } catch (_) { break; }
    }
    await persistQueue();
  }
}
```

## Conflict resolution

| Strategy | When | Behavior |
|----------|------|----------|
| Last write wins | Low conflict | Latest timestamp wins |
| CRDT | Collaborative | Merge without conflicts |
| Manual | High stakes | Show both, let user pick |
| Server wins | Trust server | Always accept server state |
