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
Structure Django applications with one app per bounded context, service layer for business logic, thin views, and clean separation of concerns.

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
```

### Step 2: Service Layer (Business Logic Here)
```python
# apps/orders/services.py
from dataclasses import dataclass
from apps.orders.models import Order
from apps.orders.repositories import OrderRepository

class OrderService:
    def __init__(self, repo: OrderRepository):
        self.repo = repo

    def place_order(self, user_id: int, items: list[dict]) -> Order:
        order = self.repo.create(user_id=user_id, status="pending")
        for item in items:
            self.repo.add_item(order, **item)
        total = sum(item.price * item.quantity for item in order.items.all())
        order.status = "confirmed" if total <= 10000 else "pending_approval"
        order.save()
        return order
```

### Step 3: Thin Models
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

    def can_be_cancelled(self) -> bool:
        return self.status in ("pending", "confirmed")
```

### Step 4: Thin Views
```python
# apps/orders/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.orders.serializers import OrderSerializer, CreateOrderSerializer
from apps.orders.services import OrderService
from apps.orders.repositories import OrderRepository

class OrderViewSet(viewsets.GenericViewSet):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = OrderService(OrderRepository())

    def create(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = self.service.place_order(
            user_id=request.user.id,
            items=serializer.validated_data["items"],
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
```

### Step 5: Signals Delegate to Services
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
```

## Rules
- Business logic lives in services.py. Models contain field definitions and basic constraints only. Views contain request parsing and response formatting only.
- Signals trigger service calls. They do not contain business logic themselves.
- Use select_related (foreign keys) and prefetch_related (many-to-many, reverse FK) to prevent N+1 queries. Lazy loading in templates is a performance bug.
- Migrations are backward-compatible. No dropping columns without deprecation period. No back-to-back migrations that conflict.
- DRF serializers act as DTOs at the boundary. They convert between request/response formats and domain/service calls.

## References
- `references/django-structure.md` — Django project structure, thin models, service layer
- `references/django-rest-framework.md` — DRF ViewSets, serializers, permissions, filtering
- `references/django-orm-patterns.md` — N+1 prevention, aggregation, subqueries, bulk operations
- `references/django-advanced.md` — Custom middleware, commands, ORM optimization, Celery

## Handoff
No artifact produced.
Next skill: backend-testing — test Django with pytest.
Carry forward: app organization, service layer pattern, DRF setup.
