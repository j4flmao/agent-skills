# Authentication Testing

Systematic tests for authentication flows: login, token validation, refresh-token rotation, logout/revocation and brute-force protection. Examples use Jest/Vitest + Supertest against an Express/Nest-style app; the same cases apply to any stack.

## Test Helpers

Centralize requests and token creation so each test states only what differs.

```typescript
// test/auth-helpers.ts
import request from "supertest";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { app } from "../src/app";
import { UserRepo } from "../src/users/user.repo";

const SECRET = process.env.JWT_TEST_SECRET;
if (!SECRET) throw new Error("JWT_TEST_SECRET must be set for auth tests");

export const VALID = { email: "user@example.com", password: "ValidPass123!" };

export const login = (body: { email: string; password: string }) =>
  request(app).post("/v2/auth/login").send(body);

export const refresh = (refreshToken: string) =>
  request(app).post("/v2/auth/refresh").send({ refreshToken });

export const getOrders = (token?: string) => {
  const req = request(app).get("/v2/orders");
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
};

export function signTestToken(
  payload: Record<string, unknown>,
  opts: { secret?: string; expiresIn?: SignOptions["expiresIn"]; exp?: number } = {},
): string {
  const claims = opts.exp !== undefined ? { ...payload, exp: opts.exp } : payload;
  const options: SignOptions = { issuer: "test", audience: "api", jwtid: randomUUID(), algorithm: "HS256" };
  if (opts.exp === undefined) options.expiresIn = opts.expiresIn ?? "15m";
  return jwt.sign(claims, opts.secret ?? SECRET!, options);
}

export async function seedUser(): Promise<void> {
  await UserRepo.create({
    email: VALID.email,
    passwordHash: await bcrypt.hash(VALID.password, 10),
    roles: ["customer"],
    emailVerified: true,
  });
}
```

The test secret comes from the test environment (e.g. `.env.test`), never a hard-coded fallback that could leak into production config. Each test run uses an isolated database (transaction rollback or a fresh container) and `beforeEach(seedUser)`.

## Login

```typescript
describe("POST /v2/auth/login", () => {
  beforeEach(seedUser);

  it("returns tokens for valid credentials", async () => {
    const res = await login(VALID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      accessToken: expect.any(String), refreshToken: expect.any(String), expiresIn: expect.any(Number),
    }));
  });

  it.each([
    ["malformed email", { email: "not-an-email", password: VALID.password }, 422, "VALIDATION_ERROR"],
    ["empty password", { email: VALID.email, password: "" }, 422, "VALIDATION_ERROR"],
    ["wrong password", { email: VALID.email, password: "WrongPassword!" }, 401, "INVALID_CREDENTIALS"],
    ["unknown user", { email: "nobody@example.com", password: "SomePass123!" }, 401, "INVALID_CREDENTIALS"],
  ])("rejects %s", async (_name, body, status, code) => {
    const res = await login(body);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
  });
});
```

Unknown user and wrong password must return the same status, code and message (no account enumeration). Optionally assert similar response timing by ensuring the server performs a dummy hash comparison for unknown users.

## Access Token Validation

```typescript
describe("protected route token validation", () => {
  const claims = { sub: "user_123", roles: ["customer"] };
  const now = () => Math.floor(Date.now() / 1000);

  it("accepts a valid token", async () => {
    expect((await getOrders(signTestToken(claims))).status).toBe(200);
  });

  it.each([
    ["missing header", undefined, undefined],
    ["malformed token", "not-a-jwt", "INVALID_TOKEN"],
    ["wrong signature", signTestToken(claims, { secret: "another-test-secret" }), "INVALID_TOKEN"],
    ["expired token", signTestToken(claims, { exp: now() - 60 }), "TOKEN_EXPIRED"],
  ])("rejects %s", async (_name, token, code) => {
    const res = await getOrders(token);
    expect(res.status).toBe(401);
    if (code) expect(res.body.error.code).toBe(code);
  });

  it("rejects alg=none tokens", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ ...claims, exp: now() + 600 })).toString("base64url");
    expect((await getOrders(`${header}.${body}.`)).status).toBe(401);
  });
});
```

Use an explicit past `exp` instead of sleeping, so tests stay fast and deterministic. Also cover wrong `iss`/`aud`, tokens signed with an unexpected algorithm, and (for asymmetric keys) unknown `kid`.

## Refresh Token Rotation

```typescript
describe("POST /v2/auth/refresh", () => {
  beforeEach(seedUser);

  it("rotates the refresh token", async () => {
    const first = (await login(VALID)).body;
    const res = await refresh(first.refreshToken);
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(first.refreshToken);
  });

  it("detects reuse and revokes the token family", async () => {
    const { refreshToken } = (await login(VALID)).body;
    const rotated = (await refresh(refreshToken)).body.refreshToken;

    const reuse = await refresh(refreshToken);              // old token replayed
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe("TOKEN_REUSED");

    expect((await refresh(rotated)).status).toBe(401);      // whole family revoked
  });
});
```

Refresh tokens are typically opaque, stored hashed server-side with family IDs; test expiry by manipulating the stored expiry or using a fake clock rather than signing JWTs.

## Logout and Revocation

- After logout, the refresh token is rejected.
- Access tokens remain valid until expiry unless a denylist/introspection is used; test whichever behavior the design promises.
- Password change or "log out everywhere" revokes all refresh tokens of the user.

## Brute-Force Protection

```typescript
describe("brute-force protection", () => {
  beforeEach(seedUser);

  it("throttles repeated failures for one account", async () => {
    for (let i = 0; i < 5; i++) await login({ email: VALID.email, password: "WrongPassword!" });
    const res = await login(VALID);
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("rate limits by client IP across accounts", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => login({ email: `u${i}@example.com`, password: "x" })),
    );
    expect(results.some((r) => r.status === 429)).toBe(true);
  });
});
```

Prefer temporary, escalating throttling over permanent lockout: hard lockouts let attackers lock out real users (denial of service). Make thresholds configurable so tests can set them low; reset limiter state (e.g. Redis) between tests.

## Other Cases Worth Covering

| Area | Case |
|---|---|
| Password reset | Token single-use, expires, invalidated after password change; response identical for unknown emails |
| MFA | Missing/invalid TOTP rejected; replayed code rejected; recovery codes single-use |
| Sessions/cookies | `HttpOnly`, `Secure`, `SameSite` attributes set; CSRF protection on cookie-authenticated mutations |
| Authorization boundary | Valid token for user A cannot access user B's resources (IDOR) |
| Headers | No tokens in URLs or logs |

## Checklist
- [ ] Shared helpers; secrets from test env only
- [ ] Login success, validation errors and non-enumerating failures
- [ ] Expired, malformed, wrong-signature, `alg=none`, wrong `iss`/`aud` tokens rejected
- [ ] Refresh rotation with reuse detection and family revocation
- [ ] Logout and global revocation behavior verified
- [ ] Throttling by account and IP with `Retry-After`; no permanent lockout DoS
- [ ] Deterministic time handling (explicit `exp`, fake clocks)
