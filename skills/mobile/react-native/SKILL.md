---
name: react-native
description: React Native cross-platform development — TypeScript, Expo, React Navigation, Zustand/TanStack Query, Native Modules, New Architecture, Jest + Detox.
---

# React Native

## Agent Protocol

### Trigger
User request includes: `react native`, `react-native`, `expo`, `rn`, `react native architecture`, `react native navigation`, `react native testing`, `native module`, `new architecture`, `hermes`.

### Input Context
- RN version (0.76+, New Architecture enabled?)
- Expo or bare workflow
- State management (Redux Toolkit, Zustand, TanStack Query)
- Navigation (React Navigation, Expo Router)
- Platform target (iOS, Android)

### Output Artifact
A markdown document containing:
- Project structure
- Component tree
- Navigation/routing setup
- State management architecture
- Native module integration
- Test plan

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Project Structure (Expo)

```
app/                          # Expo Router file-based
├── (tabs)/
│   ├── _layout.tsx
│   ├── orders.tsx
│   └── profile.tsx
├── orders/
│   └── [id].tsx
├── _layout.tsx
└── index.tsx
src/
├── features/
│   ├── orders/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── index.ts
│   └── ...
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── lib/
│   ├── api.ts
│   └── query.ts
└── types/
    └── common.ts
```

## State Management — TanStack Query + Zustand

```typescript
// api/orders.ts
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.getOrders(),
  });
}

// stores/orderStore.ts
interface OrderStore {
  selectedId: string | null;
  filter: string;
  setFilter: (f: string) => void;
  selectOrder: (id: string) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  selectedId: null,
  filter: '',
  setFilter: (filter) => set({ filter }),
  selectOrder: (id) => set({ selectedId: id }),
}));
```

## Navigation — Expo Router

```typescript
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

// app/(tabs)/orders.tsx
export default function OrdersScreen() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) return <ActivityIndicator />;
  return (
    <FlatList
      data={orders}
      renderItem={({ item }) => <OrderCard order={item} />}
    />
  );
}
```

## Native Module Bridge

```typescript
// src/lib/payment.ts
import { NativeModules } from 'react-native';

const { PaymentModule } = NativeModules;

export async function processPayment(amount: number, currency: string): Promise<string> {
  return PaymentModule.processPayment(amount, currency);
}
```

### iOS Swift Implementation

```swift
@objc(PaymentModule)
class PaymentModule: NSObject {
  @objc
  func processPayment(_ amount: Double, currency: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve("payment_\(UUID().uuidString)")
  }
}
```

### Android Kotlin Implementation

```kotlin
@ReactMethod
fun processPayment(amount: Double, currency: String,
  promise: Promise) {
  promise.resolve("payment_${UUID.randomUUID()}")
}
```

## Testing

### Unit Test (Jest)

```typescript
describe('useOrders', () => {
  it('returns orders on success', async () => {
    const { result } = renderHook(() => useOrders(), {
      wrapper: QueryClientProvider,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

### Component Test (RNTL)

```typescript
it('renders order list', () => {
  render(<OrderListScreen />);
  expect(screen.getByText('Order #1')).toBeOnTheScreen();
});
```

### E2E (Detox)

```typescript
describe('Order Flow', () => {
  it('creates a new order', async () => {
    await by.id('create-order').tap();
    await by.id('customer-name').typeText('Alice');
    await by.id('submit-order').tap();
    await expect(by.text('Order created')).toBeVisible();
  });
});
```

## References

### Reference Files
- `references/architecture.md` — project structure, folder conventions
- `references/navigation.md` — Expo Router, React Navigation, deep linking
- `references/performance.md` — FlatList, Hermes, JS thread optimization
- `references/testing.md` — Jest, RNTL, Detox, MSW

### Related Skills
- `mobile/android/SKILL.md` — Android-specific native modules
- `mobile/ios/SKILL.md` — iOS-specific native modules
- `mobile/universal/deployment/SKILL.md` — app store deployment

## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for build and deployment.
