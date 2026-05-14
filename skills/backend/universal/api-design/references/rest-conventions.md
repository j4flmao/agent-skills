# REST API Conventions

## URL Structure
```
GET    /{resources}          → list
GET    /{resources}/{id}     → single
POST   /{resources}          → create
PUT    /{resources}/{id}     → full replace
PATCH  /{resources}/{id}     → partial update
DELETE /{resources}/{id}     → delete
```

## Query Parameters
```
?page=1&limit=20              → Pagination
?sort=-createdAt              → Sort (hyphen = descending)
?filter[status]=active        → Filter
?fields=id,name,email         → Field selection (sparse fields)
?include=user,items           → Include related resources
```

## Status Codes
| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failure |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Authenticated but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict (duplicate, stale data) |
| 422 | Unprocessable | Semantic validation failure |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Unexpected server error |
