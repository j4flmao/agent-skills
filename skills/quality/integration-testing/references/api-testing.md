# API Integration Testing Patterns

## Test Structure
`
describe('POST /api/users')
  ├── should create user with valid data
  ├── should reject duplicate email
  ├── should require name field
  └── should return 401 without auth token
`

## Testing Authentication
`	ypescript
const request = supertest(app);

beforeAll(async () => {
    token = await generateTestToken({ role: 'admin' });
});

test('GET /api/users requires auth', async () => {
    await request.get('/api/users').expect(401);
});

test('GET /api/users returns data with auth', async () => {
    await request.get('/api/users')
        .set('Authorization', Bearer )
        .expect(200);
});
`

## Database Cleanup Strategies
| Strategy | Pros | Cons |
|----------|------|------|
| Truncate all tables | Clean state | Slow for many tables |
| Transaction rollback | Fast | Can't test commits |
| Delete specific data | Fast | Must track what was created |
| TestContainers reuse | Shared across tests | Shared state issues |
