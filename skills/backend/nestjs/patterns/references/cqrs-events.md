# CQRS and Events in NestJS

## Overview
NestJS CQRS module provides Command Query Responsibility Segregation with an event-driven architecture. Commands handle writes, queries handle reads, and events enable loose coupling between domains.

## Module Setup

### CQRS Module Registration
```typescript
import { CqrsModule } from '@nestjs/cqrs'

@Module({
  imports: [CqrsModule],
  controllers: [OrderController],
  providers: [
    // Command Handlers
    CreateOrderHandler,
    CancelOrderHandler,
    // Query Handlers
    GetOrderHandler,
    GetOrdersHandler,
    // Event Handlers
    OrderCreatedHandler,
    OrderCancelledHandler,
    // Saga
    OrderSaga,
  ],
})
export class OrderModule {}
```

## Commands

### Command Definition
```typescript
import { ICommand } from '@nestjs/cqrs'

export class CreateOrderCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly items: OrderItemDto[],
    public readonly shippingAddress: AddressDto,
  ) {}
}

export class CancelOrderCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
  ) {}
}

export class UpdateOrderStatusCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly status: OrderStatus,
  ) {}
}
```

### Command Handler
```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly paymentService: PaymentService,
  ) {}

  async execute(command: CreateOrderCommand): Promise<string> {
    const order = Order.create(command.userId, command.items, command.shippingAddress)
    await this.orderRepository.save(order)
    this.eventBus.publish(new OrderCreatedEvent(order.id, order.total))
    return order.id
  }
}

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    const order = await this.orderRepository.findById(command.orderId)
    if (!order) throw new NotFoundException('Order not found')
    order.cancel(command.reason)
    await this.orderRepository.save(order)
    this.eventBus.publish(new OrderCancelledEvent(order.id, command.reason))
  }
}
```

## Queries

### Query Definition
```typescript
import { IQuery } from '@nestjs/cqrs'

export class GetOrderQuery implements IQuery {
  constructor(public readonly orderId: string) {}
}

export class GetUserOrdersQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}

export class GetOrderStatsQuery implements IQuery {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}
```

### Query Handler
```typescript
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs'

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(query: GetOrderQuery): Promise<OrderDto | null> {
    const order = await this.orderRepository.findById(query.orderId)
    if (!order) return null
    return OrderDto.fromDomain(order)
  }
}

@QueryHandler(GetUserOrdersQuery)
export class GetUserOrdersHandler implements IQueryHandler<GetUserOrdersQuery> {
  constructor(private readonly orderReadModel: OrderReadModel) {}

  async execute(query: GetUserOrdersQuery): Promise<PaginatedResult<OrderDto>> {
    return this.orderReadModel.findByUserId(query.userId, query.page, query.limit)
  }
}

@QueryHandler(GetOrderStatsQuery)
export class GetOrderStatsHandler implements IQueryHandler<GetOrderStatsQuery> {
  constructor(private readonly orderReadModel: OrderReadModel) {}

  async execute(query: GetOrderStatsQuery): Promise<OrderStats> {
    return this.orderReadModel.getStats(query.startDate, query.endDate)
  }
}
```

## Events

### Domain Events
```typescript
import { IEvent } from '@nestjs/cqrs'

export class OrderCreatedEvent implements IEvent {
  constructor(
    public readonly orderId: string,
    public readonly total: number,
  ) {}
}

export class OrderCancelledEvent implements IEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
  ) {}
}

export class OrderShippedEvent implements IEvent {
  constructor(
    public readonly orderId: string,
    public readonly trackingNumber: string,
  ) {}
}

export class PaymentProcessedEvent implements IEvent {
  constructor(
    public readonly orderId: string,
    public readonly transactionId: string,
    public readonly amount: number,
  ) {}
}
```

### Event Handlers
```typescript
import { EventsHandler, IEventHandler } from '@nestjs/cqrs'

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async handle(event: OrderCreatedEvent) {
    await Promise.all([
      this.emailService.sendOrderConfirmation(event.orderId),
      this.analyticsService.trackOrderCreated(event.orderId, event.total),
    ])
  }
}

@EventsHandler(OrderCancelledEvent)
export class OrderCancelledHandler implements IEventHandler<OrderCancelledEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly inventoryService: InventoryService,
  ) {}

  async handle(event: OrderCancelledEvent) {
    await Promise.all([
      this.emailService.sendOrderCancellation(event.orderId, event.reason),
      this.inventoryService.releaseReservedItems(event.orderId),
    ])
  }
}

@EventsHandler(OrderShippedEvent)
export class OrderShippedHandler implements IEventHandler<OrderShippedEvent> {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async handle(event: OrderShippedEvent) {
    await this.notificationService.notifyShippingUpdate(
      event.orderId,
      event.trackingNumber,
    )
  }
}
```

