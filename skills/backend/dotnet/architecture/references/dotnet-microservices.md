# .NET Microservices

## Service Boundary Decisions

| Decision | Monolith | Microservice |
|----------|----------|--------------|
| Team size | Small (<10) | Multiple teams |
| Deploy frequency | Weekly | Daily+ |
| Domain complexity | Simple | Complex |
| Scale requirements | Moderate | High/elastic |
| Consistency | Strong | Eventually |

## Service Template

```
src/
  OrderService.Api/          # Entry point
  OrderService.Application/  # Use cases
  OrderService.Domain/       # Entities
  OrderService.Infrastructure/ # Persistence, messaging
```

## Inter-service Communication

### gRPC (Internal)

```csharp
// Proto: service OrderRpc { rpc GetOrder(OrderId) returns (OrderResponse); }
[ApiVersion("1")]
public class OrderGrpcService : OrderRpc.OrderRpcBase
{
    private readonly IMediator _mediator;
    public OrderGrpcService(IMediator mediator) => _mediator = mediator;

    public override async Task<OrderResponse> GetOrder(OrderId request, ServerCallContext context)
    {
        var result = await _mediator.Send(new GetOrderQuery(Guid.Parse(request.Id)));
        return new OrderResponse { Id = result.Value.Id.ToString(), Status = result.Value.Status };
    }
}
```

### RabbitMQ / MassTransit

```csharp
// Publishing
public class OrderSubmittedHandler : INotificationHandler<OrderSubmittedEvent>
{
    private readonly IPublishEndpoint _publish;
    public OrderSubmittedHandler(IPublishEndpoint publish) => _publish = publish;

    public async Task Handle(OrderSubmittedEvent notification, CancellationToken ct)
    {
        await _publish.Publish(new OrderSubmittedIntegrationEvent(notification.OrderId), ct);
    }
}

// Consuming
public class PaymentConsumer : IConsumer<OrderSubmittedIntegrationEvent>
{
    public async Task Consume(ConsumeContext<OrderSubmittedIntegrationEvent> context)
    {
        // Process payment in payment service
    }
}
```

## Service Discovery

```csharp
// Using Consul
builder.Services.AddConsul();
builder.Services.AddHealthChecks().AddCheck("self", () => HealthCheckResult.Healthy());

// Using Kubernetes DNS
// Services resolve by name: http://order-service.namespace.svc.cluster.local
```

## Resilience Patterns

```csharp
// Polly — retry + circuit breaker
builder.Services.AddHttpClient<InventoryClient>(client =>
{
    client.BaseAddress = new Uri("http://inventory-service");
})
.AddTransientHttpErrorPolicy(p => p.WaitAndRetryAsync(3, retry => TimeSpan.FromMilliseconds(200)))
.AddTransientHttpErrorPolicy(p => p.CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));

// Client usage
public class InventoryClient
{
    private readonly HttpClient _http;
    public InventoryClient(HttpClient http) => _http = http;

    public async Task<bool> CheckStock(string sku)
    {
        var response = await _http.GetAsync($"/api/stock/{sku}");
        return response.IsSuccessStatusCode;
    }
}
```

## Configuration

```csharp
// appsettings.json per environment
builder.Configuration
    .AddJsonFile("appsettings.json")
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json")
    .AddEnvironmentVariables();

// Kubernetes ConfigMap integration
// Mounted as environment variables or volume
```

## Observability

```csharp
// OpenTelemetry — distributed tracing
builder.Services.AddOpenTelemetry()
    .WithTracing(tracer => tracer
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter());

// Structured logging with Serilog
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.WithProperty("Service", "order-service")
    .WriteTo.Console()
    .WriteTo.Seq("http://seq:5341"));
```

## API Gateway

```csharp
// YARP — reverse proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// appsettings.json
{
  "ReverseProxy": {
    "Routes": {
      "orders": { "ClusterId": "orders", "Match": { "Path": "/api/orders/{**catch-all}" } },
      "payments": { "ClusterId": "payments", "Match": { "Path": "/api/payments/{**catch-all}" } }
    },
    "Clusters": {
      "orders": { "Destinations": { "order1": { "Address": "http://order-service/" } } },
      "payments": { "Destinations": { "payment1": { "Address": "http://payment-service/" } } }
    }
  }
}
```

## Database Per Service

```csharp
// Each service owns its database, accessed only via its API
// OrderService -> OrdersDb
// PaymentService -> PaymentsDb
// No cross-service direct database access
```

## Container Orchestration

```yaml
# docker-compose.yml
services:
  order-service:
    build: ./src/OrderService.Api
    ports:
      - "5001:80"
    environment:
      - ConnectionStrings__Default=Host=postgres;Database=orders
  payment-service:
    build: ./src/PaymentService.Api
    ports:
      - "5002:80"
    depends_on:
      - rabbitmq
```
