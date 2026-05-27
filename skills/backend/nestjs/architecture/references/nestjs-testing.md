# NestJS Testing Strategies

## Test Types

### Test Pyramid
```
    ╱╲
   ╱ E2E ╲
  ╱────────╲
 ╱ Integration ╲
╱────────────────╲
╱   Unit Tests    ╲
╱──────────────────╲
```

| Type | Speed | Scope | Confidence |
|------|-------|-------|------------|
| Unit | Fast | Single class/module | Low |
| Integration | Medium | Module interactions | Medium |
| E2E | Slow | Full system | High |

## Unit Testing

### Service Test
```typescript
import { Test } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { EmailService } from './email.service';

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendWelcomeEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    userRepo = module.get(UserRepository);
    emailService = module.get(EmailService);
  });

  describe('createUser', () => {
    it('should create a user and send welcome email', async () => {
      const dto = { email: 'test@example.com', name: 'Test' };
      const expectedUser = { id: '1', ...dto };

      userRepo.save.mockResolvedValue(expectedUser);

      const result = await service.createUser(dto);

      expect(result).toEqual(expectedUser);
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining(dto));
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(expectedUser.id, dto.email);
    });

    it('should throw if email already exists', async () => {
      userRepo.findByEmail.mockResolvedValue({ id: '1', email: 'exists@example.com' });

      await expect(
        service.createUser({ email: 'exists@example.com', name: 'Test' }),
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

### Controller Test
```typescript
import { Test } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            createUser: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(UserController);
    service = module.get(UserService);
  });

  it('should return created user', async () => {
    const dto = { email: 'test@example.com', name: 'Test' };
    const expected = { id: '1', ...dto };

    service.createUser.mockResolvedValue(expected);

    const result = await controller.create(dto);

    expect(result).toEqual(expected);
    expect(result).not.toHaveProperty('password');
  });
});
```

## Integration Testing

### Database Integration
```typescript
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './user.entity';
import { UserModule } from './user.module';
import { createTestDatabase } from '../test/utils/database';

describe('UserService Integration', () => {
  let service: UserService;
  let module: TestingModule;

  beforeAll(async () => {
    const database = await createTestDatabase();

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(database.config),
        UserModule,
      ],
    }).compile();

    service = module.get(UserService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should persist user to database', async () => {
    const user = await service.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });

    const found = await service.findById(user.id);
    expect(found).toBeDefined();
    expect(found.email).toBe('test@example.com');
  });

  it('should enforce unique email constraint', async () => {
    await service.createUser({
      email: 'dupe@example.com',
      name: 'First',
    });

    await expect(
      service.createUser({
        email: 'dupe@example.com',
        name: 'Second',
      }),
    ).rejects.toThrow();
  });
});
```

### HTTP Integration
```typescript
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('User API (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create user', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'test@example.com', name: 'Test' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'invalid', name: 'Test' })
        .expect(400);
    });
  });
});
```

## E2E Testing

### Full E2E Test
```typescript
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('User E2E', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Auth
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('full user lifecycle', async () => {
    // Create
    const createRes = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ email: 'new@test.com', name: 'New User' })
      .expect(201);

    const userId = createRes.body.id;

    // Read
    await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // List
    const listRes = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(listRes.body.data.length).toBeGreaterThan(0);

    // Delete
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);
  });
});
```

## Test Database Utilities

### Test Database Setup
```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export async function createTestDatabase(): Promise<{
  container: StartedPostgreSqlContainer;
  config: TypeOrmModuleOptions;
}> {
  const container = await new PostgreSqlContainer()
    .withDatabase('test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const config: TypeOrmModuleOptions = {
    type: 'postgres',
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: true,
  };

  return { container, config };
}

export async function cleanDatabase(): Promise<void> {
  const entities = getMetadataArgsStorage().tables.map((t) => t.name);
  for (const entity of entities) {
    await getConnection().manager.query(`TRUNCATE TABLE "${entity}" CASCADE`);
  }
}
```

## Mocking Strategies

### Service Mocking
```typescript
// Mock factory
export const createMockUserService = (): jest.Mocked<UserService> => ({
  createUser: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
});

// Custom provider
const mockUserService = createMockUserService();
mockUserService.findById.mockResolvedValue(testUser);

const module = await Test.createTestingModule({
  providers: [
    { provide: UserService, useValue: mockUserService },
  ],
}).compile();
```

### Guard Mocking
```typescript
import { ExecutionContext } from '@nestjs/common';

export const mockAuthGuard = {
  canActivate: jest.fn((context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'test-user-id', roles: ['admin'] };
    return true;
  }),
};

// Override guard in test
const module = await Test.createTestingModule({
  imports: [UserModule],
})
  .overrideGuard(AuthGuard('jwt'))
  .useValue(mockAuthGuard)
  .compile();
```

## Key Points
- Unit tests mock all dependencies and test single classes in isolation
- Integration tests use real database (TestContainers) and verify module interactions
- E2E tests exercise the full HTTP stack including guards, pipes, interceptors
- TestContainers provides disposable databases for integration testing
- Clean database between tests to avoid state pollution
- Guard mocking enables testing authenticated endpoints without tokens
- Service mocking with jest.Mocked<T> provides type-safe mocks
- Override providers and guards for controlled test scenarios
