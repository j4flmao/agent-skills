# Play Framework Performance

## Thread Pools

```scala
// conf/application.conf
play {
  akka {
    actor-system = "my-app"
    default-dispatcher {
      fork-join-executor {
        parallelism-factor = 3.0
        parallelism-max = 64
      }
    }
  }
}

// Dedicated dispatcher for blocking operations
play.modules.enabled += "BlockingDispatcherModule"

// For blocking DB calls (use carefully)
implicit val blockingEc: ExecutionContext = actorSystem.dispatchers.lookup("blocking-dispatcher")
```

## Database Connection Pool

```hocon
db.default {
  driver = "org.postgresql.Driver"
  url = "jdbc:postgresql://localhost/orders"
  connectionPool = "HikariCP"
  numThreads = 10
  queueSize = 100
}
```

## Caching

```scala
// Add EhCache or Redis cache
libraryDependencies += "com.github.karelcemus" %% "play-redis" % "3.0.0"

// Cache API
class OrderService @Inject()(cache: AsyncCacheApi, repo: OrderRepository)
                            (implicit ec: ExecutionContext) {
  def getOrder(id: String): Future[Option[Order]] = {
    cache.getOrElseUpdate(s"order-$id", 3600) {
      repo.findById(id)
    }
  }
}
```

## Performance Tips

- Use `AsyncCacheApi` for non-blocking caching.
- Configure `play.server.akka.requestTimeout = infinite` for long-lived connections.
- Use `EssentialAction` for compile-time dependency injection to reduce startup time.
- Enable `play.server.http2.enabled = true` for HTTP/2 support.
- Use `akka.http.parsing.max-chunk-size` for streaming large payloads.
- Monitor with Play's built-in metrics or integrate with Kamon/OpenTelemetry.
- All I/O operations return `Future` — never block threads.
