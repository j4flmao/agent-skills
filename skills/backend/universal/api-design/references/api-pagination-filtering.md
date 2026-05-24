# API Pagination and Filtering

## Cursor vs Offset Pagination

| Aspect | Offset-based | Cursor-based |
|--------|-------------|--------------|
| Stability | Can miss/duplicate items on insert | Stable, insert-safe |
| Performance | O(n) for large offsets | O(1) with indexed cursor |
| Use case | Static data, admin panels | Real-time, live data |
| Implementation | `?page=2&limit=20` | `?cursor=eyJpZCI6MTB9&limit=20` |
| Sorting | Arbitrary | Requires sortable cursor field |

### Cursor Implementation

```typescript
// Response
{
  "data": [...],
  "meta": {
    "pagination": {
      "nextCursor": "eyJpZCI6MjAsImNyZWF0ZWRfYXQiOiIyMDI0…",
      "hasNext": true,
      "limit": 20
    }
  }
}

// Cursor encoding (base64 of { id, sort_field })
function encodeCursor(id: string, sortValue: string): string {
  return Buffer.from(JSON.stringify({ id, sv: sortValue })).toString('base64');
}

// Cursor decoding
function decodeCursor(cursor: string): { id: string; sv: string } {
  return JSON.parse(Buffer.from(cursor, 'base64').toString());
}

// SQL query with cursor
SELECT id, name, created_at
FROM users
WHERE (created_at, id) < ($cursorDate, $cursorId)
ORDER BY created_at DESC, id DESC
LIMIT $limit + 1;  -- +1 to detect hasNext
```

## Filtering Patterns

| Pattern | URL | Use Case |
|---------|-----|----------|
| Exact match | `?status=active` | Enum fields |
| Range | `?createdAt.gte=2024-01-01&createdAt.lte=2024-06-30` | Dates, numbers |
| Partial match | `?q=searchterm` | Text search |
| Multi-value | `?status=active,pending` | OR conditions |
| Exclusion | `?status.ne=deleted` | NOT conditions |
| Nested | `?user.role=admin` | Relation filtering |

```typescript
// Filter parameter convention
interface FilterParams {
  exact?: Record<string, string>;
  range?: Record<string, { gte?: string; lte?: string }>;
  search?: string;
  sort?: string;  // "field" or "-field" for descending
}
```

## Sorting

```typescript
// Sort by single field
GET /users?sort=-createdAt  // Descending
GET /users?sort=name        // Ascending

// Sort by multiple fields
GET /users?sort=-createdAt,name

// Response sort metadata
{
  "data": [...],
  "meta": {
    "pagination": {...},
    "sort": ["-createdAt", "name"]
  }
}
```

## Field Selection

```typescript
// Sparse fieldset
GET /users?fields=id,name,email

// Exclude fields
GET /users?exclude=password,internal_notes
```

## Rate Limit Headers

```typescript
// Include in paginated responses
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1700000000
```

## Best Practices

- Default limit: 20. Max limit: 100. Require explicit `?limit=100` opt-in.
- Cursor-based for real-time feeds, offset-based for admin UIs.
- Filter documentation in OpenAPI spec with examples.
- Sort on indexed columns only — prevent DB full scan.
- Return `hasNext`/`hasPrev` instead of forcing client to calculate.
- Cache cursor results (cursors are stable, offset results are not).
