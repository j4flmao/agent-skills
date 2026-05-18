# React Native Navigation

## Expo Router (file-based)

```
app/
├── (tabs)/
│   ├── _layout.tsx         # Tab bar config
│   ├── orders.tsx          # Tab: Orders
│   └── profile.tsx         # Tab: Profile
├── orders/
│   ├── [id].tsx            # /orders/123
│   └── new.tsx             # /orders/new
├── _layout.tsx             # Root layout
└── index.tsx               # Redirect to /orders
```

```typescript
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return <Tabs>
    <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ... }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>;
}
```

## React Navigation

```typescript
const Stack = createNativeStackNavigator<RootStackParamList>();

type RootStackParamList = {
  Orders: undefined;
  OrderDetail: { id: string };
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Deep Linking

```typescript
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Orders: 'orders',
      OrderDetail: 'orders/:id',
    },
  },
};
```
