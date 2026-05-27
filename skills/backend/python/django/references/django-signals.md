# Django Signal Patterns

## Signal Registration

### AppConfig Setup
```python
# apps/users/apps.py
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"

    def ready(self):
        import apps.users.signals  # noqa
```

### Signal File Structure
```
signals/
├── __init__.py
├── user_signals.py
├── order_signals.py
└── notification_signals.py
```

## Common Signal Patterns

### Post-Save Signals
```python
# apps/orders/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.orders.models import Order
from apps.notifications.services import NotificationService
from apps.analytics.services import AnalyticsService

@receiver(post_save, sender=Order)
def handle_order_created(sender, instance, created, **kwargs):
    if not created:
        return

    NotificationService().send_order_confirmation(instance)
    AnalyticsService().track_order_created(instance)
```

### Pre-Save Signals
```python
# apps/users/signals.py
from django.db.models.signals import pre_save
from django.dispatch import receiver
from apps.users.models import User

@receiver(pre_save, sender=User)
def set_default_role(sender, instance, **kwargs):
    if not instance.pk:
        instance.role = instance.role or "user"

@receiver(pre_save, sender=User)
def hash_password_on_change(sender, instance, **kwargs):
    if instance.pk:
        old = User.objects.get(pk=instance.pk)
        if old.password != instance.password:
            from django.contrib.auth.hashers import make_password
            instance.password = make_password(instance.password)
    else:
        from django.contrib.auth.hashers import make_password
        instance.password = make_password(instance.password)
```

### Post-Delete Signals
```python
# apps/documents/signals.py
from django.db.models.signals import post_delete
from django.dispatch import receiver
from apps.documents.models import Document
from apps.storage.services import StorageService

@receiver(post_delete, sender=Document)
def cleanup_document_files(sender, instance, **kwargs):
    """Delete file from storage when Document is deleted."""
    if instance.file:
        StorageService().delete(instance.file.name)

@receiver(post_delete, sender=Document)
def log_document_deletion(sender, instance, **kwargs):
    from apps.audit.services import AuditService
    AuditService().log("document_deleted", {
        "document_id": instance.id,
        "title": instance.title,
        "deleted_by": instance.uploaded_by_id,
    })
```

## Custom Signals

### Signal Definition
```python
# apps/orders/signals.py
import django.dispatch

order_shipped = django.dispatch.Signal()
order_delivered = django.dispatch.Signal()
payment_received = django.dispatch.Signal()
stock_low = django.dispatch.Signal()

# With arguments
user_subscription_changed = django.dispatch.Signal()
```

### Sending Signals
```python
# apps/orders/services.py
from django.dispatch import Signal
from apps.orders.signals import order_shipped, payment_received

class OrderService:
    def ship_order(self, order_id: int) -> Order:
        order = Order.objects.get(id=order_id)
        order.status = "shipped"
        order.shipped_at = timezone.now()
        order.save()

        # Send custom signal
        order_shipped.send(
            sender=self.__class__,
            order=order,
            tracking_number=order.tracking_number,
        )

        return order

    def process_payment(self, order: Order, amount: Decimal) -> bool:
        # Payment processing...
        payment_received.send(
            sender=self.__class__,
            order=order,
            amount=amount,
            payment_method=order.payment_method,
        )
        return True
```

### Receiving Custom Signals
```python
# apps/notifications/handlers.py
from django.dispatch import receiver
from apps.orders.signals import order_shipped, payment_received
from apps.notifications.services import EmailService, PushService

@receiver(order_shipped)
def notify_customer_order_shipped(sender, **kwargs):
    order = kwargs["order"]
    tracking = kwargs["tracking_number"]

    EmailService().send_template(order.user.email, "order_shipped", {
        "order_id": order.id,
        "tracking_number": tracking,
    })

    PushService().send(order.user, {
        "title": "Order Shipped!",
        "body": f"Order #{order.id} is on its way!",
    })

@receiver(payment_received)
def update_inventory_on_payment(sender, **kwargs):
    order = kwargs["order"]
    from apps.inventory.services import InventoryService
    InventoryService().reserve_items(order)
```

## Conditional Signal Connections

