# React Folder Structure

```
src/
├── app/                    # App setup, routing
│   ├── App.tsx
│   └── routes.tsx
├── pages/                  # Route-level components (containers/smart)
│   ├── OrdersPage.tsx
│   ├── OrderDetailPage.tsx
│   └── CreateOrderPage.tsx
├── features/               # Feature modules
│   ├── orders/
│   │   ├── components/     # Feature-specific components (presentation/dumb)
│   │   │   ├── OrderList.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   └── OrderForm.tsx
│   │   ├── hooks/          # Feature-specific hooks
│   │   │   ├── useOrders.ts
│   │   │   └── useCreateOrder.ts
│   │   ├── api/            # API calls
│   │   │   └── orders.api.ts
│   │   └── types/
│   │       └── order.types.ts
│   └── users/
│       └── ...
├── shared/                 # Shared components, hooks, utils
│   ├── components/         # Design system / UI kit
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   └── utils/
│       ├── format.ts
│       └── validation.ts
├── providers/              # Context providers
│   └── AuthProvider.tsx
├── lib/                    # Third-party integrations
│   └── api-client.ts
└── styles/
    └── globals.css
```

## Conventions
- Feature-based grouping, not type-based
- Smart components (pages) in `pages/`, dumb components in `features/X/components/`
- One feature = one folder = self-contained module
- Shared UI = `shared/components/`
