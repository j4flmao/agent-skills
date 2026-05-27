# Rust Serialization with Serde

## Basic Serialization

### Derive Macros
```rust
use serde::{Serialize, Deserialize};
use serde_json;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
    #[serde(default)]
    pub role: String,
}

let user = User {
    id: 1,
    name: "John".into(),
    email: "john@example.com".into(),
    bio: None,
    role: "user".into(),
};

// Serialize
let json = serde_json::to_string_pretty(&user)?;
println!("{}", json);

// Deserialize
let json = r#"{"id":1,"name":"John","email":"john@example.com","role":"user"}"#;
let user: User = serde_json::from_str(json)?;
```

## Attribute Configuration

### Field Attributes
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct Order {
    #[serde(rename = "order_id")]
    pub id: u64,

    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,

    #[serde(with = "chrono::serde::ts_seconds")]
    pub timestamp: DateTime<Utc>,

    #[serde(default)]
    pub status: OrderStatus,

    #[serde(skip_serializing)]
    pub internal_note: String,

    #[serde(skip_deserializing)]
    pub computed_field: String,

    #[serde(alias = "total")]
    #[serde(alias = "amount")]
    pub total_price: f64,

    #[serde(flatten)]
    pub metadata: HashMap<String, serde_json::Value>,
}
```

### Container Attributes
```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Pending,
    Confirmed,
    Shipped,
    #[serde(rename = "delivered")]
    Completed,
    Cancelled,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum PaymentMethod {
    CreditCard(CreditCardDetails),
    BankTransfer(BankDetails),
    Crypto(CryptoDetails),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StrictConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Response {
    Success { data: serde_json::Value },
    Error { message: String },
}
```

## Custom Serialization

### Custom Serializer
```rust
use serde::ser::{Serialize, Serializer, SerializeStruct};

pub struct UserId(pub u64);

impl Serialize for UserId {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&format!("usr_{}", self.0))
    }
}

impl<'de> Deserialize<'de> for UserId {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let s = String::deserialize(deserializer)?;
        let id = s.strip_prefix("usr_")
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| serde::de::Error::custom("invalid user id format"))?;
        Ok(UserId(id))
    }
}
```

### Serialize with Custom Function
```rust
fn serialize_optional<S>(value: &Option<String>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match value {
        Some(v) => serializer.serialize_str(v),
        None => serializer.serialize_none(),
    }
}

fn deserialize_optional<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let s = Option::<String>::deserialize(deserializer)?;
    Ok(s.filter(|s| !s.is_empty()))
}

#[derive(Serialize, Deserialize)]
pub struct Profile {
    #[serde(
        serialize_with = "serialize_optional",
        deserialize_with = "deserialize_optional"
    )]
    pub display_name: Option<String>,
}
```

## Format-Specific Features

### JSON
```rust
// Pretty print
let json = serde_json::to_string_pretty(&value)?;

// Raw JSON value
let raw: serde_json::Value = serde_json::from_str(r#"{"key": "value"}"#)?;
let val = &raw["key"];

// Streaming (large data)
let mut stream = serde_json::Deserializer::from_reader(file);
for item in stream.into_iter::<Record>() {
    let record = item?;
    process(record);
}
```

### YAML
```rust
use serde_yaml;

let yaml = serde_yaml::to_string(&config)?;

let config: Config = serde_yaml::from_str(&yaml)?;

// Multi-document YAML
let docs: Vec<Config> = serde_yaml::Deserializer::from_str(&yaml)
    .map(|doc| Config::deserialize(doc))
    .collect::<Result<Vec<_>, _>>()?;
```

### MessagePack
```rust
use rmp_serde;

// Binary format, more compact than JSON
let bytes = rmp_serde::to_vec(&value)?;
let value: Value = rmp_serde::from_slice(&bytes)?;
```

### BSON
```rust
use mongodb::bson;

let doc = bson::to_document(&user)?;
let user: User = bson::from_document(doc)?;
```

## Performance Optimization

### Flatten vs Nested
```rust
// Flattened (faster, less allocation)
#[derive(Serialize, Deserialize)]
pub struct ApiResponse {
    pub status: u16,
    #[serde(flatten)]
    pub data: HashMap<String, serde_json::Value>,
}

// Nested (slower, more allocation)
#[derive(Serialize, Deserialize)]
pub struct ApiResponseNested {
    pub status: u16,
    pub data: HashMap<String, serde_json::Value>,
}
```

### Pre-allocated Buffers
```rust
use serde_json::Serializer;
use std::io::Write;

fn serialize_batch(records: &[Record], writer: impl Write) -> Result<(), Error> {
    let mut serializer = Serializer::new(writer);
    let mut seq = serializer.serialize_seq(Some(records.len()))?;
    for record in records {
        seq.serialize_element(record)?;
    }
    seq.end()?;
    Ok(())
}
```

## Error Handling

### Deserialize Error
```rust
use serde::de;

pub fn parse_config(data: &str) -> Result<Config, ConfigError> {
    serde_json::from_str::<Config>(data)
        .map_err(|e| match e.classify() {
            de::Category::Io => ConfigError::Io(e),
            de::Category::Syntax => ConfigError::Syntax(e),
            de::Category::Data => ConfigError::Validation(e),
            de::Category::Eof => ConfigError::Incomplete(e),
            _ => ConfigError::Unknown(e),
        })
}
```

## Key Points
- #[derive(Serialize, Deserialize)] provides automatic serialization
- Attributes control naming, skipping, defaults, and aliasing
- Enums support tagged, untagged, and adjacently tagged representations
- Custom serializers handle non-standard formats
- flatten attribute merges nested structs into parent
- serde_json for JSON, serde_yaml for YAML, rmp_serde for MessagePack
- Pre-allocated buffers improve serialization throughput
- Error classification enables specific error handling
- Streaming deserialization processes large files without loading entirely
- Field renaming with rename_all enables consistent naming conventions
