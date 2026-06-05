# Tool Schema Definitions

## Schema-First Contract Design

Every tool exposed to an AI agent must have a strict, machine-readable contract that defines its inputs, outputs, constraints, and behavioral guarantees. JSON Schema serves as the canonical schema language for MCP tool definitions. This reference covers schema design patterns from basic type definitions through complex composition, validation implementation, and contract evolution strategies.

```
+-------------------+       +-------------------+       +-------------------+
|   Tool Contract   | ───►  | Schema Validator  | ───►  | Tool Executor     |
|   (JSON Schema)   |       | (Compile-time)    |       | (Runtime)         |
+-------------------+       +-------------------+       +-------------------+
        │                           │                           │
        │  Defines types,           │  Rejects invalid          │  Executes with
        │  required fields,         │  inputs at gate           │  validated params
        │  constraints              │  before execution         │
```

---

## JSON Schema Fundamentals for Tools

### Basic Tool Schema Structure

Every MCP tool schema follows the JSON Schema Draft 2020-12 specification. The `inputSchema` property defines the tool's parameter contract.

```json
{
  "name": "database_query",
  "description": "Execute a read-only SQL query against the application database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "SQL SELECT query to execute",
        "minLength": 1,
        "maxLength": 10000,
        "pattern": "^\\s*SELECT\\s"
      },
      "database": {
        "type": "string",
        "description": "Target database name",
        "enum": ["production_readonly", "staging", "analytics"]
      },
      "timeout_ms": {
        "type": "integer",
        "description": "Query timeout in milliseconds",
        "minimum": 100,
        "maximum": 30000,
        "default": 5000
      },
      "max_rows": {
        "type": "integer",
        "description": "Maximum number of rows to return",
        "minimum": 1,
        "maximum": 10000,
        "default": 100
      }
    },
    "required": ["query", "database"],
    "additionalProperties": false
  }
}
```

### Type System Reference

```
JSON Schema Type    │ Python Type     │ TypeScript Type  │ Constraints
────────────────────┼─────────────────┼──────────────────┼────────────────────
"string"            │ str             │ string           │ minLength, maxLength, pattern, enum, format
"integer"           │ int             │ number           │ minimum, maximum, multipleOf, exclusiveMin/Max
"number"            │ float           │ number           │ minimum, maximum, multipleOf
"boolean"           │ bool            │ boolean          │ (none)
"array"             │ list            │ Array<T>         │ items, minItems, maxItems, uniqueItems
"object"            │ dict            │ Record<K,V>      │ properties, required, additionalProperties
"null"              │ None            │ null             │ (none)
```

---

## Schema Design Patterns

### Pattern 1: File Operation Tools

```json
{
  "name": "file_edit",
  "description": "Apply a targeted edit to a specific file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file_path": {
        "type": "string",
        "description": "Absolute path to the file to edit",
        "minLength": 1,
        "pattern": "^/"
      },
      "old_content": {
        "type": "string",
        "description": "Exact content to find and replace. Must match verbatim.",
        "minLength": 1
      },
      "new_content": {
        "type": "string",
        "description": "Replacement content. Can be empty string for deletion."
      },
      "expected_count": {
        "type": "integer",
        "description": "Expected number of matches. Fails if actual count differs.",
        "minimum": 1,
        "default": 1
      }
    },
    "required": ["file_path", "old_content", "new_content"],
    "additionalProperties": false
  }
}
```

### Pattern 2: API Call Tools

```json
{
  "name": "http_request",
  "description": "Make an HTTP request to an external API",
  "inputSchema": {
    "type": "object",
    "properties": {
      "method": {
        "type": "string",
        "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"],
        "description": "HTTP method"
      },
      "url": {
        "type": "string",
        "format": "uri",
        "description": "Full URL to send the request to"
      },
      "headers": {
        "type": "object",
        "additionalProperties": { "type": "string" },
        "description": "Request headers as key-value pairs"
      },
      "body": {
        "type": "string",
        "description": "Request body (for POST, PUT, PATCH)",
        "maxLength": 1048576
      },
      "timeout_seconds": {
        "type": "integer",
        "minimum": 1,
        "maximum": 120,
        "default": 30
      }
    },
    "required": ["method", "url"],
    "additionalProperties": false
  }
}
```

