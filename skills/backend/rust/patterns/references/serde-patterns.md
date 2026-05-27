# Serde Patterns for Serialization

## Overview
Serde is Rust's standard serialization framework. It provides derive macros for automatic serialization and deserialization, format-specific implementations (JSON, YAML, TOML, etc.), and customization through attributes.

## Basic Serde Usage

### Derive Macros
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

let user = User {
    id: Uuid::new_v4(),
    name: "Alice".into(),
    email: "alice@example.com".into(),
    is_active: true,
    created_at: Utc::now(),
};

let json = serde_json::to_string(&user)?;
let parsed: User = serde_json::from_str(&json)?;
```

## Attribute Customization

### Renaming Fields
```rust
#[derive(Serialize, Deserialize)]
struct Product {
    #[serde(rename = "product_id")]
    pub id: String,

    #[serde(rename = "display_name")]
    pub name: String,

    #[serde(rename = "unit_price")]
    pub price: f64,
}

// JSON: {"product_id": "...", "display_name": "...", "unit_price": 9.99}
```

### Skip and Default
```rust
#[derive(Serialize, Deserialize)]
struct Config {
    pub host: String,
    pub port: u16,

    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(skip)]
    pub internal_cache: Vec<u8>,
}

fn default_timeout() -> u64 { 30 }
```

### Flatten
```rust
#[derive(Serialize, Deserialize)]
struct Pagination {
    pub page: u32,
    pub per_page: u32,
    pub total: u64,
}

#[derive(Serialize, Deserialize)]
struct UserListResponse {
    pub data: Vec<User>,

    #[serde(flatten)]
    pub pagination: Pagination,
}

// JSON: {"data": [...], "page": 1, "per_page": 20, "total": 100}
```

### Untagged Enums
```rust
#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum ApiResponse {
    Success { data: Value },
    Error { error: String, code: u16 },
}

// JSON: {"data": ...} or {"error": "...", "code": 400}
```

### Tagged Enums
```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
enum WebSocketMessage {
    Join { room: String },
    Leave { room: String },
    Message { text: String, room: String },
}

// JSON: {"type": "Join", "payload": {"room": "general"}}
// JSON: {"type": "Message", "payload": {"text": "hello", "room": "general"}}
```

## Custom Serialization

### Custom Serialize
```rust
use serde::ser::{Serialize, Serializer};

struct Email(String);

impl Serialize for Email {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let lowercased = self.0.to_lowercase();
        serializer.serialize_str(&lowercased)
    }
}
```

### Custom Deserialize
```rust
use serde::de::{self, Deserialize, Deserializer, Visitor};
use std::fmt;

impl<'de> Deserialize<'de> for Email {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct EmailVisitor;

        impl<'de> Visitor<'de> for EmailVisitor {
            type Value = Email;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a valid email address")
            }

            fn visit_str<E: de::Error>(self, value: &str) -> Result<Email, E> {
                if value.contains('@') {
                    Ok(Email(value.to_lowercase()))
                } else {
                    Err(de::Error::custom("invalid email format"))
                }
            }
        }

        deserializer.deserialize_str(EmailVisitor)
    }
}
```

### Serde with Functions
```rust
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct CreateUserRequest {
    #[serde(deserialize_with = "validate_email")]
    pub email: String,

    #[serde(default = "default_role")]
    pub role: String,
}

fn validate_email<'de, D: Deserializer<'de>>(deserializer: D) -> Result<String, D::Error> {
    let s = String::deserialize(deserializer)?;
    if s.contains('@') && s.contains('.') {
        Ok(s.to_lowercase())
    } else {
        Err(serde::de::Error::custom("invalid email"))
    }
}

fn default_role() -> String {
    "user".to_string()
}
```

## Date and Time Patterns

### Chrono Integration
```rust
use chrono::{DateTime, Utc, NaiveDateTime};

#[derive(Serialize, Deserialize)]
struct Event {
    #[serde(with = "chrono::serde::ts_seconds")]
    pub timestamp: DateTime<Utc>,

    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub precise_time: DateTime<Utc>,

