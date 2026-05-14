# Go Project Layout

```
cmd/
├── server/
│   └── main.go
└── migration/
    └── main.go

internal/
├── domain/
│   ├── entity/
│   │   └── order.go
│   ├── repository/
│   │   └── order_repository.go (interface)
│   └── service/
│       └── order_service.go
├── application/
│   ├── usecase/
│   │   └── place_order.go
│   └── dto/
│       └── place_order.go
└── infrastructure/
    ├── persistence/
    │   └── postgres/
    │       └── order_repository.go
    ├── web/
    │   └── handler/
    │       └── order_handler.go
    └── auth/
        └── jwt.go

pkg/
├── middleware/
│   └── logging.go
└── response/
    └── envelope.go

api/
├── openapi.yaml
└── proto/
```
