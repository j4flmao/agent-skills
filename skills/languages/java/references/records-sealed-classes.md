# Java Records and Sealed Classes

## Overview
Java 14+ introduced records for transparent data carriers and Java 15+ added sealed classes for restricted inheritance. Together they enable concise domain modeling with strong type safety guarantees.

## Records

### Basic Record
```java
public record Point(int x, int y) {}

// Usage
Point p = new Point(3, 4);
int x = p.x();  // Accessor method
int y = p.y();
System.out.println(p); // Point[x=3, y=4]
System.out.println(p.equals(new Point(3, 4))); // true
System.out.println(p.hashCode()); // Consistent hash code
```

### Record with Validation
```java
public record Email(String address) {
    public Email {
        if (address == null || address.isBlank()) {
            throw new IllegalArgumentException("Email cannot be blank");
        }
        if (!address.contains("@")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        address = address.toLowerCase().trim();
    }

    public String domain() {
        return address.substring(address.indexOf("@") + 1);
    }

    public boolean isCorporate() {
        return domain().equals("company.com");
    }
}
```

### Record with Static Members
```java
public record OrderLine(Product product, int quantity, Money price) {
    private static final int MAX_QUANTITY = 1000;

    public OrderLine {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        if (quantity > MAX_QUANTITY) {
            throw new IllegalArgumentException("Quantity exceeds maximum");
        }
    }

    public Money total() {
        return price.multiply(quantity);
    }

    public static OrderLine empty() {
        return new OrderLine(Product.EMPTY, 0, Money.ZERO);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Product product;
        private int quantity;
        private Money price;

        public Builder product(Product product) {
            this.product = product;
            return this;
        }

        public Builder quantity(int quantity) {
            this.quantity = quantity;
            return this;
        }

        public Builder price(Money price) {
            this.price = price;
            return this;
        }

        public OrderLine build() {
            return new OrderLine(product, quantity, price);
        }
    }
}
```

### Records in Collections
```java
public record User(Long id, String name, String email) {}

// Usage with streams
List<User> activeUsers = users.stream()
    .filter(user -> user.email().endsWith("@company.com"))
    .sorted(Comparator.comparing(User::name))
    .collect(Collectors.toList());

// Pattern matching with records
String displayName = switch (user) {
    case User(var id, var name, var email) when email != null -> name + " (" + email + ")";
    case User(var id, var name, var email) -> name;
};

// Records as DTOs
public record CreateUserRequest(String name, String email, String password) {}

public record UserResponse(Long id, String name, String email, Instant createdAt) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getCreatedAt()
        );
    }
}
```

## Sealed Classes

### Sealed Interface
```java
public sealed interface Shape
    permits Circle, Rectangle, Triangle {}

public final class Circle implements Shape {
    private final double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    public double area() {
        return Math.PI * radius * radius;
    }
}

public final class Rectangle implements Shape {
    private final double width;
    private final double height;

    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }

    public double area() {
        return width * height;
    }
}
```

### Sealed Abstract Class
```java
public sealed abstract class PaymentMethod
    permits CreditCard, PayPal, BankTransfer {

    public abstract String getDisplayName();

    public abstract boolean isValid();
}

public final class CreditCard extends PaymentMethod {
    private final String cardNumber;
    private final String expiryDate;
    private final String cvv;

    public CreditCard(String cardNumber, String expiryDate, String cvv) {
        this.cardNumber = cardNumber;
        this.expiryDate = expiryDate;
        this.cvv = cvv;
    }

    @Override
    public String getDisplayName() {
        return "Credit Card ending in " +
            cardNumber.substring(cardNumber.length() - 4);
    }

    @Override
    public boolean isValid() {
        return cardNumber.length() == 16 && cvv.length() == 3;
    }
}
```

### Pattern Matching with Sealed Classes
```java
public sealed interface Expression
    permits Constant, Add, Multiply, Negate {}

public record Constant(int value) implements Expression {}

public record Add(Expression left, Expression right) implements Expression {}

public record Multiply(Expression left, Expression right) implements Expression {}

public record Negate(Expression expr) implements Expression {}

// Exhaustive pattern matching - compiler checks all cases
public int evaluate(Expression expr) {
    return switch (expr) {
        case Constant(var value) -> value;
        case Add(var left, var right) -> evaluate(left) + evaluate(right);
        case Multiply(var left, var right) -> evaluate(left) * evaluate(right);
        case Negate(var inner) -> -evaluate(inner);
    };
}
```

### Non-Sealed Subclasses
```java
public sealed class Vehicle permits Car, Truck, Motorcycle {}

public non-sealed class Car extends Vehicle {
    // Can be extended further
}

public final class Truck extends Vehicle {
    // Cannot be extended
}

public final class Motorcycle extends Vehicle {}

// Car can have subclasses
public class Sedan extends Car {}
public class SUV extends Car {}
```

## Combining Records and Sealed Classes

### Algebraic Data Types
```java
public sealed interface Result<T>
    permits Success, Failure, Loading {}

public record Success<T>(T data) implements Result<T> {}

public record Failure<T>(String error, int code) implements Result<T> {}

public record Loading<T>() implements Result<T> {}

// Usage
public <T> void handleResult(Result<T> result) {
    switch (result) {
        case Success(var data) -> processData(data);
        case Failure(var error, var code) -> handleError(error, code);
        case Loading() -> showSpinner();
    }
}
```

## Key Points
- Records are transparent data carriers with auto-generated equals, hashCode, toString
- Compact constructors provide validation without field assignment
- Records can have instance methods and static members
- Sealed classes/interfaces restrict which types can extend/implement them
- Permits clause lists all allowed subclasses
- Subclasses must be final, sealed, or non-sealed
- Pattern matching with sealed classes is exhaustive - compiler verifies coverage
- Records and sealed classes together model algebraic data types
- Records work naturally with streams, optionals, and pattern matching
- Sealed hierarchies enable safe domain modeling
- Compact constructors can transform parameters during construction
- Records cannot extend other classes (implicitly extend java.lang.Record)
- Sealed classes provide better documentation of type hierarchies
- Switch expressions with pattern matching handle all cases
- Non-sealed allows further extension of a sealed hierarchy branch
- Records can implement interfaces
- Sealed classes can be used in public APIs to control extension points
- Pattern matching instanceof works seamlessly with records
- Record patterns enable deep destructuring in switch and instanceof
- Both features improve code readability and maintainability
