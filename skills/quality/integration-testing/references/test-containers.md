# TestContainers Patterns

## Supported Containers
| Container | Module | Use Case |
|-----------|--------|----------|
| PostgreSQL | postgresql | Relational database testing |
| MySQL | mysql | MySQL-specific features |
| MongoDB | mongodb | Document database testing |
| Kafka | kafka | Event streaming testing |
| Redis | redis | Caching testing |
| Elasticsearch | elasticsearch | Search testing |
| LocalStack | localstack | AWS service emulation |

## Spring Boot Example
`java
@SpringBootTest
@Testcontainers
class UserRepositoryTest {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
`

## Best Practices
- Use reusable containers for test suites
- Set container reuse strategy
- Configure proper timeouts
- Clean up data between test classes
- Don't test the container — test your code against it
