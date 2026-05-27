# Containerized Testing

## Overview

Containerized testing uses real infrastructure services (databases, message queues, object storage) running in containers during tests. This provides realistic integration testing without requiring developers to install and maintain local infrastructure.

## TestContainers Overview

TestContainers is a library that manages container lifecycle for tests. It automatically starts containers before tests, waits for them to be ready, and cleans up after tests complete.

### Supported Languages

| Language | Library | Example |
|----------|---------|---------|
| Java | testcontainers-java | 
ew PostgreSQLContainer<>() |
| TypeScript | testcontainers | 
ew PostgreSqlContainer() |
| Go | testcontainers-go | postgres.RunContainer() |
| Python | testcontainers-python | PostgresContainer() |
| .NET | testcontainers-dotnet | 
ew PostgreSqlContainer() |
| Node.js | testcontainers | 
ew GenericContainer('redis:7') |

## TestContainers Patterns

### PostgreSQL (TypeScript Example)

`	ypescript
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'

let container: PostgreSqlContainer
let client: Client

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('testdb')
    .withUsername('test')
    .withPassword('test')
    .start()

  client = new Client({
    host: container.getHost(),
    port: container.getPort(),
    database: 'testdb',
    user: 'test',
    password: 'test',
  })
  await client.connect()
})

afterAll(async () => {
  await client.end()
  await container.stop()
})

it('should insert and retrieve user', async () => {
  await client.query(
    'INSERT INTO users (name, email) VALUES (, )',
    ['Alice', 'alice@example.com']
  )
  const result = await client.query('SELECT * FROM users WHERE name = ', ['Alice'])
  expect(result.rows[0].email).toBe('alice@example.com')
})
`

### PostgreSQL (Java Example)

`java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.sql.Connection;
import java.sql.DriverManager;

@Testcontainers
class UserRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Test
    void shouldSaveAndFindUser() throws Exception {
        try (Connection conn = DriverManager.getConnection(
                postgres.getJdbcUrl(),
                postgres.getUsername(),
                postgres.getPassword()
        )) {
            var stmt = conn.createStatement();
            stmt.execute("CREATE TABLE users (id SERIAL, name VARCHAR(100))");
            stmt.execute("INSERT INTO users (name) VALUES ('Alice')");
            var rs = stmt.executeQuery("SELECT * FROM users");
            rs.next();
            assertEquals("Alice", rs.getString("name"));
        }
    }
}
`

### Redis

`	ypescript
import { RedisContainer } from '@testcontainers/redis'
import { createClient } from 'redis'

let container: RedisContainer
let redis: ReturnType<typeof createClient>

beforeAll(async () => {
  container = await new RedisContainer('redis:7')
    .start()

  redis = createClient({
    url: edis://:,
  })
  await redis.connect()
})

afterAll(async () => {
  await redis.disconnect()
  await container.stop()
})

it('should set and get value', async () => {
  await redis.set('key', 'value')
  const result = await redis.get('key')
  expect(result).toBe('value')
})
`

### Kafka

`	ypescript
import { KafkaContainer } from '@testcontainers/kafka'
import { Kafka, Producer, Consumer } from 'kafkajs'

let container: KafkaContainer
let kafka: Kafka
let producer: Producer
let consumer: Consumer

beforeAll(async () => {
  container = await new KafkaContainer('confluentinc/cp-kafka:7.5.0')
    .start()

  kafka = new Kafka({
    clientId: 'test-client',
    brokers: [container.getBootstrapServers()],
  })

  producer = kafka.producer()
  consumer = kafka.consumer({ groupId: 'test-group' })

  await producer.connect()
  await consumer.connect()
  await consumer.subscribe({ topic: 'test-topic', fromBeginning: true })
})

afterAll(async () => {
  await producer.disconnect()
  await consumer.disconnect()
  await container.stop()
})

it('should publish and consume message', async () => {
  const messages: string[] = []

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (message.value) messages.push(message.value.toString())
    },
  })

  await producer.send({
    topic: 'test-topic',
    messages: [{ value: 'hello-kafka' }],
  })

  await new Promise((resolve) => setTimeout(resolve, 2000))
  expect(messages).toContain('hello-kafka')
})
`

### S3/MinIO

`	ypescript
import { GenericContainer } from 'testcontainers'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

let container: GenericContainer
let s3Client: S3Client

beforeAll(async () => {
  container = await new GenericContainer('minio/minio:latest')
    .withCommand(['server', '/data'])
    .withExposedPorts(9000)
    .withEnvironment({
      MINIO_ROOT_USER: 'minioadmin',
      MINIO_ROOT_PASSWORD: 'minioadmin',
    })
    .start()

  s3Client = new S3Client({
    endpoint: http://localhost:,
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    },
    forcePathStyle: true,
  })
})

afterAll(async () => {
  await container.stop()
})

it('should upload and download file', async () => {
  const bucketName = 'test-bucket-' + Date.now()

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: 'test.txt',
      Body: 'Hello S3',
    })
  )

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: 'test.txt',
    })
  )

  const content = await response.Body?.transformToString()
  expect(content).toBe('Hello S3')
})
`

