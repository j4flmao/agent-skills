# Django ORM Patterns

## Query Optimization

### N+1 Prevention
```python
# Bad — N+1 queries
orders = Order.objects.all()
for order in orders:
    print(order.customer.name)  # Hits DB for each order

# Good — select_related for FK/O2O
orders = Order.objects.select_related('customer').all()

# Good — prefetch_related for M2M/reverse FK
orders = Order.objects.prefetch_related('items', 'items__product').all()
```

### Indexing
```python
class Order(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['customer', '-created_at']),
        ]
```

## Common Query Patterns

### Aggregation
```python
from django.db.models import Count, Sum, Avg, Q, F, Subquery, OuterRef

# Count by status
Order.objects.values('status').annotate(count=Count('id'))

# Total revenue
Order.objects.filter(status='confirmed').aggregate(total=Sum('total'))

# Conditional aggregation
Order.objects.aggregate(high_value=Count('id', filter=Q(total__gt=1000)))
```

### Subqueries
```python
from django.db.models import Subquery, OuterRef

latest_order = Order.objects.filter(
    customer=OuterRef('pk')
).order_by('-created_at').values('total')[:1]

Customer.objects.annotate(last_order_total=Subquery(latest_order))
```

### Bulk Operations
```python
# Bulk create
OrderItem.objects.bulk_create(items, batch_size=500)

# Bulk update
Order.objects.filter(status='pending', created_at__lt=cutoff).update(status='cancelled')

# Bulk delete
Order.objects.filter(status='cancelled', created_at__lt=cutoff).delete()
```

## Migration Best Practices

- Add nullable fields first, populate, then make non-nullable.
- Use `RunSQL` for complex data migrations.
- Test migrations against a copy of production data.
- Never remove a column without deprecation period.
- Use `SeparateDatabaseAndState` for index-only changes.
