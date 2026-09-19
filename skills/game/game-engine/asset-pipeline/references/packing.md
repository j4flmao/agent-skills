---
title: Packing and Shipping
description: Pak layout, compression, streaming pools, update/delta packs, and disk/system memory budget for shipped game content.
---

# Packing & Shipping — Deep Reference

## 1. Why Pak Files

- 100k loose files = slow install + many handles + fsync chatter on console.
- One `.pak` (or a few) = single handle, contiguous reads, easy update/patches, better compression (dictionary across files).
- Consoles mandate pack format for security & certification.

## 2. Pak Layout

```
magic | version | flags | entryCount | [entryTable]  -> [data...]
entry: { id (uint64), offset (u64), size (u32), compressedSize (u32),
         compression, crc32 }
```

- Entries sorted by id (binary search / hash-index).
- Compression: LZ4 (fast) for stream-heavy; Zstd (ratio) for cold; several engines per-block.

### 2.1 Compression Choices

| Codec | Ratio | Speed | Use |
|-------|-------|-------|-----|
| LZ4 | ~2x | very fast | audio, streaming textures |
| Zstd | ~3–5x | fast | meshes, cold data |
| Oodle / Kraken | ~4–7x | fast | AAA (per-platform) |
| Zlib | ~3x | slow | legacy, web |

## 3. Streaming Pools

Paks are read in slices on demand (async):

```
pak read path (async):
  request(id) → manifest(lookup) → read [offset, size+compressedSize)
              → decompress (worker) → staging → GPU upload / RAM asset
```

Budgets:
- in-flight concurrent reads ≤ 8
- in-flight bytes ≤ 128 MB
- decompression workers ≤ 4
- page-in rate adaptive to RSS

## 4. Install & Layering

- Console: install entire pak set (fast sequential copy).
- PC: streaming install (online delivery) — levels downloaded on demand.
- Update: **delta paks** — patch only changed entries vs a base manifest; rolling patch list.

### 4.1 Update/DLC Models

1. Full pak shipping (ships complete as of that version).
2. **Delta patches**: base pak + patch idx; loader reads mod + base (see below).
3. DLC packs: additional `.pak` mounted on top with the *highest* priority.

Priority resolution: mounted packs in order (DLC > base); entry id wins from highest priority mount.

## 5. The Modding Story

Mod = a `pak` mounted on top. Priority + no signature = moddable. Shipping with mod support:
- Signed community packs optional (security gate).
- Content layering with proper id namespaces (`{mod}/mesh` under its own root) avoids conflicts.

## 6. Runtime Mount Priorities

```
Priority 0: DLC/mods (top)
Priority 1: delta/patch (top of base)
Priority 2: base GameData
Priority 3: engine safety data (bottom)
```

Lookup = highest priority mount with the id. Keep layering *deterministic* per config.

## 7. Certification-Critical Bits

- **Signing**: console paks must be signed (tamper-proof).
- **Hash**: every entry CRC'd; a corrupt pak entry = safe error + skip (not silent blank).
- **Boot-time read**: manifest read at startup (small, ~1 MB); the *index* could be memory-mapped.

## 8. Pack Sizes & Budget

| Title scale | Pak count | Pak size | Repo |
|-------------|-----------|----------|------|
| Indie (10 GB) | 2–4 | 5 GB | git-lfs or cloud store |
| AA (40 GB) | 8 | 5–10 GB | object-store + CDN |
| AAA (120 GB) | 12–20 | 8–15 GB | build farm + object store |

Ship state = literal byte set (deterministic); a build id maps to a manifest.

## 9. Pitfalls

| Pitfall | Result | Fix |
|---------|--------|-----|
| Loose-file ship | install/cert issues | pak |
| Main-thread pak read | frame spike | async + pool |
| Uncompressed pak | disk-cold games double I/O | compressed reads |
| Unsigned console pak | cert fail | sign all |
| Base pak + update layering bug | mixed content | deterministic overlay |
| Streaming that races unload | use-after-free | refcount + state machine |

## 10. Checklist

- [ ] Paks mounted by priority; load resolves highest-first.
- [ ] Async slicing; throttled in-flight reads.
- [ ] Delta updates / DLC layering deterministic.
- [ ] Signed paks + CRC per entry.
- [ ] Deterministic cook → deterministic pak bytes.
- [ ] No main-thread pak reads.