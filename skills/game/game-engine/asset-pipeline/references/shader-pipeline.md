---
title: Shader Pipeline Management
description: Cook-time shader compilation, variant management, PSO cache, runtime permutation reduction and pipeline of shaders in game engines.
---

# Shader Pipeline — Deep Reference

## 1. The Shader Compile Architecture

Compile once at **cook time**, ship the blobs. Runtime never compiles (except opt-in dev).

| Stage | Where | Output |
|-------|-------|--------|
| Source HLSL/GLSL/MSL | tool | `.shader` source |
| Permutation selection | cook | per-feature variant |
| Front end (DXC/glslc) | cook | `DXIL` / `SPIR-V` / `MSL` |
| Back end (driver) | cook (PC) / runtime (driver w/ cache) | device-specific |
| PSO combination | cook (pre-heat) | cached pipeline state |

Get "compile on user's GPU" out of the runtime path: pre-build DXIL/SPIR-V blobs; build PSOs lazily with a shipped cache.

## 2. Variant (Permutation) Management

### 2.1 The Explosion

`materialOption(4) × lightingOpt(2) × shadowOpt(2) × fogOpt(3)` = 48 permutations per shader. × 1k shaders → 48k blobs. Manage:

- **Feature toggling by `#define`** + a "menu" of a few feature-sets.
- **Permutation groups**: group orthogonal dimensions; combine only meaningful ones.
- **Precompute all**: ship all (blob-heavy); load lazily with a shipped index.

### 2.2 Runtime Permutation Reduction

The best win: collapse rarely-used feature combos. A "2D UI shader" doesn't do skinned shadows; the material system must pick the *right narrow* variant rather than a universal one.

### 2.3 The Variant Key

```cpp
struct ShaderVariantKey {
    ShaderId shader;           // what
    uint32_t macros;            // #defines bitmap
    RRF featureMask;            // allowed features
    GpuApi api;                 // DXIL vs SPIR-V vs MSL
    PipelineLayout layout;      // bindings
};
```

Key hashes into the PSO cache. Deterministic caching: euclidean hash of the key bits.

## 3. Pipeline State Object (PSO) Cache

A PSO = shader blobs + RT format + blend/rast/depth state + layout + vertex layout.

- Build PSOs **once per variant key** (not per draw).
- Cache on disk: `(shaderKeyHash → PSO bytecode/descriptor)`.
- Pre-heat at level load: build the PSOs for the level's materials on a background thread (as the level loads), so first draw of a material is warm.
- On driver update / GPU swap: re-validate the cache (hash of driver version in the key).

### Example (Vulkan)

```cpp
auto psop = renderer->GetOrCreatePSO(variantKey);   // mutex-protected hash map
cmd->bindPipeline(psop);                            // cheap bind
```

First frame of a material in a fresh boot = PSO compile (~milliseconds); the shipped cache must eliminate nearly all of that.

## 4. Shader Development Loop

- Hot reload (see `hot-reload.md`): on save, compile + swap PSO next frame.
- Validation: `SPIR-V` — `spirv-val` during cook; HLSL — DXC warnings as errors in CI.
- Shader "fail-fast": a `.shader` that references a missing preprocessor feature fails the cook (no runtime purple boxes).

## 5. Cook-Time Compile Workflow

```
cook job: for each .shader source
  1. parse stages (VS/PS/GS/Compute/RT)
  2. must-include: feature macros per platform (DX12/Vulkan)
  3. compile with DXC/glslc → DXIL or SPIR-V blobs
  4. store per-api blob + a PSO prebuild
  5. entry in shader.manifest with variant keys
```

Determinism: AST/compile ordering by sorted key; DXC reproducible flags.

## 6. Runtime Management

- `ShaderManager`: key→blob map (mmap'd); refcount per unique PSO.
- Bind pipeline by PSO id; never compile on the game thread.
- On device lost: reload all PSOs from the blob cache.

## 7. Metrics & Checklist

| Metric | Alarm |
|--------|-------|
| first-draw PSO hit (%) | < 98% → cache too thin |
| PSO compile on game thread | > 0 |
| shader blob memory | > target budget |
| variant count / shader | > 300 → reduce |

- [ ] Cook-time compile; blobs shipped.
- [ ] Variant keys deterministic + hash → PSO cache.
- [ ] PSO cache shipped; pre-heat at level load.
- [ ] No runtime compile on game thread.
- [ ] Hot reload via PSO swap.
- [ ] Driver/gpu hash in cache key.