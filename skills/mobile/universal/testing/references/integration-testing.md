# Mobile Integration Testing

## API mocking

```dart
// Flutter: Mockito for HTTP
final mockClient = MockClient();
when(() => mockClient.get(any))
    .thenAnswer((_) async => Response(jsonEncode([order]), 200));
```

```typescript
// RN: MSW
import { http, HttpResponse } from 'msw';
server.use(
  http.get('/api/orders', () => HttpResponse.json([mockOrder]))
);
```

## Local DB testing

```kotlin
@RunWith(AndroidJUnit4::class)
class OrderDaoTest {
    private lateinit var database: AppDatabase
    private lateinit var dao: OrderDao

    @Before fun setUp() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(), AppDatabase::class.java
        ).build()
        dao = database.orderDao()
    }

    @After fun tearDown() = database.close()
}
```

## CI integration

```yaml
# GitHub Actions
jobs:
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: flutter test --coverage
```
