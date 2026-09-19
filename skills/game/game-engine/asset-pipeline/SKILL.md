---
name: asset-pipeline
description: Expert game asset pipeline — asset system lifecycle, import/cook pipeline, streaming & hot-reload, reference counting, virtual filesystem, and shader pipeline management.
---

# Game Asset Pipeline — Deep Engineering Guide

Assets are the foundation of every game: the pipeline takes 100k DCC source files and turns them into compressed, streamable, cache-friendly runtime formats — without frame spikes, without leaks, without 3-minute load screens longer than the content itself.

## 1. The Two-Stage World: Source vs Runtime

| | Source asset | Runtime asset |
|--|--------------|---------------|
| Where | tool-generated (Blender, Maya, Photoshop, Houdini) | shipped, loaded at runtime |
| Format | .blend, .ma, .psd, .zip ... | engine-native (`.mesh`, `.anim`, `.tex`, `.shader`) |
| Transform | DCC tools (artist-facing) | Cook step (build-time) |
| Versioning | VCS + LFS | pak/stream |

The pipeline separates them: **source** lives under version control; **cooked** assets ship. Cook = offline, deterministic conversion.

## 2. The Import Pipeline

### 2.1 Importers

One importer per source type: FBX/glTF for meshes, PNG/TGA for textures, WAV/FLAC for audio, .asset for configs. Importers are **normalizers**: they read source and emit a canonical engine-format intermediate (`.import` file) and a preview.

```cpp
struct ImportResult {
    MeshSource*   mesh;      // canonical
    MaterialDesc  material;
    std::vector<SubMesh> subs;
    uint64_t sourceFingerprint;   // content hash, not mtime
};
```

### 2.2 Content-Hash Incremental

Fingerprint = hash of source bytes (+ importer version + import options). Only re-cook when the fingerprint changes. This makes turning an artist's "I touched every file" into "re-cook 2 files".

## 3. The Cook Step

Runtime conversion, deterministic, offline:

| Input | Cook | Output |
|-------|------|--------|
| .blend mesh | weld verts, tangent calc, LOD gen, KTX2/BCn compress | `.mesh` (with LODs) |
| .png texture | mipgen (8–13 mips), swizzle, DXT/BC7/ETC2/BCn | `.tex` |
| WAV | resample, ADX/Ogg Vorbis/Opus | `.audio` |
| anim | compress (key-bit quantization, per-track reindex) | `.anim` |
| HLSL/GLSL | compile to DXIL/SPIR-V/machine blobs | `.shader` |
| level | bake navmesh, lightmaps, build BVH/tiles | `.level` |

Cook output goes to the shipping `GameData` (mount `{GameData}`, see `filesystem.md`).

### 3.1 The Cook Manifest

```
assets.manifest (JSON/binary)
  entry: { id, sourceHash, outputPath, dependencies[] }
```

Runtime load **by id** (not by path): `GetAsset(AID("hero_model"))` — id avoids path-sensitive bugs. The manifest also records shader variants, LOD tables, and dependency closure.

### 3.2 Deterministic Cook

Same source → byte-identical output in a clean checkout (fixed importer versions, stable order, stable compression seeds). Without determinism, incremental builds get poisoned and QA can't trust a cached build.

## 4. Asset Load & the Runtime Registry

```cpp
class AssetManager {
    // id -> live asset; refcounted; hot-reloaded and streamed
    AssetHandle Load(AssetId id);          // resolves manifest -> stream
    void RequestStream(AssetId id);        // async
    void Unload(AssetId id);               // decrement refcount
};

struct Asset {
    AssetId id; RefCount refs; uint32_t flags;
    void*   data; uint64_t size;
    StreamingHandle streamState;
};
```

Refcounting is the API: `Load` increments, `Unload` decrements. A streamed texture is loaded when first referenced, unloads when unreferenced. This keeps the live set = exactly what's in use.