### Pattern 3: Compound Tools with Conditional Fields

```json
{
  "name": "deploy_service",
  "description": "Deploy a service to the target environment",
  "inputSchema": {
    "type": "object",
    "properties": {
      "service_name": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9-]{2,63}$"
      },
      "environment": {
        "type": "string",
        "enum": ["staging", "production"]
      },
      "image_tag": {
        "type": "string",
        "pattern": "^[a-z0-9][a-z0-9._-]*$"
      },
      "replicas": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50,
        "default": 2
      },
      "canary_percentage": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100,
        "default": 0,
        "description": "Percentage of traffic to route to new version (0=full deploy)"
      },
      "health_check": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "default": "/health" },
          "interval_seconds": { "type": "integer", "minimum": 5, "default": 30 },
          "timeout_seconds": { "type": "integer", "minimum": 1, "default": 5 },
          "healthy_threshold": { "type": "integer", "minimum": 1, "default": 3 }
        },
        "additionalProperties": false
      }
    },
    "required": ["service_name", "environment", "image_tag"],
    "additionalProperties": false,
    "if": {
      "properties": { "environment": { "const": "production" } }
    },
    "then": {
      "required": ["service_name", "environment", "image_tag", "health_check"]
    }
  }
}
```

---

## Schema Composition

### Using $ref for Reusable Definitions

```json
{
  "$defs": {
    "FilePath": {
      "type": "string",
      "minLength": 1,
      "pattern": "^/",
      "description": "Absolute filesystem path"
    },
    "Encoding": {
      "type": "string",
      "enum": ["utf-8", "ascii", "base64", "binary"],
      "default": "utf-8"
    },
    "PaginationParams": {
      "type": "object",
      "properties": {
        "page": { "type": "integer", "minimum": 1, "default": 1 },
        "page_size": { "type": "integer", "minimum": 1, "maximum": 1000, "default": 50 }
      },
      "additionalProperties": false
    }
  },
  "tools": [
    {
      "name": "file_read",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "$ref": "#/$defs/FilePath" },
          "encoding": { "$ref": "#/$defs/Encoding" }
        },
        "required": ["path"]
      }
    },
    {
      "name": "search_files",
      "inputSchema": {
        "type": "object",
        "properties": {
          "directory": { "$ref": "#/$defs/FilePath" },
          "query": { "type": "string", "minLength": 1 },
          "pagination": { "$ref": "#/$defs/PaginationParams" }
        },
        "required": ["directory", "query"]
      }
    }
  ]
}
```

### Combining Schemas with allOf, anyOf, oneOf

```json
{
  "name": "transform_data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "source": {
        "oneOf": [
          {
            "type": "object",
            "properties": {
              "type": { "const": "file" },
              "path": { "type": "string" }
            },
            "required": ["type", "path"]
          },
          {
            "type": "object",
            "properties": {
              "type": { "const": "inline" },
              "content": { "type": "string" }
            },
            "required": ["type", "content"]
          },
          {
            "type": "object",
            "properties": {
              "type": { "const": "url" },
              "url": { "type": "string", "format": "uri" }
            },
            "required": ["type", "url"]
          }
        ],
        "description": "Data source - can be a file path, inline content, or URL"
      },
      "output_format": {
        "type": "string",
        "enum": ["json", "csv", "yaml", "xml"]
      }
    },
    "required": ["source", "output_format"]
  }
}
```

---

## Schema Validation Implementation

### Python Schema Validator

