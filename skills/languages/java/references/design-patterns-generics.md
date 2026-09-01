# Design Patterns with Generics in Java

## 1. The Generic Repository Pattern (Data Access)
In Domain-Driven Design (DDD), a Repository abstracts database operations. Without generics, you would write `UserRepository`, `ProductRepository`, etc., duplicating CRUD logic.

With Java Generics, we can create a `BaseRepository`. However, due to **Type Erasure** (Java forgets the generic type `T` at runtime), we cannot instantiate `T` (e.g., `new T()`) or easily map database rows to `T` using reflection without a workaround.

### The Workaround: Passing `Class<T>`
```java
public abstract class BaseRepository<T extends BaseEntity, ID extends Serializable> {
    private final Class<T> persistentClass;
    private final EntityManager entityManager;

    @SuppressWarnings("unchecked")
    public BaseRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
        // Hack to extract the generic type at runtime via reflection on the subclass
        this.persistentClass = (Class<T>) ((ParameterizedType) getClass()
                                .getGenericSuperclass()).getActualTypeArguments()[0];
    }

    public Optional<T> findById(ID id) {
        return Optional.ofNullable(entityManager.find(persistentClass, id));
    }

    public T save(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}

// Usage: The subclass locks in the generic types
public class UserRepository extends BaseRepository<User, UUID> {
    public UserRepository(EntityManager em) { super(em); }
    
    // Can add specific methods here
    public List<User> findByEmail(String email) { ... }
}
```

## 2. The Generic Builder Pattern
The Builder pattern is notoriously difficult to implement with class hierarchies (e.g., a `VehicleBuilder` and a `CarBuilder` that extends it) because method chaining (`return this`) in the parent class returns the parent type, breaking the chain.

### The Curiously Recurring Template Pattern (CRTP) in Java
By making the builder generic over its own type, we can force `return this` to return the subclass type.

```java
// B is the exact type of the Builder
public abstract class VehicleBuilder<T extends Vehicle, B extends VehicleBuilder<T, B>> {
    protected String engine;

    // The subclass must return 'this' casted to its own type
    protected abstract B self();

    public B withEngine(String engine) {
        this.engine = engine;
        return self();
    }
    
    public abstract T build();
}

public class CarBuilder extends VehicleBuilder<Car, CarBuilder> {
    private int doors;

    @Override
    protected CarBuilder self() {
        return this;
    }

    public CarBuilder withDoors(int doors) {
        this.doors = doors;
        return self();
    }

    @Override
    public Car build() {
        return new Car(this.engine, this.doors);
    }
}

// Usage: The chain doesn't break!
Car myCar = new CarBuilder()
    .withEngine("V8") // Returns CarBuilder, not VehicleBuilder
    .withDoors(4)
    .build();
```
