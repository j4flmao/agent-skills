# Vue Folder Structure

```
src/
├── App.vue
├── main.ts
├── router/
│   └── index.ts
├── pages/                    # Route-level views
│   ├── OrdersPage.vue
│   └── OrderDetailPage.vue
├── features/                 # Feature modules
│   ├── orders/
│   │   ├── components/       # Feature-specific components
│   │   │   ├── OrderList.vue
│   │   │   ├── OrderCard.vue
│   │   │   └── OrderForm.vue
│   │   ├── composables/      # Feature-specific composables
│   │   │   ├── useOrders.ts
│   │   │   └── useCreateOrder.ts
│   │   ├── api/
│   │   │   └── orders.api.ts
│   │   └── types/
│   │       └── order.ts
│   └── users/
│       └── ...
├── shared/                   # Shared UI and utilities
│   ├── components/
│   │   ├── UiButton.vue
│   │   ├── UiInput.vue
│   │   └── UiCard.vue
│   ├── composables/
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   └── utils/
│       ├── format.ts
│       └── validation.ts
├── stores/                   # Pinia stores
│   ├── auth.ts
│   └── ui.ts
├── lib/
│   └── api-client.ts
└── styles/
    └── main.css
```

## Conventions
- Feature-based grouping
- Composables in nearest feature folder or shared
- Components prefixed with `Ui` for shared UI kit
- Pages in `pages/` mirror router structure