    #[serde(with = "date_format")]
    pub date: NaiveDateTime,
}

mod date_format {
    use chrono::NaiveDateTime;
    use serde::{self, Deserialize, Deserializer, Serializer};

    const FORMAT: &str = "%Y-%m-%d %H:%M:%S";

    pub fn serialize<S: Serializer>(date: &NaiveDateTime, serializer: S) -> Result<S::Ok, S::Error> {
        let s = format!("{}", date.format(FORMAT));
        serializer.serialize_str(&s)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<NaiveDateTime, D::Error> {
        let s = String::deserialize(deserializer)?;
        NaiveDateTime::parse_from_str(&s, FORMAT).map_err(serde::de::Error::custom)
    }
}
```

## Serialization Formats

### JSON
```rust
let json = serde_json::to_string(&data)?;
let pretty = serde_json::to_string_pretty(&data)?;
let parsed: MyType = serde_json::from_str(&json)?;

// Raw JSON manipulation
let value: serde_json::Value = serde_json::from_str(&json)?;
if let Some(name) = value["name"].as_str() {
    println!("Name: {}", name);
}
```

### YAML
```rust
use serde_yaml;

let yaml = serde_yaml::to_string(&config)?;
let parsed: Config = serde_yaml::from_str(&yaml)?;
```

### MessagePack (Binary)
```rust
let bytes = rmp_serde::to_vec(&data)?;
let parsed: MyType = rmp_serde::from_slice(&bytes)?;
```

### TOML
```rust
let toml = toml::to_string(&config)?;
let parsed: Config = toml::from_str(&toml)?;
```

## Error Handling

### Result Wrapping
```rust
use serde_json::Value;

fn safe_deserialize<T: serde::de::DeserializeOwned>(json: &str) -> Result<T, String> {
    serde_json::from_str(json).map_err(|e| format!("Deserialization error: {}", e))
}

fn parse_with_fallback(json: &str) -> Value {
    serde_json::from_str(json).unwrap_or(Value::Null)
}
```

## Performance Patterns

### Zero-Copy Deserialization
```rust
use serde::Deserialize;

#[derive(Deserialize)]
struct LogEntry<'a> {
    #[serde(borrow)]
    pub level: &'a str,

    #[serde(borrow)]
    pub message: &'a str,

    pub timestamp: i64,
}

// Avoids allocating strings when parsing from bytes
let data = b"{\"level\":\"info\",\"message\":\"hello\",\"timestamp\":1234567890}";
let entry: LogEntry = serde_json::from_slice(&data)?;
```

### Pre-allocating Buffers
```rust
fn serialize_to_buffer<T: Serialize>(data: &T) -> Result<Vec<u8>, serde_json::Error> {
    let mut buf = Vec::with_capacity(1024);
    let mut serializer = serde_json::Serializer::new(&mut buf);
    data.serialize(&mut serializer)?;
    Ok(buf)
}
```

## Transparent Wrapper Pattern

### Newtype Idiom
```rust
#[derive(Serialize, Deserialize)]
#[serde(transparent)]
pub struct UserId(Uuid);

#[derive(Serialize, Deserialize)]
#[serde(transparent)]
pub struct Email(String);

// JSON: "550e8400-e29b-41d4-a716-446655440000"
// JSON: "user@example.com"
```

## Key Points
- Derive Serialize and Deserialize for automatic implementation
- Use renaming attributes for different JSON field names
- Flatten merges nested structs into the parent
- Skip fields that shouldn't be serialized or have defaults
- Untagged enums avoid wrapping objects in type discriminators
- Custom visitors enable validation during deserialization
- Chrono integration provides flexible date/time formatting
- Borrowed deserialization avoids allocations for string fields
- Transparent wrappers remove one layer of nesting
- Use format-specific serde crates for non-JSON formats
- Handle errors gracefully with Result types
- Choose binary formats (MessagePack) for performance-critical paths
