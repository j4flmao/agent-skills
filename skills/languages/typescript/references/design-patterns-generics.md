# Advanced Generic Patterns in TypeScript

## 1. The Type-Safe Factory (Registry Pattern)
In JavaScript, factories often take a string and return an `any` or `unknown` object. TypeScript allows us to use **Indexed Access Types** and **Mapped Types** to create a factory that provides perfect intellisense and type safety without casting.

### Implementation
```typescript
// 1. Define a mapping interface of Keys to Class Types
interface ServiceRegistry {
    database: DatabaseService;
    logger: LoggerService;
    auth: AuthService;
}

class ServiceLocator {
    private services = new Map<keyof ServiceRegistry, any>();

    // 2. The Generic Method
    // K must be one of the keys in ServiceRegistry ('database' | 'logger' | 'auth')
    // The return type is dynamically mapped to ServiceRegistry[K]
    public register<K extends keyof ServiceRegistry>(key: K, service: ServiceRegistry[K]): void {
        this.services.set(key, service);
    }

    public get<K extends keyof ServiceRegistry>(key: K): ServiceRegistry[K] {
        const service = this.services.get(key);
        if (!service) throw new Error(`Service ${key} not found`);
        return service;
    }
}

// Usage
const locator = new ServiceLocator();
locator.register('logger', new LoggerService());

// TypeScript knows 'logger' returns exactly LoggerService. No 'as LoggerService' needed!
const logger = locator.get('logger'); 
logger.logInfo("System started"); // Perfect intellisense
```

## 2. The Generic State Machine (State Pattern)
Using Discriminated Unions and Generics, we can enforce that a state machine only transitions to valid states.

```typescript
type State<T, D> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: D };

class DataFetcher<T> {
    private state: State<T, Error> = { status: 'idle' };

    public getState() { return this.state; }

    public async fetch(url: string, parser: (res: any) => T) {
        this.state = { status: 'loading' };
        try {
            const response = await fetch(url).then(res => res.json());
            // TypeScript forces us to provide 'data' because status is 'success'
            this.state = { status: 'success', data: parser(response) };
        } catch (e) {
            this.state = { status: 'error', error: e as Error };
        }
    }
}
```
