---
title: Import and Cook Pipeline
description: DCC importers, normalization, deterministic cooking, content hashing, LOD and tangent generation for game assets.
---

# Import & Cook — Deep Reference

## 1. Import Foundations

### 1.1 The Importer Contract

```cpp
struct ImporterDesc { const char* extensions[8]; ImporterFn fn; };
void RegisterImporter(const ImporterDesc&);

ImportResult Import(const Path& source) {
    // 1. fingerprint: hash(content + importer version + options)
    uint64_t fp = Fingerprint(source);
    if (cache.Contains(fp)) return cache.Get(fp);         // cached
    // 2. normalize: parse DCC format into canonical representation
    MeshSource ms = Parse(source);                          // platform-agnostic
    // 3. emit intermediate (.import) + preview
    CacheResult(ms, fp);
    return ms;
}
```

Import parsers (FBX, glTF, OBJ for meshes; PNG/EXR; WAV/FLAC) are *pure*: same bytes → same output. Cache key = fingerprint.

### 1.2 Canonical Normalization

Normalize on import so downstream never sees DCC quirks:
- Meshes: weld near-duplicate verts, compact indices (32→16-bit when possible), generate tangents/bitangents (if 3D), fix winding.
- UVs: clamp to [0,1] warning on >1 (tiling handled at material).
- Coordinates: DCC Y-up/right-handed vs engine Z-up — bake to engine convention once, at import.

### 1.3 Fingerprint & Caching

```
fingerprint = SHA256(source_bytes + importer_version + import_options)
```

Not mtime — mtime lies (artist touch-all + saves same content). Fingerprint hijacks false rebuilds; re-cook only real changes.

## 2. Mesh Cook

### 2.1 When

- Weld vertices (merge by position+normal+uv+index → fewer verts, still meshes).
- Generate tangents (used by normal mapping) when needed.
- Index best-fit: 16-bit if vertex count fits.
- Interleave or SoA? Depends on renderer; cook to the renderer's format (vertex buffers are AoS typically for GPU).

### 2.2 LODs

Generate LOD chain (auto-simplify at cook time: decimate via edge collapse). Store per-LOD vertex/index streams in the `.mesh`. At runtime the renderer picks LOD by screen size.

### 2.3 Bounding

Cook the AABB + sphere per mesh + per LOD (frustum culling, stream selection).

### 2.4 Compression

Geometry can drop precision if the game is camera-close: quantize positions to 16-bit relative to the AABB center (games keep 32-bit float). Normals/tangents pack to 8-bit octhedral. This is a **staff-level decision**: number format baked at cook, not at runtime.

## 3. Texture Cook

- Generate mipmaps (filter: box/kaisser for albedo; keep alpha channel).
- Compress to platform format:
  - Desktop: BC7 (quality) / BC1 (albedo) / BC5 (normal maps).
  - Mobile/Web: ETC2, ASTC.
- Swizzle/block order to the GPU's native layout (avoids GPU block transcoding = bandwidth+time).
- Normal maps: store in BC3/BC5 with correct swizzle (GNM/other formats differ).

Runtime stream loads lower mips first, then higher (see `streaming-throttle.md`).

## 4. Animation Cook

- Resample F-curves to fixed ticks; quantize keys (e.g., 16-bit quantized rotations) for smaller `.anim`.
- Remove redundant channels; channels below threshold drop to default.
- Additive layers cooked separately (blend tree inputs are cooked; see `client-engine/animation-systems.md`).

## 5. Deterministic Cook

The build server's "clean → cook" must be byte-identical:

- Ordering: iterate file lists sorted by id.
- Compression: fixed seeds, no parallel artifacts.
- No wall-clock in cook output (no timestamps in baked .level).

CI enforces: cook twice, byte-compare.

## 6. Cooking Graph & Dependencies

Cooks form a DAG (texture → material → prefab → level). The cook scheduler runs it on N threads, respecting the DAG. A changed texture re-cooks only its consumers (material, level).

```
mesh → LOD → submeshes
texture → mips → compressed
material(LOD,tex) → shader variant
prefab(material,mesh) → level
```

## 7. Cook Durations & Scale

AAA benchmark: ~4 M assets, ~12 h full cook (multi-node). Optimizing:
- Incremental cook (fingerprint only the changed).
- Chunked parallel cooks; remote build farm.
- LZ4/part of compression only where needed.

## 8. Cook Tooling UX

- Dev: `cook --incremental` re-cooks ~10 files in seconds.
- Ship: `cook --release` full, deterministic, packed.
- The cook builds with the *same engine allocators/layout* the runtime uses, so the runtime paths are exercised in CI.

## 9. Pitfalls

| Pitfall | Result |
|---------|--------|
| mtime-based caching | false rebuilds / stale cooks |
| Y-up vs Z-up double conversion | subtly rotated meshes (artist rage) |
| Slow tangent gen per cook | 12 h cook each time (cache it) |
| Non-deterministic compression | build farm mismatch, QA distrust |
| Baking sort order at cook | runtime sort differences |
| Cooking shaders at runtime | first-load compile spikes |