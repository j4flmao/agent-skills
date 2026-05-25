# Technical Specification Templates

## Standard Template

### Structure
```
# Tech Spec: {Title}

## Overview
- Goal: {one sentence}
- Context: {background, why this exists}
- Related ADRs: {links}

## Design
### Architecture
- {diagram or description}
- {components and their responsibilities}

### API Design
- {endpoints, request/response shapes}
- {error codes and handling}

### Data Model
- {schema changes, new tables/collections}
- {migration strategy}

### Security
- {auth requirements, data sensitivity}
- {compliance considerations}

## Implementation Plan
### Phases
1. {phase 1} — {scope, effort}
2. {phase 2} — {scope, effort}

### Dependencies
- {internal}: {description}
- {external}: {description}

## Testing Strategy
- Unit tests: {what to cover}
- Integration tests: {what to cover}
- E2E tests: {what to cover}
- Performance tests: {benchmarks}

## Rollout Plan
- Feature flag: {name, rollout strategy}
- Canary: {percentage, duration}
- Rollback: {procedure}
```

## API-First Template

### Structure
```
# API Spec: {Service/Feature}

## Endpoints
### {Method} /{path}
- Description: {what it does}
- Auth: {required roles/scopes}
- Request:
  - Headers: {required headers}
  - Body: {schema reference}
- Response:
  - 200: {success schema}
  - 4xx: {error schema}
  - 5xx: {error schema}

## Rate Limits
- {requests per minute per user/IP}
- {burst limit}

## Pagination
- {cursor or offset-based}
- {default and max page size}
```

## Database Migration Template

### Structure
```
# Migration: {name}

## Schema Changes
- {table/collection}: {field changes}
- {indexes}: {add/drop/modify}

## Data Migration
- {backfill script approach}
- {rollback procedure}

## Rollout
- {deploy order: schema first, app second}
- {downtime expected?}
- {verification queries}
```
