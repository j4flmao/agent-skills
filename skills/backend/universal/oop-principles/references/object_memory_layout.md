# C++ Object Memory Layout and Inheritance

How C++ objects are laid out in memory: member ordering, padding and alignment, empty base optimization, and the effects of single, multiple, and virtual inheritance. Useful for reasoning about object size, ABI stability, cache behaviour, and the real cost of inheritance-heavy designs. Virtual dispatch internals are in `cpp_vtables_theory.md`. Layouts below follow the Itanium C++ ABI on 64-bit platforms unless noted; the standard leaves many details implementation-defined.

## Members, Alignment, and Padding

Non-static data members with the same access control are laid out in declaration order; each member is placed at an offset that is a multiple of its alignment, and the object size is rounded up to the largest member alignment.

```cpp
struct Bad {          // sizeof == 24
    char  a;          // offset 0, then 7 bytes padding
    double b;         // offset 8
    char  c;          // offset 16, then 7 bytes tail padding
};

struct Good {         // sizeof == 16
    double b;         // offset 0
    char  a;          // offset 8
    char  c;          // offset 9, then 6 bytes tail padding
};

static_assert(sizeof(Bad) == 24 && sizeof(Good) == 16);
static_assert(alignof(Good) == alignof(double));
```

- Order members from largest to smallest alignment to reduce padding.
- `offsetof` is only guaranteed for standard-layout types.
- `alignas(64)` places hot, independently written data on separate cache lines to avoid false sharing; C++17 provides `std::hardware_destructive_interference_size` as a hint.

## Standard-Layout and Trivially Copyable Types

| Property | Means | Why it matters |
|----------|-------|---------------|
| Standard-layout | C-compatible layout rules (no virtuals, same access control for members, restricted base classes) | Interop with C, `offsetof`, pointer-interconvertibility with first member |
| Trivially copyable | Copy/move/destructor are trivial | Safe `memcpy`, binary serialization within one ABI |
| Implicit-lifetime / aggregate | Rules for creating objects in raw storage | Placement and buffer reuse |

```cpp
static_assert(std::is_standard_layout_v<Good>);
static_assert(std::is_trivially_copyable_v<Good>);
```

Adding a virtual function makes a class non-standard-layout and adds a vptr.

## Single Inheritance

The base subobject is placed first, followed by derived members. A pointer to `Derived` and its `Base` subobject usually have the same address.

```cpp
struct Base    { int id; };                 // offset 0..3
struct Derived : Base { double value; };    // Base at 0, padding 4..7, value at 8 → sizeof 16
```

With virtual functions, a single vptr at offset 0 is shared by base and derived (the derived vtable extends the base's).

Tail-padding reuse: the Itanium ABI may place derived members in a base's tail padding when the base is not POD for layout purposes, so `sizeof(Derived)` can be smaller than expected; MSVC generally does not reuse tail padding.

## Empty Base Optimization (EBO)

An empty class has `sizeof` ≥ 1, but as a base it can occupy zero bytes:

```cpp
struct Empty {};
struct WithMember { Empty e; int x; };     // sizeof 8 (e takes 1 byte + padding)
struct WithBase : Empty { int x; };        // sizeof 4 (EBO)

struct Compressed {
    [[no_unique_address]] Empty alloc;     // C++20: member may take zero space
    int x;                                 // sizeof 4 on GCC/Clang
};
```

MSVC ignores `[[no_unique_address]]` for ABI reasons and provides `[[msvc::no_unique_address]]` instead. Standard library containers rely on EBO to store stateless allocators and comparators for free.

## Multiple Inheritance

Each base gets its own subobject; non-first polymorphic bases carry their own vptr.

```cpp
struct A { virtual void fa(); int a; };
struct B { virtual void fb(); int b; };
struct C : A, B { void fb() override; int c; };
```

Conceptual layout of `C` (64-bit Itanium):

```
offset 0   vptr (C-in-A vtable)        ← A subobject and C start here
offset 8   int a
offset 16  vptr (C-in-B vtable)        ← B subobject
offset 24  int b
offset 28  int c
sizeof(C) == 32
```

Consequences:

- Converting `C*` to `B*` adds 16 to the pointer (`static_cast` adjusts automatically; `reinterpret_cast` does not and is wrong here).
- Calling `fb` through a `B*` that actually points into a `C` requires adjusting `this` back to the start of `C`. Compilers emit a **thunk** in the B-in-C vtable that subtracts the offset and jumps to `C::fb`.
- Comparing pointers to different base subobjects of the same object compares adjusted addresses; `dynamic_cast<void*>(p)` returns the address of the most derived object.

## Virtual Inheritance (Diamond)

```cpp
struct Base   { int x; virtual ~Base() = default; };
struct Left   : virtual Base { int l; };
struct Right  : virtual Base { int r; };
struct Bottom : Left, Right { int b; };
```

- Only one `Base` subobject exists in `Bottom`, shared by `Left` and `Right`.
- Its position is not fixed relative to `Left` or `Right`; it depends on the most derived type. Accessing `Base` members through a `Left*` requires reading a **virtual base offset** from the vtable (Itanium) or a **virtual base table pointer** (vbptr, MSVC).
- The most derived class constructs the virtual base directly; intermediate classes' initializers for `Base` are ignored when they are not the most derived type.
- Construction uses VTTs (virtual table tables) and construction vtables in Itanium so that partially built objects dispatch correctly.

Costs: larger objects, extra indirection on virtual base access, more complex construction. Use virtual inheritance only for genuine diamond interfaces (e.g. iostreams), not as a default.

## Inspecting Layouts

```bash
clang++ -Xclang -fdump-record-layouts -fsyntax-only layout.cpp   # offsets, sizes, vptrs, EBO
g++ -fdump-lang-class -c layout.cpp                               # writes *.class dump
cl /d1reportSingleClassLayoutBottom layout.cpp                    # MSVC, one class
pahole ./binary                                                   # holes/padding from DWARF
```

```cpp
static_assert(sizeof(Derived) == 16, "layout changed: check ABI consumers");
static_assert(offsetof(Good, a) == 8);
```

`static_assert` on size/offset protects binary formats and shared-memory structures from accidental changes.

## ABI Stability Implications

- Adding, removing, or reordering data members or virtual functions changes layout and vtable slots, breaking binary compatibility for libraries shipped as binaries.
- The pImpl idiom (pointer to implementation) keeps class layout stable across library versions at the cost of an allocation and indirection.
- Never serialize non-trivially-copyable objects with `memcpy` or `reinterpret_cast`; define explicit wire formats.

## Performance Implications

| Design | Memory/cache effect |
|--------|---------------------|
| `std::vector<std::unique_ptr<Base>>` | Pointer chasing, scattered heap objects, vptr per object |
| `std::vector<Concrete>` | Contiguous, prefetch-friendly |
| Structure of arrays | Only hot fields loaded per pass |
| Deep hierarchies with many members in bases | Larger objects, more padding, hot/cold data mixed |

Composition over inheritance often produces both cleaner designs and better layouts.

## Checklist

- [ ] Members ordered to minimize padding where size matters
- [ ] `static_assert` on size/offsets of ABI-sensitive or serialized types
- [ ] Empty policy members use EBO or `[[no_unique_address]]` (MSVC-specific attribute when needed)
- [ ] `static_cast`/`dynamic_cast` (never `reinterpret_cast`) between bases with multiple inheritance
- [ ] Virtual inheritance only for true diamonds
- [ ] Layout inspected with compiler dumps or `pahole` for hot structures
