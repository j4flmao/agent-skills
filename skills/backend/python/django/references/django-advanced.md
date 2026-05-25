# Django Advanced Patterns

## Custom Middleware

```python
# apps/core/middleware.py
import time
import uuid
from django.utils.deprecation import MiddlewareMixin

class RequestTimingMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request._start_time = time.time()
        request.request_id = str(uuid.uuid4())

    def process_response(self, request, response):
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            response['X-Request-ID'] = request.request_id
            response['X-Duration-MS'] = int(duration * 1000)
        return response

# settings.py
MIDDLEWARE = [
    'apps.core.middleware.RequestTimingMiddleware',
    # ... other middleware
]
```

## Custom Management Commands

```python
# apps/orders/management/commands/process_expired.py
from django.core.management.base import BaseCommand
from apps.orders.models import Order

class Command(BaseCommand):
    help = 'Cancel expired pending orders'

    def add_arguments(self, parser):
        parser.add_argument('--hours', type=int, default=24)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=options['hours'])
        expired = Order.objects.filter(
            status='pending',
            created_at__lt=cutoff,
        )
        count = expired.count()
        expired.update(status='cancelled')
        self.stdout.write(self.style.SUCCESS(f'Cancelled {count} orders'))
```

## Advanced ORM Queries

```python
# Subqueries and annotations
from django.db.models import Count, Sum, Q, F, Subquery, OuterRef, Prefetch
from django.db.models.functions import TruncMonth, ExtractYear

# Complex aggregations
orders = Order.objects.annotate(
    item_count=Count('items'),
    total_value=Sum('items__price', filter=Q(status='confirmed')),
    month=TruncMonth('created_at'),
).filter(
    created_at__year=ExtractYear('now()'),
)

# Subquery
latest_orders = Order.objects.filter(
    customer=OuterRef('pk'),
).order_by('-created_at')

customers = Customer.objects.annotate(
    last_order_date=Subquery(latest_orders.values('created_at')[:1]),
)

# Prefetch with filters
from apps.orders.models import OrderItem

orders = Order.objects.prefetch_related(
    Prefetch(
        'items',
        queryset=OrderItem.objects.filter(quantity__gte=2),
        to_attr='bulk_items',
    )
)

# Window functions
from django.db.models import Window, Rank

ranked = Order.objects.annotate(
    rank=Window(
        expression=Rank(),
        partition_by=[F('customer')],
        order_by=F('total').desc(),
    ),
)
```

## Database Optimization

```python
# Indexing
class Order(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['-created_at']),
        ]

# Select only needed fields
orders = Order.objects.only('id', 'status', 'total')

# Defer heavy fields
orders = Order.objects.defer('notes', 'metadata')

# Select for update (locking)
with transaction.atomic():
    order = Order.objects.select_for_update().get(id=order_id)
    order.status = 'confirmed'
    order.save()
```

## Task Queue (Celery)

```python
# config/celery.py
from celery import Celery
app = Celery('orders')
app.config_from_object('django.conf:settings', namespace='CELERY')

# tasks.py
@app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_payment(self, order_id):
    try:
        order = Order.objects.get(id=order_id)
        payment_gateway.charge(order.total)
        order.status = 'paid'
        order.save()
    except PaymentError as exc:
        raise self.retry(exc=exc)
```

## Custom Model Managers

```python
class OrderManager(models.Manager):
    def pending(self):
        return self.filter(status='pending')

    def for_customer(self, customer_id):
        return self.filter(customer_id=customer_id)

    def requiring_approval(self):
        return self.filter(total__gte=10000, status='pending_approval')

class Order(models.Model):
    objects = OrderManager()
```

## Advanced Signals

```python
from django.dispatch import Signal, receiver

# Custom signal
order_shipped = Signal()

@receiver(order_shipped)
def handle_order_shipped(sender, **kwargs):
    order = kwargs['order']
    send_notification(order.customer_id, f'Order {order.id} shipped')

# Connecting in AppConfig.ready
class OrdersConfig(AppConfig):
    name = 'apps.orders'

    def ready(self):
        import apps.orders.signals  # noqa
```

## Performance Tips

| Technique | Impact | Use Case |
|-----------|--------|----------|
| select_related | N+1 prevention | FK relationships |
| prefetch_related | N+1 prevention | M2M, reverse FK |
| only/defer | Less data transfer | Large models |
| bulk_create | Fast inserts | Batch operations |
| update/delete | Single query | Bulk modifications |
| iterator | Memory efficiency | Large querysets |
