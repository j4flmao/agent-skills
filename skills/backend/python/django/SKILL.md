---
name: python-django-architecture
description: >
  Use this skill when the user says 'Django structure', 'Django architecture', 'Django apps', 'Django clean arch', 'Django ORM', 'Django REST framework', 'DRF', or when building a Django application. This skill enforces: one Django app per bounded context, service layer pattern separating business logic from models, thin views that delegate to services, DRF serializers as DTOs, and signals that trigger services (no business logic in signals). Requires Django in dependencies. Do NOT use for: FastAPI projects, Flask, or non-Django Python backend.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, python, django, phase-2]
---

# Python Django Architecture

## Purpose
Structure Django applications with one app per bounded context, service layer for business logic, thin views, DRF serializers as DTOs, and clean separation of concerns.

## Agent Protocol

### Trigger
Exact user phrases: "Django structure", "Django architecture", "Django apps", "Django clean arch", "Django ORM", "Django REST framework", "DRF", "Django project layout".

### Input Context
Before activating, verify:
- requirements.txt or pyproject.toml has Django dependency.
- The app or feature being created is known.

### Output Artifact
No file output. Produces folder structure and code examples as text.

### Response Format
Folder structure:
```
config/
apps/{app}/
  models.py, services.py, repositories.py, serializers.py, views.py, urls.py
```

Code: module-level only. No import statements.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] One Django app per bounded context (not per table or per view).
- [ ] Business logic in services.py, not in models.py or views.py.
- [ ] Models are thin (fields, basic constraints, string methods only).
- [ ] DRF serializers act as DTOs at the API boundary.
- [ ] Views are thin (validate input, call service, return response).
- [ ] Signals delegate to services, do not contain business logic.
- [ ] select_related/prefetch_related used to prevent N+1 queries.

### Max Response Length
Folder structure: unlimited. Code: 15 lines per example.

## Architecture Decision Trees

### Django App Boundaries: Bounded Context vs Table-per-app

| Criterion | Bounded Context (Recommended) | Table-per-app |
|-----------|------------------------------|---------------|
| Coupling | Loose (context boundary) | Tight (related tables split) |
| Team autonomy | High (per context ownership) | Low (changes affect multiple apps) |
| Reusability | High (complete business capability) | Low (fragmented) |
| Migration complexity | Low (within context) | High (cross-app foreign keys) |

Decision: Business capability grouping → Bounded Context. Quick-and-dirty → you still want bounded context. Never table-per-app.

### DRF View Types

| View Type | Boilerplate | Flexibility | Best For |
|-----------|-------------|-------------|----------|
| ViewSet + ModelViewSet | Minimal | Low | Standard CRUD |
| GenericAPIView + mixins | Low | Medium | Standard with customization |
| APIView | Manual | High | Complex business logic |
| View + JSONResponse | None | Max | Non-DRF simple endpoints |

Decision: Standard CRUD → ModelViewSet. Custom logic → APIView. Non-DRF → View + JSONResponse.

## Workflow

### Step 1: Structure by App (Bounded Context)
```
project_root/
  config/
    settings/
      base.py, dev.py, prod.py
    urls.py
    wsgi.py
  apps/
    accounts/
      models.py
      services.py         -- Business logic layer
      repositories.py     -- Query abstraction
      serializers.py      -- DRF serializers
      views.py            -- Thin views (delegate to services)
      urls.py
      admin.py
      tests/
        test_services.py
        test_views.py
      migrations/
    orders/
      models.py
      services.py
      repositories.py
      serializers.py
      views.py
      urls.py
  shared/
    exceptions.py         -- Domain exceptions
    pagination.py         -- Shared pagination
```

