# Java Streams and Optional

## Overview
Streams process sequences of data with functional-style operations. Optional represents nullable values with type safety. Together they enable declarative data processing pipelines with robust null handling.

## Stream Creation

### Creating Streams
```java
// From collections
List<String> list = List.of("a", "b", "c");
Stream<String> stream = list.stream();
Stream<String> parallelStream = list.parallelStream();

// From arrays
String[] array = {"a", "b", "c"};
Stream<String> arrayStream = Arrays.stream(array);
Stream<String> fullStream = Arrays.stream(array, 0, 2);

// From values
Stream<String> of = Stream.of("a", "b", "c");
Stream<Integer> range = Stream.iterate(0, n -> n + 1).limit(100);
Stream<Double> random = Stream.generate(Math::random).limit(5);

// From files
try (Stream<String> lines = Files.lines(Paths.get("data.txt"))) {
    lines.forEach(System.out::println);
}

// Builder pattern
Stream<String> built = Stream.<String>builder()
    .add("a")
    .add("b")
    .add("c")
    .build();
```

## Intermediate Operations

### Filtering and Mapping
```java
// Filter
List<String> filtered = items.stream()
    .filter(s -> s.startsWith("A"))
    .filter(s -> s.length() > 3)
    .collect(Collectors.toList());

// Map
List<Integer> lengths = items.stream()
    .map(String::length)
    .collect(Collectors.toList());

// FlatMap
List<String> words = sentences.stream()
    .flatMap(sentence -> Arrays.stream(sentence.split(" ")))
    .map(String::toLowerCase)
    .collect(Collectors.toList());

// Distinct
List<String> unique = items.stream()
    .distinct()
    .collect(Collectors.toList());

// Sorted
List<String> sorted = items.stream()
    .sorted()
    .collect(Collectors.toList());

List<String> customSorted = items.stream()
    .sorted(Comparator.comparingInt(String::length))
    .collect(Collectors.toList());

// Peek (for debugging)
List<String> debugged = items.stream()
    .peek(s -> System.out.println("Processing: " + s))
    .map(String::toUpperCase)
    .collect(Collectors.toList());

// Limit and Skip
List<String> page = items.stream()
    .skip(20)
    .limit(10)
    .collect(Collectors.toList());
```

## Terminal Operations

### Reduction Operations
```java
// forEach
items.stream().forEach(System.out::println);
items.stream().forEachOrdered(System.out::println);

// Collect
List<String> list = stream.collect(Collectors.toList());
Set<String> set = stream.collect(Collectors.toSet());
Map<Integer, String> map = stream.collect(
    Collectors.toMap(String::length, Function.identity(), (a, b) -> a)
);

// Grouping
Map<Integer, List<String>> grouped = items.stream()
    .collect(Collectors.groupingBy(String::length));

Map<Boolean, List<String>> partitioned = items.stream()
    .collect(Collectors.partitioningBy(s -> s.length() > 5));

// Joining
String joined = items.stream()
    .collect(Collectors.joining(", ", "[", "]"));

// Reducing
Optional<Integer> sum = numbers.stream().reduce(Integer::sum);
Integer product = numbers.stream().reduce(1, (a, b) -> a * b);

// Min/Max
Optional<String> min = items.stream().min(String::compareTo);
Optional<String> max = items.stream().max(Comparator.naturalOrder());

// Count
long count = items.stream().filter(s -> s.startsWith("A")).count();

// anyMatch/allMatch/noneMatch
boolean hasA = items.stream().anyMatch(s -> s.startsWith("A"));
boolean allLong = items.stream().allMatch(s -> s.length() > 3);
boolean noneEmpty = items.stream().noneMatch(String::isEmpty);

// findFirst/findAny
Optional<String> first = items.stream().filter(s -> s.startsWith("B")).findFirst();
Optional<String> any = items.parallelStream().filter(s -> s.startsWith("B")).findAny();
```