## Container Lifecycle Management

### Lifecycle Hooks

`	ypescript
import { GenericContainer, StartedTestContainer } from 'testcontainers'

let container: StartedTestContainer

beforeAll(async () => {
  container = await new GenericContainer('mysql:8')
    .withEnvironment({
      MYSQL_ROOT_PASSWORD: 'test',
      MYSQL_DATABASE: 'testdb',
    })
    .withExposedPorts(3306)
    .withWaitStrategy(Wait.forLogMessage('ready for connections'))
    .start()
}, 120_000)

afterAll(async () => {
  await container.stop()
})
`

### Connection Strings

`	ypescript
function getConnectionString(container: StartedTestContainer): string {
  return mysql://root:test@:/testdb
}
`

### Using with Prisma

`	ypescript
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@prisma/client'

describe('Prisma Integration', () => {
  let container: PostgreSqlContainer
  let prisma: PrismaClient

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('testdb')
      .start()

    process.env.DATABASE_URL = [
      'postgresql://',
      container.getUsername(),
      ':',
      container.getPassword(),
      '@',
      container.getHost(),
      ':',
      container.getPort(),
      '/testdb',
    ].join('')

    prisma = new PrismaClient()
    await prisma.('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  }, 120_000)

  beforeEach(async () => {
    const { execSync } = await import('child_process')
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    })
  })

  afterAll(async () => {
    await prisma.()
    await container.stop()
  })

  it('should create user via Prisma', async () => {
    const user = await prisma.user.create({
      data: { name: 'Alice', email: 'alice@example.com' },
    })
    expect(user.id).toBeDefined()
    expect(user.name).toBe('Alice')
  })
})
`

## Network Isolation

### Docker Network

`	ypescript
import { DockerComposeEnvironment, Wait } from 'testcontainers'

let environment: Awaited<ReturnType<DockerComposeEnvironment['up']>>

beforeAll(async () => {
  environment = await new DockerComposeEnvironment(
    'path/to/compose',
    'docker-compose.yml'
  )
    .withWaitStrategy('app-1', Wait.forLogMessage('started'))
    .withWaitStrategy('db-1', Wait.forLogMessage('ready for connections'))
    .up()
})

afterAll(async () => {
  await environment.down()
})
`

### Network Isolation Benefits

- Tests run in isolated networks, no port conflicts with other test suites
- Containers can communicate via internal Docker network
- No need to expose ports to the host machine
- Multiple test suites can run in parallel safely

## Reusability

### Singleton Container Pattern

`	ypescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'

let container: StartedPostgreSqlContainer | null = null

export async function getSharedPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  if (!container) {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('shared-testdb')
      .start()
  }
  return container
}
`

### Reuse Strategy Considerations

| Strategy | Pros | Cons |
|----------|------|------|
| New container per test suite | Complete isolation, no cross-test pollution | Slower startup |
| Shared container per worker | Faster, isolated between test suites | State shared within a worker |
| Global singleton | Fastest startup | State leaks between tests |

## Container Customization

### Wait Strategies

`	ypescript
import { Wait } from 'testcontainers'

const container = await new GenericContainer('postgres:16')
  .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
  .withWaitStrategy(Wait.forHttp('/health', 3000))
  .withWaitStrategy(Wait.forListeningPorts())
  .withWaitStrategy(Wait.forSuccessfulCommand('pg_isready -U test'))
  .start()
`

### Startup Scripts

`	ypescript
const container = await new PostgreSQLContainer('postgres:16')
  .withCopyContentToContainer([
    {
      content: [
        'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);',
        "INSERT INTO users (name) VALUES ('Seed User');",
      ].join('\n'),
      target: '/docker-entrypoint-initdb.d/01-seed.sql',
    },
  ])
  .start()
`

### Command Override

`	ypescript
const container = await new GenericContainer('redis:7')
  .withCommand(['redis-server', '--requirepass', 'testpass'])
  .start()
`

## Docker Compose Integration

### Compose File

`yaml
# docker-compose.test.yml
version: '3.8'
services:
  app:
    build: .
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgresql://test:test@db:5432/testdb
      - REDIS_URL=redis://redis:6379

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: testdb

  redis:
    image: redis:7
`

### TestContainers Compose

`	ypescript
import { DockerComposeEnvironment, Wait } from 'testcontainers'

let environment: Awaited<ReturnType<DockerComposeEnvironment['up']>>

beforeAll(async () => {
  environment = await new DockerComposeEnvironment(
    __dirname,
    'docker-compose.test.yml'
  )
    .withWaitStrategy('db', Wait.forLogMessage('ready for connections'))
    .withWaitStrategy('redis', Wait.forLogMessage('Ready to accept connections'))
    .up()
}, 180_000)

afterAll(async () => {
  await environment.down()
})
`