```python
import json
from typing import Any, Optional
from dataclasses import dataclass, field


@dataclass
class ValidationError:
    """Represents a single schema validation error."""
    path: str
    message: str
    value: Any = None


@dataclass
class ValidationResult:
    """Result of schema validation."""
    valid: bool
    errors: list[ValidationError] = field(default_factory=list)

    def add_error(self, path: str, message: str, value: Any = None) -> None:
        self.errors.append(ValidationError(path=path, message=message, value=value))
        self.valid = False

    def __str__(self) -> str:
        if self.valid:
            return "Validation passed"
        error_msgs = [f"  - {e.path}: {e.message}" for e in self.errors]
        return f"Validation failed:\n" + "\n".join(error_msgs)


class ToolSchemaValidator:
    """
    Validates tool call arguments against JSON Schema definitions.
    
    This is a lightweight, dependency-free validator that covers the
    most common schema constraints used in MCP tool definitions.
    For production use with complex schemas, consider jsonschema library.
    """

    def validate(self, schema: dict, data: Any, path: str = "$") -> ValidationResult:
        """Validate data against a JSON Schema."""
        result = ValidationResult(valid=True)
        self._validate_node(schema, data, path, result)
        return result

    def _validate_node(
        self, schema: dict, data: Any, path: str, result: ValidationResult
    ) -> None:
        """Recursively validate a data node against its schema."""
        
        # Handle type checking
        expected_type = schema.get("type")
        if expected_type:
            if not self._check_type(expected_type, data):
                result.add_error(
                    path,
                    f"Expected type '{expected_type}', got '{type(data).__name__}'",
                    data,
                )
                return  # Stop validating children if type is wrong

        # Handle const
        if "const" in schema:
            if data != schema["const"]:
                result.add_error(path, f"Must be exactly {schema['const']!r}", data)

        # Handle enum
        if "enum" in schema:
            if data not in schema["enum"]:
                result.add_error(
                    path,
                    f"Must be one of {schema['enum']}, got {data!r}",
                    data,
                )

        # String constraints
        if expected_type == "string" and isinstance(data, str):
            self._validate_string(schema, data, path, result)

        # Number constraints
        if expected_type in ("integer", "number") and isinstance(data, (int, float)):
            self._validate_number(schema, data, path, result)

        # Array constraints
        if expected_type == "array" and isinstance(data, list):
            self._validate_array(schema, data, path, result)

        # Object constraints
        if expected_type == "object" and isinstance(data, dict):
            self._validate_object(schema, data, path, result)

        # Handle oneOf
        if "oneOf" in schema:
            self._validate_one_of(schema["oneOf"], data, path, result)

    def _check_type(self, expected: str, data: Any) -> bool:
        """Check if data matches the expected JSON Schema type."""
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict,
            "null": type(None),
        }
        expected_python_type = type_map.get(expected)
        if expected_python_type is None:
            return True  # Unknown type, pass through
        # Special case: bool is subclass of int in Python
        if expected == "integer" and isinstance(data, bool):
            return False
        return isinstance(data, expected_python_type)

    def _validate_string(
        self, schema: dict, data: str, path: str, result: ValidationResult
    ) -> None:
        """Validate string-specific constraints."""
        if "minLength" in schema and len(data) < schema["minLength"]:
            result.add_error(
                path,
                f"String length {len(data)} is below minimum {schema['minLength']}",
                data,
            )
        if "maxLength" in schema and len(data) > schema["maxLength"]:
            result.add_error(
                path,
                f"String length {len(data)} exceeds maximum {schema['maxLength']}",
                data,
            )
        if "pattern" in schema:
            import re
            if not re.search(schema["pattern"], data):
                result.add_error(
                    path,
                    f"String does not match pattern '{schema['pattern']}'",
                    data,
                )

    def _validate_number(
        self, schema: dict, data: float, path: str, result: ValidationResult
    ) -> None:
        """Validate numeric constraints."""
        if "minimum" in schema and data < schema["minimum"]:
            result.add_error(path, f"Value {data} is below minimum {schema['minimum']}")
        if "maximum" in schema and data > schema["maximum"]:
            result.add_error(path, f"Value {data} exceeds maximum {schema['maximum']}")
        if "exclusiveMinimum" in schema and data <= schema["exclusiveMinimum"]:
            result.add_error(
                path, f"Value {data} must be > {schema['exclusiveMinimum']}"
            )
        if "exclusiveMaximum" in schema and data >= schema["exclusiveMaximum"]:
            result.add_error(
                path, f"Value {data} must be < {schema['exclusiveMaximum']}"
            )

    def _validate_array(
        self, schema: dict, data: list, path: str, result: ValidationResult
    ) -> None:
        """Validate array constraints."""
        if "minItems" in schema and len(data) < schema["minItems"]:
            result.add_error(path, f"Array length {len(data)} below minimum {schema['minItems']}")
        if "maxItems" in schema and len(data) > schema["maxItems"]:
            result.add_error(path, f"Array length {len(data)} exceeds maximum {schema['maxItems']}")
        if "uniqueItems" in schema and schema["uniqueItems"]:
            seen = []
            for item in data:
                item_str = json.dumps(item, sort_keys=True)
                if item_str in seen:
                    result.add_error(path, f"Array contains duplicate item: {item!r}")
                    break
                seen.append(item_str)
        if "items" in schema:
            for i, item in enumerate(data):
                self._validate_node(schema["items"], item, f"{path}[{i}]", result)

    def _validate_object(
        self, schema: dict, data: dict, path: str, result: ValidationResult
    ) -> None:
        """Validate object constraints."""
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        additional = schema.get("additionalProperties", True)

        # Check required fields
        for field_name in required:
            if field_name not in data:
                result.add_error(
                    f"{path}.{field_name}",
                    f"Required field '{field_name}' is missing",
                )

        # Validate each property
        for key, value in data.items():
            if key in properties:
                self._validate_node(properties[key], value, f"{path}.{key}", result)
            elif additional is False:
                result.add_error(
                    f"{path}.{key}",
                    f"Additional property '{key}' is not allowed",
                    value,
                )

    def _validate_one_of(
        self, schemas: list[dict], data: Any, path: str, result: ValidationResult
    ) -> None:
        """Validate that data matches exactly one of the provided schemas."""
        matching = 0
        for i, sub_schema in enumerate(schemas):
            sub_result = ValidationResult(valid=True)
            self._validate_node(sub_schema, data, f"{path}/oneOf[{i}]", sub_result)
            if sub_result.valid:
                matching += 1

        if matching == 0:
            result.add_error(path, f"Value does not match any of the {len(schemas)} oneOf schemas")
        elif matching > 1:
            result.add_error(path, f"Value matches {matching} schemas, but must match exactly one")


# Usage Example
if __name__ == "__main__":
    validator = ToolSchemaValidator()

    schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "minLength": 1,
                "pattern": "^\\s*SELECT\\s",
            },
            "database": {
                "type": "string",
                "enum": ["production_readonly", "staging"],
            },
            "timeout_ms": {
                "type": "integer",
                "minimum": 100,
                "maximum": 30000,
            },
        },
        "required": ["query", "database"],
        "additionalProperties": False,
    }

    # Valid input
    valid_result = validator.validate(schema, {
        "query": "SELECT * FROM users LIMIT 10",
        "database": "staging",
        "timeout_ms": 5000,
    })
    print(f"Valid input: {valid_result}")

    # Invalid input
    invalid_result = validator.validate(schema, {
        "query": "DELETE FROM users",  # Doesn't match SELECT pattern
        "database": "unknown_db",      # Not in enum
        "timeout_ms": 50,              # Below minimum
        "extra_field": True,           # Not allowed
    })
    print(f"Invalid input: {invalid_result}")
```