## Sagas

### Orchestrating Sagas
```typescript
import { Saga, ICommand, ofType } from '@nestjs/cqrs'
import { Observable } from 'rxjs'
import { delay, map } from 'rxjs/operators'

export class OrderSaga {
  @Saga()
  orderCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(OrderCreatedEvent),
      delay(1000),
      map(event => new ProcessPaymentCommand(event.orderId, event.total)),
    )
  }

  @Saga()
  paymentProcessed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PaymentProcessedEvent),
      delay(500),
      map(event => new UpdateOrderStatusCommand(event.orderId, OrderStatus.Paid)),
    )
  }

  @Saga()
  paymentFailed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PaymentFailedEvent),
      map(event => new CancelOrderCommand(event.orderId, 'Payment failed')),
    )
  }
}
```

## Event Bus Patterns

### Publishing Events from Services
```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly eventBus: EventBus,
    private readonly orderRepository: OrderRepository,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<string> {
    const order = Order.create(dto.userId, dto.items, dto.shippingAddress)
    await this.orderRepository.save(order)
    this.eventBus.publish(new OrderCreatedEvent(order.id, order.total))
    return order.id
  }
}
```

### Merged Event Observables
```typescript
@Injectable()
export class NotificationSaga {
  @Saga()
  orderEvents = (events$: Observable<any>): Observable<ICommand> => {
    return merge(
      events$.pipe(
        ofType(OrderCreatedEvent),
        map(e => new SendConfirmationCommand(e.orderId)),
      ),
      events$.pipe(
        ofType(OrderShippedEvent),
        delay(1000),
        map(e => new SendTrackingCommand(e.orderId, e.trackingNumber)),
      ),
      events$.pipe(
        ofType(OrderDeliveredEvent),
        map(e => new RequestReviewCommand(e.orderId)),
      ),
    )
  }
}
```

## Microservice Event Publishing

### RabbitMQ Integration
```typescript
import { EventBus } from '@nestjs/cqrs'
import { ClientProxy } from '@nestjs/microservices'

@Injectable()
export class CrossServiceEventPublisher {
  constructor(
    private readonly eventBus: EventBus,
    @Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy,
  ) {}

  publishAndForward(event: IEvent) {
    // Publish locally
    this.eventBus.publish(event)

    // Forward to other services via message broker
    this.client.emit(event.constructor.name, event)
  }
}
```

## Testing CQRS

### Command Handler Test
```typescript
describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler
  let orderRepository: MockType<OrderRepository>
  let eventBus: MockType<EventBus>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CreateOrderHandler,
        { provide: OrderRepository, useFactory: mockRepository },
        { provide: EventBus, useValue: { publish: jest.fn() } },
      ],
    }).compile()

    handler = module.get(CreateOrderHandler)
    orderRepository = module.get(OrderRepository)
    eventBus = module.get(EventBus)
  })

  it('creates order and publishes event', async () => {
    const command = new CreateOrderCommand('user-1', [...], { ... })
    const orderId = await handler.execute(command)
    expect(orderRepository.save).toHaveBeenCalled()
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(OrderCreatedEvent),
    )
  })
})
```

### Saga Test
```typescript
describe('OrderSaga', () => {
  let saga: OrderSaga

  it('should emit ProcessPaymentCommand on OrderCreatedEvent', (done) => {
    const events$ = of(new OrderCreatedEvent('order-1', 100))
    const saga = new OrderSaga()
    const result$ = saga.orderCreated(events$)

    result$.subscribe(command => {
      expect(command).toBeInstanceOf(ProcessPaymentCommand)
      expect(command.orderId).toBe('order-1')
      done()
    })
  })
})
```

## Key Points
- Commands handle writes (imperative, named with intent)
- Queries handle reads (no side effects, return data)
- Events notify other parts of the system about changes
- Sagas orchestrate long-running workflows across handlers
- Use ofType() RxJS operator to filter specific events in sagas
- Event handlers run asynchronously after command completion
- Microservice EventBus extends CQRS to cross-service communication
- Test each handler in isolation with mocked dependencies
- Never put business logic in sagas — only orchestration
- CQRS separates read and write models for independent scaling
