# Rust Memory Management

## Ownership and Borrowing

```rust
struct User {
    id: String,
    name: String,
    email: String,
}

fn get_user_name(user: &User) -> &str {
    &user.name
}

fn update_user_email(user: &mut User, new_email: String) {
    user.email = new_email;
}

fn process_users(users: Vec<User>) -> Vec<String> {
    users.into_iter().map(|u| u.name).collect()
}

fn demonstrate_borrowing() {
    let mut user = User {
        id: String::from("1"),
        name: String::from("Alice"),
        email: String::from("alice@example.com"),
    };

    // Immutable borrow
    let name = get_user_name(&user);
    println!("User name: {}", name);

    // Mutable borrow
    update_user_email(&mut user, String::from("alice@new.com"));

    // Ownership transfer
    let names = process_users(vec![user]);
    println!("Names: {:?}", names);
}
```

## Lifetimes

```rust
struct UserRepository<'a> {
    db: &'a Database,
    cache: &'a Cache,
}

impl<'a> UserRepository<'a> {
    fn new(db: &'a Database, cache: &'a Cache) -> Self {
        Self { db, cache }
    }

    fn find_by_id(&self, user_id: &str) -> Option<&User> {
        // Check cache first, then database
        self.cache.get(user_id)
            .or_else(|| self.db.find_user(user_id))
    }
}

fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn process<'a>(items: &'a [Item], filter: &dyn Fn(&Item) -> bool) -> Vec<&'a Item> {
    items.iter().filter(|item| filter(item)).collect()
}
```

## Smart Pointers

```rust
use std::rc::Rc;
use std::cell::RefCell;
use std::sync::{Arc, Mutex};

// Single-threaded shared ownership
struct SharedState {
    counter: Rc<RefCell<u32>>,
}

impl SharedState {
    fn new() -> Self {
        Self { counter: Rc::new(RefCell::new(0)) }
    }

    fn increment(&self) {
        *self.counter.borrow_mut() += 1;
    }

    fn value(&self) -> u32 {
        *self.counter.borrow()
    }
}

// Multi-threaded shared ownership
struct ThreadSafeState {
    config: Arc<Mutex<Config>>,
}

impl ThreadSafeState {
    fn new(config: Config) -> Self {
        Self { config: Arc::new(Mutex::new(config)) }
    }

    fn update<F>(&self, updater: F)
    where F: FnOnce(&mut Config)
    {
        let mut guard = self.config.lock().unwrap();
        updater(&mut *guard);
    }
}
```

## Error Handling

```rust
use std::fs::File;
use std::io::{self, Read};

#[derive(Debug)]
enum AppError {
    IoError(io::Error),
    NotFound(String),
    Validation(String),
}

impl From<io::Error> for AppError {
    fn from(err: io::Error) -> Self {
        AppError::IoError(err)
    }
}

fn read_config(path: &str) -> Result<String, AppError> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn process_user(user_id: &str) -> Result<User, AppError> {
    let data = read_config("config.toml")?;
    let user = find_user(user_id)
        .ok_or_else(|| AppError::NotFound(user_id.to_string()))?;

    if user.name.is_empty() {
        return Err(AppError::Validation("Name required".into()));
    }

    Ok(user)
}
```

## Key Points

- Follow Rust's ownership rules for memory safety
- Use references (&T) for read-only borrowing
- Use mutable references (&mut T) for write access
- Leverage lifetimes to prevent dangling references
- Use Rc/RefCell for single-threaded shared ownership
- Use Arc/Mutex for multi-threaded shared state
- Use Result for recoverable errors
- Use ? operator for error propagation
- Implement From traits for error conversion
- Use Option for nullable values
- Avoid raw pointers and unsafe code
- Use clippy for idiomatic Rust linting