---

## TypeScript Schema Validation

```typescript
import Ajv, { ValidateFunction, ErrorObject } from "ajv";
import addFormats from "ajv-formats";

interface ToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface ToolValidationResult {
  valid: boolean;
  errors: string[];
  coercedData?: Record<string, unknown>;
}

class ToolSchemaRegistry {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();
  private schemas: Map<string, ToolSchema> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,       // Report all errors, not just first
      coerceTypes: false,    // Don't silently coerce types
      useDefaults: true,     // Apply default values from schema
      strict: true,          // Strict mode for schema correctness
      removeAdditional: false, // Don't silently remove extra fields
    });
    addFormats(this.ajv);
  }

  registerTool(tool: ToolSchema): void {
    const validator = this.ajv.compile(tool.inputSchema);
    this.validators.set(tool.name, validator);
    this.schemas.set(tool.name, tool);
    console.log(`[Schema] Registered tool '${tool.name}' with schema validation`);
  }

  validateToolInput(
    toolName: string,
    input: Record<string, unknown>
  ): ToolValidationResult {
    const validator = this.validators.get(toolName);
    if (!validator) {
      return {
        valid: false,
        errors: [`Tool '${toolName}' not registered in schema registry`],
      };
    }

    // Clone input to avoid mutating original (defaults may be applied)
    const inputCopy = JSON.parse(JSON.stringify(input));
    const valid = validator(inputCopy);

    if (valid) {
      return { valid: true, errors: [], coercedData: inputCopy as Record<string, unknown> };
    }

    const errors = (validator.errors || []).map((err: ErrorObject) => {
      const path = err.instancePath || "$";
      return `${path}: ${err.message} (${JSON.stringify(err.params)})`;
    });

    return { valid: false, errors };
  }

  getToolSchema(toolName: string): ToolSchema | undefined {
    return this.schemas.get(toolName);
  }

  listRegisteredTools(): string[] {
    return Array.from(this.schemas.keys());
  }
}

// Usage
const registry = new ToolSchemaRegistry();

registry.registerTool({
  name: "create_issue",
  description: "Create a new issue in the project tracker",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1, maxLength: 200 },
      body: { type: "string", maxLength: 65535 },
      labels: {
        type: "array",
        items: { type: "string" },
        maxItems: 10,
        uniqueItems: true,
        default: [],
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        default: "medium",
      },
      assignee: { type: "string" },
    },
    required: ["title"],
    additionalProperties: false,
  },
});

// Valid call
const result1 = registry.validateToolInput("create_issue", {
  title: "Fix login timeout bug",
  labels: ["bug", "auth"],
  priority: "high",
});
console.log("Valid:", result1);

// Invalid call
const result2 = registry.validateToolInput("create_issue", {
  title: "", // empty string, minLength=1 violation
  labels: ["bug", "bug"], // uniqueItems violation
  priority: "urgent", // not in enum
  unknown_field: true, // additionalProperties=false violation
});
console.log("Invalid:", result2);
```

