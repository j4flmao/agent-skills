# C++ Skill Architecture

## 1. Skill Context
**Focus**: Extreme performance, manual memory management, game engines, embedded systems, HFT.
**Triggers**: cpp, c++, memory management, pointers, templates, stl, cmake.

## 2. Core Principles
- **RAII (Resource Acquisition Is Initialization)**: The fundamental idiom of C++. Resources (heap memory, file handles, network sockets) are bound to the lifespan of objects on the stack. When the object goes out of scope, the destructor cleans up the resource automatically.
- **Zero-Overhead Principle**: You don't pay for what you don't use. If you don't use exceptions, there is zero performance penalty for them existing in the language.
- **Value Semantics**: Objects are copied by default, unlike Java/C# where objects are passed by reference. This requires deep understanding of Move Semantics to avoid performance hits.

## 3. Anti-Patterns
- **Raw `new` and `delete`**: Managing memory manually is obsolete. Use Smart Pointers (`std::unique_ptr`, `std::shared_ptr`) combined with `std::make_unique`.
- **C-Style Arrays and Strings**: Avoid `char*` and `int arr[]`. Use `std::string` and `std::vector` or `std::array`.
- **Ignoring the Rule of 5**: If you write a custom destructor, you almost certainly need a custom copy constructor, copy assignment operator, move constructor, and move assignment operator.

## 4. References
- `references/cpp-fundamentals.md` — Move Semantics, Pointers.
- `references/cpp-advanced.md` — Templates, Concepts, SFINAE.
- `references/cpp-testing.md` — GTest, GMock.
