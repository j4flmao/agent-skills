# Rust Configuration Management

## Environment Configuration

### Basic Env Loading
```rust
use std::env;
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub max_connections: u32,
}

impl DatabaseConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        Ok(Self {
            host: env::var("DB_HOST").unwrap_or_else(|_| "localhost".into()),
            port: env::var("DB_PORT")
                .unwrap_or_else(|_| "5432".into())
                .parse()
                .map_err(|e| ConfigError::ParseError("DB_PORT".into(), e))?,
            database: env::var("DB_DATABASE")
                .map_err(|_| ConfigError::Missing("DB_DATABASE".into()))?,
            username: env::var("DB_USERNAME")
                .map_err(|_| ConfigError::Missing("DB_USERNAME".into()))?,
            password: env::var("DB_PASSWORD")
                .map_err(|_| ConfigError::Missing("DB_PASSWORD".into()))?,
            max_connections: env::var("DB_MAX_CONNECTIONS")
                .unwrap_or_else(|_| "25".into())
                .parse()
                .map_err(|e| ConfigError::ParseError("DB_MAX_CONNECTIONS".into(), e))?,
        })
    }
}
```

## Config Crate

### Structured Configuration
```rust
use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::net::SocketAddr;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub auth: AuthConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: usize,
    pub request_timeout_seconds: u64,

    #[serde(default = "default_cors_origins")]
    pub cors_origins: Vec<String>,
}

fn default_cors_origins() -> Vec<String> {
    vec!["http://localhost:3000".to_string()]
}

#[derive(Debug, Deserialize, Clone)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
    pub enable_console: bool,
    pub enable_file: bool,
    pub file_path: Option<String>,
}

impl AppConfig {
    pub fn load() -> Result<Self, ConfigError> {
        let run_mode = std::env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let config = Config::builder()
            // Base config
            .add_source(File::with_name("config/default"))
            // Environment-specific overrides
            .add_source(File::with_name(&format!("config/{}", run_mode)).required(false))
            // Local overrides (gitignored)
            .add_source(File::with_name("config/local").required(false))
            // Environment variables (prefix = APP)
            .add_source(
                Environment::with_prefix("APP")
                    .separator("__")
                    .list_separator(",")
                    .try_parsing(true),
            )
            .build()?;

        config.try_deserialize()
    }
}
```

## Environment-Specific Configs

### Config File Structure
```yaml
# config/default.yaml
server:
  host: "0.0.0.0"
  port: 8080
  workers: 4

database:
  host: "localhost"
  port: 5432
  max_connections: 25

logging:
  level: "info"
  format: "json"
  enable_console: true
```

```yaml
# config/development.yaml
server:
  port: 3000
  workers: 1

logging:
  level: "debug"
  format: "pretty"
```

```yaml
# config/production.yaml
server:
  port: 8080
  workers: 8

database:
  max_connections: 50

logging:
  enable_file: true
  file_path: "/var/log/app.log"
```

## Type-Safe Configuration Parsing

### Custom Parsers
```rust
use serde::Deserialize;
use std::net::IpAddr;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Debug, Deserialize)]
pub struct RateLimitConfig {
    pub requests_per_second: u32,
    pub burst_size: u32,

    #[serde(deserialize_with = "deserialize_duration")]
    pub window: Duration,
}

fn deserialize_duration<'de, D>(deserializer: D) -> Result<Duration, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    let duration = parse_duration::parse(&s)
        .map_err(serde::de::Error::custom)?;
    Ok(duration)
}

fn deserialize_socket_addr<'de, D>(deserializer: D) -> Result<SocketAddr, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    s.parse::<SocketAddr>()
        .map_err(serde::de::Error::custom)
}
```

## Secrets Management

