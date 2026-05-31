# Spring Boot Auto-Configuration Reference

## Overview

Comprehensive reference for Spring Boot auto-configuration: how it works, creating custom auto-configuration, overriding defaults, conditional annotations, and testing.

## Table of Contents

1. Auto-Configuration Fundamentals
2. @Conditional Annotations
3. Creating Custom Auto-Configuration
4. Configuration Properties
5. Auto-Configuration Ordering
6. Overriding Auto-Configuration
7. Testing Auto-Configuration
8. Common Auto-Configurations
9. Performance Considerations
10. Best Practices

---

## 1. Auto-Configuration Fundamentals

### How Auto-Configuration Works

```java
// Spring Boot auto-configuration is triggered by:
// 1. Classpath dependencies (e.g., H2 on classpath -> DataSourceAutoConfiguration)
// 2. Property configuration (e.g., spring.datasource.*)
// 3. Existing beans (e.g., no DataSource bean -> configure one)
// 4. Conditional annotations

@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }
}
```

### Auto-Configuration Registration

```java
// META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
// (Spring Boot 3.x+)
com.example.autoconfigure.OrderServiceAutoConfiguration
com.example.autoconfigure.PaymentGatewayAutoConfiguration

// Legacy (Spring Boot 2.x)
// META-INF/spring.factories
// org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
// com.example.autoconfigure.OrderServiceAutoConfiguration
```

### @SpringBootApplication Composition

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = {
    @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
    @Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class)
})
public @interface SpringBootApplication {
    @AliasFor(annotation = EnableAutoConfiguration.class)
    Class<?>[] exclude() default {};

    @AliasFor(annotation = ComponentScan.class)
    String[] basePackages() default {};
}
```

### How @EnableAutoConfiguration Works

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@AutoConfigurationPackage
@Import(AutoConfigurationImportSelector.class)
public @interface EnableAutoConfiguration {
    String ENABLED_OVERRIDE_PROPERTY = "spring.boot.enableautoconfiguration";
    Class<?>[] exclude() default {};
    String[] excludeName() default {};
}

// AutoConfigurationImportSelector reads
// META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
// and applies all conditional annotations
```

---

## 2. @Conditional Annotations

### Class Conditions

```java
@Configuration
@ConditionalOnClass(name = "org.springframework.kafka.core.KafkaTemplate")
public class KafkaAutoConfiguration {
    // Only active when Kafka is on the classpath
}

@Configuration
@ConditionalOnMissingClass("com.example.legacy.LegacyService")
public class ModernServiceConfiguration {
    // Only active when LegacyService is NOT on classpath
}
```

### Bean Conditions

```java
@Configuration
public class DataSourceConfiguration {

    @Bean
    @ConditionalOnMissingBean(DataSource.class)
    public DataSource dataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConditionalOnBean(DataSource.class)
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean
    @ConditionalOnSingleCandidate(DataSource.class)
    public DataSourceInitializer initializer(DataSource dataSource) {
        return new DataSourceInitializer(dataSource, null);
    }
}
```

### Property Conditions

```java
@Configuration
@ConditionalOnProperty(
    name = "feature.orders.enabled",
    havingValue = "true",
    matchIfMissing = false
)
public class OrderFeatureConfiguration {
    // Only active when feature.orders.enabled=true
}

@Configuration
@ConditionalOnProperty("app.datasource.url")
public class CustomDatasourceConfiguration {
    // Only active when app.datasource.url is set
}

@Configuration
@ConditionalOnResource(resources = "classpath:config/orders-config.yml")
public class OrdersConfigLoadingConfiguration {
    // Only active when the resource exists
}

@Configuration
@ConditionalOnExpression(
    "'${app.environment}'.equals('production') && ${app.feature.advanced-mode:false}"
)
public class AdvancedProductionConfiguration {
    // Complex expression condition
}
```

### Web Application Conditions

```java
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class WebMvcConfiguration {
    // Only for Servlet-based web apps (Spring MVC)
}

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class WebFluxConfiguration {
    // Only for reactive web apps (Spring WebFlux)
}

@Configuration
@ConditionalOnNotWebApplication
public class BatchConfiguration {
    // Only for non-web applications
}
```

