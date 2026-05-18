# Protocol Buffer Basics

## Syntax
```
syntax = "proto3";
package acme.users.v1;
```

## Scalar Types
| Proto | Go | Java | Notes |
|-------|----|------|-------|
| double | float64 | double | |
| float | float32 | float | |
| int32 | int32 | int | Variable-length, not efficient for negative |
| int64 | int64 | long | Variable-length |
| uint32 | uint32 | int | Variable-length |
| uint64 | uint64 | long | Variable-length |
| sint32 | int32 | int | Efficient for negative (ZigZag) |
| sint64 | int64 | long | Efficient for negative (ZigZag) |
| fixed32 | uint32 | int | 4 bytes, efficient if >2^28 |
| fixed64 | uint64 | long | 8 bytes, efficient if >2^56 |
| sfixed32 | int32 | int | 4 bytes |
| sfixed64 | int64 | long | 8 bytes |
| bool | bool | boolean | |
| string | string | String | UTF-8 |
| bytes | []byte | ByteString | |

## Well-Known Types
```protobuf
import "google/protobuf/timestamp.proto";
import "google/protobuf/duration.proto";
import "google/protobuf/wrappers.proto";
import "google/protobuf/struct.proto";
import "google/protobuf/field_mask.proto";
import "google/protobuf/empty.proto";

message Example {
  google.protobuf.Timestamp created_at = 1;
  google.protobuf.Duration ttl = 2;
  google.protobuf.StringValue optional_name = 3;  // nullable string
  google.protobuf.Struct metadata = 4;             // dynamic JSON
  google.protobuf.FieldMask update_mask = 5;       // partial update
}
```

## Field Rules
```protobuf
message User {
  string id = 1;                    // optional (default in proto3)
  optional string nickname = 2;     // explicit optional
  repeated string tags = 3;         // list (array)
  map<string, string> meta = 4;     // key-value
  oneof contact {                    // mutually exclusive
    string email = 5;
    string phone = 6;
  }
  reserved 7, 8;                    // reserved field numbers
  reserved "foo", "bar";            // reserved field names
}
```

## Field Number Rules
- 1-15: 1 byte in wire format. Use for frequently occurring fields.
- 16-2047: 2 bytes. Use for less frequent fields.
- 19000-19999: reserved for internal proto use.
- Never reuse a field number. Use `reserved` to block.
- Maximum field number: 536,870,911.

## Package and Naming
- `package` names: lowercase dotted: `acme.users.v1`
- `message` names: PascalCase: `CreateUserRequest`, `UserResponse`
- `field` names: snake_case: `user_id`, `created_at`
- `enum` names: PascalCase, values UPPER_SNAKE_CASE
- `service` names: PascalCase: `UserService`
- `rpc` names: PascalCase: `CreateUser`

## Enums
```protobuf
enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;   // always have an unspecified zero value
  USER_STATUS_ACTIVE = 1;
  USER_STATUS_SUSPENDED = 2;
  USER_STATUS_DELETED = 3;
}
```

## Options
```protobuf
option go_package = "github.com/acme/gen/users/v1;usersv1";
option java_package = "com.acme.users.v1";
option java_multiple_files = true;
option optimize_for = SPEED;
```

## Compilation
```bash
protoc --proto_path=proto --go_out=gen proto/**/*.proto
protoc --proto_path=proto --go-grpc_out=gen proto/**/*.proto
```

## Best Practices
- Always version packages (`v1`, `v2`). Never change a package without a version bump.
- Keep field numbers dense starting from 1. Gaps waste wire format efficiency.
- Never use `int32`/`int64` for timestamps. Use `google.protobuf.Timestamp`.
- Never use `string` for enum-like values. Use `enum`.
- Never return `Empty` when the caller needs any meaningful response.
- One file per top-level message (or small group of related messages).
