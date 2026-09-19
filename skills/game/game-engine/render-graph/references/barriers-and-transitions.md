---
title: Barriers and Transitions
description: Layout/state transitions, barrier placement, merging, and accidental sync removal in render graphs.
---

# Barriers & Transitions — Deep Reference

## 1. The Problem

GPUs are massively parallel; hazards are visibility + ordering. A **barrier** tells the GPU "previous reads/writes of this resource are visible to subsequent ops". Emitting too many = stalls; too few = corruption. The render graph derives the minimal set from edges.

## 2. Two Flavors

- **Vulkan**: `vkCmdPipelineBarrier`, transitions happen as *layout transitions* (`VK_IMAGE_LAYOUT_*`) + memory/access stages.
- **DX12**: `ResourceBarrier` with `D3D12_RESOURCE_STATE_*`.

Same graph pays ~same cost; the graph's abstraction covers the mapping to each API.

## 3. The Transition Table

Per resource: {oldLayout, newLayout, access before, access after}.

| Resource | Old | New | Typical |
|----------|-----|-----|---------|
| render target | `UNDEFINED` | `COLOR_ATTACHMENT` | first write |
| depth buffer | `UNDEFINED` | `DEPTH_STENCIL` | first frame |
| read by shader | `COLOR_ATTACHMENT` | `SHADER_READ_ONLY` | after a pass writes it |
| to be copied from | `SHADER_READ_ONLY` | `TRANSFER_SRC` | readback |
| present | `COLOR_ATTACHMENT` | `PRESENT` | swapchain |

Undefined initial: `UNDEFINED` means *content undefined* — most efficient (discard). Never transition from `UNDEFINED` to `SHADER_READ` without writing first (the content is not "keep");

## 4. Where the Graph Emits Barriers

Between passes where an edge exists:

```
 Pass1 : writes texA
   edge(texA: Pass1→Pass2)
 Pass2 : reads texA
```

The graph inserts: `barrier(texA, WRITE→READ)` at the boundary. It *merges*: if 3 passes read texA, one transition covers all (at the boundary of the write-pass's end).

## 5. Merging and Coalescing

Granularity rules:
- Don't transition per-draw — per-pass.
- Adjacent compatible transitions (same resource, both directions) — the graph emits one.
- Don't put barriers between passes that have no edge (nothing shared) — GPU pipelines free.

## 6. Over-Accelleration Hazards

| Over-sync | Cost |
|-----------|------|
| Barrier every draw | GPU stalls (hidden but ~2x on mobile) |
| Synchronizing read-after-write always even when data flows via separate memory | unnecessary |
| `CLEAR` then `LOAD` semantics on same memory | wasted |

Graph emits only data-dependency edges. Anything else = the user over-barriered (the graph says no).

## 7. Barrier Simplification for Aliased/Transients

Transient textures: first use = `UNDEFINED→(state)`, last use = `(state)→UNDEFINED` — the discard removes the *store* hazard entirely (the memory is being reused). Graph sets these automatically.

## 8. Validation Tools

- **`--validate-sync`**: render graph emits the full barrier dump; check: the set matches the DAG exactly (no missing, no extra).
- Vulkan: `VK_LAYER_KHRONOS_validation` sync-validation enabled in dev.
- DX12: DRED (Device Removal Debug) — turns resource-state bugs into diagnosable errors.

## 9. Pitfalls

| Pitfall | Result | Fix |
|---------|--------|-----|
| UNDEFINED→READ (never written) | garbage input | write-first or ignore discard |
| Per-draw barriers | stall | per-pass |
| Transition after last use (leak) | hidden copy | store `DontCare` |
| Async-lane resource ownership ignored | cross-queue corruption | ownership transfer (§ sync) |
| Barrier inverted order | read before write | edge-based ordering |
| Stale UNDEFINED after aliasing | reuse garbage | transient auto-discard |

## 10. Checklist

- [ ] All resources have defined initial state (UNDEFINED or KNOWN).
- [ ] Barriers emitted per-pass, merged, edge-derived only.
- [ ] Transients discard (UNDEFINED) at first/last.
- [ ] `--validate-sync` green in CI/dev.
- [ ] Async ownership transfers present.
- [ ] No per-draw barriers.