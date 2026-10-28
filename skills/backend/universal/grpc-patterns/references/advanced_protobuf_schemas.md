# Advanced gRPC Protobuf Schemas

Schema design beyond the basics in `protobuf-basics.md`: field presence, `oneof`, maps, well-known types for partial updates and polymorphism, Protobuf Editions, validation, resource-oriented API design, and safe schema evolution enforced with Buf.

## Field Presence

| Field kind (proto3 syntax) | Presence tracked? | Notes |
|----------------------------|-------------------|-------|
| Scalar without label | No | Cannot distinguish "0/empty" from "not set" |
| `optional` scalar | Yes (`has_x()`) | Use when zero is meaningful and must be distinguished |
| Message field | Yes | |
| `oneof` member | Yes | |
| `repeated` / `map` | No (empty = unset) | |

```proto
message UpdateLimitsRequest {
  string account_id = 1;
  optional int64 daily_limit_minor = 2;   // 0 is a valid limit; absence means "do not change"
}
```

Wrapper types (`google.protobuf.Int64Value`) predate `optional` in proto3; prefer `optional` in new schemas.

## Protobuf Editions

Editions replace `syntax = "proto2"/"proto3"` with feature flags. `edition = "2023"` behaves like proto2/proto3 hybrid: explicit presence by default for singular fields, configurable per file/field via `features`.

```proto
edition = "2023";
package acme.payments.v1;

message Payment {
  string id = 1;
  int64 amount_minor = 2 [features.field_presence = IMPLICIT];   // proto3-like
}
```

Check that every language runtime and tool in your stack (protoc version, Buf, gRPC plugins) supports the edition before migrating; `buf` can migrate files between syntaxes and editions.

## oneof for Variants

```proto
message PaymentMethod {
  oneof kind {
    Card card = 1;
    BankAccount bank_account = 2;
    Wallet wallet = 3;
  }
}
```

- Adding new members is backward compatible; old readers see the field as unknown (oneof appears unset).
- Never move an existing field into or out of a `oneof`; it changes semantics on the wire for older readers.
- Handle the "unset/unknown" case explicitly in code (`KIND_NOT_SET`).

## Maps

```proto
map<string, string> labels = 10;
```

Keys may be integral or string types; values cannot be another map (wrap in a message). Map iteration order is undefined; never rely on it for signatures or hashes.

## Enums

```proto
enum PaymentStatus {
  PAYMENT_STATUS_UNSPECIFIED = 0;
  PAYMENT_STATUS_PENDING = 1;
  PAYMENT_STATUS_SUCCEEDED = 2;
  PAYMENT_STATUS_FAILED = 3;
}
```

- Zero value `*_UNSPECIFIED`; prefix values with the enum name (enum values share the package scope).
- Open enums (proto3 default) preserve unknown numeric values; clients must handle unknown values gracefully.
- Never renumber; reserve removed values.

## Partial Updates with FieldMask

```proto
import "google/protobuf/field_mask.proto";

message UpdateCustomerRequest {
  Customer customer = 1;
  google.protobuf.FieldMask update_mask = 2;   // e.g. paths: ["email", "address.city"]
}
```

Server rules: only update listed paths; reject unknown paths with `INVALID_ARGUMENT`; an empty mask either means "update all set fields" or is rejected, documented explicitly (AIP-134).

## Any and Struct

- `google.protobuf.Any` packs an arbitrary message with its type URL; use for extensible error details or plugin payloads, not as a way to avoid designing types.
- `google.protobuf.Struct` holds JSON-like data; loses type safety; acceptable for user-defined metadata.

## Rich Errors

Use `google.rpc.Status` with details (`google.rpc.BadRequest`, `ErrorInfo`, `RetryInfo`, `QuotaFailure`) so clients can act on structured errors:

```proto
// returned via grpc-status-details-bin trailer
google.rpc.ErrorInfo { reason: "INSUFFICIENT_FUNDS", domain: "payments.acme.com", metadata { key: "account_id" value: "acc_1" } }
```

## Resource-Oriented Design (Google AIPs)

```proto
service InvoiceService {
  rpc GetInvoice(GetInvoiceRequest) returns (Invoice);
  rpc ListInvoices(ListInvoicesRequest) returns (ListInvoicesResponse);
  rpc CreateInvoice(CreateInvoiceRequest) returns (Invoice);
  rpc UpdateInvoice(UpdateInvoiceRequest) returns (Invoice);
  rpc DeleteInvoice(DeleteInvoiceRequest) returns (google.protobuf.Empty);
}

message ListInvoicesRequest {
  string parent = 1;          // "customers/123"
  int32 page_size = 2;
  string page_token = 3;      // opaque
  string filter = 4;
}

message ListInvoicesResponse {
  repeated Invoice invoices = 1;
  string next_page_token = 2;
}
```

- One request/response message per RPC (even if it has one field) so fields can be added later.
- Resource names as strings (`customers/123/invoices/456`).
- Opaque page tokens; cap `page_size` server-side.
- `request_id` field for idempotent creates (AIP-155).

## Validation with protovalidate

```proto
import "buf/validate/validate.proto";

message CreateTransferRequest {
  string from_account = 1 [(buf.validate.field).string.min_len = 1];
  string to_account = 2 [(buf.validate.field).string.min_len = 1];
  int64 amount_minor = 3 [(buf.validate.field).int64.gt = 0];
  string currency = 4 [(buf.validate.field).string.pattern = "^[A-Z]{3}$"];

  option (buf.validate.message).cel = {
    id: "distinct_accounts"
    message: "from_account and to_account must differ"
    expression: "this.from_account != this.to_account"
  };
}
```

protovalidate (successor to `protoc-gen-validate`) evaluates CEL rules at runtime in Go, Java, Python, C++ and TypeScript; run it in a server interceptor.

## Schema Evolution Rules

| Change | Safe? |
|--------|-------|
| Add a field with a new number | Yes |
| Remove a field (and `reserved` its number and name) | Yes, if readers tolerate absence |
| Rename a field | Wire-safe, breaks JSON and generated code |
| Change field type | Only between documented compatible types (e.g. `int32`/`int64`/`uint32` with truncation caveats); avoid |
| Change field number | No |
| Move field into/out of `oneof` | No |
| Change `repeated` to singular | No |
| Add enum value | Yes, if clients handle unknown values |

```proto
message Customer {
  reserved 4, 7 to 9;
  reserved "legacy_score";
}
```

## Package Versioning

- Major versions in the package: `acme.payments.v1`, `acme.payments.v2`. Breaking changes go to a new package; run both during migration.
- Pre-release: `v1alpha1`, `v1beta1` with explicit stability expectations.

## Buf Toolchain

```yaml
# buf.yaml (v2)
version: v2
modules:
  - path: proto
lint:
  use: [STANDARD]
breaking:
  use: [FILE]
deps:
  - buf.build/bufbuild/protovalidate
  - buf.build/googleapis/googleapis
```

```bash
buf lint
buf format -w
buf breaking --against '.git#branch=main'
buf generate
```

Run `buf breaking` in CI on every PR; publish modules to the Buf Schema Registry or an internal registry for consumers.

## Checklist

- [ ] `optional`/messages where presence matters; enums with `UNSPECIFIED = 0`
- [ ] One request/response message per RPC; AIP-style resource names and pagination
- [ ] FieldMask for partial updates; documented empty-mask behaviour
- [ ] protovalidate rules enforced server-side
- [ ] Removed fields reserved; `buf breaking` in CI
- [ ] Versioned packages for breaking changes
