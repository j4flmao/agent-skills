# Hooks Patterns Reference

## Custom Hook Design

### Data Fetching Hook

```typescript
// hooks/useOrders.ts
import { useState, useEffect, useCallback } from 'react';

interface UseOrdersOptions {
  autoFetch?: boolean;
  pageSize?: number;
}

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useOrders(filters: OrderFilters, options: UseOrdersOptions = {}): UseOrdersReturn {
  const { autoFetch = true, pageSize = 20 } = options;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getOrders({ ...filters, page, pageSize });
      setOrders(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (autoFetch) fetchOrders();
  }, [autoFetch, fetchOrders]);

  return { orders, loading, error, page, totalPages, setPage, refetch: fetchOrders };
}
```

### Form Handling Hook

```typescript
// hooks/useForm.ts
interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setTouched: (key: keyof T) => void;
  validate: () => boolean;
  reset: () => void;
}

export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules?: Partial<Record<keyof T, (value: unknown) => string | null>>
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    if (validationRules?.[key]) {
      const error = validationRules[key]!(value);
      setErrors(prev => ({ ...prev, [key]: error }));
    }
  }, [validationRules]);

  const validate = useCallback((): boolean => {
    if (!validationRules) return true;
    const newErrors: Partial<Record<keyof T, string>> = {};
    let valid = true;

    for (const key in validationRules) {
      const error = validationRules[key]!(values[key]);
      if (error) { newErrors[key] = error; valid = false; }
    }

    setErrors(newErrors);
    return valid;
  }, [validationRules, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, setValue, setTouched, validate, reset };
}
```

### Debounced Search Hook

```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchableOrderList() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { orders } = useOrders({ search: debouncedSearch });
  // ...
}
```

### Auth Hook

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const { user, login: storeLogin, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (credentials: Credentials) => {
    const { token, user } = await api.login(credentials);
    localStorage.setItem('auth_token', token);
    storeLogin(token, user);
    navigate('/dashboard');
  }, [navigate, storeLogin]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    storeLogout();
    navigate('/login');
  }, [navigate, storeLogout]);

  return { user, isAuthenticated: !!user, login, logout };
}
```

## Hook Composition Rules

### Rule 1: One Hook per Concern

```typescript
// BAD — one hook does everything
function useOrderPage() { /* fetches orders, manages filters, handles pagination, tracks events */ }

// GOOD — split by concern
function useOrders(filters) { /* data fetching */ }
function useOrderFilters() { /* filter state */ }
function usePagination(totalPages) { /* page state */ }
function useOrderTracking() { /* analytics */ }
```

### Rule 2: Hooks Call Hooks Only at Top Level

```typescript
// BAD — conditional hook call
function useOrders(enabled: boolean) {
  if (enabled) {
    const [data, setData] = useState(); // RULE VIOLATION
  }
}

// GOOD — hook always called, condition inside
function useOrders(enabled: boolean) {
  const [data, setData] = useState();
  useEffect(() => { if (enabled) fetch(); }, [enabled]);
}
```

### Rule 3: Return Stable References

```typescript
// BAD — new function reference every render
function useActions() {
  return {
    approve: (id: string) => api.approve(id),  // new reference each render
  };
}

// GOOD — stable references
function useActions() {
  const approve = useCallback((id: string) => api.approve(id), []);
  return { approve };
}
```

## Vue Composables

```typescript
// composables/useOrders.ts
import { ref, watch, type Ref, type ComputedRef, computed } from 'vue'

export function useOrders(filters: Ref<OrderFilters>) {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchOrders() {
    loading.value = true
    error.value = null
    try {
      orders.value = await api.getOrders(filters.value)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  watch(filters, fetchOrders, { immediate: true })

  const total = computed(() => orders.value.reduce((sum, o) => sum + o.total, 0))

  return { orders, loading, error, total, refetch: fetchOrders }
}
```

### Composable Composition

```typescript
// composables/useOrderPage.ts
export function useOrderPage() {
  const filters = useOrderFilters()
  const { orders, loading, error, refetch } = useOrders(filters)
  const { pagination, setPage } = usePagination()
  const { trackPageView } = useAnalytics()

  watchEffect(() => {
    if (!loading.value) trackPageView('orders', { count: orders.value.length })
  })

  return { orders, loading, error, pagination, setPage, refetch }
}
```

## SolidJS Signals

```typescript
// signals/orders.ts
import { createSignal, createResource, createMemo } from 'solid-js';

export function createOrdersResource(filters: () => OrderFilters) {
  const [page, setPage] = createSignal(1);
  const [ordersResource] = createResource(
    () => ({ ...filters(), page: page() }),
    (params) => api.getOrders(params)
  );

  const total = createMemo(() =>
    ordersResource()?.items.reduce((sum, o) => sum + o.total, 0) ?? 0
  );

  return {
    orders: () => ordersResource()?.items ?? [],
    loading: ordersResource.loading,
    error: ordersResource.error,
    total,
    page,
    setPage,
  };
}
```
