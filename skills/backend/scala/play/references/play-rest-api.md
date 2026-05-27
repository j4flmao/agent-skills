# Play Framework REST API Reference

## RESTful Controller Pattern

```scala
import play.api.libs.json._
import play.api.mvc._
import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}

@Singleton
class OrderController @Inject()(
  orderService: OrderService,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def list(page: Int, limit: Int) = Action.async {
    orderService.list(page, limit).map { pageResult =>
      Ok(Json.toJson(pageResult.items))
        .withHeaders("X-Total-Count" -> pageResult.total.toString)
        .withHeaders("X-Page" -> page.toString)
    }
  }

  def get(id: String) = Action.async {
    orderService.findById(id).map {
      case Some(order) => Ok(Json.toJson(order))
      case None => NotFound(Json.obj("error" -> "Order not found"))
    }
  }

  def create = Action.async(parse.json) { implicit request =>
    request.body.validate[CreateOrderRequest].fold(
      errors => Future.successful(BadRequest(Json.obj(
        "error" -> "Validation failed",
        "details" -> JsError.toJson(errors)
      ))),
      data => orderService.create(data).map { order =>
        Created(Json.toJson(order))
      }
    )
  }

  def update(id: String) = Action.async(parse.json) { implicit request =>
    request.body.validate[UpdateOrderRequest].fold(
      errors => Future.successful(BadRequest(Json.obj("error" -> "Validation failed"))),
      data => orderService.update(id, data).map {
        case Some(order) => Ok(Json.toJson(order))
        case None => NotFound(Json.obj("error" -> "Order not found"))
      }
    )
  }

  def delete(id: String) = Action.async {
    orderService.delete(id).map {
      case true => NoContent
      case false => NotFound(Json.obj("error" -> "Order not found"))
    }
  }
}
```

## Error Handling

```scala
class ErrorHandler extends HttpErrorHandler {
  def onClientError(request: RequestHeader, statusCode: Int, message: String) = {
    Future.successful(Status(statusCode)(Json.obj(
      "error" -> message,
      "status" -> statusCode
    )))
  }

  def onServerError(request: RequestHeader, exception: Throwable) = {
    Logger.error("Server error", exception)
    Future.successful(InternalServerError(Json.obj(
      "error" -> "An unexpected error occurred"
    )))
  }
}

// application.conf
play.http.errorHandler = "com.example.ErrorHandler"
```

## Routing

```scala
# conf/routes
GET     /api/orders                    controllers.OrderController.list(page: Int ?= 0, limit: Int ?= 20)
GET     /api/orders/:id                controllers.OrderController.get(id: String)
POST    /api/orders                    controllers.OrderController.create
PUT     /api/orders/:id                controllers.OrderController.update(id: String)
DELETE  /api/orders/:id                controllers.OrderController.delete(id: String)
POST    /api/login                     controllers.AuthController.login
GET     /api/health                    controllers.HealthController.health
```

## Request Validation

```scala
case class CreateOrderRequest(
  customerId: String,
  items: List[OrderItemRequest],
  couponCode: Option[String]
)

case class OrderItemRequest(sku: String, quantity: Int, price: BigDecimal)

object CreateOrderRequest {
  implicit val orderItemReads: Reads[OrderItemRequest] = Json.reads[OrderItemRequest]
  implicit val reads: Reads[CreateOrderRequest] = Json.reads[CreateOrderRequest]
}
```

## JSON Serialization

```scala
import play.api.libs.json._
import play.api.libs.functional.syntax._

case class OrderResponse(
  id: String,
  customerId: String,
  status: String,
  items: Seq[OrderItemResponse],
  total: BigDecimal,
  createdAt: String
)

object OrderResponse {
  implicit val writes: Writes[OrderResponse] = Json.writes[OrderResponse]
  
  def fromDomain(order: Order): OrderResponse = OrderResponse(
    id = order.id.toString,
    customerId = order.customerId,
    status = order.status.toString,
    items = order.items.map(OrderItemResponse.fromDomain),
    total = order.total,
    createdAt = order.createdAt.toString
  )
}
```

## Pagination

```scala
case class Page[T](items: Seq[T], total: Int, page: Int, limit: Int)

class PaginatedAction @Inject()(parser: BodyParsers.Default)(implicit ec: ExecutionContext)
  extends ActionBuilder[Request, AnyContent] {

  override def parser: BodyParser[AnyContent] = parser

  override protected def executionContext: ExecutionContext = ec
}
```

## Key Points

- Action.async for non-blocking request handling
- JSON validation with Reads combinators and case classes
- Error handler provides consistent error responses
- Routes file maps HTTP methods to controller actions
- REST conventions: GET list/show, POST create, PUT update, DELETE destroy
- Pagination parameters with default values in routes
- Writes serializers convert domain models to JSON responses
- Header-based metadata (X-Total-Count, X-Page) for pagination
- Future-based async operations prevent thread blocking
- Custom ActionBuilders encapsulate cross-cutting concerns