### Custom Conditional Annotation

```java
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Conditional(OnMissingBeanWithNameCondition.class)
public @interface ConditionalOnMissingBeanWithName {
    String beanName();
}

public class OnMissingBeanWithNameCondition extends SpringBootCondition {
    @Override
    public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String beanName = (String) metadata.getAnnotationAttributes(
            ConditionalOnMissingBeanWithName.class.getName()).get("beanName");

        if (context.getBeanFactory().containsBean(beanName)) {
            return ConditionOutcome.noMatch("Bean " + beanName + " already exists");
        }
        return ConditionOutcome.match("Bean " + beanName + " not found, configuration applies");
    }
}

// Usage
@Configuration
public class CustomAutoConfiguration {

    @Bean
    @ConditionalOnMissingBeanWithName(beanName = "defaultOrderService")
    public OrderService customOrderService() {
        return new OrderService();
    }
}
```

---

## 3. Creating Custom Auto-Configuration

### Basic Auto-Configuration

```java
// src/main/java/com/example/autoconfigure/MessagingAutoConfiguration.java
@AutoConfiguration
@ConditionalOnClass(MessageBroker.class)
@EnableConfigurationProperties(MessagingProperties.class)
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
public class MessagingAutoConfiguration {

    private final MessagingProperties properties;

    public MessagingAutoConfiguration(MessagingProperties properties) {
        this.properties = properties;
    }

    @Bean
    @ConditionalOnMissingBean
    public MessageBroker messageBroker() {
        MessageBroker broker = new MessageBroker();
        broker.setHost(properties.getHost());
        broker.setPort(properties.getPort());
        broker.setCredentials(properties.getUsername(), properties.getPassword());
        return broker;
    }

    @Bean
    @ConditionalOnBean(MessageBroker.class)
    @ConditionalOnProperty(prefix = "messaging", name = "auto-startup", havingValue = "true", matchIfMissing = true)
    public MessageBrokerStartupListener startupListener(MessageBroker broker) {
        return new MessageBrokerStartupListener(broker);
    }
}
```

### Configuration Properties

```java
// src/main/java/com/example/autoconfigure/MessagingProperties.java
@ConfigurationProperties(prefix = "messaging")
public class MessagingProperties {
    private String host = "localhost";
    private int port = 5672;
    private String username;
    private String password;
    private int maxConnections = 10;
    private Duration connectionTimeout = Duration.ofSeconds(30);
    private boolean autoStartup = true;
    private Retry retry = new Retry();

    // Getters and setters...

    public static class Retry {
        private int maxAttempts = 3;
        private Duration initialInterval = Duration.ofSeconds(1);
        private double multiplier = 2.0;
        private Duration maxInterval = Duration.ofSeconds(30);

        // Getters and setters...
    }
}
```

### Auto-Configuration Registration

```java
// META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.example.autoconfigure.MessagingAutoConfiguration
com.example.autoconfigure.CachingAutoConfiguration
com.example.autoconfigure.SecurityAutoConfiguration

// Optional: Additional configuration metadata
// META-INF/additional-spring-configuration-metadata.json
{
  "properties": [
    {
      "name": "messaging.host",
      "type": "java.lang.String",
      "description": "Message broker host address.",
      "defaultValue": "localhost"
    },
    {
      "name": "messaging.port",
      "type": "java.lang.Integer",
      "description": "Message broker port.",
      "defaultValue": 5672
    },
    {
      "name": "messaging.retry.max-attempts",
      "type": "java.lang.Integer",
      "description": "Maximum connection retry attempts.",
      "defaultValue": 3
    }
  ]
}
```

### Auto-Configuration with Multiple Conditions

