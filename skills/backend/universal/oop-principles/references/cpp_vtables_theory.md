# C++ Virtual Dispatch: vtables and vptrs

How C++ implements runtime polymorphism under the hood, why it matters for OOP design decisions (cost of `virtual`, destructor rules, construction-time behaviour), and how to inspect it. The C++ standard does not mandate vtables; the details below describe the Itanium C++ ABI (GCC, Clang on Linux/macOS) and note MSVC differences. Object layout with inheritance is covered in `object_memory_layout.md`.

## The Mechanism

- Each polymorphic class (one that declares or inherits a virtual function) gets a **vtable**: a static, read-only table of function pointers plus metadata.
- Each object of such a class contains a hidden **vptr** pointing to the vtable of its dynamic type. In common ABIs it sits at offset 0 of the object (or of each polymorphic base subobject).
- A virtual call `p->f()` compiles to: load vptr from `*p`, load the slot for `f` from the vtable, indirect call with `this = p`.

```cpp
struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual const char* name() const { return "shape"; }
};

struct Circle final : Shape {
    explicit Circle(double r) : r_(r) {}
    double area() const override { return 3.141592653589793 * r_ * r_; }
    const char* name() const override { return "circle"; }
private:
    double r_;
};

double total_area(const Shape& s) { return s.area(); }   // virtual call
```

Conceptual layout (Itanium ABI, 64-bit):

```
Circle object                 vtable for Circle
+-------------------+         +------------------------------+
| vptr  ───────────────────►  | offset-to-top (0)             |  (before the address point)
| r_ (double)       |         | typeinfo for Circle           |
+-------------------+         | ► Circle::~Circle (complete)  |  ← vptr points here
                              |   Circle::~Circle (deleting)  |
                              |   Circle::area                |
                              |   Circle::name                |
                              +------------------------------+
```

## Vtable Contents (Itanium ABI)

| Entry | Purpose |
|-------|---------|
| Virtual call offsets / virtual base offsets | Used with virtual inheritance |
| Offset-to-top | Distance from this subobject to the start of the complete object (used by `dynamic_cast<void*>`) |
| RTTI pointer | `std::type_info` for `typeid` and `dynamic_cast` |
| Function pointers | One slot per virtual function, in declaration order, inherited slots first |

Virtual destructors occupy two slots in Itanium: the complete-object destructor and the deleting destructor (which calls `operator delete`). MSVC uses a single scalar deleting destructor with a flag.

## Construction and Destruction

The vptr is updated as each constructor in the hierarchy runs: while `Shape`'s constructor executes, the object's vptr points at `Shape`'s vtable. Therefore:

```cpp
struct Base {
    Base() { init(); }                    // calls Base::init, never Derived::init
    virtual void init() { /* base setup */ }
    virtual ~Base() = default;
};
struct Derived : Base {
    void init() override { /* never called from Base() */ }
};
```

- Virtual calls in constructors and destructors dispatch to the class currently being constructed/destroyed.
- Calling a pure virtual function during construction is undefined behaviour; typical runtimes abort with "pure virtual method called".
- Use two-phase initialization or factory functions if derived-specific setup is needed.

## Virtual Destructor Rule

If a class is meant to be deleted through a base pointer, its destructor must be virtual; otherwise `delete base_ptr` is undefined behaviour and typically skips derived destructors.

```cpp
std::unique_ptr<Shape> s = std::make_unique<Circle>(2.0);   // OK: ~Shape is virtual
```

Rule of thumb: a base class destructor should be either public and virtual, or protected and non-virtual (for bases never deleted polymorphically).

## Cost Model

| Cost | Notes |
|------|-------|
| Per object | One pointer per polymorphic base subobject (8 bytes on 64-bit) |
| Per class | One vtable (plus VTT/construction vtables with virtual inheritance) |
| Per call | Two dependent loads + indirect branch; usually cheap when predicted |
| Lost optimization | Indirect calls usually cannot be inlined unless the compiler devirtualizes |

The bigger cost is often lost inlining and the data layout that polymorphism encourages (arrays of pointers to heap objects), not the indirect branch itself. Measure before replacing virtual functions.

## Devirtualization

Compilers turn virtual calls into direct calls when the dynamic type is provable:

- Class or function marked `final`.
- Object of known type (local variable, not a reference/pointer of unknown origin).
- Whole-program/link-time optimization (`-flto`, `-fwhole-program-vtables` with Clang) proving there are no other overrides.
- Speculative devirtualization with profile data (PGO).

```cpp
double f(const Circle& c) { return c.area(); }   // Circle is final → direct call, inlinable
```

## Alternatives When Dispatch Is Hot

| Technique | Trade-off |
|-----------|-----------|
| CRTP (static polymorphism) | No runtime cost; types fixed at compile time; code bloat |
| `std::variant` + `std::visit` | Closed set of types, value semantics, contiguous storage |
| Type erasure (`std::function`, `std::move_only_function`, custom) | Flexible; similar indirection cost |
| Data-oriented design (arrays per type) | Best cache behaviour; changes architecture |
| C++23 "deducing this" | Simplifies CRTP-like patterns |

```cpp
using AnyShape = std::variant<Circle, Square>;
double area(const AnyShape& s) { return std::visit([](const auto& x) { return x.area(); }, s); }
```

## RTTI and dynamic_cast

- `dynamic_cast` and `typeid` on polymorphic types read the RTTI pointer from the vtable.
- `dynamic_cast` down or across a hierarchy walks type info and can be relatively expensive; frequent use often signals a missing virtual function (Tell, Don't Ask).
- `-fno-rtti` disables `typeid`/`dynamic_cast` for polymorphic types; some libraries require RTTI.

## Inspecting vtables

```bash
# Clang: dump vtable layouts
clang++ -Xclang -fdump-vtable-layouts -c shapes.cpp
# Clang: record layouts (shows vptr placement)
clang++ -Xclang -fdump-record-layouts -c shapes.cpp
# GCC: class hierarchy and vtable dump
g++ -fdump-lang-class -c shapes.cpp            # writes shapes.cpp.*.class
# MSVC
cl /d1reportAllClassLayout shapes.cpp
# Demangled vtable symbols in a binary (Itanium: _ZTV prefix)
nm -C shapes.o | grep vtable
```

## Security Notes

- vptr overwrites (via use-after-free or overflows) are a classic exploitation primitive. Mitigations: Clang CFI (`-fsanitize=cfi-vcall` with LTO), MSVC Control Flow Guard / XFG, hardware CET/BTI, and AddressSanitizer in testing to catch use-after-free.
- Vtables live in read-only memory (RELRO), so attacks target the vptr, not the table.

## Design Takeaways

- Make destructors of polymorphic bases virtual (or protected).
- Mark leaf classes and overrides `final` where extension is not intended; it documents intent and enables devirtualization.
- Do not call virtual functions from constructors/destructors expecting derived behaviour.
- Prefer `override` on every overriding function so signature mismatches become compile errors.
- Choose static polymorphism or variants only after profiling shows dispatch or layout is a bottleneck.

## Checklist

- [ ] Polymorphic bases have virtual or protected destructors
- [ ] `override` on all overrides; `final` where appropriate
- [ ] No virtual calls relied upon during construction/destruction
- [ ] Hot paths profiled before replacing virtual dispatch
- [ ] CFI/sanitizers enabled in hardened or test builds
