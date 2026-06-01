# Zod Runtime Validation Guide

## Why Zod?

TypeScript types are erased at compile time. Zod provides runtime validation schemas that double as TypeScript types via `z.infer`. This ensures external data (API responses, form inputs, localStorage, file reads) matches your expected shape at runtime.

## Core Concepts

### Basic Schemas
```typescript
import { z } from "zod";

// Primitives
const stringSchema = z.string();
const numberSchema = z.number();
const booleanSchema = z.boolean();
const dateSchema = z.date();

// With constraints
const emailSchema = z.string().email();
const positiveNumber = z.number().positive();
const minLength = z.string().min(3).max(100);
const regex = z.string().regex(/^[A-Z]{3}$/);
```

### Object Schemas
```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(["admin", "user", "viewer"]),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type User = z.infer<typeof UserSchema>;
// {
//   id: string;
//   name: string;
//   email: string;
//   age?: number | undefined;
//   role: "admin" | "user" | "viewer";
//   tags: string[];
//   metadata?: Record<string, unknown> | undefined;
// }
```

## Parsing

### Parse vs SafeParse
```typescript
// Throws on invalid data
const user = UserSchema.parse(data);

// Returns result object (no throw)
const result = UserSchema.safeParse(data);
if (result.success) {
  console.log(result.data);  // typed as User
} else {
  console.log(result.error);  // ZodError with details
}
```

### Partial & Deep Partial
```typescript
const PartialUser = UserSchema.partial();
// All fields optional

const DeepPartialUser = UserSchema.deepPartial();
// Nested fields also optional

const UserWithRequiredName = UserSchema.required({ name: true });
// Only name required, rest as-is
```

## Composition

### Merging
```typescript
const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const FullUserSchema = UserSchema.merge(TimestampsSchema);

// Pick & Omit
const UserPublicSchema = UserSchema.omit({ email: true });
const UserUpdateSchema = UserSchema.pick({ name: true, email: true });
```

### Unions & Discriminated Unions
```typescript
// Union
const ResultSchema = z.union([
  z.object({ status: z.literal("success"), data: z.unknown() }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

// Discriminated union (more efficient)
const ApiResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("success"), data: z.unknown() }),
  z.object({ status: z.literal("error"), message: z.string(), code: z.number() }),
]);
```

## Advanced Validation

### Refinements
```typescript
const PasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .refine(val => /[A-Z]/.test(val), "Must contain uppercase")
  .refine(val => /[0-9]/.test(val), "Must contain number");

// SuperRefine for complex cross-field validation
const SignupSchema = z.object({
  password: PasswordSchema,
  confirmPassword: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords must match",
      path: ["confirmPassword"],
    });
  }
});
```

### Transformations
```typescript
const DateStringSchema = z.string().datetime()
  .transform(str => new Date(str));

const NumberStringSchema = z.string()
  .transform(val => Number(val))
  .pipe(z.number().positive());

const SlugSchema = z.string()
  .transform(val => val.toLowerCase().replace(/ /g, "-"))
  .pipe(z.string().regex(/^[a-z0-9-]+$/));
```

## Integration Patterns

### API Client Validation
```typescript
async function fetchOrder(orderId: string): Promise<Order> {
  const response = await fetch(`/api/orders/${orderId}`);
  if (!response.ok) throw new ApiError(response.status);

  const data = await response.json();
  return OrderSchema.parse(data);  // Validates shape at runtime
}
```

### Form Validation
```typescript
const OrderFormSchema = z.object({
  customerName: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1, "At least one item required"),
});

// In React component
function OrderForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(data: unknown) {
    const result = OrderFormSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    // submit result.data
  }
}
```

### Environment Variables
```typescript
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
```

## Best Practices

1. **Parse at boundaries**: validate at API, file read, storage, form submit — never trust external data
2. **Infer types from schemas**: use `z.infer<typeof Schema>` instead of writing separate types
3. **Use `.safeParse()`** for expected failures (forms, external API), `.parse()` for unexpected failures
4. **Compose schemas**: build complex schemas from small, testable pieces
5. **Transform early**: convert strings to numbers/dates at parse time, not downstream
6. **Error formatting**: use `.flatten()` or `.format()` for user-friendly error messages
7. **No schema duplication**: schema is the single source of truth for shape + validation

### Testing Schemas
```typescript
describe("UserSchema", () => {
  it("validates a complete user", () => {
    const user = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Alice",
      email: "alice@example.com",
    };
    expect(() => UserSchema.parse(user)).not.toThrow();
  });

  it("rejects invalid email", () => {
    const result = UserSchema.safeParse({ ...validUser, email: "not-email" });
    expect(result.success).toBe(false);
  });
});
```