```java
@AutoConfiguration
@ConditionalOnClass({JdbcTemplate.class, TransactionManager.class})
@ConditionalOnProperty(prefix = "app.database", name = "enabled", havingValue = "true")
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "app.database", name = "pool", havingValue = "hikari", matchIfMissing = true)
    public DataSource hikariDataSource(DatabaseProperties properties) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(properties.getUrl());
        config.setUsername(properties.getUsername());
        config.setPassword(properties.getPassword());
        config.setMaximumPoolSize(properties.getMaxPoolSize());
        return new HikariDataSource(config);
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "app.database", name = "pool", havingValue = "tomcat")
    public DataSource tomcatDataSource(DatabaseProperties properties) {
        org.apache.tomcat.jdbc.pool.DataSource ds = new org.apache.tomcat.jdbc.pool.DataSource();
        ds.setUrl(properties.getUrl());
        ds.setUsername(properties.getUsername());
        ds.setPassword(properties.getPassword());
        ds.setMaxActive(properties.getMaxPoolSize());
        return ds;
    }

    @Bean
    @ConditionalOnBean(DataSource.class)
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean
    @ConditionalOnBean(DataSource.class)
    @ConditionalOnMissingBean
    public PlatformTransactionManager transactionManager(DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
```

### Auto-Configuration with @ConfigurationPropertiesScan

```java
@SpringBootApplication
@ConfigurationPropertiesScan("com.example.autoconfigure.properties")
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// Properties classes are automatically detected
@ConfigurationProperties("app.feature.flags")
public class FeatureFlags {
    private boolean ordersEnabled = true;
    private boolean paymentsEnabled = false;
    private int maxOrderItems = 50;

    // Getters and setters...
}
```

---

## 4. Configuration Properties

### Nested Properties

```java
@ConfigurationProperties(prefix = "app.order")
public class OrderProperties {
    private int maxItems = 50;
    private Duration paymentTimeout = Duration.ofMinutes(5);
    private List<String> supportedCurrencies = List.of("USD", "EUR");
    private Map<String, String> customFields = new HashMap<>();
    private Shipping shipping = new Shipping();
    private Notification notification = new Notification();

    // Getters and setters...

    public static class Shipping {
        private double baseRate = 5.99;
        private double freeThreshold = 50.0;
        private Map<String, Double> zoneRates = new HashMap<>();

        // Getters and setters...
    }

    public static class Notification {
        private boolean emailEnabled = true;
        private boolean smsEnabled = false;
        private String emailTemplate = "order-confirmation";

        // Getters and setters...
    }
}

// application.yml
app:
  order:
    max-items: 100
    payment-timeout: 10m
    supported-currencies: USD, EUR, GBP
    custom-fields:
      source: WEB
      campaign: SPRING_SALE
    shipping:
      base-rate: 4.99
      free-threshold: 75.0
      zone-rates:
        US: 5.99
        EU: 12.99
        OTHER: 25.00
    notification:
      email-enabled: true
      sms-enabled: true
      email-template: order-v2
```

### Property Validation

```java
@ConfigurationProperties(prefix = "app.order")
@Validated
public class OrderProperties {
    @Min(1)
    @Max(500)
    private int maxItems = 50;

    @NotNull
    @DurationMin(minutes = 1)
    @DurationMax(hours = 24)
    private Duration paymentTimeout;

    @NotEmpty
    private List<@NotBlank String> supportedCurrencies;

    @Valid
    private Shipping shipping = new Shipping();

    // Getters and setters...

    public static class Shipping {
        @Positive
        private double baseRate;

        @PositiveOrZero
        private double freeThreshold;

        // Getters and setters...
    }
}
```

### Property Conversion

```java
// Custom property converter
@ConfigurationProperties(prefix = "app.crypto")
public class CryptoProperties {
    private List<KeyPair> keys = new ArrayList<>();

    public List<KeyPair> getKeys() { return keys; }
    public void setKeys(List<KeyPair> keys) { this.keys = keys; }

    public static class KeyPair {
        private String alias;
        private String publicKey;
        private String privateKey;

        // Getters and setters...
    }
}

// Custom converter
@Component
@ConfigurationPropertiesBinding
public class CryptoKeyConverter implements Converter<String, CryptoKey> {
    @Override
    public CryptoKey convert(String source) {
        String[] parts = source.split(":");
        return new CryptoKey(parts[0], Base64.getDecoder().decode(parts[1]));
    }
}
```

---

## 5. Auto-Configuration Ordering

### @AutoConfigureOrder

