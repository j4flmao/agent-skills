# Component Patterns Reference

## Container / Presentational (React)

### Container Pattern

```tsx
// containers/OrderListContainer.tsx
export function OrderListContainer() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', { page, pageSize }],
    queryFn: () => api.getOrders({ page, pageSize }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveOrder(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data?.items.length) return <EmptyState message="No orders found" />;

  return (
    <OrderListView
      orders={data.items}
      totalPages={data.totalPages}
      currentPage={page}
      onPageChange={setPage}
      onApprove={(id) => approveMutation.mutate(id)}
    />
  );
}
```

### Presentational Pattern

```tsx
// components/OrderListView.tsx
interface OrderListViewProps {
  orders: Order[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onApprove: (id: string) => void;
}

export function OrderListView({
  orders,
  totalPages,
  currentPage,
  onPageChange,
  onApprove,
}: OrderListViewProps) {
  return (
    <div>
      <table>
        <thead>
          <tr><th>ID</th><th>Total</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>${order.total}</td>
              <td><StatusBadge status={order.status} /></td>
              <td>
                {order.status === 'pending' && (
                  <button onClick={() => onApprove(order.id)}>Approve</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination current={currentPage} total={totalPages} onChange={onPageChange} />
    </div>
  );
}
```

## Compound Components (React)

```tsx
// components/Accordion.tsx
interface AccordionContextType {
  openItems: Set<string>;
  toggleItem: (id: string) => void;
}
const AccordionContext = createContext<AccordionContextType | null>(null);

function Accordion({ children, defaultOpen }: { children: ReactNode; defaultOpen?: string[] }) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));
  const toggleItem = useCallback((id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const ctx = useContext(AccordionContext)!;
  const isOpen = ctx.openItems.has(id);
  return (
    <div className="accordion-item">
      <button onClick={() => ctx.toggleItem(id)}>{title} {isOpen ? '−' : '+'}</button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
}

Accordion.Item = AccordionItem;
```

### Vue Compound Component

```vue
<!-- Accordion.vue -->
<script setup lang="ts">
import { provide, ref } from 'vue'

const openItems = ref<Set<string>>(new Set())
const toggleItem = (id: string) => {
  const next = new Set(openItems.value)
  next.has(id) ? next.delete(id) : next.add(id)
  openItems.value = next
}
provide('accordion', { openItems, toggleItem })
</script>

<template><div class="accordion"><slot /></div></template>
```

### Angular Content Projection

```typescript
// tabs.component.ts
@Component({
  selector: 'app-tabs',
  template: `<div class="tabs"><ng-content /></div>`,
})
export class TabsComponent {
  @ContentChildren(TabComponent) tabs!: QueryList<TabComponent>;
}
```

## Higher-Order Component

```typescript
// hocs/withTracking.tsx
interface WithTrackingProps {
  trackEvent: (event: string, data?: Record<string, unknown>) => void;
}

export function withTracking<P extends object>(
  Component: React.ComponentType<P & WithTrackingProps>
) {
  return function TrackedComponent(props: P) {
    const trackEvent = useCallback((event: string, data?: Record<string, unknown>) => {
      analytics.track(event, { ...data, component: Component.displayName });
    }, []);

    return <Component {...props} trackEvent={trackEvent} />;
  };
}
```

## Render Props (React)

```tsx
interface MouseTrackerProps {
  render: (state: { x: number; y: number }) => ReactNode;
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={(e) => setPosition({ x: e.clientX, y: e.clientY })}>
      {render(position)}
    </div>
  );
}

// Usage
<MouseTracker render={({ x, y }) => <p>Mouse position: {x}, {y}</p>} />
```

## Provider Pattern (Angular Services)

```typescript
// Angular equivalent of Provider pattern via DI
@Injectable({ providedIn: 'root' })
export class OrderStateService {
  private orders = signal<Order[]>([]);
  readonly orders$ = this.orders.asReadonly();

  addOrder(order: Order) {
    this.orders.update(prev => [...prev, order]);
  }
}

@Component({ selector: 'app-order-list' })
export class OrderListComponent {
  private orderState = inject(OrderStateService);
  orders = this.orderState.orders$;
}
```