### 4.1 Streaming Load

Async request goes through the VFS (see `filesystem.md`): read async → cook-on-load (decompress, decode) on a worker → upload to GPU → mark ready. Pending loads are tracked; the frame only sees ready assets.

```cpp
AsyncLoadBBC tx = AssetManager::RequestStream(id);
// later: await via the job system; or poll tx.isReady()
```

## 5. Hot-Reload & Iteration

Two hot reload paths:

- **Code**: swap gameplay module (see `modules-and-tools.md`).
- **Assets**: monitor `{EngineRoot}` source dirs; on fingerprint change → re-cook → swap live GPU textures/meshes/shader blobs next frame (or next level load).

Tooling uses this to close the artist iteration loop to seconds.

## 6. Reference Counting & Cyclic Avoidance

Assets can reference assets (material → textures, skeleton → meshes, level → prefabs). Cycles must be broken:

- Explicit ownership: parent (level) owns children; children never ref the parent.
- Lease-based: leases (owner, id) released when the owner unloads.
- Registry-aware GC: periodically, any asset with refcount 0 and no lease is reclaimed.

A leak (referenced never unloaded) shows up as: RSS growth on repeated level loads. CI runs a "load/unload 10x" leak check (see `memory-tracking.md`).

## 7. Packing & Shipping (`pak`)

- Cooked assets are packed into a few `.pak` files (multiple assets per archive; single handle; good compression).
- Runtime loads by manifest entry → the pak's read via mmap + async reads (see `filesystem.md`).
- Streaming pools remain engine-side; assets page in/out by pak slice.

| Priority | Asset | Stream? |
|----------|-------|---------|
| .pak index | always loaded | no |
| level meshes/textures | first-need | yes (priority queue) |
| npc anims/audio | first-need | yes |
| skippable cinematics | pre-skip | optional |

## 8. Shader Pipeline Specifics

- Shaders cook to compiled blobs per platform/per API (`DXIL`, `SPIR-V`, GCN/MSL).
- **Variant explosion**: every material×fog×shadow×lighting permutation → thousands of variants. Manage with:
  - **Runtime permutation reduction** — feature flags collapsed into a small set ("shadow on/off").
  - **Shader cache**: prebuilt `shadercache` shipped (not built on user machine).
  - **Pipeline state objects** built once per variant and cached (see vulkan skill pipelines).
- The shader pipeline compiles at cook time, not runtime (skip mid-game shader compile spam).

## 9. Frame-Spike Avoidance

| Load pattern | Spike? | Fix |
|--------------|--------|-----|
| `Load` on main thread in Update | yes | async + worker decode |
| Big GPU upload mid-frame | yes | staging ring + frame-deferred upload |
| First-reference shader compile | yes | cook-time compile + PSO cache |
| Texture mipgen at load | yes | mips at cook; runtime = streaming higher mips |

## 10. Asset Pipeline Checklist (Lead-Level)

1. Source vs runtime separated; cook deterministic.
2. Manifest with content-hash incremental cook.
3. Runtime loads by id + refcount; streaming API.
4. Hot-reload for assets (fingerprint → re-cook → swap).
5. No cycles; leak-check CI (load/unload ×10).
6. Paks with async reads, not main-thread `fread`.
7. Shaders cooked per platform; PSO cache shipped.
8. Zero allocations/mid-frame loads in hot paths.

## 11. References

- `references/import-and-cook.md` — DCC import, normalization, deterministic cook, content hashing, LOD/tangent generation
- `references/asset-registry.md` — id registry, refcount API, streaming states, leak detection
- `references/hot-reload.md` — fingerprinting, re-cook, live swaps, tool loop
- `references/packing.md` — pak layout, compression, streaming pools, update/delta packs
- `references/shader-pipeline.md` — variant management, PSO cache, compile at cook time
- `references/streaming-throttle.md` — priority queues, budgets, adaptive streaming, hitch prevention