```java
@AutoConfiguration
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE + 10)
public class CoreInfrastructureConfiguration {
    // Runs early
}

@AutoConfiguration
@AutoConfigureOrder(Ordered.LOWEST_PRECEDENCE)
public class OptionalFeatureConfiguration {
    // Runs late
}
```

### @AutoConfigureBefore and @AutoConfigureAfter

```java
@AutoConfiguration
@AutoConfigureBefore(DataSourceAutoConfiguration.class)
public class CustomDataSourceConfiguration {
    // Runs before the default DataSource auto-configuration
}

@AutoConfiguration
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
@AutoConfigureBefore(HibernateJpaAutoConfiguration.class)
public class JpaConfiguration {
    // Runs after DataSource, but before JPA configuration
}
```

---

## 6. Overriding Auto-Configuration

### Excluding Auto-Configuration

```java
// Exclude specific auto-configurations
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// Via application.properties
spring.autoconfigure.exclude=\
  org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,\
  org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
```

### Replacing Auto-Configured Beans

```java
@Configuration
public class CustomDatabaseConfiguration {

    // Define a bean with the same type to override auto-configuration
    @Bean
    @Primary
    public DataSource dataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:postgresql://custom-host:5432/mydb")
            .username("custom_user")
            .password("custom_pass")
            .build();
    }

    // Replace JPA properties
    @Bean
    public JpaProperties jpaProperties() {
        JpaProperties props = new JpaProperties();
        props.setShowSql(true);
        props.setOpenInView(false);
        return props;
    }
}
```

### Using @ConditionalOnMissingBean for Override Points

```java
@AutoConfiguration
public class CacheAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager();
    }
}

// User-defined override
@Configuration
public class RedisCacheConfiguration {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        return RedisCacheManager.builder(factory).build();
    }
}
```

---

## 7. Testing Auto-Configuration

### Unit Testing

```java
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class MessagingAutoConfigurationTest {

    private final ApplicationContextRunner contextRunner = ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(MessagingAutoConfiguration.class));

    @Test
    void shouldCreateMessageBrokerWhenClassPresent() {
        contextRunner
            .withPropertyValues("messaging.host=broker.example.com")
            .run(context -> {
                assertThat(context).hasSingleBean(MessageBroker.class);
                MessageBroker broker = context.getBean(MessageBroker.class);
                assertThat(broker.getHost()).isEqualTo("broker.example.com");
            });
    }

    @Test
    void shouldNotCreateMessageBrokerWhenDisabled() {
        contextRunner
            .withPropertyValues("messaging.enabled=false")
            .run(context -> {
                assertThat(context).doesNotHaveBean(MessageBroker.class);
            });
    }

    @Test
    void shouldRespectExistingBeans() {
        contextRunner
            .withBean(MessageBroker.class, () -> {
                MessageBroker broker = new MessageBroker();
                broker.setHost("custom-host");
                return broker;
            })
            .run(context -> {
                assertThat(context).hasSingleBean(MessageBroker.class);
                assertThat(context.getBean(MessageBroker.class).getHost())
                    .isEqualTo("custom-host");
            });
    }
}
```

### Integration Testing

```java
@SpringBootTest
@AutoConfigureMockMvc
class OrderServiceAutoConfigurationIntegrationTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldConfigureOrderService() {
        assertThat(context.containsBean("orderService")).isTrue();
        OrderService service = context.getBean(OrderService.class);
        assertThat(service).isNotNull();
    }

    @Test
    void shouldConfigureRepository() {
        assertThat(context.containsBean("orderRepository")).isTrue();
    }

    @Test
    void shouldLoadCustomProperties() {
        OrderProperties props = context.getBean(OrderProperties.class);
        assertThat(props.getMaxItems()).isGreaterThan(0);
    }
}

// Test with specific auto-configuration classes
@SpringBootTest(classes = {
    OrderServiceAutoConfiguration.class,
    TestDatabaseConfiguration.class
})
@TestPropertySource(properties = {
    "app.order.max-items=100",
    "spring.datasource.url=jdbc:h2:mem:test"
})
class AutoConfigurationSliceTest {

    @Autowired
    private OrderService orderService;

    @Test
    void shouldCreateOrder() {
        // Test logic
    }
}
```

