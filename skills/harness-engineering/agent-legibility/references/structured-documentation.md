# Structured Documentation Reference

## Overview

Structured documentation transforms human-readable knowledge into formats that AI agents
can systematically parse, reason about, and apply. This reference covers the principles,
patterns, and implementation techniques for creating documentation that serves both humans
and machines effectively.

---

## 1. Machine-Readable Documentation Principles

### 1.1 Core Tenets

1. **Parseable Structure**: Use consistent heading hierarchies, lists, and tables
2. **Deterministic Semantics**: Each section has one unambiguous meaning
3. **Self-Contained Context**: Minimize cross-references; inline critical info
4. **Progressive Depth**: Summary → details → examples → edge cases
5. **Metadata Enrichment**: Include types, categories, and relationships

### 1.2 Structural Hierarchy

```
Document
├── Frontmatter (YAML metadata)
├── Title (H1)
├── Summary (first paragraph)
├── Table of Contents
├── Section (H2)
│   ├── Subsection (H3)
│   │   ├── Description (paragraph)
│   │   ├── Code Example (fenced block)
│   │   ├── Parameters (table)
│   │   └── Notes (blockquote)
│   └── Subsection (H3)
├── Section (H2)
└── References (final H2)
```

### 1.3 Agent Parsing Expectations

AI agents process documentation by:

1. **Scanning headings** to build a mental table of contents
2. **Reading the first paragraph** of each section for summary
3. **Extracting code blocks** as executable examples
4. **Parsing tables** as structured data
5. **Following cross-references** only when the current document is insufficient

### 1.4 Information Density Scale

```
┌────────────────────────────────────────────────────────────────┐
│ Density Level │ Format      │ Agent Utility │ Example          │
├────────────────────────────────────────────────────────────────┤
│ 1 - Minimal  │ Plain text  │ Low           │ Prose paragraphs │
│ 2 - Light    │ Headers+text│ Medium        │ Sectioned docs   │
│ 3 - Moderate │ +Code blocks│ Good          │ With examples    │
│ 4 - Rich     │ +Tables     │ High          │ With data tables │
│ 5 - Maximum  │ +Metadata   │ Excellent     │ YAML + structured│
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Structured Comments

### 2.1 Comment Architecture

Structured comments embed machine-readable metadata directly in source code:

```typescript
/**
 * @module UserAuthentication
 * @description Handles user login, logout, and session management.
 * @layer Application
 * @depends-on {@link DatabaseService}, {@link TokenService}
 * @consumed-by {@link AuthMiddleware}, {@link LoginPage}
 * @since 2.0.0
 * @stability stable
 */

/**
 * Authenticates a user with email and password credentials.
 *
 * @param credentials - The login credentials
 * @param credentials.email - User's email address (must be verified)
 * @param credentials.password - User's password (min 8 chars)
 * @returns Promise resolving to authenticated session or error
 *
 * @throws {InvalidCredentialsError} When email/password combination is wrong
 * @throws {AccountLockedError} When account has exceeded login attempts
 * @throws {EmailNotVerifiedError} When email hasn't been verified
 *
 * @example
 * ```typescript
 * const result = await authenticate({
 *   email: 'user@example.com',
 *   password: 'securePassword123'
 * });
 *
 * if (result.ok) {
 *   // Session created: result.value.token
 * } else {
 *   // Handle error: result.error.code
 * }
 * ```
 *
 * @see {@link logout} for ending sessions
 * @see {@link refreshToken} for extending sessions
 *
 * @permission requires:auth:login
 * @rateLimit 5 attempts per 15 minutes per IP
 * @audit logs to audit.authentication table
 */
export async function authenticate(
  credentials: LoginCredentials
): Promise<Result<Session, AuthError>> {
  // implementation
}
```

### 2.2 Module Header Pattern

Every module file should have a structured header:

```typescript
/**
 * @module PaymentProcessing
 * @file src/services/payment.ts
 *
 * @description
 * Handles payment processing through Stripe. Supports one-time payments,
 * subscriptions, and refunds. All monetary values use cents (integer).
 *
 * @architecture
 * - Layer: Infrastructure
 * - Pattern: Repository/Service
 * - External: Stripe API v2024-01
 *
 * @dependencies
 * - stripe: ^14.0.0 (payment processing)
 * - zod: ^3.22.0 (input validation)
 * - @repo/db: internal (database access)
 *
 * @exports
 * - createPayment: Process a one-time payment
 * - createSubscription: Set up recurring billing
 * - cancelSubscription: Cancel recurring billing
 * - processRefund: Refund a completed payment
 *
 * @env
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_WEBHOOK_SECRET: Webhook signature verification
 *
 * @see docs/adr/0005-stripe-integration.md
 */
