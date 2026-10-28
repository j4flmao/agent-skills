---
name: lang-c
description: >
  Use this skill when the user says 'C language', 'C11', 'C17', 'C23', 'pointers', 'undefined behavior', 'strict aliasing', 'restrict', 'volatile', 'malloc/free', 'buffer overflow', 'segfault', 'sanitizer', 'Makefile', 'CMake C project'. Writes and reviews portable C (C11/C17/C23): memory ownership, undefined behaviour and how optimisers exploit it, strings and buffers, error handling, build flags, sanitizers and static analysis. Do NOT use for: microcontroller firmware specifics (use c-cpp-patterns), kernel modules (use kernel-development), C++ (use lang-cpp).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, c, systems, undefined-behavior, memory-safety]
---

# C

## Purpose
C gives direct control over memory and layout, and the compiler assumes you never break the standard's rules. This skill focuses on writing C whose behaviour is defined, whose ownership is clear, and whose bugs are caught by tooling before production.

## Agent Protocol

### Trigger
"C language", "C11", "C17", "C23", "pointers", "undefined behavior", "strict aliasing", "restrict", "volatile", "malloc", "buffer overflow", "segfault", "sanitizer".

### Input Context
- Standard and compilers (GCC, Clang, MSVC) and target platforms
- Code under review or the API to design; existing build system
- Constraints (freestanding/embedded, real-time, ABI stability)

### Output Artifact
C code with ownership comments, build/sanitizer flags, review findings. No file unless requested.

### Response Format
```
Std/compiler: {C17, gcc 14 / clang 19 / MSVC}
Change: {what and why}
Code: {snippet}
UB check: {which rules this code relies on}
Verify: {flags + sanitizers + tests}
```

## 1. Undefined Behaviour (UB)
C is not "portable assembly": optimisers assume UB never happens and delete or rearrange code accordingly.
| UB | Example | Defined alternative |
|----|---------|---------------------|
| Signed integer overflow | `if (a + 1 < a)` (optimised to false) | check before: `if (a == INT_MAX)`, or `__builtin_add_overflow`, C23 `ckd_add` |
| Out-of-bounds access | `buf[len]` | track lengths, use sizes in APIs |
| Use after free / double free | dangling pointers | single owner, set to `NULL` after free |
| Null dereference | `p->x` before checking `p` | check first (the compiler may delete later null checks) |
| Strict aliasing violation | `*(uint32_t *)&f` for a `float f` | `memcpy(&u, &f, sizeof u)` (compiles to a move) |
| Shift by >= width or negative | `1 << 32` | `n < 32 ? 1u << n : 0` |
| Unsequenced modification | `i = i++ + 1` | separate statements |
| Data race | two threads writing a plain variable | `<stdatomic.h>` or a mutex |
| Uninitialised read | automatic variable used before assignment | initialise at declaration |

## 2. `volatile`, `restrict`, `const`
- `volatile`: every access is performed as written — for memory-mapped I/O and `sig_atomic_t` flags in signal handlers. It is **not** a thread synchronisation primitive (no atomicity, no ordering); use `_Atomic`/`atomic_*` for threads. See `references/memory-mapped-io.md`.
- `restrict`: promise that, for the pointer's lifetime, the object is accessed only through it; enables vectorisation. Breaking the promise is UB.
- `const` on pointees in APIs documents read-only access (`size_t count(const char *s)`).

## 3. Ownership and Memory
- Document who allocates and who frees for every pointer in an API. Common pattern: `obj_create()` / `obj_destroy()`; caller-provided buffers with explicit sizes for output.
- Check every `malloc`/`calloc`/`realloc` result; `realloc` into a temporary so the original is not leaked on failure:
```c
void *tmp = realloc(buf, new_cap);
if (tmp == NULL) { free(buf); return -ENOMEM; }
buf = tmp;
```
- Overflow-safe allocation: `calloc(n, size)` checks `n * size`; otherwise test `n > SIZE_MAX / size` first.
- Single-exit cleanup with `goto` is idiomatic and readable:
```c
int load(const char *path, struct cfg *out)
{
    int rc = -1;
    FILE *f = fopen(path, "rb");
    char *buf = NULL;
    if (!f) { perror(path); goto out; }
    buf = malloc(BUF_SZ);
    if (!buf) goto out;
    if (fread(buf, 1, BUF_SZ, f) == 0 && ferror(f)) goto out;
    rc = parse_cfg(buf, out);
out:
    free(buf);
    if (f) fclose(f);
    return rc;
}
```

