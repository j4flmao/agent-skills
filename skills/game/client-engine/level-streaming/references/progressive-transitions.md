---
title: Progressive Transitions and LOD
description: Progressive LOD, shell→resident swap, fades/masks, editor hot-reload and transition UX.
---

# Progressive Transitions — Deep Reference

## 1. The Role

When a cell *starts* streaming (proxy visible) and *finishes* (resident), the swap must be invisible. Progressive transitions = a family of "cheap now, refine later" renderings.

## 2. The Shell → Resident Swap

```
state LOADING   → render shell (cook-time box/silhouette at LOD_LOW)
state RESIDENT  → next frame boundary: swap shell→full
```
Swap cost: < 0.2 ms (a render-target rebind + mesh bind). Never a mid-frame texture upload (see render-graph/resource-lifecycle staging).

## 3. Progressive LOD (Coarse → Refine)

For a *huge* cell (an entire city quadrant):
1. Load the coarse mesh + simplified textures first → "good enough" at distance.
2. As IO is idle (no critical priority), stream the refine pass (LOD1 textures, extra props).
3. Refine applies progressively (a few batches/frame, credits toward the budget).

This is "the procedural last 10%" that buys 90% of the visible fat.

## 4. Fades & Masks (The Seam Tool)

| Tool | Effect |
|------|--------|
| Fade (alpha clip) | new content fades in under its own alpha (GPU cheap) |
| Pop-mask fog | a thin fog/doc band at the active cell boundary |
| Screen mask (teleport) | a full-screen mask during hard-load |

Apply fades around *boundary activations*, not global — global fades are obvious. Balance: masks cost GPU; keep them narrow and only where streaming actually races.

## 5. Interop with Netcode (A Server-Streaming Pedal)

- If the *server* streams (zones), the client's scope mirrors the server's interest (see interest-management) — the "radius" the client preloads is the *interpolated* prediction of where gameplay happens, so net+client agree.

## 6. Editor Hot-Reload Through the Same Path

The asset editor's "reimport" must route through the *same* streaming path as runtime: edit → hot-reload cook → cell reload (masked) — no separate editor-loading codebase (see asset-pipeline/hot-reload).

## 7. Metrics

| Metric | Watch |
|--------|-------|
| swap ms | < 0.2 |
| refine bytes idle / frame | smooth |
| fade band GPU cost | per-pixel, keep narrow |
| shell-miss (proxy when resident expected) | race → predict fix |

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Swap mid-frame | frame-boundary |
| Global fades | boundary only |
| Refining busy frames | idle-credit |
| Editor loads separately | hot-reload same path |
| Shell created at runtime | cook-time |

## 9. Checklist

- [ ] Shell→resident swap ≤ 0.2 ms, frame-boundary.
- [ ] Progressive LOD refine on idle budget.
- [ ] Fades/masks narrow + boundary-specific.
- [ ] Server-scope mirrors client predict.
- [ ] Editor hot-reload threaded through streaming.