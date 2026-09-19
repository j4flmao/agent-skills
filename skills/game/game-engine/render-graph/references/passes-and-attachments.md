---
title: Passes and Attachments
description: Declaring render pass structure, attachments, transient aliasing, framebuffer reuse and passes in a render graph.
---

# Passes & Attachments — Deep Reference

## 1. Pass Anatomy

```cpp
struct Pass {
    string  name;                       // debug label
    std::vector<AttachmentRef> inputs;  // what we read
    std::vector<AttachmentRef> outputs; // what we write
    ResourceID  renderTarget;           // the framebuffer/layout this writes into
    uint        clearOpt;               // Clear/Keep/Load
    Task        recordTask;             // CPU lambda to record commands
};
```

Two kinds of "edges" careful to separate:
- **Data edge** (resource read→ written): drives ordering.
- **Framebuffer reuse** (same render target attach): enables pass merging.

## 2. Attachment Declaration & Path

```cpp
graph.CreateTexture(TexDesc w,h,fmt, Usage::ColorAttachment), attColor);
Pass p;
p.addOutput(ResourceHandle::of(attColor), LoadOp::Clear, StoreOp::Store);
```

Access state gives the graph what it must ensure pre/post:
- `LoadOp::Clear` → initialize on first touch (value from `clearColor`).
- `LoadOp::Load` → keep previous content (pass reads previous frame).
- `StoreOp::Store` → persist (for the next pass/frame).
- `StoreOp::DontCare` → transient; can alias (see §3).

## 3. Transient Aliasing

A render target used by N passes and destroyed at frame end **may alias another** memory region that's alive earlier in the same frame:

```
---- time -------------------------------------------------------->
 AAAA  (Ambient only)   BBBB  (Post/atmospheric room)
   alias slot shared; lifetime of A ends before B begins.
```

The graph's allocator: for each transient, compute active interval [first,last pass], find a free alias slot, assign the same device-memory slab. Plot it in debug ("alias map").

Win: a 1080p scene with 4 transients uses ~1.5x VRAM instead of 4x. This is the "memory" the render graph buys.

## 4. Framebuffer (RenderTarget) Reuse & Merging

- If pass A outputs to RT and pass B reads it and writes the *same* RT, and states allow — swap to a single RT pass (merge drains). Merging reduces attachment locality misses and state changes.
- The graph batches draws whose state is compatible into one list.

## 5. Attachment Formats

- Choose formats by *usage*, not name: `D32F` for depth (half-float rarely needed), `R11G11B10F` for HDR RTs, `RGBA16F` for post, `R8G8B8A8` for UI.
- Depth+stencil as `D24S8`. Verify with the device's supported-format list; specialize per platform in one table (`PAL formats`).

## 6. The LoadOp/Clear Consistency Contract

```cpp
enum LoadOp { Clear, Load, Ignore };
enum StoreOp { Store, DontCare };
```
"Efficient" load false heaven: `LoadOp::Ignore` when the pass fully overwrites (lets driver alias / discard). The graph sets it automatically when the pass writes each pixel (full-screen pass).
But: same-texture reuse across frames must not lose previous frame (do not use Ignore for accumulation buffers that read old values).

## 7. Multi-View / VR Attachments

- Stereo: two render targets in a paired pass (or arrayed texture with `renderArea` per eye).
- Cube attachments: shadow maps — cube target = 6 views; write 6 dispatches or a single layered pass.

## 8. Performance

| Metric | Watch |
|--------|-------|
| Attachment load cost | prefer Ignore/Clear over Load on per-frame |
| Transient count | high = memory, but alias reuses |
| Framebuffer switch rate per frame | target < ~10 |
| Merged passes | reduces barriers automatically |

The biggest cost is *state changes*: each render target switch flushes the pipeline cache entry; graph merging = fewer distinct RTs.

## 9. Debug

- Debug view of "transient map" and "merged passes".
- Count `rt.rebind` events in profiler; route to "frame stats" panel.

## 10. Pitfalls

| Pitfall | Fix |
|---------|-----|
| LoadOp::Load for a transient each frame | aliasing waste |
| RT switched every draw | merge passes |
| Multi-pass with unclear lifetime | graph first/last tracking |
| Formats guessed per-platform | `PAL` format table |
| DontCare written but read later | StoreOp contract violation → assert |

## 11. Checklist

- [ ] Pass inputs/outputs + clear/store declared.
- [ ] Transients aliased via graph allocator.
- [ ] Compatible passes merged.
- [ ] LoadOp auto; not loading every frame.
- [ ] Formats centralized in PAL table.