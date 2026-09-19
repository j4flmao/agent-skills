---
title: Stream Strategies
description: Spatial, zone, trigger and persistent strategies, hybrid models, authoring and planning stream scope.
---

# Stream Strategies — Deep Reference

## 1. The Strategy Zoo

| Strategy | Model | Strength | Weakness |
|----------|-------|----------|----------|
| **Spatial cell grid** | fixed-size cells | uniform, predictable | doesn't match authored walls |
| **Zone/region** | authored chunks | matches design | must author every chunk |
| **Enabling trigger** | scripted beams | linear-focused | linear only |
| **Persistent + stream** | always-on base | hub + set-pieces | base is always resident |

## 2. Choosing (The Decision Matrix)

| World shape | Strategy |
|-------------|----------|
| Open field / driving | spatial grid + predict-ahead |
| Dungeon / hub | zone + enabling triggers |
| Linear campaign | trigger chain |
| Hub + open zones | persistent + spatial |
| Seamless world (large) | spatial + zones mixed |

Most games are hybrids. Pair small authored "set-piece" zones with a spatial grid for the rest.

## 3. Authoring the Plan (Dev-Side)

Stream plans are **asset** (a `.stream` file, cook-time generated):
```
cell aabb {min,max}; deps [materials, meshes, audio, nav]; type spatial;
trigger t {position, range, targetCell};
zone z {name, cells[]};
```
The cook validates: every asset in a cell's deps exists + the closure is finite; a plan with a broken cell fails the cook (not the player's frame).

## 4. The Predict-Ahead Allowance

```
scope(streamPlan) = cells whose AABB:
   [camera frustum intersect]
 ∪ [dist(camera) < radius_predict (cameraSpeed × T ≥ 2 s)]
 ∪ [trigger active]
```
No "inside-too-late" cases: a camera-abrupt teleport triggers a cell *hard-load* (blocking + fades — the teleport mask hides it).

## 5. The Persistent Base

The always-resident small core: modes/UI/title-clip, common NPC, shared libraries (so "UI appears while world streams").

## 6. Co-Streaming "Hugging" Zones

At a region gate, *pre-load* the neighbor's trigger-zone cells during transit (the player walks through → the next zone is 90% ready).

## 7. Metrics to Plan With

| Plan metric | Watch |
|-------------|-------|
| cells/player in scope | growth = budget blowout |
| nested-zone counts | depth crossing |
| persistent size | keep < 20% RAM |
| gates per region | chokepoint friction |

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Load-on-frame-cross | predict-ahead |
| All cells spatial (huge set) | hybrid zones |
| Deep trigger chains | plan validation |
| Persistent too big | base-only minimal |
| Plan not authored | cook-time validation |

## 9. Checklist

- [ ] Strategy matrix matched to world type (hybrid).
- [ ] Authored plan as asset, cook-validated.
- [ ] Predict-ahead scope = frustum ∪ radius ∪ triggers.
- [ ] Persistent base small + shared.
- [ ] Gate pre-load of neighbor zones.