### Dynamic Connection
```python
# apps/core/signal_manager.py
from django.db.models.signals import post_save
from django.apps import apps

def connect_signals_for_tenant(tenant):
    """Connect signals only for specific tenant."""
    if tenant.plan == "enterprise":
        from apps.analytics.signals import track_order_created

        post_save.connect(
            track_order_created,
            sender=apps.get_model("orders", "Order"),
            weak=False,
        )
```

### Disconnecting Signals
```python
# During testing
from django.db.models.signals import post_save
from apps.orders.signals import handle_order_created

class SignalTestMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        post_save.disconnect(handle_order_created, sender=Order)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        post_save.connect(handle_order_created, sender=Order)
```

## Signal Ordering

### Execution Order
```python
# apps/users/signals.py
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

@receiver(pre_save, sender=User)
def validate_user_email(sender, instance, **kwargs):
    """Runs first (registered first)."""
    if not instance.email or "@" not in instance.email:
        raise ValueError("Invalid email")

@receiver(pre_save, sender=User)
def normalize_email(sender, instance, **kwargs):
    """Runs second."""
    instance.email = instance.email.lower().strip()

@receiver(post_save, sender=User)
def send_welcome_email(sender, instance, created, **kwargs):
    """Runs after save completes."""
    if created:
        send_welcome_email_task.delay(instance.id)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Runs after other post_save handlers."""
    if created:
        Profile.objects.create(user=instance)
```

## Signal Testing

### Test Case Setup
```python
# apps/orders/tests/test_signals.py
from django.test import TestCase
from django.db.models.signals import post_save
from unittest.mock import patch, Mock

class OrderSignalTestCase(TestCase):
    def setUp(self):
        # Disconnect signals for clean test
        post_save.disconnect(
            sender=Order,
            dispatch_uid="handle_order_created",
        )

    def tearDown(self):
        # Reconnect
        from apps.orders.signals import handle_order_created
        post_save.connect(
            handle_order_created,
            sender=Order,
            dispatch_uid="handle_order_created",
        )

    @patch("apps.notifications.services.NotificationService.send_order_confirmation")
    def test_order_created_signal_sends_notification(self, mock_send):
        with patch("apps.orders.signals.AnalyticsService.track_order_created"):
            # Reconnect just this one
            from apps.orders.signals import handle_order_created
            post_save.connect(
                handle_order_created,
                sender=Order,
                weak=False,
            )

            order = Order.objects.create(
                user=self.user,
                total=Decimal("100.00"),
            )

            mock_send.assert_called_once_with(order)
```

## Performance Considerations

### Signal Throttling
```python
# apps/core/signal_throttle.py
import time
from functools import wraps

def throttle_signal(seconds: int = 60):
    """Prevent signal from firing too frequently."""
    def decorator(signal_func):
        last_called = {}

        @wraps(signal_func)
        def wrapper(sender, **kwargs):
            key = f"{sender.__module__}.{signal_func.__name__}"
            now = time.time()
            if key in last_called and now - last_called[key] < seconds:
                return
            last_called[key] = now
            return signal_func(sender, **kwargs)

        return wrapper
    return decorator

# Usage
@receiver(post_save, sender=Order)
@throttle_signal(seconds=300)
def update_order_dashboard(sender, **kwargs):
    """Only updates dashboard every 5 minutes regardless of saves."""
    from apps.dashboard.services import DashboardService
    DashboardService().recalculate_metrics()
```

### Selective Processing
```python
@receiver(post_save, sender=Order)
def process_order_if_paid(sender, instance, **kwargs):
    """Only process orders that meet specific criteria."""
    if instance.status != "paid":
        return
    if not instance.is_fully_paid():
        return
    if instance.processed_at is not None:
        return

    process_order_tasks.delay(instance.id)
```

## Key Points
- Signal receivers are registered in AppConfig.ready() to ensure connection
- Pre/post save/delete signals hook into model lifecycle events
- Custom signals decouple event producers from consumers
- Signal ordering depends on registration order — not guaranteed
- Disconnect signals during tests for isolated test cases
- Use dispatch_uid to prevent duplicate signal connections
- Throttle signals to prevent excessive processing on frequent saves
- Selective processing checks conditions before executing logic
- Signals should delegate to service layer, not contain business logic
