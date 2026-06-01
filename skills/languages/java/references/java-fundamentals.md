# Java Fundamentals

## What is Java?

Java is a statically-typed, object-oriented, compiled language that runs on the Java Virtual Machine (JVM). Its "write once, run anywhere" philosophy means compiled bytecode runs on any platform with a JVM. Modern Java (17+) has evolved significantly with records, sealed classes, pattern matching, and virtual threads.

## Build Tools

### Maven
```xml
<!-- pom.xml — convention over configuration -->
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0</version>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.0</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

### Gradle
```kotlin
// build.gradle.kts — flexible, performant
plugins {
    java
    application
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
}

application {
    mainClass = "com.example.Main"
}
```

## Project Structure

```
src/
├── main/
│   ├── java/com/example/
│   │   ├── Main.java              # Entry point
│   │   ├── model/                 # Domain models
│   │   ├── repository/            # Data access
│   │   ├── service/               # Business logic
│   │   └── web/                   # Controllers
│   └── resources/
│       ├── application.properties # Config
│       └── logback.xml            # Logging
└── test/
    └── java/com/example/
        ├── service/               # Unit tests
        └── repository/            # Integration tests
```

## Core Language Features

### Classes & Objects
```java
public class User {
    private Long id;
    private String name;
    private String email;

    public User(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
```

### Records (Java 16+)
```java
// Immutable, transparent data carriers
public record Product(Long id, String name, BigDecimal price) {
    // Compact constructor for validation
    public Product {
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Price must be positive");
        }
    }
}
```

### Interfaces
```java
public interface UserRepository {
    Optional<User> findById(Long id);
    User save(User user);
    void deleteById(Long id);
}

public class JdbcUserRepository implements UserRepository {
    @Override
    public Optional<User> findById(Long id) {
        // JDBC implementation
    }
}
```

### Pattern Matching (Java 21+)
```java
// Switch expression with pattern matching
public String processPayment(Payment payment) {
    return switch (payment) {
        case CreditCard c -> "Card: " + c.lastFour();
        case PayPal p -> "PayPal: " + p.email();
        case CryptoPayment cp -> "Crypto: " + cp.currency();
        case null -> "No payment method";
    };
}
```

### Sealed Classes
```java
// Exhaustive hierarchy — all subtypes known at compile time
public sealed interface Shape permits Circle, Rectangle, Triangle { }

public record Circle(double radius) implements Shape { }
public record Rectangle(double width, double height) implements Shape { }
public record Triangle(double base, double height) implements Shape { }
```

## Modern Java Features by Version

| Version | Features | Status |
|---------|----------|--------|
| 8 | Lambdas, Streams, Optional | Widespread — end of free support |
| 11 | HTTP Client, Local-Variable Syntax for Lambda | LTS — transitioning off |
| 14 | Switch expressions (standard) | Modern |
| 16 | Records | Modern |
| 17 | Sealed classes, Pattern matching for switch | Current LTS |
| 21 | Virtual threads, Record patterns, Pattern matching for switch | Current LTS (recommended) |
| 22+ | String templates (preview), Scoped values | Preview |

## Exception Handling

### Checked vs Unchecked
```java
// Checked — must be caught or declared
public void readFile(String path) throws IOException {
    Files.readString(Path.of(path));
}

// Unchecked — RuntimeException, may be caught optionally
public User findUser(Long id) {
    return repository.findById(id)
        .orElseThrow(() -> new UserNotFoundException(id));
}
```

### Try-with-Resources
```java
// Auto-closes Closeable resources
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(sql);
     ResultSet rs = stmt.executeQuery()) {
    while (rs.next()) {
        // Process results
    }
}
```

## Collections

```java
List<String> items = List.of("a", "b", "c");  // Immutable list
var list = new ArrayList<String>();            // Mutable
list.add("d");

Set<Integer> numbers = Set.of(1, 2, 3);
Map<String, Integer> scores = Map.of("Alice", 95, "Bob", 87);

// Stream operations
List<String> filtered = items.stream()
    .filter(s -> s.startsWith("a"))
    .map(String::toUpperCase)
    .sorted()
    .toList();
```

## Common Annotations

```java
@Override                           // Override superclass method
@Deprecated                         // Mark as deprecated
@SuppressWarnings("unchecked")      // Suppress compiler warnings
@FunctionalInterface                // Single abstract method
@Test                               // JUnit test
@SpringBootApplication              // Spring Boot entry
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `javac Main.java` | Compile |
| `java Main` | Run |
| `java -jar app.jar` | Run JAR |
| `./mvnw clean install` | Maven build |
| `./mvnw test` | Run tests |
| `./gradlew build` | Gradle build |
| `./gradlew test` | Run tests |
| `jcmd <pid> VM.version` | JVM diagnostics |
| `jstack <pid>` | Thread dump |
| `jmap -dump:live,format=b,file=heap.hprof <pid>` | Heap dump |
