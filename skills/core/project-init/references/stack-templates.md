# Stack Templates

## NestJS

```
project/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/
│   │   │   └── guards/
│   │   └── users/
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       ├── users.module.ts
│   │       ├── entities/
│   │       └── dto/
│   ├── shared/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── pipes/
│   │   └── decorators/
│   ├── config/
│   │   ├── database.config.ts
│   │   └── app.config.ts
│   └── main.ts
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── tsconfig.json
├── nest-cli.json
├── package.json
└── .env.example
```

## Go

```
project/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── domain/
│   │   ├── user.go
│   │   └── errors.go
│   ├── application/
│   │   ├── auth_service.go
│   │   └── user_service.go
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── cache/
│   │   └── queue/
│   ├── api/
│   │   ├── handler/
│   │   ├── middleware/
│   │   └── router.go
│   └── config/
│       └── config.go
├── api/
│   └── openapi.yaml
├── migrations/
│   └── 001_create_users.sql
├── go.mod
├── go.sum
├── Dockerfile
├── Makefile
└── .env.example
```

## Rust

```
project/
├── crates/
│   ├── domain/
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── models/
│   │       └── errors.rs
│   ├── application/
│   │   └── src/
│   │       ├── lib.rs
│   │       └── services/
│   ├── infrastructure/
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── database/
│   │       └── cache/
│   └── api/
│       └── src/
│           ├── lib.rs
│           ├── handlers/
│           └── middleware/
├── Cargo.toml
├── Cargo.lock
├── Dockerfile
└── .env.example
```

## FastAPI

```
project/
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   └── users.py
│   │       └── api.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── database.py
│   ├── domain/
│   │   ├── models.py
│   │   └── schemas.py
│   ├── application/
│   │   └── use_cases/
│   ├── infrastructure/
│   │   └── repositories/
│   └── main.py
├── tests/
├── alembic/
├── pyproject.toml
├── Dockerfile
└── .env.example
```

## Spring Boot

```
project/
├── src/
│   ├── main/
│   │   ├── java/com/project/
│   │   │   ├── config/
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── model/
│   │   │   ├── dto/
│   │   │   └── Application.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       └── db/migration/
│   └── test/
│       └── java/com/project/
├── pom.xml / build.gradle
├── Dockerfile
└── .env.example
```

## React (Vite)

```
project/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   └── dashboard/
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── lib/
│   │   └── api-client.ts
│   └── assets/
├── public/
├── tests/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Python (Django)

```
project/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── tests.py
│   └── api/
├── static/
├── templates/
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── manage.py
├── Dockerfile
└── .env.example
```

## Monorepo (Nx)

```
project/
├── apps/
│   ├── api/
│   ├── web/
│   └── mobile/
├── libs/
│   ├── shared/
│   │   ├── types/
│   │   └── utils/
│   └── feature/
│       ├── auth/
│       └── dashboard/
├── tools/
│   ├── scripts/
│   └── generators/
├── nx.json
├── package.json
├── tsconfig.base.json
└── .eslintrc.json
```
