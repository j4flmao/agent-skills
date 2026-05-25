# NestJS Testing

## Unit Testing Services

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('OrderService', () => {
  let service: OrderService;
  let repo: MockType<OrderRepository>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useFactory: mockRepository },
      ],
    }).compile();

    service = module.get(OrderService);
    repo = module.get(OrderRepository);
  });

  describe('create', () => {
    it('should create order successfully', async () => {
      const dto = { customerId: 'cust-1', items: [] };
      repo.save.mockResolvedValue({ id: 1, ...dto });

      const result = await service.create(dto);

      expect(result.id).toBeDefined();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining(dto));
    });

    it('should throw when customer not found', async () => {
      repo.findByCustomerId.mockResolvedValue(null);
      await expect(service.create({ customerId: 'invalid' }))
        .rejects.toThrow('Customer not found');
    });
  });
});
```

## Controller Tests

```typescript
describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderService, useValue: { create: jest.fn(), findAll: jest.fn() } },
      ],
    }).compile();

    controller = module.get(OrderController);
    service = module.get(OrderService);
  });

  it('should return created order', async () => {
    const result = { id: 1, status: 'PENDING' };
    jest.spyOn(service, 'create').mockResolvedValue(result);

    expect(await controller.create({ customerId: '1', items: [] })).toBe(result);
  });

  it('should handle validation errors', async () => {
    await expect(controller.create({} as any)).rejects.toThrow();
  });
});
```

## Integration Tests

```typescript
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrderRepository)
      .useClass(InMemoryOrderRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /api/orders creates order', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .send({ customerId: 'cust-1', items: [{ sku: 'A', qty: 1, price: 10 }] })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.status).toBe('PENDING');
      });
  });

  it('POST /api/orders validates required fields', () => {
    return request(app.getHttpServer())
      .post('/api/orders')
      .send({})
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Testing Guards

```typescript
import { ExecutionContext } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(mockJwtService);
  });

  it('should allow request with valid token', () => {
    const context = createMockContext({
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny request without token', () => {
    const context = createMockContext({ headers: {} });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});

function createMockContext(overrides: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: overrides.headers || {},
        user: overrides.user,
      }),
    }),
  } as any;
}
```

## Testing Pipes

```typescript
describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(1) });
  const pipe = new ZodValidationPipe(schema);

  it('should pass valid data', () => {
    expect(pipe.transform({ name: 'Test' })).toEqual({ name: 'Test' });
  });

  it('should throw on invalid data', () => {
    expect(() => pipe.transform({})).toThrow(BadRequestException);
  });
});
```

## Mocking TypeORM

```typescript
export const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  })),
});

type MockType<T> = {
  [P in keyof T]?: jest.Mock;
};
```

## Test Configuration

```typescript
// Use .env.test for test environment
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.test',
      isGlobal: true,
    }),
  ],
})
export class TestAppModule {}
```

## Coverage Configuration

```json
// package.json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.service.ts",
      "src/**/*.controller.ts",
      "src/**/*.guard.ts",
      "!src/**/*.module.ts",
      "!src/main.ts"
    ],
    "coverageThreshold": {
      "global": { "branches": 80, "functions": 80, "lines": 80 }
    }
  }
}
```
