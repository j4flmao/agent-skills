---
title: Filesystem and Virtual Paths
description: Mount table, virtual paths, async I/O, memory-mapped files, save systems and disk layout for game engines.
---

# Filesystem & Virtual Paths — Deep Reference

## 1. Virtual → Physical Resolution

Every engine doing serious porting has a `VFS`. The engine never hard-codes disk paths:

```cpp
// virtual path: "{GameData}/levels/lvl01.dat"
// resolve to:   "C:\...\install\GameData\levels\lvl01.dat"  (PC)
//               "/data/GameData/levels/lvl01.dat"             (Linux)
//               "package:/GameData/levels/lvl01.dat"          (console)
Path Resolve(Path vpath) {
    for (auto& m : g_mounts) if (vpath.beginsWith(m.root)) return m.physical + vpath.tail();
    return {};   // unmounted -> error
}
```

Rules:
- Assets store only virtual paths.
- The mount table is set once at boot.
- `{Config}`, `{Save}`, `{Temp}` resolve to platform-writable dirs.

## 2. Mount Table

```
Mount           Physical (per platform)
{EngineRoot}    <sdk>\engine
{GameData}      <install>\GameData
{ShaderCache}   <install>\ShaderCache   (read-only)
{LocalCache}    %LOCALAPPDATA%\<title>   (writable cache)
{SaveFiles}     %APPDATA%\|xdg-data-home|console-save
{Temp}          system temp | console scratch
```

The writable mount (`{SaveFiles}`) is separate from read-only (`{GameData}`) — prevents mods accidentally writing to shipped data and simplifies pack code.

## 3. Read Patterns

| Pattern | Use | API |
|---------|-----|-----|
| Synchronous small read | config, tiny assets | `ReadSmall` |
| Async read | audio, textures, streaming | `ReadAsync(fd, buf, n, cb)` |
| Memory-mapped | big read-only assets | `MapReadOnly(vpath, &size)` |
| Pack file | many small assets in one `.pak` | `OpenPak`, `Read(pak, entry)` |

### 3.1 Async I/O

```cpp
void LoadTextureAsync(const Path& vpath) {
    int fd = IO_OpenVirtual(vpath);
    IO_ReadAsync(fd, staging, n, [=](IoResult r) {
        // on worker thread: after read, upload to GPU via staging ring
        job_spawn(uploadToGpu, staging, r.bytes);
    });
}
```

I/O completion posts back onto the job system (see `job-system`), never the game thread — blocking reads on the main thread are a frame-spike factory.

### 3.2 Packs (.pak)

Ship 10–100k small assets as a few large `.pak` files (fewer file handles, one big mmap). Entry table: `{name→(offset,size,compressed)}`; reads are `pread`/mmap slices. Compression per-entry (LZ4/Zstd) — streamed reads decompress on a worker.

## 4. Streaming Budgets

The streaming system (see `client-engine/level-streaming.md`) requests tiles/textures from the filesystem; the FS caps in-flight reads:

| Metric | Budget |
|--------|--------|
| concurrent async reads | ≤ 8 |
| in-flight bytes | ≤ 128 MB |
| decompression workers | ≤ 4 |
| page-in rate | adaptive to RSS |

Never `fread` a 100 MB asset synchronously on the main thread.

## 5. Saves & Writes

- Atomic write: write to `{Temp}` then rename into place (crash-safe).
- Save format: binary + CRC, versioned, written async.
- Multiple save slots + auto-save; keep a rolling "last N" for corruption recovery.

```cpp
SaveSlot SaveAsync(SaveDesc d) {
    WriteTemp(d);  Rename(d.tmp, d.final);  UpdateIndexAsync();
}
```

## 6. Disk Layout (Shipped)

```
<install>/
  Game.exe / Game  (or .app bundle)
  GameData/        (read-only)
    config.ini
    shaders/  hlsl compiled
    content/  levels, textures.pak, audio.pak, mesh.pak
  ShaderCache/     (read-only pre-cache)
```

Consoles hide this behind their package format; the PAL resolves it. PC shipping often ships loose (dev) or packed (release); the PAL must support both.

## 7. Pitfalls

1. Hard-coded `\` paths — use `Path` type (forward slashes internally, normalized per platform).
2. Blocking `fread` of big assets on main thread → frame spike. Async or mmap.
3. Writing to `{GameData}` (read-only in stores).
4. Non-atomic save → corrupt save on crash mid-write.
5. Case-sensitivity differences (Windows case-insensitive, Linux not) → lower-case virtual paths + normalize.
6. Symlinks/packs assumed same layout across platforms → resolve via PAL, not assumptions.
7. Forgetting `CloseFile` on unload → handles exhausted on console.

## 8. Checklist

- [ ] All paths virtual, mounted per platform.
- [ ] Big reads async or mmap'd, throttled.
- [ ] Saves atomic; a few slots; CRC-protected.
- [ ] Read-only vs writable mounts separated.
- [ ] Packs for many-asset scenarios.
- [ ] PAL abstracts open/read/seek/map across platforms.