## 4. Strings and Buffers
- Always carry lengths; prefer `snprintf` (check the return value for truncation), `memcpy` with known sizes. Avoid `strcpy`, `strcat`, `sprintf`, `gets` (removed in C11). `strncpy` does not guarantee termination.
- `strlcpy`/`strlcat` are available on BSD/macOS and glibc ≥ 2.38; otherwise write a bounded copy helper.
- Parse integers with `strtol`/`strtoul` and check `errno` and the end pointer, not `atoi`.

## 5. Modern C Features Worth Using
- C11: `_Static_assert`, `_Alignas`/`_Alignof`, `<stdatomic.h>`, `<threads.h>` (optional), anonymous structs/unions, `_Generic`.
- C23: `nullptr`, `bool`/`true`/`false` as keywords, `constexpr` objects, `typeof`, `[[nodiscard]]`/`[[maybe_unused]]` attributes, `#embed`, `<stdckdint.h>` checked arithmetic, binary literals, `memset_explicit`. Check compiler support (GCC 14+/Clang 18+ have most; MSVC lags).

## 6. Build Flags and Tooling
```bash
# development
cc -std=c17 -O1 -g -Wall -Wextra -Wpedantic -Wconversion -Wshadow -Werror \
   -fsanitize=address,undefined -fno-omit-frame-pointer main.c -o app
# hardened release (GCC/Clang, glibc)
cc -std=c17 -O2 -D_FORTIFY_SOURCE=3 -fstack-protector-strong -fPIE -pie \
   -Wl,-z,relro,-z,now main.c -o app
```
- Sanitizers: ASan (memory errors), UBSan (UB at runtime), TSan (data races; not combinable with ASan), MSan (uninitialised reads, Clang only). Run the test suite under them in CI.
- Static analysis: `clang --analyze`/`scan-build`, `clang-tidy`, cppcheck, GCC `-fanalyzer`, CodeQL.
- Fuzz parsers with libFuzzer or AFL++.
- Inline assembly: see `references/inline-assembly.md`.

## 7. Error Handling
- Return error codes (negative errno style or an enum) and use output parameters; never ignore return values of I/O and allocation (`[[nodiscard]]` in C23, `__attribute__((warn_unused_result))` before).
- Log context with the failing input: `fprintf(stderr, "parse %s:%d: %s\n", path, line, msg);`.

## 8. Anti-Patterns
- Casting `malloc`'s result in C (hides a missing `#include <stdlib.h>` in old code; unnecessary).
- Macros with side-effect-duplicating arguments (`#define MAX(a,b) ((a)>(b)?(a):(b))` with `MAX(i++, j)`); use `static inline` functions.
- `sizeof(pointer)` where `sizeof(*pointer)` or the array size was meant.
- Mixing signed and unsigned in comparisons (`-1 < sizeof x` is false).
- Relying on implementation-defined struct layout or bit-field order for file/wire formats.

## 9. Checklist
- [ ] Ownership documented for each pointer parameter/return
- [ ] No unbounded string functions; all sizes checked
- [ ] Warnings as errors; ASan+UBSan and TSan test runs green
- [ ] Integer overflow checked where inputs are external
- [ ] Static analyser and fuzzing for parsers in CI

## References
- `references/memory-mapped-io.md` — volatile register access, MMIO patterns
- `references/inline-assembly.md` — GCC/Clang extended asm, constraints, clobbers