```

### 2.3 Inline Decision Comments

```typescript
// DECISION: Use optimistic locking instead of pessimistic locking
// REASON: Lower contention in high-read scenarios
// ALTERNATIVE: SELECT ... FOR UPDATE (rejected: causes deadlocks under load)
// DATE: 2025-01-10
// AUTHOR: @engineering-team

// INVARIANT: Balance must never go negative
// ENFORCED-BY: Database CHECK constraint + application-level validation
// VIOLATION-IMPACT: Financial inconsistency, regulatory non-compliance

// PERFORMANCE: This query is O(n) where n = number of user's orders
// ACCEPTABLE: Users rarely have >1000 orders; paginated at 50
// MONITOR: Alert if p99 > 100ms (see grafana dashboard: orders-perf)

// SECURITY: Input sanitized via Zod schema before reaching this point
// THREAT-MODEL: SQL injection, XSS via order notes field
// MITIGATIONS: Parameterized queries (Prisma), output encoding (React)

// TODO(priority:high): Migrate to batch processing for >100 items
// TICKET: ENG-1234
// DEADLINE: 2025-Q2
// IMPACT: Current implementation times out for large catalogs
```

---

## 3. JSDoc/TSDoc for Agent Consumption

### 3.1 Complete JSDoc Reference

```typescript
/**
 * Represents a user in the system.
 *
 * @interface
 * @category Domain
 * @since 1.0.0
 *
 * @property {string} id - Unique identifier (UUID v7)
 * @property {string} email - Verified email address
 * @property {string} displayName - User-chosen display name (2-50 chars)
 * @property {UserRole} role - Authorization role
 * @property {Date} createdAt - Account creation timestamp
 * @property {Date | null} lastLoginAt - Most recent login (null if never)
 *
 * @example
 * ```typescript
 * const user: User = {
 *   id: '01234567-89ab-cdef-0123-456789abcdef',
 *   email: 'jane@example.com',
 *   displayName: 'Jane Doe',
 *   role: 'admin',
 *   createdAt: new Date('2025-01-01'),
 *   lastLoginAt: new Date('2025-01-15'),
 * };
 * ```
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Available user roles in the authorization system.
 *
 * @enum
 * @category Domain
 *
 * @member admin - Full system access, can manage users and settings
 * @member editor - Can create and modify content, cannot manage users
 * @member viewer - Read-only access to published content
 * @member guest - Limited access, pre-registration state
 */
export type UserRole = 'admin' | 'editor' | 'viewer' | 'guest';

/**
 * Repository for user data access.
 *
 * @class
 * @category Infrastructure
 * @implements {IUserRepository}
 *
 * @description
 * Provides CRUD operations for User entities using Prisma ORM.
 * All methods handle their own error boundaries and return Result types.
 *
 * @example
 * ```typescript
 * const repo = new UserRepository(prisma);
 * const result = await repo.findById('user-id');
 *
 * if (result.ok) {
 *   console.log(result.value.displayName);
 * }
 * ```
 */
