# gRPC Testing

## Unit Testing Services

### Testing Unary RPCs
```typescript
import * as grpc from '@grpc/grpc-js';
import { Server } from '@grpc/grpc-js';

function createTestServer(serviceImpl) {
  const server = new Server();
  server.addService(UserService, serviceImpl);
  return server;
}

describe('UserService', () => {
  let server;
  let client;

  beforeAll(async () => {
    server = createTestServer({
      GetUser: (call, callback) => {
        const { id } = call.request;
        if (id === '999') {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: 'User not found',
          });
        }
        callback(null, { id, name: 'Test User', email: 'test@example.com' });
      },
    });

    const port = await server.bindAsync(
      '0.0.0.0:0',
      grpc.ServerCredentials.createInsecure()
    );
    server.start();

    client = new UserServiceClient(
      `localhost:${port}`,
      grpc.credentials.createInsecure()
    );
  });

  afterAll(() => {
    server.forceShutdown();
    client.close();
  });

  it('should return user when ID exists', (done) => {
    client.GetUser({ id: '123' }, (error, response) => {
      expect(error).toBeNull();
      expect(response.name).toBe('Test User');
      done();
    });
  });

  it('should return NOT_FOUND for missing user', (done) => {
    client.GetUser({ id: '999' }, (error, response) => {
      expect(error).toBeDefined();
      expect(error.code).toBe(grpc.status.NOT_FOUND);
      done();
    });
  });
});
```

### Testing Server Streaming
```typescript
describe('EventService (server streaming)', () => {
  let server;
  let client;

  beforeAll(async () => {
    server = createTestServer({
      Subscribe: (call) => {
        const events = [
          { id: '1', type: 'CREATED', data: '{}' },
          { id: '2', type: 'UPDATED', data: '{}' },
          { id: '3', type: 'DELETED', data: '{}' },
        ];
        events.forEach(event => call.write(event));
        call.end();
      },
    });

    const port = await server.bindAsync(
      '0.0.0.0:0',
      grpc.ServerCredentials.createInsecure()
    );
    server.start();

    client = new EventServiceClient(
      `localhost:${port}`,
      grpc.credentials.createInsecure()
    );
  });

  it('should stream all events', (done) => {
    const call = client.Subscribe({ topics: ['users'] });
    const received = [];

    call.on('data', (event) => received.push(event));
    call.on('end', () => {
      expect(received).toHaveLength(3);
      expect(received[0].type).toBe('CREATED');
      done();
    });
  });

  it('should handle client cancellation', (done) => {
    const call = client.Subscribe({ topics: ['users'] });
    call.on('data', () => call.cancel());
    call.on('error', (error) => {
      expect(error.code).toBe(grpc.status.CANCELLED);
      done();
    });
  });
});
```

### Testing Client Streaming
```typescript
describe('UploadService (client streaming)', () => {
  it('should process uploaded chunks', (done) => {
    const call = client.Upload((error, response) => {
      expect(error).toBeNull();
      expect(response.fileSize).toBe(300);
      done();
    });

    call.write({ chunk: 'a'.repeat(100), index: 0 });
    call.write({ chunk: 'b'.repeat(100), index: 1 });
    call.write({ chunk: 'c'.repeat(100), index: 2 });
    call.end();
  });
});
```

### Testing Bidirectional Streaming
```typescript
describe('ChatService (bidirectional)', () => {
  it('should echo messages in order', (done) => {
    const call = client.Chat();
    const replies = [];
    const messages = ['Hello', 'How are you?', 'Goodbye'];

    call.on('data', (reply) => {
      replies.push(reply);
      if (replies.length === messages.length) {
        replies.forEach((r, i) => {
          expect(r.content).toBe(messages[i]);
        });
        done();
      }
    });

    messages.forEach(msg => call.write({ content: msg, user: 'test' }));
    call.end();
  });
});
```

## Integration Testing with Test Containers

```typescript
import { GenericContainer } from 'testcontainers';

describe('gRPC Integration Tests', () => {
  let container;
  let client;

  beforeAll(async () => {
    container = await new GenericContainer('my-grpc-service:latest')
      .withExposedPorts(50051)
      .start();

    client = new UserServiceClient(
      `${container.getHost()}:${container.getMappedPort(50051)}`,
      grpc.credentials.createInsecure()
    );
  }, 60000);

  afterAll(async () => {
    client.close();
    await container.stop();
  });

  it('should persist and retrieve user', async () => {
    const createRes = await promisify(client.CreateUser)({
      name: 'Integration Test',
      email: 'integration@test.com',
    });

    const getRes = await promisify(client.GetUser)({ id: createRes.id });
    expect(getRes.name).toBe('Integration Test');
  });
});
```

## Load Testing

```typescript
import * as grpc from '@grpc/grpc-js';

async function loadTest(target, rps, duration) {
  const client = new UserServiceClient(
    target,
    grpc.credentials.createInsecure()
  );

  const startTime = Date.now();
  let success = 0;
  let failure = 0;

  while (Date.now() - startTime < duration * 1000) {
    const batchStart = Date.now();
    const batch = [];

    for (let i = 0; i < rps; i++) {
      batch.push(new Promise((resolve) => {
        client.GetUser({ id: String(i % 1000) }, (error) => {
          if (error) failure++;
          else success++;
          resolve();
        });
      }));
    }

    await Promise.all(batch);
    const elapsed = Date.now() - batchStart;
    if (elapsed < 1000) {
      await new Promise(r => setTimeout(r, 1000 - elapsed));
    }
  }

  console.log(`Success: ${success}, Failure: ${failure}`);
  client.close();
}
```

## Mocking gRPC Services

```typescript
import { MockService } from './grpc-mock';

describe('Service consuming gRPC', () => {
  let mockService;

  beforeAll(() => {
    mockService = new MockService(UserService, {
      GetUser: (request) => ({
        id: request.id,
        name: 'Mocked User',
        email: 'mocked@example.com',
      }),
      ListUsers: (request) => ({
        users: [
          { id: '1', name: 'User 1' },
          { id: '2', name: 'User 2' },
        ],
        nextPageToken: '',
      }),
    });
  });

  it('should use mocked response', async () => {
    const response = await myService.getUser('456');
    expect(response.name).toBe('Mocked User');
  });
});
```

## Proto Validation Testing

```typescript
describe('Proto schema validation', () => {
  it('should validate required fields', () => {
    const request = CreateUserRequest.fromPartial({
      name: '',
      email: 'invalid',
    });

    const errors = validateCreateUserRequest(request);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'name', message: 'Name is required' })
    );
  });

  it('should validate email format', () => {
    const request = CreateUserRequest.fromPartial({
      name: 'Test',
      email: 'not-an-email',
    });

    const errors = validateCreateUserRequest(request);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'email', message: 'Invalid email format' })
    );
  });
});

function validateCreateUserRequest(request) {
  const errors = [];
  if (!request.name) errors.push({ field: 'name', message: 'Name is required' });
  if (!request.email?.includes('@')) errors.push({ field: 'email', message: 'Invalid email format' });
  return errors;
}
```

## Key Points
- Use in-memory gRPC servers for fast unit tests
- Test all four RPC types: unary, server-stream, client-stream, bidirectional
- Verify error codes for each failure scenario
- Use test containers for integration tests with real dependencies
- Implement load tests to validate performance under traffic
- Mock gRPC services for testing dependent services
- Validate proto message fields with schema checks
- Test deadline propagation and cancellation scenarios
- Use promisify wrappers for cleaner async test patterns
- Clean up server and client resources between test suites
