# Advanced C++

## 1. Template Metaprogramming (TMP)
Templates in C++ are Turing-complete. You can write code that executes during compilation, generating entirely new functions and classes.

```cpp
template <int N>
struct Factorial {
    static const int value = N * Factorial<N - 1>::value;
};

// Base case
template <>
struct Factorial<0> {
    static const int value = 1;
};

// Resolved at compile time. Zero runtime cost!
int x = Factorial<5>::value; // Equivalent to int x = 120;
```

## 2. SFINAE (Substitution Failure Is Not An Error)
Before C++20, developers used SFINAE to conditionally compile templates based on type traits. If substituting a template parameter creates invalid code, the compiler silently ignores that template overload instead of hard-failing.

```cpp
#include <type_traits>

// This version only exists if T is an integer
template <typename T>
typename std::enable_if<std::is_integral<T>::value, void>::type
process(T value) {
    // Integer processing
}
```

## 3. Concepts (C++20)
Concepts replace the horrific syntax of SFINAE with clean, readable constraints on template parameters.

```cpp
#include <concepts>

// Define a Concept
template<typename T>
concept Hashable = requires(T a) {
    { std::hash<T>{}(a) } -> std::convertible_to<std::size_t>;
};

// Apply the Concept
template <Hashable T>
void insertIntoMap(T key) {
    // ...
}
```

## 4. `constexpr` and `consteval`
- `constexpr`: Suggests the compiler evaluate the function at compile time if inputs are known at compile time.
- `consteval` (C++20): Forces the function to ONLY run at compile time. If it can't, compilation fails.