export class UserRepository implements IUserRepository {
  /**
   * Creates a new UserRepository instance.
   *
   * @param prisma - Prisma client instance (injected)
   * @param logger - Logger instance for query logging
   * @param cache - Optional Redis cache for read-through caching
   */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
    private readonly cache?: RedisCache
  ) {}

  /**
   * Find a user by their unique identifier.
   *
   * @param id - The user's UUID
   * @returns The user if found, NotFoundError if not
   *
   * @complexity O(1) - primary key lookup
   * @caching TTL: 5 minutes, invalidated on update
   *
   * @example
   * ```typescript
   * const user = await repo.findById('01234567-89ab-cdef-0123-456789abcdef');
   * ```
   */
  async findById(id: string): Promise<Result<User, NotFoundError>> {
    // implementation
  }

  /**
   * Search users by display name with pagination.
   *
   * @param query - Search string (min 2 chars, fuzzy matched)
   * @param options - Pagination options
   * @param options.page - Page number (1-indexed, default: 1)
   * @param options.pageSize - Items per page (max: 100, default: 20)
   * @returns Paginated list of matching users
   *
   * @complexity O(n) where n = total users (uses ILIKE index)
   * @caching Not cached — results change frequently
   *
   * @example
   * ```typescript
   * const results = await repo.search('jane', { page: 1, pageSize: 20 });
   * // results.items: User[], results.total: number
   * ```
   */
  async search(
    query: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<User>> {
    // implementation
  }
}
```

### 3.2 TSDoc Specifics

TSDoc extends JSDoc with additional tags for TypeScript:

```typescript
/**
 * Creates a type-safe event emitter for domain events.
 *
 * @typeParam TEvents - Map of event names to their payload types
 *
 * @remarks
 * This implementation uses WeakRef for listener cleanup to prevent
 * memory leaks in long-running server processes. Listeners are
 * automatically garbage collected when their containing scope is
 * destroyed.
 *
 * @example
 * Define your event map:
 * ```typescript
 * interface AppEvents {
 *   'user:created': { userId: string; email: string };
 *   'user:deleted': { userId: string; reason: string };
 *   'order:placed': { orderId: string; total: number };
 * }
 *
 * const emitter = createEventEmitter<AppEvents>();
 *
 * emitter.on('user:created', (payload) => {
 *   // payload is typed as { userId: string; email: string }
 *   sendWelcomeEmail(payload.email);
 * });
 *
 * emitter.emit('user:created', {
 *   userId: '123',
 *   email: 'user@example.com',
 * });
 * ```
 *
 * @public
 */
export function createEventEmitter<
  TEvents extends Record<string, unknown>
>(): TypedEventEmitter<TEvents> {
  // implementation
}
```

---

## 4. API Documentation Patterns

### 4.1 OpenAPI/Swagger as Agent Documentation

```yaml
# openapi.yaml - Agent-readable API documentation
openapi: 3.1.0
info:
  title: Project API
  version: 2.0.0
  description: |
    RESTful API for the project platform.
    
    ## Authentication
    All endpoints require Bearer token authentication except /auth/login.
    Include the token in the Authorization header: `Bearer <token>`
    
    ## Rate Limiting
    - Standard endpoints: 100 requests/minute
    - Auth endpoints: 5 requests/minute
    - Upload endpoints: 10 requests/minute
    
    ## Error Format
    All errors return: { "error": { "code": "ERROR_CODE", "message": "..." } }

paths:
  /api/users:
    get:
      operationId: listUsers
      summary: List all users with pagination
      description: |
        Returns a paginated list of users. Results are ordered by creation date
        descending. Supports filtering by role and search by display name.
      tags: [Users]
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
          description: Page number (1-indexed)
        - name: pageSize
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          description: Number of items per page
        - name: role
          in: query
          schema:
            $ref: '#/components/schemas/UserRole'
          description: Filter by user role
        - name: search
          in: query
          schema:
            type: string
            minLength: 2
          description: Search by display name (fuzzy match)
      responses:
        '200':
          description: Paginated list of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedUsers'
              example:
                data:
                  - id: "01234567-89ab-cdef-0123-456789abcdef"
                    email: "jane@example.com"
                    displayName: "Jane Doe"
                    role: "admin"
                    createdAt: "2025-01-01T00:00:00Z"
                pagination:
                  page: 1
                  pageSize: 20
                  total: 150
                  totalPages: 8
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

    post:
      operationId: createUser
      summary: Create a new user
      description: |
        Creates a new user account. Sends a verification email automatically.
        The user must verify their email before they can log in.
      tags: [Users]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserInput'
            example:
              email: "newuser@example.com"
              displayName: "New User"
              role: "editor"
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/ValidationError'
        '409':
          description: Email already registered
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error:
                  code: "EMAIL_EXISTS"
                  message: "A user with this email already exists"

