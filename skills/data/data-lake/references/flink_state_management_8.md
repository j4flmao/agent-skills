
# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```


# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```

# Flink State Management Deep Dive

## Architecture Overview

+-------------------+       +-------------------+
|   JobManager      |       |   TaskManager     |
|                   |       |                   |
| +---------------+ |       | +---------------+ |
| | Checkpoint    | |<------| | State Backend | |
| | Coordinator   | |       | | (RocksDB)     | |
| +---------------+ |       | +---------------+ |
+-------------------+       +-------------------+


## Algorithms and Formulations
- Chandy-Lamport algorithm for distributed snapshots.
- RocksDB SSTable compaction strategies.
- State serialization and deserialization.

## Code Examples
```java
ValueStateDescriptor<Tuple2<Long, Long>> descriptor =
    new ValueStateDescriptor<>(
        "average", // the state name
        TypeInformation.of(new TypeHint<Tuple2<Long, Long>>() {}), // type information
        Tuple2.of(0L, 0L)); // default value of the state, if nothing was set
```
