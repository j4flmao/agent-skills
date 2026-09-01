# C++: Static Polymorphism (CRTP)

## 1. The Cost of Dynamic Polymorphism
In C++ and Java, classic polymorphism uses virtual functions (the `virtual` keyword). 
- **The Mechanism**: The compiler generates a Virtual Method Table (vtable). When a method is called, the program looks up the memory address of the function pointer in the vtable at runtime.
- **The Cost**: This dynamic dispatch prevents function inlining (a crucial compiler optimization) and causes CPU pipeline stalls (branch misprediction) in high-performance loops (e.g., game engines, high-frequency trading).

## 2. The Curiously Recurring Template Pattern (CRTP)
CRTP achieves Polymorphism at compile-time using C++ Templates (Generics).

### Structure
The derived class inherits from a template base class, passing *itself* as the template argument.

```cpp
#include <iostream>

// Base Template Class
template <typename Derived>
class Shape {
public:
    void draw() {
        // Compile-time downcast! No vtable lookup.
        // static_cast has zero runtime overhead.
        static_cast<Derived*>(this)->draw_impl();
    }
};

// Derived Class 1
class Circle : public Shape<Circle> {
public:
    // Notice this is NOT a virtual function
    void draw_impl() {
        std::cout << "Drawing a Circle (Fast!)\n";
    }
};

// Derived Class 2
class Square : public Shape<Square> {
public:
    void draw_impl() {
        std::cout << "Drawing a Square (Fast!)\n";
    }
};
```

## 3. Usage and Inlining
Because the compiler knows the exact type at compile time (`Shape<Circle>`), it can completely inline the `draw_impl()` code directly into the caller.

```cpp
template <typename T>
void renderShape(Shape<T>& shape) {
    shape.draw(); // Resolves at compile time
}

int main() {
    Circle c;
    Square s;
    
    renderShape(c);
    renderShape(s);
    
    return 0;
}
```

## 4. Modern C++23 Alternative (Deducing `this`)
While CRTP is a legendary C++ pattern, C++23 introduces "Deducing `this`" which allows similar static polymorphism without the awkward inheritance structure.
```cpp
struct Base {
    template <typename Self>
    void draw(this Self&& self) {
        self.draw_impl();
    }
};
```