components:
  schemas:
    User:
      type: object
      required: [id, email, displayName, role, createdAt]
      properties:
        id:
          type: string
          format: uuid
          description: Unique identifier (UUID v7)
        email:
          type: string
          format: email
          description: Verified email address
        displayName:
          type: string
          minLength: 2
          maxLength: 50
          description: User-chosen display name
        role:
          $ref: '#/components/schemas/UserRole'
        createdAt:
          type: string
          format: date-time
          description: Account creation timestamp (ISO 8601)
        lastLoginAt:
          type: string
          format: date-time
          nullable: true
          description: Most recent login timestamp

    UserRole:
      type: string
      enum: [admin, editor, viewer, guest]
      description: |
        Authorization levels:
        - admin: Full system access
        - editor: Content management
        - viewer: Read-only access
        - guest: Pre-registration access
```

### 4.2 Inline API Documentation

```typescript
/**
 * @api {GET} /api/users List Users
 * @apiVersion 2.0.0
 * @apiGroup Users
 * @apiPermission admin, editor
 *
 * @apiQuery {Number} [page=1] Page number (1-indexed)
 * @apiQuery {Number} [pageSize=20] Items per page (max: 100)
 * @apiQuery {String} [role] Filter by role
 * @apiQuery {String} [search] Search display name (min 2 chars)
 *
 * @apiSuccess {Object[]} data Array of user objects
 * @apiSuccess {Object} pagination Pagination metadata
 *
 * @apiError (401) Unauthorized Missing or invalid auth token
 * @apiError (403) Forbidden Insufficient permissions
 */
export async function GET(request: NextRequest) {
  // implementation
}
```

---

## 5. Architecture Decision Records (ADRs)

### 5.1 ADR Template

```markdown
# ADR-0001: Use Next.js App Router

## Status
Accepted

## Date
2025-01-10

## Context
We need to choose a routing strategy for our Next.js application.
The two options are:
1. Pages Router (stable, well-documented, widely adopted)
2. App Router (newer, supports React Server Components, streaming)

## Decision Drivers
- **Performance**: Need server-side rendering with streaming
- **Developer Experience**: Simpler data fetching patterns
- **Future-proofing**: App Router is the recommended path forward
- **Bundle Size**: Server Components reduce client JavaScript

## Decision
We will use the **App Router** pattern for all new routes.

## Consequences

### Positive
- React Server Components reduce client-side JavaScript by ~40%
- Streaming SSR improves Time to First Byte
- Simplified data fetching with async components
- Built-in loading and error states per route segment
- Layout nesting reduces component duplication

### Negative
- Learning curve for team members familiar with Pages Router
- Some third-party libraries don't fully support Server Components
- More complex mental model (server vs. client boundaries)
- Caching behavior is implicit and sometimes surprising

### Neutral
- Existing Pages Router routes can coexist during migration
- Testing patterns are different but not harder

## Alternatives Considered

### Pages Router (Rejected)
- Pro: More stable, better ecosystem support
- Con: No Server Components, no streaming SSR
- Con: Being phased out as primary recommendation

### Remix (Rejected)
- Pro: Excellent data loading patterns
- Con: Different ecosystem, team lacks experience
- Con: Less community support than Next.js

## Implementation Notes
- All new routes use `app/` directory
- Migrate existing `pages/` routes incrementally
- Server Components are default; add `'use client'` only when needed
- Use `loading.tsx` for Suspense boundaries
- Use `error.tsx` for error boundaries

## References
- Next.js App Router docs: https://nextjs.org/docs/app
- React Server Components RFC
- Internal migration guide: docs/migration/app-router.md
```

### 5.2 ADR Index File

```markdown
# Architecture Decision Records

## Index

| ID   | Title                           | Status   | Date       |
|------|---------------------------------|----------|------------|
| 0001 | Use Next.js App Router          | Accepted | 2025-01-10 |
| 0002 | PostgreSQL over MongoDB         | Accepted | 2025-01-10 |
| 0003 | Prisma as ORM                   | Accepted | 2025-01-10 |
| 0004 | Tailwind CSS for Styling        | Accepted | 2025-01-12 |
| 0005 | Stripe for Payment Processing   | Accepted | 2025-01-15 |
| 0006 | pnpm Monorepo with Turborepo    | Accepted | 2025-01-15 |
| 0007 | Vitest over Jest                | Accepted | 2025-01-18 |
| 0008 | Use Result Type Pattern         | Accepted | 2025-01-20 |
| 0009 | Feature Flags via PostHog       | Proposed | 2025-01-22 |
| 0010 | Migrate Auth to Clerk           | Rejected | 2025-01-25 |