### Step 2: Service Layer (Business Logic Here)
```python
# apps/orders/services.py
from dataclasses import dataclass
from django.db import transaction
from apps.orders.models import Order
from apps.orders.repositories import OrderRepository
from apps.notifications.services import NotificationService

class OrderService:
    def __init__(self):
        self.repo = OrderRepository()
        self.notifications = NotificationService()

    @transaction.atomic
    def place_order(self, user_id: int, items: list[dict]) -> Order:
        order = self.repo.create(user_id=user_id, status="pending")
        for item in items:
            self.repo.add_item(order, **item)
        total = sum(item.price * item.quantity for item in order.items.all())
        order.status = "confirmed" if total <= 10000 else "pending_approval"
        order.total = total
        order.save()
        self.notifications.send_order_confirmation(order)
        return order

    def cancel_order(self, order_id: int) -> Order:
        order = self.repo.get_by_id(order_id)
        if not order.can_be_cancelled():
            raise SharedException("Order cannot be cancelled in current status")
        order.status = "cancelled"
        order.save()
        self.notifications.send_order_cancellation(order)
        return order
```

### Step 3: Repository Layer (Query Abstraction)
```python
# apps/orders/repositories.py
from django.db.models import Prefetch
from apps.orders.models import Order, OrderItem

class OrderRepository:
    def get_by_id(self, order_id: int) -> Order | None:
        return Order.objects.select_related('user').prefetch_related(
            Prefetch('items', queryset=OrderItem.objects.select_related('product'))
        ).filter(id=order_id).first()

    def get_user_orders(self, user_id: int, status: str | None = None):
        qs = Order.objects.filter(user_id=user_id).select_related('user')
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')

    def create(self, **kwargs) -> Order:
        return Order.objects.create(**kwargs)

    def add_item(self, order: Order, **kwargs) -> OrderItem:
        return OrderItem.objects.create(order=order, **kwargs)

    def get_pending_approval(self) -> list[Order]:
        return Order.objects.filter(status='pending_approval').select_related('user')
```

### Step 4: Thin Models
```python
# apps/orders/models.py
class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("pending_approval", "Pending Approval"),
        ("shipped", "Shipped"),
        ("cancelled", "Cancelled"),
    ]
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['-created_at']),
        ]

    def can_be_cancelled(self) -> bool:
        return self.status in ("pending", "confirmed")

    def __str__(self) -> str:
        return f"Order #{self.id} - {self.status}"
```

### Step 5: DRF Serializers (DTOs)
```python
# apps/orders/serializers.py
from rest_framework import serializers
from apps.orders.models import Order

class OrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)

class CreateOrderSerializer(serializers.Serializer):
    items = OrderItemSerializer(many=True, min_length=1)

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'user', 'status', 'total', 'items', 'created_at']
        read_only_fields = ['id', 'status', 'total', 'created_at']
```

### Step 6: Thin Views
```python
# apps/orders/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.orders.serializers import OrderSerializer, CreateOrderSerializer
from apps.orders.services import OrderService

class OrderViewSet(viewsets.GenericViewSet):
    queryset = Order.objects.none()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = OrderService()

    def list(self, request):
        orders = self.service.repo.get_user_orders(request.user.id)
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = self.service.place_order(
            user_id=request.user.id,
            items=serializer.validated_data["items"],
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        order = self.service.repo.get_by_id(pk)
        if not order or order.user_id != request.user.id:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)
```

### Step 7: Signals Delegate to Services
```python
# apps/orders/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.orders.models import Order
from apps.notifications.services import NotificationService

@receiver(post_save, sender=Order)
def notify_order_created(sender, instance, created, **kwargs):
    if created:
        NotificationService().send_order_confirmation(instance)

# apps/orders/apps.py
from django.apps import AppConfig

class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.orders'

    def ready(self):
        import apps.orders.signals
```

### Step 8: URL Configuration
```python
# config/urls.py
from django.urls import path, include

urlpatterns = [
    path('api/v1/', include('apps.orders.urls')),
    path('api/v1/', include('apps.accounts.urls')),
]

# apps/orders/urls.py
from rest_framework.routers import DefaultRouter
from apps.orders.views import OrderViewSet

router = DefaultRouter()
router.register('orders', OrderViewSet, basename='order')

urlpatterns = router.urls
```

