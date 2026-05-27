---
name: react-native
description: >
  Use this skill when the user asks about React Native, Expo, React Navigation,
  Zustand, TanStack Query, native modules, New Architecture, Hermes, or React
  Native testing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, react-native, phase-4]
---

# React Native

## Purpose
Build React Native cross-platform applications with Expo, TanStack Query, Zustand, React Navigation, native modules, and comprehensive testing with Jest and Detox.

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

——

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Project Structure
Initialize with Expo and organize code with feature-based folders: features (api, components, hooks, types), shared, lib, and types.

### Step 2: Configure State Management
Use TanStack Query for server state (caching, refetching, pagination) and Zustand for lightweight client state.

### Step 3: Set Up Navigation
Configure Expo Router with file-based routing, tab navigation, and deep linking support.

### Step 4: Implement Native Module Bridges
Create native module interfaces for platform-specific features with Swift (iOS) and Kotlin (Android) implementations.

### Step 5: Write Tests
Cover queries with Jest unit tests, components with RNTL, and critical flows with Detox E2E tests.

## Rules

- Server state belongs in TanStack Query — not in Zustand or Redux
- Client state (UI state, selected IDs, filters) belongs in Zustand
- FlatList over ScrollView for lists with virtualization enabled
- Native modules must have TypeScript interface + iOS Swift + Android Kotlin implementations
- Avoid inline styles — use StyleSheet.create or styled components
- Hermes enabled by default for production builds
- KeyboardAvoidingView wrapping for text input screens

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
  - references/architecture.md — React Native Architecture
  - references/navigation-routing.md — React Native Navigation and Routing
  - references/navigation.md — React Native Navigation
  - references/performance-optimization.md — React Native Performance Optimization
  - references/performance.md — React Native Performance
  - references/react-native-advanced.md — React Native Advanced Topics
  - references/react-native-fundamentals.md — React Native Fundamentals
  - references/testing.md — React Native Testing
## Handoff

Hand off to `mobile/universal/deployment/SKILL.md` for build and deployment.
