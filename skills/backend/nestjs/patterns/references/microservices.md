# NestJS Microservices

## Transport Options

| Transport | Use Case |
|-----------|----------|
| TCP | Internal services, low latency |
| Redis | Pub/sub, broadcast |
| RabbitMQ | Reliable messaging, persistent queues |
| Kafka | Event streaming, replay, high throughput |
| gRPC | Typed contracts, bidirectional streaming |

## Service Definition
```typescript
// order.service.ts — microservice
@Controller()
export class OrderMicroservice {
  @MessagePattern({ cmd: 'place_order' })
  async placeOrder(@Payload() data: PlaceOrderDto, @Ctx() context: RmqContext): Promise<OrderResponse> {
    const result = await this.useCase.execute(data)
    context.getChannelRef().ack(context.getMessage())
    return result
  }

  @EventPattern('payment_completed')
  async handlePaymentCompleted(@Payload() data: PaymentCompletedEvent) {
    await this.useCase.confirmPayment(data.orderId)
  }
}
```

## Client Proxy
```typescript
// api-gateway.controller.ts
@Injectable()
export class OrderGateway {
  constructor(@Inject('ORDER_SERVICE') private client: ClientProxy) {}

  async placeOrder(dto: PlaceOrderDto): Promise<OrderResponse> {
    return firstValueFrom(this.client.send({ cmd: 'place_order' }, dto))
  }
}
```

## Message Patterns vs Event Patterns
| Pattern | Expects Response | Use Case |
|---------|-----------------|----------|
| `@MessagePattern` | Yes (request-response) | Commands, queries |
| `@EventPattern` | No (fire-and-forget) | Events, notifications |
