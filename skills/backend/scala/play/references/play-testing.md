# Play Framework Testing

## Test Setup

```scala
// build.sbt
libraryDependencies ++= Seq(
  "org.scalatestplus.play" %% "scalatestplus-play" % "7.0.0" % Test,
  "org.mockito" %% "mockito-scala" % "1.17.30" % Test
)
```

## Controller Test

```scala
class OrderControllerSpec extends PlaySpec with GuiceOneAppPerTest {
  "OrderController GET" should {
    "return orders list" in {
      val controller = app.injector.instanceOf[OrderController]
      val result = controller.list().apply(FakeRequest(GET, "/orders"))

      status(result) mustBe OK
      contentType(result) mustBe Some("application/json")
    }
  }
}
```

## Service Test with Mock

```scala
class OrderServiceSpec extends PlaySpec {
  "OrderService" should {
    "calculate total correctly" in {
      val mockRepo = mock[OrderRepository]
      when(mockRepo.findById(any)) thenReturn Future.successful(Some(Order(...)))

      val service = new OrderService(mockRepo, ec)
      val result = await(service.calculateTotal("order-1"))

      result mustBe BigDecimal("150.00")
    }
  }
}
```

## Integration Test

```scala
class OrderIntegrationSpec extends PlaySpec with GuiceOneServerPerSuite {
  val wsClient = app.injector.instanceOf[WSClient]
  val baseUrl = s"http://localhost:$port/api/v1"

  "POST /orders" should {
    "create new order" in {
      val response = await(wsClient.url(s"$baseUrl/orders")
        .withHttpHeaders("Content-Type" -> "application/json")
        .post("""{"items":[{"productId":"p1","quantity":2}]}"""))

      response.status mustBe 201
    }
  }
}
```

## Best Practices

- Use `GuiceOneAppPerTest` for integration tests.
- Mock external services with Mockito.
- Use `FakeRequest` for controller-level testing.
- Test JSON serialization with Play JSON.
- Use `await` for Future results — never block in production code.