### Encrypted Secrets
```rust
use secrecy::{SecretString, ExposeSecret};

#[derive(Debug, Deserialize, Clone)]
pub struct AuthConfig {
    pub jwt_secret: SecretString,
    pub jwt_expiration_hours: u64,
    pub refresh_token_expiration_days: u64,
}

// Usage
impl AuthConfig {
    pub fn jwt_secret(&self) -> &str {
        self.jwt_secret.expose_secret()
    }
}

// Never accidentally log secrets
impl std::fmt::Debug for AuthConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AuthConfig")
            .field("jwt_secret", &"***REDACTED***")
            .field("jwt_expiration_hours", &self.jwt_expiration_hours)
            .finish()
    }
}
```

## Configuration Validation

### Runtime Validation
```rust
use validator::Validate;

#[derive(Debug, Deserialize, Validate, Clone)]
pub struct ServerConfig {
    #[validate(range(min = 1, max = 65535))]
    pub port: u16,

    #[validate(range(min = 1, max = 64))]
    pub workers: usize,

    #[validate(url)]
    pub public_url: String,
}

impl AppConfig {
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        if let Err(e) = self.server.validate() {
            errors.extend(e.field_errors().iter().map(|(field, errs)| {
                format!("{}: {:?}", field, errs)
            }));
        }

        if self.database.port == 0 {
            errors.push("database.port must be > 0".into());
        }

        if self.auth.jwt_expiration_hours == 0 {
            errors.push("auth.jwt_expiration_hours must be > 0".into());
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}
```

## Reloading Configuration

### Hot Reload
```rust
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct ConfigManager {
    config: Arc<RwLock<AppConfig>>,
    config_path: PathBuf,
}

impl ConfigManager {
    pub async fn new(config_path: PathBuf) -> Result<Self, ConfigError> {
        let config = Self::load_config(&config_path).await?;

        let manager = Self {
            config: Arc::new(RwLock::new(config)),
            config_path,
        };

        manager.start_watcher();
        Ok(manager)
    }

    pub async fn get(&self) -> AppConfig {
        self.config.read().await.clone()
    }

    async fn load_config(path: &PathBuf) -> Result<AppConfig, ConfigError> {
        let content = tokio::fs::read_to_string(path).await?;
        let config: AppConfig = serde_yaml::from_str(&content)?;
        config.validate().map_err(ConfigError::Validation)?;
        Ok(config)
    }

    fn start_watcher(&self) {
        let config = self.config.clone();
        let path = self.config_path.clone();

        tokio::spawn(async move {
            let (tx, mut rx) = tokio::sync::mpsc::channel(16);
            let mut watcher = RecommendedWatcher::new(
                move |event| {
                    let _ = tx.blocking_send(event);
                },
                Config::default(),
            )
            .expect("Failed to create watcher");

            watcher
                .watch(&path, RecursiveMode::NonRecursive)
                .expect("Failed to start watcher");

            while let Some(_) = rx.recv().await {
                match Self::load_config(&path).await {
                    Ok(new_config) => {
                        *config.write().await = new_config;
                        tracing::info!("Configuration reloaded");
                    }
                    Err(e) => {
                        tracing::error!("Failed to reload config: {}", e);
                    }
                }
            }
        });
    }
}
```

## Testing with Configuration

### Test Config Factory
```rust
#[cfg(test)]
pub mod test_utils {
    use super::*;

    pub fn test_config() -> AppConfig {
        AppConfig {
            server: ServerConfig {
                host: "127.0.0.1".into(),
                port: 0, // Random port
                workers: 1,
                request_timeout_seconds: 30,
                cors_origins: vec!["*".into()],
            },
            database: DatabaseConfig {
                host: "localhost".into(),
                port: 5432,
                database: "test_db".into(),
                username: "test".into(),
                password: "test".into(),
                max_connections: 5,
            },
            // ...
        }
    }
}
```

## Key Points
- Environment variables with sensible defaults provide basic configuration
- config crate builds layered configuration from files, env, and defaults
- Environment-specific files inherit from default with overrides
- serde deserialization provides type-safe configuration parsing
- Custom deserializers handle non-standard types like Duration
- secrecy crate prevents accidental secret leakage in logs
- Validator crate provides struct-level validation rules
- Hot reload with file watchers updates configuration at runtime
- Test config factories create consistent test configuration
- Configuration should be validated at startup, not lazily
