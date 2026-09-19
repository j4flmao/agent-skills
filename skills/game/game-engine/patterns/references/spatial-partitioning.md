---
title: Spatial Partitioning
description: Grids, quadtrees, octrees, BVH, spatial hash, and R-tree strategies for broad-phase collision, culling, and queries.
---

# Spatial Partitioning — Deep Reference

## 1. The Problem

Naïve collision checks are **O(n²)** (each entity vs every other). At 10,000 entities that's 100M pair checks/frame — impossible. All spatial partitions reduce the candidate set by only testing entities in nearby cells.

## 2. Uniform Grid

### Structure

Divide the world into fixed-size cells; hash each entity's cell → list of entities.

| Cell size | Use case |
|-----------|----------|
| Entity radius × 2 | best for uniform-diameter bullets/particles |
| Large (32–64 u) | best for mixed units |

### Implementation

```cpp
class Grid {
    float cellSize;
    std::unordered_map<CellKey, std::vector<Entity>> cells;
public:
    std::vector<Entity> candidatesFor(const AABB& box) {
        // iterate cells overlapped by box, concatenate contents
    }
    void insert(Entity e, Vec2 center) {
        cells[keyFor(center)].push_back(e);
    }
    void remove(Entity e, Vec2 center) { /* erase from cell list */ }
};
```

### Complexity

- Insert/remove: O(1) amortized.
- Query: O(overlap area × avg density).
- Works great when entity size ≈ cell size.

### Good for
- Pooled puzzle games, bullets, particles, grid-strategy.
- When density is roughly uniform and cell-size tuned to entity size.

## 3. Quadtree / Octree

### Structure

Recursively subdivide space into 4 (2D) / 8 (3D) children only where entities exist.

```
Root (full world)
 ├── NW, NE, SW, SE       (subdivide when >N entities in node)
      ├── ... leaf nodes store entity lists
```

### Implementation Sketch

```cpp
class Quadtree {
    AABB bounds;
    std::vector<Entity> entities;   // if count < MAX, leaf
    Quadtree* children[4];
public:
    void insert(Entity e, Vec2 pos);
    void query(const AABB& region, std::vector<Entity>& out);
};
```

### Complexity

- Average query: O(log n + k) (k = result count).
- Worst-case: O(n) if all entities in one node (degenerate).
- Node granularity adapts to density — no wasted cells on sparse regions.

### Good for
- RTS maps, terrain, open worlds, visibility culling.
- When density varies wildly.

### Gotchas
- Deep trees with few entities waste memory on internal nodes.
- Dynamic entities must be removed/reinserted each frame (avoid rebuilding entire tree).

## 4. Dynamic Bounding Volume Hierarchy (DBVH)

### Structure

Binary tree of bounding boxes; refit each frame (bottom-up).

```
      [World AABB]
      /          \
  [AABB A]    [AABB B]
   /   \       /     \
  a1   a2    b1      b2
```

### Implementation (Box2D / PhysX pattern)

```cpp
struct BVHNode {
    AABB box;
    int left, right, parent;   // -1 for leaves
};

class DynamicBVH {
    std::vector<BVHNode> nodes;
public:
    int insertLeaf(const AABB& box, int data) { /* hierarchy insert + refit */ }
    void removeLeaf(int index);
    void update(int index, const AABB& newBox);
    void query(const AABB& region, std::vector<int>& out);
};
```

### Complexity

- Insert: O(log n) average.
- Refit after move: O(log n) path to root.
- Query: O(k + log n).

### Good for
- Physics broad-phase (Box2D/PhysX), raycasts against moving objects.
- When objects move and change size (radio/light radius).

## 5. Spatial Hash (Grid + Hash Map)

A uniform grid stored in a hash map — sparse worlds don't preallocate all cells:

```cpp
struct SpatialHash {
    float cellSize;
    std::unordered_map<HashKey, std::vector<Entity>> cells;
};
```

Functions: `hashCell(cx, cy) = (cx * 73856093) ^ (cy * 19349663)` (co-prime hash).

Great when the world is huge and mostly empty.

## 6. Choosing a Structure — Decision Matrix

| Scenario | Best fit |
|----------|----------|
| Uniform size objects, dense (bullets/particles) | Uniform grid |
| Mixed sizes, sparse, dynamic open world | BVH |
| Static-ish world, terrain/rooms, 2D RTS | Quadtree |
| 3D world, voxel, everything | Octree |
| Huge world, mostly empty, ad-hoc queries | Spatial hash |
| Raycasts vs moving colliders | BVH (ray acceleration) |
| GPU query (compute shaders) | Uniform grid (structured buffers) |

## 7. Integration with Physics

```
Each physics body AABB updated
  → Broad-phase bucketing (grid/BVH/quadtree)
  → Narrow-phase (SAT, GJK/EPA) on generated pairs
  → Contact solvers (impulse / position correction)
  → Integration (semi-implicit Euler)
```

## 8. Practical Rules

1. Cell/maintenance cost: if a system's query set is small, skip spatial index — O(n) linear scan is fine for <200 candidates.
2. Update frequency: moving entities should refit bottom-up, not rebuild the tree each frame.
3. Correct coordinate wrap: don't let entities fall into negative cells (wrap hash).
4. Balance: max entities per leaf before split (e.g., 4–8) to limit traversal depth.
5. Profile: measure query count and average result list length — if large result lists pour out, cell size too big.