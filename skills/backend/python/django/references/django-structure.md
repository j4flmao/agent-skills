# Django Project Structure

```
config/
├── settings/
│   ├── base.py
│   ├── development.py
│   └── production.py
├── urls.py
├── wsgi.py
└── asgi.py

apps/
├── orders/
│   ├── domain/
│   │   ├── entities.py
│   │   ├── value_objects.py
│   │   └── repositories.py  (ABC)
│   ├── application/
│   │   ├── use_cases.py
│   │   └── dto.py
│   ├── infrastructure/
│   │   ├── models.py        (Django ORM models)
│   │   ├── repositories.py  (implementations)
│   │   └── admin.py
│   ├── api/
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── migrations/
│   ├── tests/
│   └── apps.py
├── users/
│   └── ...
└── payments/
    └── ...
```

## Thin Models Pattern
```python
# apps/orders/infrastructure/models.py
class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField()
    status = models.CharField(max_length=20, choices=OrderStatus.choices)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "orders"

# apps/orders/domain/entities.py
class OrderEntity:
    def __init__(self, id: UUID, user_id: UUID, status: OrderStatus, total: Decimal):
        self.id = id
        self.user_id = user_id
        self.status = status
        self.total = total

    def confirm(self):
        if self.status != OrderStatus.PENDING:
            raise DomainError("Only PENDING orders can be confirmed")
        self.status = OrderStatus.CONFIRMED
```

## Service Layer
```python
# apps/orders/application/use_cases.py
from dataclasses import dataclass

@dataclass
class PlaceOrderCommand:
    user_id: UUID
    items: list[OrderItemDTO]

class PlaceOrderUseCase:
    def __init__(self, repo: OrderRepository):
        self.repo = repo

    def execute(self, cmd: PlaceOrderCommand) -> OrderEntity:
        user = self.repo.get_user(cmd.user_id)
        order = OrderEntity.create(user, cmd.items)
        self.repo.save(order)
        return order
```