## Implementation Patterns

### Pattern: Soft Delete with Custom Manager

```python
class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class Order(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)
    objects = ActiveManager()
    all_objects = models.Manager()  # Include soft-deleted

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save()
```

### Pattern: Custom Exception Classes

```python
# shared/exceptions.py
class AppException(Exception):
    def __init__(self, message: str, code: str = "ERROR"):
        self.code = code
        self.message = message
        super().__init__(message)

class NotFoundException(AppException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", "NOT_FOUND")

class ConflictException(AppException):
    def __init__(self, message: str):
        super().__init__(message, "CONFLICT")
```

## Production Considerations

### Query Performance
- Use `select_related()` for FK/O2O relationships (single JOIN)
- Use `prefetch_related()` for M2M/O2M (separate query, merged in Python)
- Use `only()` / `defer()` to limit loaded columns on large models
- Use `.iterator()` for memory-efficient iteration of large querysets
- Add `db_index=True` on all FK fields and frequently filtered columns
- Use `EXPLAIN ANALYZE` via `connection.queries` in DEBUG mode

### Celery Configuration
```python
# config/celery.py
from celery import Celery
app = Celery('project')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Business logic in models | Fat models, hard to test | Service layer |
| Business logic in views | Fat controllers, untestable | Thin views → service |
| Business logic in signals | Untestable, hard to trace | Signal calls service |
| N+1 queries in templates | 100+ SQL queries | select_related / prefetch_related |
| `objects.all()` on large tables | Memory exhaustion | .iterator() or pagination |
| Signals for cross-app coupling | Implicit dependency | Service method call |

## Security Considerations
- DRF: use `permission_classes` on every view — never default allow any
- `IsAuthenticated` as default in `REST_FRAMEWORK` settings
- CSRF: DRF uses token auth by default — CSRF only matters for session auth
- SQL injection: Django ORM is safe (parameterized), but `.extra()` and `RawSQL` are not
- XSS: Django templates auto-escape; DRF JSON responses are safe
- Clickjacking: `X-Frame-Options` middleware enabled by default
- Rate limiting: `django-ratelimit` or DRF throttling classes

## Testing Strategies

```python
# apps/orders/tests/test_services.py
from django.test import TestCase
from apps.orders.services import OrderService
from apps.orders.models import Order

class OrderServiceTest(TestCase):
    def setUp(self):
        self.service = OrderService()
        self.user = User.objects.create(username='test')

    def test_place_order_creates_order(self):
        order = self.service.place_order(self.user.id, [
            {'product_id': 1, 'quantity': 2, 'price': '10.00'},
        ])
        self.assertEqual(order.status, 'confirmed')
        self.assertEqual(order.items.count(), 1)
```

Use `pytest-django` for faster test discovery and fixtures. Use `factory_boy` for model factories. Use `responses` or `requests_mock` for external HTTP mocking.

## Rules
- Business logic lives in services.py. Models contain field definitions and basic constraints only. Views contain request parsing and response formatting only.
- Signals trigger service calls. They do not contain business logic themselves.
- Use select_related (foreign keys) and prefetch_related (many-to-many, reverse FK) to prevent N+1 queries. Lazy loading in templates is a performance bug.
- Migrations are backward-compatible. No dropping columns without deprecation period. No back-to-back migrations that conflict.
- DRF serializers act as DTOs at the boundary. They convert between request/response formats and domain/service calls.
- Repository layer for query abstraction — views never call ORM directly.
- `@transaction.atomic` on service methods, not in views or models.

## References
  - references/django-advanced.md — Django Advanced Patterns
  - references/django-celery.md — Django Celery Integration
  - references/django-orm-patterns.md — Django ORM Patterns
  - references/django-rest-framework.md — Django REST Framework Patterns
  - references/django-signals.md — Django Signal Patterns
  - references/django-structure.md — Django Project Structure
## Handoff
No artifact produced.
Next skill: backend-testing — test Django with pytest.
Carry forward: app organization, service layer pattern, DRF setup.
