# Database Integration Testing

## TestContainers for Databases

### Supported Databases

| Database | TestContainers Module | Image |
|----------|----------------------|-------|
| PostgreSQL | postgresql | postgres:16 |
| MySQL | mysql | mysql:8.0 |
| MariaDB | mariadb | mariadb:10 |
| MongoDB | mongodb | mongo:6 |
| Oracle | oracle-xe | gvenzl/oracle-xe |
| SQL Server | mssqlserver | mcr.microsoft.com/mssql/server |
| ClickHouse | clickhouse | clickhouse/clickhouse-server |
| DynamoDB | localstack | localstack/localstack |

### Basic Setup (Java/Spring Boot)

```java
@SpringBootTest
@Testcontainers
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldSaveAndFindUser() {
        User user = new User("alice@example.com", "Alice");
        userRepository.save(user);

        Optional<User> found = userRepository.findByEmail("alice@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Alice");
    }
}
```

### Python Setup

```python
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16") as postgres:
        yield postgres

@pytest.fixture
def db_connection(postgres_container):
    connection = psycopg2.connect(
        host=postgres_container.get_container_host_ip(),
        port=postgres_container.get_exposed_port(5432),
        user=postgres_container.USER,
        password=postgres_container.PASSWORD,
        dbname=postgres_container.DBNAME,
    )
    yield connection
    connection.close()

def test_user_repository(db_connection):
    cursor = db_connection.cursor()
    cursor.execute("INSERT INTO users (email, name) VALUES (%s, %s)",
                   ("alice@example.com", "Alice"))
    db_connection.commit()

    cursor.execute("SELECT name FROM users WHERE email = %s",
                   ("alice@example.com",))
    result = cursor.fetchone()
    assert result[0] == "Alice"
```

## Repository Testing Patterns

### Standard Repository Test

```java
@DataJpaTest
@Testcontainers
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldFindActiveUsers() {
        userRepository.save(new User("alice@example.com", "Alice", Status.ACTIVE));
        userRepository.save(new User("bob@example.com", "Bob", Status.INACTIVE));

        List<User> activeUsers = userRepository.findByStatus(Status.ACTIVE);

        assertThat(activeUsers).hasSize(1);
        assertThat(activeUsers.get(0).getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void shouldEnforceUniqueEmail() {
        userRepository.save(new User("alice@example.com", "Alice", Status.ACTIVE));

        assertThrows(DataIntegrityViolationException.class, () -> {
            userRepository.save(new User("alice@example.com", "Alice2", Status.ACTIVE));
        });
    }
}
```

### Data Cleanup Strategies

| Strategy | Implementation | Pros | Cons |
|----------|---------------|------|------|
| **Transaction rollback** | @Transactional on test | Fast, automatic | Can't test commit behavior |
| **Truncate between tests** | @Sql(statements = "TRUNCATE TABLE users") | Clean state, commit-safe | Slow with many tables |
| **Delete by test key** | WHERE test_run_id = :runId | Fast, parallel-friendly | Must add test metadata to schema |
| **Container per test class** | @Container static | Complete isolation | Slow (container startup) |

### Transactional Rollback Example
```java
@DataJpaTest  // Automatically rolls back each test
class UserRepositoryTest {
    // All tests run within a transaction that rolls back after each test
    // No cleanup code needed
}
```

## Migration Testing

### Flyway Migration Test

```java
@Testcontainers
class FlywayMigrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Test
    void shouldApplyAllMigrations() {
        Flyway flyway = Flyway.configure()
            .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
            .load();

        MigrateResult result = flyway.migrate();

        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isGreaterThan(0);
    }

    @Test
    void shouldSupportRollback() {
        Flyway flyway = Flyway.configure()
            .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
            .load();

        flyway.migrate();
        UndoResult result = flyway.undo();

        assertThat(result.success).isTrue();
    }
}
```

### Migration Version Testing

```java
@SpringBootTest
@Testcontainers
class SchemaCompatibilityTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Test
    void shouldMigrateFromV1ToLatest() {
        // Start with V1 schema
        Flyway flyway = Flyway.configure()
            .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
            .target(MigrationVersion.fromVersion("1"))
            .load();
        flyway.migrate();

        // Verify V1 schema
        verifyV1Schema();

        // Migrate to latest
        flyway = Flyway.configure()
            .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
            .load();

        MigrateResult result = flyway.migrate();
        assertThat(result.migrationsExecuted).isGreaterThan(0);

        // Verify final schema
        verifyLatestSchema();
    }

    private void verifyV1Schema() {
        // Assert that only V1 tables exist
    }

    private void verifyLatestSchema() {
        // Assert that all expected tables exist with correct columns
    }
}
```

## Transaction Testing

### Isolation Level Tests

```java
@SpringBootTest
@Testcontainers
class TransactionIsolationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void shouldPreventDirtyReadsWithReadCommitted() {
        TransactionTemplate tx1 = new TransactionTemplate(transactionManager);
        tx1.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);

        TransactionTemplate tx2 = new TransactionTemplate(transactionManager);
        tx2.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);

        // TX1: update product but don't commit
        tx1.executeWithoutResult(status -> {
            productRepository.updatePrice(1L, 100.00);
            // TX2 should NOT see the uncommitted change
        });
    }
}
```

### Transaction Rollback Test

```java
@Test
void shouldRollbackOnException() {
    User user = new User("alice@example.com", "Alice");
    userRepository.save(user);

    assertThrows(RuntimeException.class, () -> {
        userService.createUserWithOrder(user, invalidOrder);
    });

    // Verify user was also rolled back
    assertThat(userRepository.findByEmail("alice@example.com")).isEmpty();
}
```

## Performance Tests

### Query Performance Baseline

```java
@Test
void userLookupShouldCompleteUnder100ms() {
    // Set up test data
    for (int i = 0; i < 1000; i++) {
        userRepository.save(new User("user" + i + "@test.com", "User " + i));
    }

    long start = System.nanoTime();
    for (int i = 0; i < 100; i++) {
        userRepository.findByEmail("user" + i + "@test.com");
    }
    long duration = (System.nanoTime() - start) / 1_000_000;

    assertThat(duration).isLessThan(100); // 100 lookups in < 100ms
}
```

## References
- TestContainers Documentation — https://testcontainers.com/
- Spring Testing — https://docs.spring.io/spring-framework/docs/current/reference/html/testing.html
- Flyway Documentation — https://flywaydb.org/documentation/
- Database Testing Best Practices — Martin Fowler
- Integration Tests Are A Scam — J.B. Rainsberger
