# Play Architecture Guide

## Request Lifecycle

```
HTTP Request → Filters → Router → Action → Result → HTTP Response
```

## Action Composition

### Simple Action
```scala
def loggingAction[A](action: Action[A]): Action[A] = Action.async(action.parser) { request =>
  Logger.info(s"Request: ${request.method} ${request.uri}")
  action(request).map { result =>
    Logger.info(s"Response: ${result.header.status}")
    result.withHeaders("X-Request-Time" -> System.currentTimeMillis().toString)
  }
}

def index = loggingAction {
  Action { Ok("Hello") }
}
```

### ActionBuilder / ActionRefiner
```scala
class AuthenticatedAction @Inject()(val parser: BodyParsers.Default)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent] {
  override def invokeBlock[A](request: Request[A], block: AuthenticatedRequest[A] => Future[Result]): Future[Result] = {
    request.headers.get("Authorization") match {
      case Some(token) => block(AuthenticatedRequest(validateToken(token), request))
      case None => Future.successful(Results.Unauthorized)
    }
  }
}
```

## Error Handling
```scala
class ErrorHandler @Inject()(env: Environment, config: Configuration)
  extends DefaultHttpErrorHandler(env, config) {

  override def onServerError(request: RequestHeader, exception: Throwable): Future[Result] = {
    Future.successful(
      InternalServerError(Json.obj("error" -> "Internal server error"))
    )
  }

  override def onNotFound(request: RequestHeader, message: String): Future[Result] = {
    Future.successful(NotFound(Json.obj("error" -> s"${request.path} not found")))
  }

  override def onBadRequest(request: RequestHeader, message: String): Future[Result] = {
    Future.successful(BadRequest(Json.obj("error" -> message)))
  }
}
```

## Filters
```scala
class LoggingFilter @Inject()(implicit val mat: Materializer, ec: ExecutionContext)
  extends Filter {

  def apply(nextFilter: RequestHeader => Future[Result])(request: RequestHeader): Future[Result] = {
    val start = System.currentTimeMillis()
    nextFilter(request).map { result =>
      val time = System.currentTimeMillis() - start
      Logger.info(s"${request.method} ${request.uri} ${result.header.status} ${time}ms")
      result.withHeaders("X-Response-Time" -> time.toString)
    }
  }
}
```

## JSON Handling
```scala
import play.api.libs.json._

case class Order(id: String, customerId: String, status: String)

object Order {
  implicit val reads: Reads[Order] = Json.reads[Order]
  implicit val writes: Writes[Order] = Json.writes[Order]
  implicit val format: Format[Order] = Json.format[Order]
}

// In controller
def create = Action(parse.json) { request =>
  request.body.validate[Order].fold(
    errors => BadRequest(JsError.toJson(errors)),
    order => Created(Json.toJson(order))
  )
}
```

## Dependency Injection
```scala
// Module
class Module extends AbstractModule {
  override def configure(): Unit = {
    bind(classOf[OrderRepository]).to(classOf[OrderRepositoryImpl])
  }
}

// Controller
class OrderController @Inject()(
  orderService: OrderService,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc)
```

## Configuration Loading
```scala
class AppConfig @Inject()(config: Configuration) {
  val dbUrl: String = config.get[String]("db.url")
  val poolSize: Int = config.get[Int]("db.poolSize")
  val jwtSecret: String = config.get[String]("play.http.secret.key")
}
```

## Testing
```scala
class OrderControllerSpec extends PlaySpec with GuiceOneAppPerTest with Injecting {
  "OrderController GET /api/orders/:id" should {
    "return 200 for existing order" in {
      val controller = app.injector.instanceOf[OrderController]
      val result = controller.get("test-uuid")(FakeRequest())
      status(result) mustBe OK
    }
  }
}
```