### Testing Configuration Properties

```java
@SpringBootTest
@TestPropertySource(properties = {
    "app.order.max-items=200",
    "app.order.payment-timeout=5m",
    "app.order.supported-currencies=USD,EUR,GBP,JPY",
    "app.order.shipping.base-rate=9.99",
    "app.order.notification.email-template=order-v2"
})
class OrderPropertiesTest {

    @Autowired
    private OrderProperties properties;

    @Test
    void shouldBindAllProperties() {
        assertThat(properties.getMaxItems()).isEqualTo(200);
        assertThat(properties.getPaymentTimeout()).isEqualTo(Duration.ofMinutes(5));
        assertThat(properties.getSupportedCurrencies()).containsExactly("USD", "EUR", "GBP", "JPY");
        assertThat(properties.getShipping().getBaseRate()).isEqualTo(9.99);
        assertThat(properties.getNotification().getEmailTemplate()).isEqualTo("order-v2");
    }

    @Test
    void shouldUseDefaultsWhenPropertiesMissing() {
        // When using a fresh context without test properties
    }
}
```

---

## 8. Common Auto-Configurations

### DataSource Auto-Configuration

```java
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@ConditionalOnProperty(prefix = "spring.datasource", name = "url")
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder()
            .type(getDataSourceType())
            .build();
    }

    private Class<? extends DataSource> getDataSourceType() {
        try {
            return (Class<? extends DataSource>) Class.forName("com.zaxxer.hikari.HikariDataSource");
        } catch (ClassNotFoundException e) {
            return DataSource.class;
        }
    }
}
```

### JPA Auto-Configuration

```java
@AutoConfiguration
@ConditionalOnClass({LocalContainerEntityManagerFactoryBean.class, EntityManager.class})
@ConditionalOnBean(DataSource.class)
@EnableConfigurationProperties(JpaProperties.class)
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
public class HibernateJpaAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            DataSource dataSource, JpaProperties properties) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.example.entity");
        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Properties jpaProps = new Properties();
        jpaProps.put("hibernate.hbm2ddl.auto", properties.getHibernate().getDdlAuto());
        jpaProps.put("hibernate.dialect", properties.getHibernate().getDialect());
        jpaProps.put("hibernate.show_sql", properties.isShowSql());
        em.setJpaProperties(jpaProps);

        return em;
    }
}
```

### Jackson Auto-Configuration

```java
@AutoConfiguration
@ConditionalOnClass(Jackson2ObjectMapperBuilder.class)
public class JacksonAutoConfiguration {

    @Bean
    @Primary
    @ConditionalOnMissingBean(ObjectMapper.class)
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        return builder
            .createXmlMapper(false)
            .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .featuresToEnable(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT)
            .modules(new JavaTimeModule(), new Jdk8Module())
            .build();
    }
}
```

### Kafka Auto-Configuration

```java
@AutoConfiguration
@ConditionalOnClass(KafkaTemplate.class)
@EnableConfigurationProperties(KafkaProperties.class)
public class KafkaAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public KafkaTemplate<String, Object> kafkaTemplate(
            ProducerFactory<String, Object> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    @Bean
    @ConditionalOnMissingBean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);
        return factory;
    }
}
```

---

## 9. Performance Considerations

### Auto-Configuration Scanning Impact

```java
// Spring Boot scans all auto-configuration imports at startup.
// Reducing the number scanned improves startup time.

// Exclude unnecessary auto-configurations
@SpringBootApplication(exclude = {
    JmxAutoConfiguration.class,
    QuartzAutoConfiguration.class,
    BatchAutoConfiguration.class,
    WebSocketAutoConfiguration.class,
    MailSenderAutoConfiguration.class
})
public class Application { }

// Disable auto-configuration for minimal footprint
spring.autoconfigure.exclude=\
  org.springframework.boot.autoconfigure.jmx.JmxAutoConfiguration,\
  org.springframework.boot.autoconfigure.websocket.servlet.WebSocketServletAutoConfiguration
```

### Conditional Evaluation Cost

