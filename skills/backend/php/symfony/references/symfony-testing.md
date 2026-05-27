# Symfony Testing Reference

## PHPUnit Configuration

```xml
<!-- phpunit.xml.dist -->
<phpunit>
  <php>
    <env name="APP_ENV" value="test"/>
    <env name="KERNEL_CLASS" value="App\Kernel"/>
  </php>
</phpunit>
```

## WebTestCase

```php
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class OrderControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    
    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testCreateOrder(): void
    {
        $this->client->request('POST', '/api/orders', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'customerId' => 'cust-123',
            'items' => [['sku' => 'SKU-001', 'quantity' => 2]],
        ]));

        $this->assertResponseStatusCodeSame(201);
        $response = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('id', $response);
    }
}
```

## Functional Test with Authentication

```php
class AuthenticatedTestCase extends WebTestCase
{
    protected function createAuthenticatedClient(string $email = 'user@test.com'): KernelBrowser
    {
        $client = static::createClient();
        $client->request('POST', '/api/login', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'email' => $email,
            'password' => 'testPass123!',
        ]));

        $data = json_decode($client->getResponse()->getContent(), true);
        $client->setServerParameter('HTTP_Authorization', sprintf('Bearer %s', $data['token']));

        return $client;
    }

    public function testAuthenticatedRoute(): void
    {
        $client = $this->createAuthenticatedClient();
        $client->request('GET', '/api/orders');

        $this->assertResponseIsSuccessful();
    }
}
```

## Integration Test with Database

```php
use Doctrine\ORM\EntityManagerInterface;

class OrderRepositoryTest extends WebTestCase
{
    private EntityManagerInterface $em;
    
    protected function setUp(): void
    {
        $kernel = static::bootKernel();
        $this->em = $kernel->getContainer()->get('doctrine')->getManager();
    }

    public function testPersistOrder(): void
    {
        $order = new Order();
        $order->setCustomerId('cust-123');
        $order->setTotal(99.99);
        
        $this->em->persist($order);
        $this->em->flush();
        
        $this->assertNotNull($order->getId());
    }
}
```

## Validation Testing

```php
use Symfony\Component\Validator\Validator\ValidatorInterface;

class OrderValidationTest extends WebTestCase
{
    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $kernel = static::bootKernel();
        $this->validator = $kernel->getContainer()->get('validator');
    }

    public function testBlankCustomerId(): void
    {
        $order = new Order();
        $violations = $this->validator->validate($order);
        
        $this->assertGreaterThan(0, count($violations));
        $this->assertStringContainsString('customerId', $violations[0]->getPropertyPath());
    }
}
```

## Mocking Services

```php
class OrderServiceTest extends WebTestCase
{
    public function testWithMockedRepository(): void
    {
        $repository = $this->createMock(OrderRepositoryInterface::class);
        $repository->method('find')->willReturn(new Order());

        $client = static::createClient();
        $client->getContainer()->set(OrderRepositoryInterface::class, $repository);

        $client->request('GET', '/api/orders/test-id');
        $this->assertResponseIsSuccessful();
    }
}
```

## Key Points

- WebTestCase boots full Symfony kernel for integration tests
- Authenticated client helper reuses JWT token across tests
- Doctrine test database with schema create/drop per test run
- Validator component tests constraint annotations
- Service mocking via container set during test
- Panther enables browser-level end-to-end tests
- PHPUnit configuration sets APP_ENV to test
- Data fixtures loaded with Alice or DoctrineFixturesBundle
- Response assertions check status codes and JSON content
- Client follows redirects and submits forms for web tests
