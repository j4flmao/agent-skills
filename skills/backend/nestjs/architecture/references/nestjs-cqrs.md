# NestJS CQRS Implementation

## CQRS Module Setup

### Module Configuration
```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/create-user.handler';
import { GetUserHandler } from './queries/get-user.handler';
import { UserRepository } from './repositories/user.repository';
import { UserController } from './user.controller';

@Module({
  imports: [CqrsModule],
  controllers: [UserController],
  providers: [
    // Command handlers
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,

    // Query handlers
    GetUserHandler,
    ListUsersHandler,
    SearchUsersHandler,

    // Event handlers
    UserCreatedHandler,
    UserUpdatedHandler,

    // Repositories
    UserRepository,
  ],
})
export class UserModule {}
```

## Commands

### Command Definition
```typescript
import { ICommand } from '@nestjs/cqrs';

export class CreateUserCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name: string,
    public readonly roles: string[] = ['user'],
  ) {}
}
```

### Command Handler
```typescript
import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../domain/user.entity';
import { CreateUserCommand } from './create-user.command';

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly repository: UserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    const user = new User(
      crypto.randomUUID(),
      command.email,
      command.password,
      command.name,
      command.roles,
    );

    user.create(); // Domain logic + event registration

    const userAggregate = this.publisher.mergeObjectContext(user);
    await this.repository.save(userAggregate);
    userAggregate.commit();

    return user.id;
  }
}
```

### Command Validation
```typescript
import { IsEmail, MinLength, IsArray, IsOptional } from 'class-validator';

export class CreateUserCommand {
  @IsEmail()
  readonly email: string;

  @MinLength(8)
  readonly password: string;

  @MinLength(2)
  readonly name: string;

  @IsArray()
  @IsOptional()
  readonly roles?: string[];
}
```

## Queries

### Query Definition
```typescript
import { IQuery } from '@nestjs/cqrs';

export class GetUserQuery implements IQuery {
  constructor(public readonly id: string) {}
}

export class ListUsersQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly filters?: Record<string, any>,
  ) {}
}
```

### Query Handler
```typescript
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { GetUserQuery } from './get-user.query';
import { UserDto } from '../dto/user.dto';

@Injectable()
@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(private readonly repository: UserRepository) {}

  async execute(query: GetUserQuery): Promise<UserDto | null> {
    const user = await this.repository.findById(query.id);
    if (!user) return null;

    return new UserDto(user);
  }
}

@Injectable()
@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery> {
  constructor(private readonly repository: UserRepository) {}

  async execute(query: ListUsersQuery): Promise<{ data: UserDto[]; total: number }> {
    const [users, total] = await this.repository.findMany(
      query.page,
      query.limit,
      query.filters,
    );

    return {
      data: users.map((u) => new UserDto(u)),
      total,
    };
  }
}
```

## Events

### Domain Events
```typescript
import { IEvent } from '@nestjs/cqrs';

export class UserCreatedEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class UserUpdatedEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: Record<string, any>,
  ) {}
}
```

### Event Handlers
```typescript
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { UserCreatedEvent } from './user-created.event';

@Injectable()
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    await Promise.all([
      this.emailService.sendWelcomeEmail(event.userId, event.email),
      this.auditService.log('user_created', {
        userId: event.userId,
        email: event.email,
      }),
    ]);
  }
}
```

### Saga Pattern
```typescript
import { Injectable } from '@nestjs/common';
import { ICommand, Saga, ofType } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { UserCreatedEvent } from './user-created.event';
import { InitializeWorkspaceCommand } from './commands/initialize-workspace.command';
import { SendOnboardingCommand } from './commands/send-onboarding.command';

@Injectable()
export class UserSaga {
  @Saga()
  userCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(UserCreatedEvent),
      delay(1000),
      map((event) => new InitializeWorkspaceCommand(event.userId)),
    );
  };

  @Saga()
  workspaceReady = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(WorkspaceInitializedEvent),
      delay(500),
      map((event) => new SendOnboardingCommand(event.userId)),
    );
  };
}
```

## Controller Integration

### Command Bus
```typescript
import { Controller, Post, Body, Param, Get, Delete } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateUserCommand } from './commands/create-user.command';
import { GetUserQuery } from './queries/get-user.query';
import { UpdateUserCommand } from './commands/update-user.command';
import { DeleteUserCommand } from './commands/delete-user.command';

@Controller('users')
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<{ id: string }> {
    const id = await this.commandBus.execute(
      new CreateUserCommand(dto.email, dto.password, dto.name),
    );
    return { id };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    await this.commandBus.execute(
      new UpdateUserCommand(id, dto),
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteUserCommand(id));
  }
}
```

## Read Models

### Read Model Definition
```typescript
import { Injectable } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserReadModel } from './user.read-model';

@Injectable()
@EventsHandler(UserCreatedEvent)
export class UserReadModelProjection implements IEventHandler<UserCreatedEvent> {
  constructor(
    @InjectRepository(UserReadModel)
    private readonly repository: Repository<UserReadModel>,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    const readModel = this.repository.create({
      id: event.userId,
      email: event.email,
      status: 'active',
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
    });
    await this.repository.save(readModel);
  }
}
```

## Testing

### Command Handler Test
```typescript
import { Test } from '@nestjs/testing';
import { CommandBus, CqrsModule, EventPublisher } from '@nestjs/cqrs';
import { CreateUserHandler } from './create-user.handler';
import { CreateUserCommand } from './create-user.command';
import { UserRepository } from '../repositories/user.repository';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let repository: jest.Mocked<UserRepository>;
  let publisher: EventPublisher;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        {
          provide: UserRepository,
          useValue: { save: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(CreateUserHandler);
    repository = module.get(UserRepository);
    publisher = module.get(EventPublisher);
  });

  it('should create a user', async () => {
    const command = new CreateUserCommand(
      'test@example.com',
      'password123',
      'Test User',
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(repository.save).toHaveBeenCalled();
  });
});
```

## Key Points
- CQRS separates commands (writes) from queries (reads) with distinct handlers
- Command handlers validate input, execute domain logic, and persist changes
- Query handlers retrieve and transform data without side effects
- Event handlers react to domain events for cross-cutting concerns
- Sagas orchestrate multi-step workflows by listening to events and emitting commands
- EventBus publishes domain events after command execution
- Read models are denormalized projections optimized for query performance
- Testing command handlers requires mocking the repository only
