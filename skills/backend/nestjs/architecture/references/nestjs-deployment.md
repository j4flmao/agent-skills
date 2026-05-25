# NestJS Deployment

## Production Build

```bash
# Build
npm run build
nest build

# Output: dist/ directory with compiled JS

# Production start
node dist/main.js

# With clustering (PM2)
npm install -g pm2
pm2 start dist/main.js -i max --name "app"
```

## Docker Deployment

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=orders
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_PASSWORD: ${DB_PASS}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      timeout: 5s
      retries: 5
```

## Environment Configuration

```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT!, 10) || 3000,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT!, 10) || 5432,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
  ],
})
export class AppModule {}
```

## CI/CD Pipeline

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run test:cov
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app .
      - run: docker push registry.example.com/app:latest
      - run: kubectl set image deployment/app app=registry.example.com/app:latest
```

## Platform Deployments

| Platform | Method | Notes |
|----------|--------|-------|
| **AWS ECS** | Docker | Fargate, auto-scaling |
| **Google Cloud Run** | Docker | Serverless containers |
| **Azure App Service** | Docker | Web App for Containers |
| **Railway** | GitHub deploy | Auto-detect Node.js |
| **Heroku** | Git deploy | Procfile: web: node dist/main.js |
| **Vercel** | Serverless | @nestjs/platform-serverless |
| **Kubernetes** | Helm | Scale with HPA |

## Graceful Shutdown

```typescript
import { ShutdownSignal } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  // Configure graceful shutdown
  app.enableShutdownHooks([ShutdownSignal.SIGTERM, ShutdownSignal.SIGINT]);
  await app.listen(3000);
}

bootstrap();
```

## Health Checks

```typescript
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
```

## Production Optimizations

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['warn', 'error']
      : ['log', 'debug', 'warn', 'error'],
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || [],
      credentials: true,
    },
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Compression
  app.use(compression());

  // Helmet
  app.use(helmet());

  await app.listen(3000);
}
```
