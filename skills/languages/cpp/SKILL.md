---
name: lang-cpp
description: >
  Use this skill when the user says 'C++', 'cpp', 'modern C++', 'C++20', 'C++23', 'RAII', 'smart pointers', 'move semantics', 'templates', 'concepts', 'CMake', 'undefined behavior C++', 'rule of five', 'std::span', 'coroutines'. Writes and reviews modern C++ (C++17/20/23): ownership with RAII and smart pointers, value/move semantics, templates and concepts, error handling, the standard library, build with CMake, and sanitizers/static analysis. Do NOT use for: MCU firmware C++ subsets (use c-cpp-patterns), game-engine architecture (use game skills), plain C (use lang-c).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, cpp, modern-cpp, raii, templates, cmake]
---

# Modern C++

## Purpose
C++ offers zero-overhead abstractions and full control, at the price of undefined behaviour and lifetime bugs when used carelessly. This skill applies the modern subset — RAII everywhere, value semantics, no owning raw pointers, concepts over SFINAE — and the tooling that catches what the type system cannot.

## Agent Protocol

### Trigger
"C++", "modern C++", "C++20", "C++23", "RAII", "smart pointers", "move semantics", "templates", "concepts", "CMake", "rule of five", "std::span", "coroutines".

### Input Context
- Standard level and compilers (GCC, Clang, MSVC) and platforms
- Codebase conventions (exceptions on/off, allocator rules, Core Guidelines adoption)
- Performance/ABI constraints (library boundaries, embedded, real-time)

### Output Artifact
C++ code, CMake snippets, or review findings with the rule each one violates. No file unless requested.

### Response Format
```
Std: {C++20}  Compiler: {clang 19 / gcc 14 / MSVC 17.x}
Change: {what and why}
Code: {snippet}
Ownership/lifetime: {who owns what}
Verify: {tests + sanitizers + clang-tidy checks}
```

## 1. Ownership
| Situation | Use |
|-----------|-----|
| Single owner, heap object | `std::unique_ptr<T>` via `std::make_unique<T>(...)` |
| Shared ownership (genuinely shared lifetime) | `std::shared_ptr<T>` via `std::make_shared` — costs atomic refcounts |
| Non-owning access | `T&`, `const T&`, `T*` (nullable), `std::span<T>`, `std::string_view` |
| Break `shared_ptr` cycles | `std::weak_ptr<T>` |
| Value with optional presence | `std::optional<T>` |

- No `new`/`delete` in application code. A raw pointer means "borrowed, does not own".
- `string_view`/`span` must not outlive the data they view — never return one to a local or temporary.

## 2. Rule of Zero / Five
- Prefer the **rule of zero**: members that manage themselves (`std::vector`, `std::unique_ptr`, `std::string`) so the compiler-generated special members are correct.
- If you write any of destructor, copy ctor/assignment, move ctor/assignment, consider all five; mark moves `noexcept` so containers use them during reallocation.
```cpp
class FileHandle {
public:
    explicit FileHandle(const char* path) : f_(std::fopen(path, "rb")) {
        if (!f_) throw std::system_error(errno, std::generic_category(), path);
    }
    ~FileHandle() { if (f_) std::fclose(f_); }
    FileHandle(FileHandle&& o) noexcept : f_(std::exchange(o.f_, nullptr)) {}
    FileHandle& operator=(FileHandle&& o) noexcept {
        if (this != &o) { if (f_) std::fclose(f_); f_ = std::exchange(o.f_, nullptr); }
        return *this;
    }
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    std::FILE* get() const noexcept { return f_; }
private:
    std::FILE* f_;
};
```
(Or: `std::unique_ptr<std::FILE, decltype(&std::fclose)>`.)

## 3. Value and Move Semantics
- Pass cheap types by value, read-only large types by `const T&`, sink parameters by value then `std::move` into the member.
- `std::move` is only a cast; the moved-from object must stay valid but unspecified — do not use its value afterwards.
- Return by value: copy elision is guaranteed for prvalues (C++17) and NRVO is usual; do not write `return std::move(local);`.