## How to Create a New ADR
1. Copy `docs/adr/template.md` to `docs/adr/NNNN-title.md`
2. Fill in all sections
3. Submit as PR for team review
4. Update this index when merged

## Status Definitions
- **Proposed**: Under discussion, not yet decided
- **Accepted**: Decision made and implemented
- **Deprecated**: Superseded by a newer ADR
- **Rejected**: Considered but not adopted
```

### 5.3 ADR for Agent Consumption

Agents benefit from ADRs because they explain **why** decisions were made, not just
what was decided. When an agent encounters a pattern it might want to change, the ADR
provides context to prevent it from undoing intentional decisions.

```typescript
// src/lib/result.ts

// ADR-0008: Use Result Type Pattern
// This file implements the Result type used throughout the codebase.
// We use this instead of throwing exceptions for expected error cases.
// See: docs/adr/0008-result-type-pattern.md

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage in service layer:
// return ok(user);           // Success case
// return err(new NotFoundError('User not found'));  // Expected error
// throw new Error('...');    // Unexpected error (let it propagate)
```

---

## 6. Structured README Patterns

### 6.1 Agent-Optimized README Structure

```markdown
# Project Name

> One-line description of what this project does.

## Quick Reference

| Item        | Value                                |
|-------------|--------------------------------------|
| Language    | TypeScript 5.4                       |
| Runtime     | Node.js 20+                         |
| Framework   | Next.js 14 (App Router)              |
| Database    | PostgreSQL 16                        |
| ORM         | Prisma 5.x                           |
| Styling     | Tailwind CSS 3.x                     |
| Testing     | Vitest + React Testing Library       |
| CI/CD       | GitHub Actions                       |
| Hosting     | Vercel                               |
| Package Mgr | pnpm 9.x                            |

## Architecture

[See structured-documentation.md section on ASCII diagrams]

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL >= 16
- Redis >= 7

### Installation
```bash
git clone <repo-url>
cd project
pnpm install
cp .env.example .env.local
# Edit .env.local with your database credentials
pnpm db:migrate:dev
pnpm db:seed
pnpm dev
```

## Directory Structure

```
[annotated tree]
```

## Development Commands

| Command             | Description                    |
|---------------------|--------------------------------|
| `pnpm dev`          | Start dev server (port 3000)   |
| `pnpm build`        | Production build               |
| `pnpm test`         | Run test suite                 |
| `pnpm test:watch`   | Run tests in watch mode        |
| `pnpm lint`         | Run ESLint                     |
| `pnpm typecheck`    | Run TypeScript compiler        |
| `pnpm db:studio`    | Open Prisma Studio             |
| `pnpm db:migrate:dev` | Create/apply migration       |
```

---

## 7. Documentation File Formats

### 7.1 Markdown with YAML Frontmatter

```markdown
---
title: User Authentication API
category: API Reference
version: 2.1.0
last_updated: 2025-01-15
owner: "@auth-team"
status: stable
tags: [auth, api, security]
dependencies:
  - "@repo/db"
  - "jose"
  - "bcrypt"
related:
  - docs/api/sessions.md
  - docs/adr/0003-jwt-auth.md
---

# User Authentication API