## Optional

### Creating Optionals
```java
// Empty
Optional<String> empty = Optional.empty();

// Of (throws on null)
Optional<String> of = Optional.of("value");

// OfNullable (accepts null)
Optional<String> nullable = Optional.ofNullable(getValue());

// From other operations
Optional<String> result = stream.findFirst();
Optional<String> parsed = Optional.ofNullable(System.getProperty("key"));
```

### Using Optionals
```java
// Checking and retrieving
if (optional.isPresent()) {
    String value = optional.get();
}

// Java 9+
if (optional.isEmpty()) {
    System.out.println("No value present");
}

// OrElse variants
String result = optional.orElse("default");
String result = optional.orElseGet(() -> computeDefault());
String result = optional.orElseThrow();
String result = optional.orElseThrow(() -> new IllegalStateException("Missing value"));

// IfPresent
optional.ifPresent(value -> System.out.println(value));
optional.ifPresentOrElse(
    value -> System.out.println(value),
    () -> System.out.println("No value")
);

// Transformation
Optional<Integer> length = optional.map(String::length);
Optional<String> filtered = optional.filter(s -> s.length() > 5);
Optional<String> upper = optional.flatMap(s -> Optional.of(s.toUpperCase()));

// Stream integration
Stream<String> stream = optional.stream();
```

### Optional Patterns
```java
// Chained optionals
public Optional<String> findUserEmail(Long userId) {
    return findUser(userId)
        .flatMap(this::getProfile)
        .flatMap(Profile::getEmail);
}

// Collection mapping
public List<String> getNonNullNames(List<User> users) {
    return users.stream()
        .map(User::getName)
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
}

// Optional in streams
List<String> emails = users.stream()
    .map(user -> findEmail(user.getId()))
    .filter(Optional::isPresent)
    .map(Optional::get)
    .collect(Collectors.toList());

// Java 9+ stream flatMap
List<String> emails = users.stream()
    .map(user -> findEmail(user.getId()))
    .flatMap(Optional::stream)
    .collect(Collectors.toList());
```

## Advanced Stream Patterns

### Custom Collector
```java
public static <T> Collector<T, ?, List<T>> toImmutableList() {
    return Collector.of(
        ArrayList::new,           // Supplier
        List::add,                // Accumulator
        (left, right) -> {        // Combiner
            left.addAll(right);
            return left;
        },
        Collections::unmodifiableList, // Finisher
        Collector.Characteristics.CONCURRENT
    );
}
```

### Parallel Streams
```java
// Parallel processing
long sum = numbers.parallelStream()
    .mapToLong(Long::valueOf)
    .sum();

// Custom fork-join pool
ForkJoinPool customPool = new ForkJoinPool(4);
try {
    long result = customPool.submit(
        () -> items.parallelStream()
            .mapToLong(this::heavyComputation)
            .sum()
    ).get();
} finally {
    customPool.shutdown();
}
```

## Key Points
- Streams support sequential and parallel execution
- Intermediate operations are lazy and return new streams
- Terminal operations trigger computation and consume the stream
- Optional prevents NullPointerException with type-safe null handling
- Collectors provide common reduction operations
- flatMap flattens nested streams into a single stream
- Parallel streams use the common fork-join pool
- Streams should not be reused after terminal operation
- Optional is not Serializable and should not be used as field type
- Prefer orElseGet over orElse for expensive defaults
- Optional in method parameters is considered an anti-pattern
- Stream pipelines express data transformations declaratively
- GroupingBy and partitioningBy create multi-level maps
- Custom collectors encapsulate complex reduction logic
- findFirst vs findAny: findAny performs better in parallel
- Method references (String::length) improve readability
- Primitive streams (IntStream, LongStream, DoubleStream) avoid boxing
- takeWhile and dropWhile (Java 9+) enable conditional operations
- Optional.stream() bridges Optional and Stream APIs
- Stream.concat combines two streams lazily