## 4. Templates and Concepts (C++20)
```cpp
#include <concepts>
#include <ranges>

template <std::ranges::input_range R>
    requires std::integral<std::ranges::range_value_t<R>>
auto sum(const R& r) {
    std::ranges::range_value_t<R> total{};
    for (auto v : r) total += v;
    return total;
}
```
- Concepts give readable errors and replace most SFINAE/`enable_if`.
- Static polymorphism with CRTP or concepts where virtual dispatch cost matters (see `references/crtp-static-polymorphism.md`); otherwise virtual functions are fine.
- Keep heavy templates out of widely included headers; consider explicit instantiation to cut build times.

## 5. Error Handling
- Exceptions for exceptional failures in code that can unwind; `std::expected<T, E>` (C++23) or `std::optional` for expected, local failures; error codes at C/ABI boundaries.
- Destructors and move operations must not throw. Mark non-throwing functions `noexcept`.
- If exceptions are disabled (`-fno-exceptions`, common in games/embedded), use `expected`-style returns consistently.

## 6. Concurrency
- `std::jthread` (C++20, joins on destruction, stop tokens), `std::mutex` with `std::scoped_lock` (deadlock-free multi-lock), `std::atomic` with explicit memory orders only when profiled.
- Data races are UB. Share immutable data freely; protect mutable shared state; prefer message passing/task systems for complex pipelines.
- Coroutines (C++20) are a language mechanism; use a library (e.g. Asio, cppcoro-style task types, `std::generator` in C++23) rather than hand-writing promise types.

## 7. Standard Library Picks
`std::vector` by default (contiguous, cache friendly); `std::array` for fixed size; `std::unordered_map` (or a flat/open-addressing map from Abseil/Boost for speed); `std::format`/`std::print` (C++20/23) instead of iostream formatting; `<ranges>` algorithms; `std::chrono` for time; `std::filesystem` for paths.

## 8. Build and Tooling
```cmake
cmake_minimum_required(VERSION 3.25)
project(app LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
add_executable(app src/main.cpp)
target_compile_options(app PRIVATE
  $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic -Wconversion -Werror>
  $<$<CXX_COMPILER_ID:MSVC>:/W4 /WX>)
```
- Target-based CMake (`target_*`), dependencies via vcpkg or Conan, `CMakePresets.json` for shared configs.
- CI: ASan+UBSan build, TSan build for concurrent code, clang-tidy (`cppcoreguidelines-*`, `bugprone-*`, `modernize-*`), clang-format.
- Testing: GoogleTest/GoogleMock, Catch2, doctest (see `references/cpp-testing.md`); fuzz with libFuzzer.

## 9. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Owning raw pointers / manual `delete` | leaks, double free | `unique_ptr`, containers |
| `shared_ptr` everywhere | unclear ownership, atomic overhead, cycles | single owner + references |
| Returning `string_view`/`span`/reference to locals | dangling | return owning values |
| `using namespace std;` in headers | name collisions | qualify names |
| C-style casts | silently reinterprets | `static_cast`, `std::bit_cast` (C++20) |
| `std::endl` in loops | flushes every line | `'\n'` |
| Iterator invalidation (push_back while iterating) | UB | index loops or collect then mutate |

## 10. Checklist
- [ ] No owning raw pointers; ownership stated in interfaces
- [ ] Rule of zero, or complete rule of five with `noexcept` moves
- [ ] Concepts or constrained templates; readable errors
- [ ] Warnings as errors; sanitizer and clang-tidy runs in CI
- [ ] Views (`span`, `string_view`) never outlive their data

## References
- `references/cpp-fundamentals.md` — value categories, move semantics, pointers and references
- `references/cpp-advanced.md` — templates, concepts, SFINAE, metaprogramming
- `references/crtp-static-polymorphism.md` — CRTP and static polymorphism
- `references/cpp-testing.md` — GoogleTest, GoogleMock, test structure
