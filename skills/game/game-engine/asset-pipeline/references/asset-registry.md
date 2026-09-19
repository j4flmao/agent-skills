---
title: Asset Registry and Reference Counting
description: Runtime asset id registry, refcount API, streaming states, async load and leak detection for game assets.
---

# Asset Registry & Refcount — Deep Reference

## 1. The Runtime Registry

Assets live in a `Registry<AssetId, Asset*>`:

```cpp
struct AssetRegistry {
    HashMap<AssetId, Asset*> map;      // id -> live asset
    vector<AssetId> pending;            // streaming not yet ready
    uint32_t generation;                // hot-reload bump
};
```

- Registry is authoritative for "is this alive?".
- `AssetId` = 64-bit (hashed name, namespace). Not a pointer — re-lookup on stream-hover.

## 2. Refcount API

```cpp
AssetHandle AssetRegistry::Load(AssetId id) {
    if (Asset* a = find(id)) { a->refs++; return {a}; }
    a = new Asset(id, manifest.lookup(id));   // disk/stream start
    a->refs = 1;
    RequestStream(a, manifest.streamHint(id));
    return {a};
}
void AssetRegistry::Unload(AssetHandle h) {
    if (--h.asset->refs == 0) { UnloadGpu(h.asset); h.asset->free(); remove(id); }
}
```

Rules:
- Never free directly — `Unload` only via handle.
- A handle held across a hot-reload (registry `generation` bump) re-lookups the new asset.
- Leak = refcount never returns to 0 (check CI).

## 3. Streaming States

```
State: None → Requested → Reading → Decoding → Ready → Retire
```

| State | Means | Async? |
|-------|-------|--------|
| `Requested` | queued in priority queue | yes |
| `Reading` | filesystem async read in flight | yes |
| `Decoding` | decompress/transcode on a worker | yes |
| `Ready` | GPU uploaded; usable per frame | — |
| `Retire` | unreferenced, back to pool | yes |

The frame only touches `Ready` assets. Others are skipped (placeholder box) until ready.

```cpp
enum class AssetState : uint8_t { None, Requested, Reading, Decoding, Ready, Retire };
```

## 4. Async Load Path

```
gameplay:  RequestStream(id)
      └> AssetRegistry: state=Requested; push priority queue
      └> I/O worker:   state=Reading; read via VFS async
      └> Decode worker: state=Decoding; decompress/transcode
      └> upload worker: state=Ready; GPU upload (staging ring, frame-deferred)
      └> waiters notified via job handle
```

The "ready" notification posts a tiny job to the job system — the requesting system `await`s it via handle (see `job-system`). No main-thread blocking.

## 5. Ref-count Edge Cases

1. **Reference from refcount pool**: children hold `AssetId` (not handle) — resolved at frame when needed; mitigates cycles.
2. **Hot-reload**: registry keeps the same `id`; a new Asset replaces the old once cook+stream complete; all consumers holding the old handle re-resolve next frame.
3. **Load-while-unloading**: registry serialize-load/unload by `id` (single table lock).
4. **Stream-close**: when last ref released, if the state is `Reading`/`Reading`, cancel + pool-release.

## 6. Leak Detection

- **CI**: load a level, wait, unload ×10; assert RSS back to baseline and all refcounts at 0.
- **Registry report**: `assets.live = 42, pending = 1, leaked = 0` printed at level unload.
- **Guard in dev**: `ASSET_ASSERT(asset->refs >= 0)` and a "leak: id paid" line when `RefCount` leaves > 0 at shutdown.

## 7. Metrics

| Metric | Alarm |
|--------|-------|
| `live` vs `pending` | pending > 20 = priority broken |
| `loadTime95` per asset | > 100 ms |
| leak per level unload | > 0 |
| RSS after unload cycle | growth > 5% |
| async read queue depth | > 64 = throttle |

These feed the profiler's asset view (`asset-pipeline.md` main doc).

## 8. Multi-Thread Safety

- `RequestStream`/`Unload` from any thread → registry lock is cheap (hot path: registry lock per call).
- Asset `data` pointers are immutable once `Ready` (safe to share across threads).
- The decode worker's scratch is per-worker (avoid false-sharing, see `cache-aware-layout.md`).

## 9. Checklist

- [ ] `Load`/`Unload` refcount API; no raw frees.
- [ ] Streaming states with async transitions off the main thread.
- [ ] Registry authoritative; hot-reload replicates under same id.
- [ ] CI leak check (load/unload cycle).
- [ ] Frame touches `Ready` only.
- [ ] Multi-thread registry lock + immutable ready-data.