# NestJS Providers and DI

## Custom Providers

```typescript
import { Injectable, Inject, Provider, FactoryProvider } from '@nestjs/common'

@Injectable()
export class DatabaseService {
  async connect(): Promise<void> {
    // connect implementation
  }

  async query<T>(sql: string): Promise<T> {
    // query implementation
  }
}

// Factory Provider
export const databaseFactory: FactoryProvider = {
  provide: 'DATABASE_CONNECTION',
  useFactory: async (config: ConfigService) => {
    const db = new DatabaseService()
    await db.connect()
    return db
  },
  inject: [ConfigService],
}

// Class Provider
@Injectable()
export class ProductionLogger implements Logger {
  log(message: string) { console.log(message) }
}

@Injectable()
export class DevelopmentLogger implements Logger {
  log(message: string) { console.debug(message) }
}

export const LoggerProvider: Provider = {
  provide: 'LOGGER',
  useClass: process.env.NODE_ENV === 'production'
    ? ProductionLogger
    : DevelopmentLogger,
}
```

## Dynamic Modules

```typescript
import { DynamicModule, Module, Global } from '@nestjs/common'

interface CacheModuleOptions {
  store: 'redis' | 'memory'
  ttl?: number
  host?: string
  port?: number
}

@Global()
@Module({})
export class CacheModule {
  static register(options: CacheModuleOptions): DynamicModule {
    const cacheProvider = {
      provide: 'CACHE_SERVICE',
      useFactory: () => {
        if (options.store === 'redis') {
          return new RedisCacheService({
            host: options.host || 'localhost',
            port: options.port || 6379,
          })
        }
        return new InMemoryCacheService(options.ttl || 300)
      },
    }

    return {
      module: CacheModule,
      providers: [cacheProvider],
      exports: [cacheProvider],
    }
  }

  static registerAsync(options: {
    useFactory: (...args: unknown[]) => Promise<CacheModuleOptions>
    inject?: unknown[]
  }): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        {
          provide: 'CACHE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: ['CACHE_OPTIONS'],
    }
  }
}
```

## Circular Dependency

```typescript
import { forwardRef, Inject, Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  async validateUser(userId: string): Promise<boolean> {
    const user = await this.userService.findById(userId)
    return user?.isActive ?? false
  }
}

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  findById(id: string): Promise<User> {
    return this.userRepository.findOne(id)
  }
}
```

## Key Points

- Use factory providers for dynamic dependency creation
- Use class providers for environment-specific implementations
- Use value providers for constants and configuration
- Use dynamic modules for configurable feature modules
- Use forwardRef for circular dependency resolution
- Use global modules for singleton services
- Use custom providers with tokens for abstraction
- Use @Optional() for optional dependencies
- Use @Inject() for non-class-based tokens
- Implement provider scopes (Singleton, Request, Transient)
- Use module re-exporting for shared providers
- Test providers with custom testing modules