[document content]
```

### 7.2 Structured Change Log

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- User profile image upload via S3 presigned URLs

### Changed
- Migrated session storage from JWT to database-backed sessions

## [2.1.0] - 2025-01-15

### Added
- Multi-factor authentication support (TOTP)
- Password reset flow with email verification
- Rate limiting on auth endpoints (5 req/min)

### Changed
- Upgraded bcrypt from v5 to v6 (security fix)
- Session expiry reduced from 30d to 7d

### Fixed
- Session not invalidated on password change (#234)
- Race condition in concurrent login attempts (#256)

### Security
- Patched CVE-2025-1234 in jose library
- Added CSRF protection to login form

## [2.0.0] - 2025-01-10

### Breaking Changes
- Changed authentication from cookie-based to Bearer token
- Removed deprecated `/api/v1/auth/*` endpoints
- User ID format changed from integer to UUID v7
```

---

## 8. Comment Conventions by Language

### 8.1 Python

```python
"""
Module: user_service.py
Layer: Application
Purpose: User lifecycle management

Dependencies:
    - sqlalchemy: Database ORM
    - pydantic: Input validation
    - passlib: Password hashing

Exports:
    - UserService: Main service class
    - create_user: Factory function
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel, EmailStr


class CreateUserInput(BaseModel):
    """
    Input schema for user creation.

    Attributes:
        email: Must be a valid, unique email address
        display_name: 2-50 characters, alphanumeric + spaces
        role: One of 'admin', 'editor', 'viewer' (default: 'viewer')

    Example:
        >>> input = CreateUserInput(
        ...     email="jane@example.com",
        ...     display_name="Jane Doe",
        ...     role="editor"
        ... )

    Validation:
        - Email: RFC 5322 format, checked for uniqueness at service layer
        - Display name: Stripped, validated length after strip
        - Role: Must be a valid UserRole enum value
    """

    email: EmailStr
    display_name: str
    role: str = "viewer"


class UserService:
    """
    Manages user lifecycle operations.

    Architecture:
        This service sits in the Application layer and coordinates
        between the Domain (User entity) and Infrastructure (UserRepository).

    Thread Safety:
        This class is NOT thread-safe. Each request should create a new
        instance via the `create_user_service()` factory function.

    Error Handling:
        All methods return Result[T, E] types. Exceptions are only raised
        for truly unexpected errors (database connection failures, etc.)
    """

    def __init__(self, repo: UserRepository, hasher: PasswordHasher) -> None:
        """
        Initialize UserService.

        Args:
            repo: User data access repository
            hasher: Password hashing utility

        Note:
            Use `create_user_service()` factory function instead of
            direct instantiation.
        """
        self._repo = repo
        self._hasher = hasher

    async def find_by_id(self, user_id: str) -> Result[User, NotFoundError]:
        """
        Find a user by their unique ID.

        Args:
            user_id: UUID v7 string

        Returns:
            Result containing User on success, NotFoundError on failure

        Performance:
            O(1) primary key lookup, cached for 5 minutes

        Example:
            >>> result = await service.find_by_id("01234567-89ab-cdef")
            >>> if result.is_ok():
            ...     print(result.value.display_name)
        """
        # implementation
        pass
```

### 8.2 Go

```go
// Package auth provides authentication and authorization utilities.
//
// Architecture:
//   - Layer: Infrastructure
//   - Pattern: Middleware chain
//   - Dependencies: golang-jwt/jwt, bcrypt
//
// Usage:
//
//	middleware := auth.NewMiddleware(auth.Config{
//	    Secret:    os.Getenv("JWT_SECRET"),
//	    Issuer:    "myapp",
//	    ExpiresIn: 24 * time.Hour,
//	})
//	router.Use(middleware.Authenticate)
//
// Security Considerations:
//   - Tokens are signed with HS256 (symmetric)
//   - Refresh tokens stored in httpOnly cookies
//   - Rate limiting applied at the handler level
package auth

import (
	"context"
	"time"
)

// Middleware provides JWT-based authentication for HTTP handlers.
//
// Thread Safety: Safe for concurrent use. The internal state is read-only
// after initialization.
//
// Performance: Token validation takes ~0.1ms per request.
// Uses an in-memory cache for recently validated tokens (TTL: 60s).
type Middleware struct {
	config Config
	cache  *tokenCache
}

// Authenticate validates the Bearer token in the Authorization header.
//
// Flow:
//  1. Extract token from Authorization header
//  2. Check token cache (skip validation if cached)
//  3. Validate JWT signature and claims
//  4. Extract user ID and roles from claims
//  5. Store user context in request context
//  6. Call next handler
//
// Error Responses:
//   - 401 Unauthorized: Missing or invalid token
//   - 403 Forbidden: Token valid but insufficient permissions
//
// Example:
//
//	router.GET("/api/users", middleware.Authenticate, usersHandler)
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	// implementation
}
```

---

## 9. Documentation Indexing

### 9.1 Documentation Map File

Create a `docs/INDEX.md` that serves as a documentation map:

```markdown
# Documentation Index

## Quick Links
- [Getting Started](./getting-started.md)
- [Architecture Overview](./architecture.md)
- [API Reference](./api/README.md)
- [Contributing Guide](../CONTRIBUTING.md)

## By Topic

### Setup & Configuration
| Document | Description | Audience |
|----------|-------------|----------|
| [Getting Started](./getting-started.md) | First-time setup guide | New developers |
| [Environment Variables](./env-vars.md) | Required env config | All developers |
| [Docker Setup](./docker.md) | Container configuration | DevOps |

### Architecture
| Document | Description | Audience |
|----------|-------------|----------|
| [Architecture Overview](./architecture.md) | System design | All developers |
| [Data Model](./data-model.md) | Database schema | Backend |
| [API Design](./api-design.md) | API conventions | Backend |

### Decision Records
| ID | Title | Status |
|----|-------|--------|
| [ADR-0001](./adr/0001-app-router.md) | Use App Router | Accepted |
| [ADR-0002](./adr/0002-postgres.md) | Use PostgreSQL | Accepted |
| [ADR-0003](./adr/0003-prisma.md) | Use Prisma ORM | Accepted |

### API Reference
| Endpoint Group | Document | Version |
|----------------|----------|---------|
| Authentication | [Auth API](./api/auth.md) | v2.1 |
| Users | [Users API](./api/users.md) | v2.0 |
| Orders | [Orders API](./api/orders.md) | v1.5 |
```

### 9.2 Auto-Generated Documentation Index

```python
#!/usr/bin/env python3
"""Generate documentation index from file headers."""

import re
from pathlib import Path
from typing import NamedTuple


class DocEntry(NamedTuple):
    path: str
    title: str
    category: str
    description: str


def extract_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter from markdown file."""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return {}
    
    result = {}
    for line in match.group(1).splitlines():
        if ':' in line:
            key, value = line.split(':', 1)
            result[key.strip()] = value.strip()
    
    return result


def extract_title(content: str) -> str:
    """Extract H1 title from markdown."""
    match = re.search(r'^# (.+)$', content, re.MULTILINE)
    return match.group(1) if match else "Untitled"


def scan_docs(docs_dir: Path) -> list[DocEntry]:
    """Scan docs directory for markdown files."""
    entries = []
    
    for md_file in sorted(docs_dir.rglob("*.md")):
        if md_file.name == "INDEX.md":
            continue
        
        content = md_file.read_text(encoding="utf-8")
        frontmatter = extract_frontmatter(content)
        title = frontmatter.get("title", extract_title(content))
        category = frontmatter.get("category", "Uncategorized")
        description = frontmatter.get("description", "")
        
        rel_path = md_file.relative_to(docs_dir)
        entries.append(DocEntry(
            path=str(rel_path),
            title=title,
            category=category,
            description=description,
        ))
    
    return entries


def generate_index(entries: list[DocEntry]) -> str:
    """Generate INDEX.md content."""
    lines = ["# Documentation Index\n"]
    
    # Group by category
    categories: dict[str, list[DocEntry]] = {}
    for entry in entries:
        categories.setdefault(entry.category, []).append(entry)
    
    for category in sorted(categories.keys()):
        lines.append(f"\n## {category}\n")
        lines.append("| Document | Description |")
        lines.append("|----------|-------------|")
        
        for entry in categories[category]:
            lines.append(f"| [{entry.title}](./{entry.path}) | {entry.description} |")
    
    return "\n".join(lines)


if __name__ == "__main__":
    docs_dir = Path("docs")
    entries = scan_docs(docs_dir)
    index_content = generate_index(entries)
    
    (docs_dir / "INDEX.md").write_text(index_content)
    print(f"Generated INDEX.md with {len(entries)} entries")
```

---

## 10. Cross-References

- For AGENTS.md design: `agents-md-design.md`
- For README patterns: `agent-optimized-readmes.md`
- For progressive context: `progressive-context-disclosure.md`
- For navigation hints: `codebase-navigation-hints.md`
- For workspace setup: `workspace-configuration.md`

<!-- Compression: Structured documentation reference covering machine-readable formats,
     structured comments, JSDoc/TSDoc, API documentation (OpenAPI), ADRs, README patterns,
     documentation indexing, and language-specific comment conventions -->
