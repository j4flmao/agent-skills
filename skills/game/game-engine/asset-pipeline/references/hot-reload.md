---
title: Hot-Reload of Assets
description: Content fingerprinting, re-cook triggers, live GPU swap and closed artist iteration loop for game asset hot-reload.
---

# Asset Hot-Reload — Deep Reference

## 1. The Loop

```
artist saves .blend        → watcher: fingerprint changed
                          → re-cook (fast, incremental)
                          → manifest entry swapped
                          → live assets replaced next frame
                          → preview update (editor view)
```

Target: artist hits save → in-game in < 1 s (for small assets).

## 2. Fingerprint & Watch

- FsWatcher monitors `{EngineRoot}` content sources (recursive, debounced ~50 ms).
- On save: recompute fingerprint (`import-and-cook.md` §1.3) → if changed, re-cook.
- Tool builds run the watcher; shipping builds don't (read-only at runtime).

## 3. The Swap

On re-cook completion:

```cpp
void HotReloadAsset(AssetId id, const CookedAsset& cooked) {
    AssetRegistry& reg = ...;
    // old asset keeps serving until the new is ready
    if (reg.holds(id)) {
        reg.publish(id, cooked);     // atomic publish; new data-pointer
        reg.generation++;
        // GPU assets: stage new buffer; swap on next frame's upload
        UploadSwapAsync(id, cooked.gpu);
    }
}
```

Rules:
- Old asset keeps wire until `ready` — no torn state mid-frame.
- Refcount stays unchanged (same id; the *data* swapped).
- Renderer reads `assetId → currentAsset` per frame; the swap is safe at frame boundary.

## 4. Editor Interop

- Editor has the same registry; a "reimport" action on an asset → fingerprint → cook → publish.
- Preview material/mesh update live in the editor viewport.
- Shader hot-reload: compile to `DXIL/SPIR-V` → swap PSO (see `shader-pipeline.md`) → next frame uses it.

## 5. GPU Resource Hot-Swap

- Textures: upload new mips into a *new* texture, then remap the bind (frame-deferred).
- Meshes: new VB/IB, rebind on next draw.
- Shaders: new bytecode blob + PSO key change → rebind pipeline.

All through the staging ring + deferred upload (see `gpu-memory.md`): the old resource is unloaded `kInFlight` frames after swap (deferred free).

## 6. Failure Handling

- Cook failure → keep serving the old asset + log the error to the editor; artist sees "cook failed: <reason>" in the preview.
- Invalid file (locked by a DCC export) → watcher retries with backoff.

## 7. Performance Considerations

- Do NOT re-cook hot frames; cook on watcher thread, publish at frame boundary.
- Chunk big assets (a 1 GB level) → hot-reload works asset-by-asset, not level-as-one.
- Multiple saves in a burst → debounce and one cook.

## 8. CI & Determinism

The publication order must be deterministic: the manifest order, not saves order, drives cook priority. CI can hot-swap all assets once (a "asseticides" job) asserting: publish → 3 frames → no crash, no leak.

## 9. Pitfalls

| Pitfall | Result | Fix |
|---------|--------|-----|
| Torn swap mid-frame | mesh/tex corruption | publish at frame boundary |
| Cook on main thread | frame spike | watcher thread |
| Re-cook from mtime | false rebuilds | fingerprint |
| Old GPU resource freed early | VRAM use-after-free | deferred free kInFlight |
| Swap while a stream is using | torn read | version (generation) gate |
| Editor "reimport" ignoring deps | stale level | dependency closure re-cook |

## 10. Checklist

- [ ] Watcher debounced; fingerprint-based.
- [ ] Re-cook on watcher thread; publish at frame boundary.
- [ ] GPU swap deferred via staging ring + k-frames.
- [ ] Cook failure → old asset continues + editor logged.
- [ ] CI asset hot-swap job (crash/leak gate).