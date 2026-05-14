# Angular Signals Guide

## Signal Basics
```typescript
import { signal, computed, effect } from '@angular/core'

// Writable signal
const count = signal(0)
count.set(1)                 // Direct assignment
count.update(v => v + 1)     // Update based on current value

// Computed signal (read-only, derived)
const doubled = computed(() => count() * 2)

// Effect (side effect, runs on signal changes)
effect(() => {
  console.log(`Count changed to ${count()}`)
})
```

## Signal Store (Default State Management)
```typescript
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals'

interface OrdersState {
  orders: Order[]
  selectedOrderId: string | null
  loading: boolean
}

const initialState: OrdersState = {
  orders: [],
  selectedOrderId: null,
  loading: false,
}

export const OrdersStore = signalStore(
  withState(initialState),
  withComputed(({ orders, selectedOrderId }) => ({
    selectedOrder: computed(() =>
      orders().find(o => o.id === selectedOrderId())
    ),
  })),
  withMethods((store, orderService = inject(OrderService)) => ({
    async loadOrders() {
      patchState(store, { loading: true })
      const orders = await orderService.getAll()
      patchState(store, { orders, loading: false })
    },
  })),
)
```

## Signals vs RxJS
| Use Case | Solution |
|----------|----------|
| Synchronous state | Signal |
| Async data streams | RxJS Observable |
| HTTP requests | RxJS (HttpClient) |
| Form state | Signal |
| Event streams | RxJS Subject |
| Computed values | computed() signal |

## Input/Output with Signals
```typescript
@Component({ ... })
export class OrderCardComponent {
  order = input.required<Order>()           // Required input
  showDetails = input(false)                // Optional input with default
  statusChange = output<OrderStatus>()      // Output as signal

  onStatusChange(status: OrderStatus) {
    this.statusChange.emit(status)
  }
}
```
