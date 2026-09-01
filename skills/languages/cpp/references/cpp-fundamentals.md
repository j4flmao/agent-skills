# C++ Fundamentals

## 1. Value vs Reference Semantics
In C++, variables hold actual values, not references (unlike Java).
```cpp
std::string a = "Hello";
std::string b = a; // Deep copy occurs! O(N) cost.
```
To avoid copying, use references (`&`) or pointers (`*`).
```cpp
void print(const std::string& s) { /* ... */ } // Pass by const-reference (No copy, read-only)
```

## 2. Move Semantics (`std::move`)
Before C++11, returning a large `std::vector` from a function resulted in a massive deep copy. Move semantics allow stealing the memory pointer from a temporary object (an rvalue).

```cpp
std::vector<int> a = {1, 2, 3, 4, 5};
// b "steals" the internal array pointer of a.
// 'a' is left in a valid but unspecified (empty) state. O(1) cost.
std::vector<int> b = std::move(a); 
```

## 3. Smart Pointers (RAII)
Never use raw `new` and `delete`. The standard library provides wrappers that automatically delete the heap memory when they go out of scope.

- **`std::unique_ptr<T>`**: Exclusive ownership. Cannot be copied, only moved. (Zero overhead).
- **`std::shared_ptr<T>`**: Shared ownership. Keeps a reference count. Deletes memory when count reaches 0. (Slight overhead due to atomic thread-safe counting).

```cpp
#include <memory>

class Player { ... };

void spawn() {
    // Memory allocated on heap
    std::unique_ptr<Player> p = std::make_unique<Player>();
    // No delete needed. p is destroyed when the function ends.
}
```

## 4. The Rule of Zero / Three / Five
If a class manages resources (like heap memory or a file handle):
- **Rule of 3 (C++98)**: Define Destructor, Copy Constructor, Copy Assignment.
- **Rule of 5 (C++11)**: Add Move Constructor, Move Assignment.
- **Rule of Zero (Modern)**: Don't manage resources manually. Use `std::vector` or `std::unique_ptr` as members, and the compiler will generate the correct 5 functions automatically.
