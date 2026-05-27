# Rust Dependency Injection Patterns

## Manual DI

### Constructor Injection
```rust
use std::sync::Arc;

// Repository trait
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: UserId) -> Result<User, RepositoryError>;
    async fn save(&self, user: &User) -> Result<(), RepositoryError>;
}

// Use case
pub struct CreateUserUseCase {
    repo: Arc<dyn UserRepository>,
    hasher: Arc<dyn PasswordHasher>,
    publisher: Arc<dyn EventPublisher>,
}

impl CreateUserUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        hasher: Arc<dyn PasswordHasher>,
        publisher: Arc<dyn EventPublisher>,
    ) -> Self {
        Self { repo, hasher, publisher }
    }

    pub async fn execute(&self, cmd: CreateUserCommand) -> Result<User, ApplicationError> {
        let hashed = self.hasher.hash(&cmd.password).await?;
        let user = User::new(cmd.email, hashed, cmd.name)?;
        self.repo.save(&user).await?;
        self.publisher.publish(UserCreated::from(&user)).await?;
        Ok(user)
    }
}
```

### Wired Application
```rust
// main.rs or app.rs
pub struct AppContainer {
    pub create_user: CreateUserUseCase,
    pub get_user: GetUserUseCase,
    pub list_users: ListUsersUseCase,
}

pub async fn build_container(db_pool: PgPool) -> AppContainer {
    // Infrastructure
    let user_repo = Arc::new(PostgresUserRepository::new(db_pool.clone()));
    let hasher = Arc::new(BcryptHasher::new(12));
    let publisher = Arc::new(EventPublisher::new(db_pool));

    // Application
    AppContainer {
        create_user: CreateUserUseCase::new(
            user_repo.clone(),
            hasher.clone(),
            publisher.clone(),
        ),
        get_user: GetUserUseCase::new(user_repo.clone()),
        list_users: ListUsersUseCase::new(user_repo),
    }
}
```

## Builder Pattern

### Container Builder
```rust
use std::marker::PhantomData;

pub struct AppBuilder {
    db_pool: Option<PgPool>,
    redis: Option<RedisPool>,
    config: AppConfig,
}

impl AppBuilder {
    pub fn new(config: AppConfig) -> Self {
        Self {
            db_pool: None,
            redis: None,
            config,
        }
    }

    pub fn with_database(mut self, pool: PgPool) -> Self {
        self.db_pool = Some(pool);
        self
    }

    pub fn with_redis(mut self, redis: RedisPool) -> Self {
        self.redis = Some(redis);
        self
    }

    pub fn build(self) -> Result<AppContainer, BuildError> {
        let db = self.db_pool.ok_or(BuildError::MissingDatabase)?;
        let redis = self.redis.unwrap_or_else(|| {
            RedisPool::new(self.config.redis_url.clone())
        });

        Ok(AppContainer {
            user_repo: Arc::new(PostgresUserRepository::new(db.clone())),
            redis_cache: Arc::new(RedisCache::new(redis)),
            // ...
        })
    }
}
```

## Trait-Based DI

### Registrar Pattern
```rust
pub trait ServiceRegistrar {
    fn register<T: Send + Sync + 'static>(&mut self, service: T);
    fn resolve<T: Send + Sync + 'static>(&self) -> Option<&T>;
}

pub struct ServiceCollection {
    services: HashMap<TypeId, Box<dyn Any + Send + Sync>>,
}

impl ServiceRegistrar for ServiceCollection {
    fn register<T: Send + Sync + 'static>(&mut self, service: T) {
        self.services.insert(TypeId::of::<T>(), Box::new(service));
    }

    fn resolve<T: Send + Sync + 'static>(&self) -> Option<&T> {
        self.services
            .get(&TypeId::of::<T>())
            .and_then(|s| s.downcast_ref::<T>())
    }
}

// Usage
fn configure_services() -> ServiceCollection {
    let mut services = ServiceCollection::new();
    services.register(PostgresUserRepository::new(pool));
    services.register(BcryptHasher::new(12));
    services.register(CreateUserUseCase::new(
        services.resolve().unwrap(),
        services.resolve().unwrap(),
        services.resolve().unwrap(),
    ));
    services
}
```

## Delayed Initialization

### Lazy Services
```rust
use once_cell::sync::OnceCell;

pub struct LazyService<T> {
    inner: OnceCell<T>,
    factory: Box<dyn FnOnce() -> T + Send>,
}

impl<T> LazyService<T> {
    pub fn new(factory: impl FnOnce() -> T + Send + 'static) -> Self {
        Self {
            inner: OnceCell::new(),
            factory: Box::new(factory),
        }
    }

    pub fn get(&self) -> &T {
        self.inner.get_or_init(|| (self.factory)())
    }
}

// Usage
let cache = LazyService::new(|| RedisCache::new(config.redis_url.clone()));

// First access initializes
cache.get().set("key", "value")?;
```

## Testing with Mock Services

### MockAll
```rust
use mockall::automock;

#[automock]
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: UserId) -> Result<User, RepositoryError>;
}

#[tokio::test]
async fn test_create_user() {
    let mut mock_repo = MockUserRepository::new();
    mock_repo
        .expect_save()
        .withf(|user: &User| user.email == "test@example.com")
        .returning(|_| Ok(()));

    let hasher = MockPasswordHasher::new();
    hasher
        .expect_hash()
        .returning(|_| Ok("hashed".to_string()));

    let publisher = MockEventPublisher::new();
    publisher.expect_publish().returning(|_| Ok(()));

    let use_case = CreateUserUseCase::new(
        Arc::new(mock_repo),
        Arc::new(hasher),
        Arc::new(publisher),
    );

    let result = use_case
        .execute(CreateUserCommand {
            email: "test@example.com".into(),
            password: "secret123".into(),
            name: "Test".into(),
        })
        .await;

    assert!(result.is_ok());
}
```

## Generic Services

### Generic Repository Injection
```rust
pub struct GenericService<T: Repository + Send + Sync> {
    repo: Arc<T>,
}

impl<T: Repository + Send + Sync> GenericService<T> {
    pub fn new(repo: Arc<T>) -> Self {
        Self { repo }
    }
}

// Concrete type at construction
let user_service = GenericService::new(Arc::new(PostgresUserRepository::new(pool)));
let order_service = GenericService::new(Arc::new(PostgresOrderRepository::new(pool)));
```

## Key Points
- Constructor injection is the simplest and most idiomatic Rust DI pattern
- Arc<dyn Trait> enables runtime polymorphism for injected dependencies
- Builder pattern validates dependencies at container construction time
- OnceCell provides lazy initialization for expensive singleton services
- Mockall generates mock implementations from trait definitions
- Service collection with TypeId enables type-based service resolution
- Generic services work with concrete types when polymorphism is not needed
- Arc allows shared ownership of services across the application
- Async traits require #[async_trait] for trait object safety
- Container pattern centralizes dependency wiring in a single location
