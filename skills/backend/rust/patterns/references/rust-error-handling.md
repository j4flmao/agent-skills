# Rust Error Handling Patterns

## Enum-Based Errors

```rust
use std::fmt;

#[derive(Debug)]
pub enum DomainError {
    NotFound { resource: String, id: String },
    Validation { field: String, message: String },
    Conflict { message: String },
    Unauthorized { action: String },
    Internal { source: anyhow::Error },
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DomainError::NotFound { resource, id } => {
                write!(f, "{} with id {} not found", resource, id)
            }
            DomainError::Validation { field, message } => {
                write!(f, "Validation failed for {}: {}", field, message)
            }
            DomainError::Conflict { message } => write!(f, "Conflict: {}", message),
            DomainError::Unauthorized { action } => write!(f, "Unauthorized: {}", action),
            DomainError::Internal { source } => write!(f, "Internal error: {}", source),
        }
    }
}

impl std::error::Error for DomainError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            DomainError::Internal { source } => Some(source.as_ref()),
            _ => None,
        }
    }
}

impl From<anyhow::Error> for DomainError {
    fn from(err: anyhow::Error) -> Self {
        DomainError::Internal { source: err }
    }
}
```

## Result Type Aliases

```rust
use std::result;

pub type Result<T> = result::Result<T, DomainError>;

pub trait Repository<T> {
    async fn find_by_id(&self, id: &str) -> Result<Option<T>>;
    async fn save(&self, entity: T) -> Result<T>;
    async fn delete(&self, id: &str) -> Result<()>;
}

pub struct UserService<R: Repository<User>> {
    repo: R,
}

impl<R: Repository<User>> UserService<R> {
    pub async fn get_user(&self, id: &str) -> Result<User> {
        self.repo.find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::NotFound {
                resource: "User".into(),
                id: id.into(),
            })
    }

    pub async fn create_user(&self, data: CreateUserDto) -> Result<User> {
        if data.name.is_empty() {
            return Err(DomainError::Validation {
                field: "name".into(),
                message: "Name is required".into(),
            });
        }

        let existing = self.repo.find_by_email(&data.email).await?;
        if existing.is_some() {
            return Err(DomainError::Conflict {
                message: format!("Email {} already exists", data.email),
            });
        }

        Ok(self.repo.save(User::from(data)).await?)
    }
}
```

## Error Chain Pattern

```rust
use anyhow::Context;

pub struct PaymentProcessor;

impl PaymentProcessor {
    pub async fn process_payment(
        &self,
        user_id: &str,
        amount: f64,
    ) -> Result<Transaction, anyhow::Error> {
        let user = self.find_user(user_id)
            .await
            .context("Failed to find user for payment")?;

        let account = self.get_account(&user)
            .await
            .context(format!("No account for user {}", user_id))?;

        if account.balance < amount {
            anyhow::bail!("Insufficient balance: have {}, need {}", account.balance, amount);
        }

        let transaction = self.execute_transaction(&account, amount)
            .await
            .context("Payment execution failed")?;

        self.send_notification(&user, &transaction)
            .await
            .context("Notification failed, payment was successful")?;

        Ok(transaction)
    }
}
```

## Key Points

- Use enum-based errors with Display and Error trait implementations
- Define Result type aliases for consistency
- Use anyhow for application-level error handling
- Use thiserror for library-level error definitions
- Implement From traits for error conversion
- Use context methods for error enrichment
- Provide meaningful error messages with context
- Handle recoverable errors with pattern matching
- Use unwrap_or_else for fallback values
- Use combinators like map_err and or_else
- Log errors with appropriate severity levels
- Test error paths with property-based testing