---

## Output Schema Definitions

While MCP tool responses are loosely typed (array of content blocks), well-designed tools document their output structure for agent consumption.

### Output Schema Pattern

```json
{
  "name": "search_code",
  "description": "Search for code patterns across the repository",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "minLength": 1 },
      "file_pattern": { "type": "string", "default": "**/*" },
      "max_results": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20 }
    },
    "required": ["query"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "matches": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "file": { "type": "string" },
            "line": { "type": "integer" },
            "content": { "type": "string" },
            "context_before": { "type": "string" },
            "context_after": { "type": "string" }
          }
        }
      },
      "total_count": { "type": "integer" },
      "truncated": { "type": "boolean" }
    }
  }
}
```

---

## Schema Evolution Best Practices

### Adding New Optional Fields (Non-Breaking)

```json
{
  "version": "1.1.0",
  "changes": "Added optional 'format' parameter",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "database": { "type": "string" },
      "format": {
        "type": "string",
        "enum": ["json", "csv", "table"],
        "default": "json",
        "description": "Output format (added in v1.1.0)"
      }
    },
    "required": ["query", "database"]
  }
}
```

### Breaking Changes Requiring Major Version

```json
{
  "version": "2.0.0",
  "breaking_changes": [
    "Renamed 'query' to 'sql_statement'",
    "Changed 'database' from string to object with 'name' and 'schema' fields",
    "Removed 'timeout_ms' (now configured server-side)"
  ],
  "migration_guide": {
    "query": "Rename to 'sql_statement'",
    "database": "Change from string to { name: string, schema: string }",
    "timeout_ms": "Remove from client calls; configure via server env var DB_TIMEOUT_MS"
  }
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
| :--- | :--- | :--- |
| No `additionalProperties: false` | Agents send extra fields silently | Always set `additionalProperties: false` on tool schemas |
| Missing `required` array | Agents omit critical parameters | Explicitly list all mandatory fields in `required` |
| Using `type: "any"` or no type | No validation possible | Always specify concrete types for every property |
| Deeply nested optional objects | Agents struggle with complex structures | Flatten schemas; use max 2 levels of nesting |
| No `description` on properties | Agents guess parameter semantics | Every property must have a clear description |
| Overly permissive patterns | Invalid inputs pass validation | Use tight regex patterns and enum constraints |

---

## Handoff & Related References
- MCP Protocol Patterns: [mcp-protocol-patterns.md](mcp-protocol-patterns.md)
- Idempotency Patterns: [idempotency-patterns.md](idempotency-patterns.md)
- Tool Versioning: [tool-versioning-compatibility.md](tool-versioning-compatibility.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive schema definitions & validation code preserved)
Strict compliance with JSON Schema Draft 2020-12 and MCP tool contract specifications.
-->