## CI Integration

### Docker-in-Docker (DinD)

`yaml
# .gitlab-ci.yml
test:
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    - npm ci
    - npm test
`

### GitHub Actions

`yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind
        options: --privileged
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
        env:
          TESTCONTAINERS_RYUK_DISABLED: "true"
          DOCKER_HOST: tcp://localhost:2375
`

### TestContainers in CI Configuration

`	ypescript
export const testcontainersConfig = {
  ryukDisabled: process.env.CI === 'true',
  reuse: process.env.CI !== 'true',
}
`

## Resource Cleanup

### Automatic Cleanup

TestContainers uses Ryuk (Rid Yourself of Unwanted Containers) to automatically clean up containers even if the test process is killed:

`	ypescript
process.env.TESTCONTAINERS_RYUK_DISABLED = 'true'
`

### Manual Cleanup

`	ypescript
afterAll(async () => {
  await container.stop()
  await environment.down()
  await environment.down({ removeVolumes: true })
  await container.stop({ timeout: 10_000 })
})
`

## Parallel Container Execution

### Running Multiple Containers

`	ypescript
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import { KafkaContainer } from '@testcontainers/kafka'

let postgres: StartedPostgreSqlContainer
let redis: StartedRedisContainer
let kafka: StartedKafkaContainer

beforeAll(async () => {
  ;[postgres, redis, kafka] = await Promise.all([
    new PostgreSqlContainer('postgres:16').start(),
    new RedisContainer('redis:7').start(),
    new KafkaContainer('confluentinc/cp-kafka:7.5.0').start(),
  ])
}, 180_000)

afterAll(async () => {
  await Promise.all([
    postgres.stop(),
    redis.stop(),
    kafka.stop(),
  ])
})
`

### Parallel Test Suites

`	ypescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
`

## Health Checks

### Custom Health Check

`	ypescript
const container = await new GenericContainer('my-service:latest')
  .withHealthCheck({
    test: ['CMD', 'curl', '-f', 'http://localhost/health'],
    interval: 1000,
    timeout: 3000,
    retries: 5,
    startPeriod: 2000,
  })
  .start()
`

### Application-Level Health Check

`	ypescript
async function waitForService(url: string, maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Service not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Service did not become healthy')
}

it('should be healthy after startup', async () => {
  const appContainer = await new GenericContainer('my-app:latest')
    .withExposedPorts(3000)
    .start()

  await waitForService(
    'http://localhost:' + appContainer.getMappedPort(3000) + '/health'
  )

  const response = await fetch(
    'http://localhost:' + appContainer.getMappedPort(3000) + '/health'
  )
  expect(response.status).toBe(200)
})
`

## Logging

### Container Log Access

`	ypescript
it('should log startup messages', async () => {
  const container = await new GenericContainer('my-app:latest')
    .withExposedPorts(3000)
    .start()

  const logs = await container.logs()
  expect(logs).toContain('Server started')
})
`

### Stream Logs

`	ypescript
it('should stream application logs', async () => {
  const logStream: string[] = []

  const container = await new GenericContainer('my-app:latest')
    .withExposedPorts(3000)
    .start()

  const stream = await container.streamLogs()
  stream.on('data', (chunk: Buffer) => {
    logStream.push(chunk.toString())
  })

  await fetch('http://localhost:' + container.getMappedPort(3000) + '/api/users')
  await new Promise((resolve) => setTimeout(resolve, 1000))

  expect(logStream.length).toBeGreaterThan(0)
})
`

## Best Practices

1. **Use real images, not simplified ones**: Use postgres:16 not postgres:16-alpine for dev/test parity
2. **Set generous timeouts**: Container startup can take 30-60 seconds in CI
3. **Parallelize container startup**: Use Promise.all to start multiple containers concurrently
4. **Clean up between tests**: Truncate tables rather than restarting containers
5. **Use Ryuk for safety**: It cleans up orphaned containers if tests crash
6. **Disable Ryuk in CI**: If DinD security policies prevent it
7. **Use wait strategies**: Don't assume containers are ready immediately
8. **Reuse containers wisely**: Shared containers are faster but risk state leakage
9. **Isolate networks**: Use Docker Compose or network per test suite
10. **Log container output**: For debugging test failures

## Key Points

- TestContainers manages container lifecycle (start, wait, stop, cleanup) for integration tests
- Supported for PostgreSQL, Redis, Kafka, S3/MinIO, MySQL, MongoDB, and more
- Use eforeAll for container startup and fterAll for teardown
- Wait strategies ensure containers are ready before tests begin
- Ryuk automatically cleans up containers if the test process crashes
- Docker Compose integration allows multi-service test environments
- CI requires Docker-in-Docker or a Docker socket mount
- Reuse containers across tests for speed, but isolate to prevent state leakage
- Parallel container startup reduces test suite execution time
- Log streaming helps debug integration test failures
