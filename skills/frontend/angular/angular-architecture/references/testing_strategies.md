# Testing Strategies

## Jasmine & Karma Basics
Angular uses Jasmine for writing tests and Karma as the test runner by default.
- `describe()`: Defines a test suite.
- `it()`: Defines an individual test spec.
- `beforeEach()` / `afterEach()`: Setup and teardown functions.
- `expect()`: Assertions.

## TestBed Configuration
`TestBed` configures and initializes the environment for unit testing components and services. It provides a testing module that behaves like a real Angular module.

```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    declarations: [ MyComponent ],
    providers: [
      { provide: DataService, useClass: MockDataService }
    ]
  }).compileComponents();
});
```

## Mocking Services
Always mock external dependencies (HTTP calls, complex services) in unit tests to ensure isolation and speed.

```typescript
// Using Jasmine Spies
const spy = jasmine.createSpyObj('DataService', ['getData']);
spy.getData.and.returnValue(of([{ id: 1, name: 'Test' }]));

TestBed.configureTestingModule({
  providers: [
    { provide: DataService, useValue: spy }
  ]
});
```

Use `HttpTestingController` for testing HTTP requests natively within services.