```java
// Each @Conditional annotation is evaluated at startup.
// Too many conditions can slow startup.

// Bad: evaluate classpath condition for every bean
@Configuration
public class FeatureConfiguration {
    @Bean
    @ConditionalOnClass(OptionalDependency.class)
    public ServiceA serviceA() { return new ServiceA(); }

    @Bean
    @ConditionalOnClass(OptionalDependency.class)
    public ServiceB serviceB() { return new ServiceB(); }
}

// Good: single classpath condition for the configuration
@Configuration
@ConditionalOnClass(OptionalDependency.class)
public class FeatureConfiguration {
    @Bean
    public ServiceA serviceA() { return new ServiceA(); }

    @Bean
    public ServiceB serviceB() { return new ServiceB(); }
}
```

---

## 10. Best Practices

### Auto-Configuration Design

```java
// 1. Auto-configuration should be optional
@AutoConfiguration
@ConditionalOnProperty(prefix = "library", name = "enabled", matchIfMissing = false)
public class LibraryAutoConfiguration {
    // Users must explicitly enable our library
}

// 2. Provide sensible defaults
@ConfigurationProperties("library.connection")
public class LibraryProperties {
    private String host = "localhost"; // Sensible default
    private int port = 8080;           // Sensible default
    private Duration timeout = Duration.ofSeconds(30); // Sensible default
}

// 3. Honor user-defined beans
@Bean
@ConditionalOnMissingBean
public LibraryClient libraryClient(LibraryProperties properties) {
    return new LibraryClient(properties.getHost(), properties.getPort());
}

// 4. Auto-configuration should be auto-configured only
// DON'T use @Component in auto-configuration packages
// DON'T use @Service, @Repository in auto-configuration

// 5. Use spring.factories / AutoConfiguration.imports, not component scan
```

### Naming Conventions

```java
// Auto-configuration class naming
XxxAutoConfiguration     // Standard naming
XxxAutoConfigurationV2   // Versioned if significant changes

// Properties class naming
XxxProperties            // Standard naming

// Module naming
spring-boot-autoconfigure-xxx  // Module name

// Package structure
com.example.autoconfigure
com.example.autoconfigure.properties
com.example.autoconfigure.condition
```

### Documentation

```java
/**
 * Auto-configuration for the Example Library.
 * <p>
 * This configuration is activated when:
 * <ul>
 *   <li>{@code com.example.library.LibraryClient} is on the classpath</li>
 *   <li>{@code library.enabled} property is {@code true} (default: {@code false})</li>
 * </ul>
 * <p>
 * Configuration properties are available under the {@code library} prefix.
 * See {@link LibraryProperties} for available options.
 *
 * @see LibraryProperties
 */
@AutoConfiguration
@ConditionalOnClass(LibraryClient.class)
@ConditionalOnProperty(prefix = "library", name = "enabled", matchIfMissing = false)
@EnableConfigurationProperties(LibraryProperties.class)
public class LibraryAutoConfiguration {
}
```

### Providing Auto-Configuration Metadata

```json
{
  "groups": [
    {
      "name": "library",
      "type": "com.example.properties.LibraryProperties",
      "sourceType": "com.example.autoconfigure.LibraryAutoConfiguration"
    }
  ],
  "properties": [
    {
      "name": "library.host",
      "type": "java.lang.String",
      "description": "Library server host.",
      "sourceType": "com.example.properties.LibraryProperties",
      "defaultValue": "localhost"
    },
    {
      "name": "library.port",
      "type": "java.lang.Integer",
      "description": "Library server port.",
      "sourceType": "com.example.properties.LibraryProperties",
      "defaultValue": 8080
    },
    {
      "name": "library.enabled",
      "type": "java.lang.Boolean",
      "description": "Enable the library integration.",
      "sourceType": "com.example.properties.LibraryProperties",
      "defaultValue": false
    }
  ],
  "hints": []
}
```

---

## References

- Spring Boot Auto-Configuration: https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.developing-auto-configuration
- Creating Custom Auto-Configuration: https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.developing-auto-configuration.custom-starter
- Configuration Properties: https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config.typesafe-configuration-properties
- Testing Auto-Configuration: https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing.spring-boot-applications.autoconfigured-tests
