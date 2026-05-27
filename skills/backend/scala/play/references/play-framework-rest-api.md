# Play Framework REST API Reference

## Routes File Syntax

```scala
# conf/routes
# HTTP method  URI pattern                    controller.method(parameters)
GET           /api/orders                     controllers.OrderController.list(page: Int ?= 0, limit: Int ?= 20)
GET           /api/orders/:id                 controllers.OrderController.get(id: String)
POST          /api/orders                     controllers.OrderController.create
PUT           /api/orders/:id                 controllers.OrderController.update(id: String)
PATCH         /api/orders/:id/status          controllers.OrderController.updateStatus(id: String)
DELETE        /api/orders/:id                 controllers.OrderController.delete(id: String)
POST          /api/orders/:id/cancel          controllers.OrderController.cancel(id: String)

# Fixed path segments
GET           /api/orders/active              controllers.OrderController.activeOrders

# Query parameters with defaults
GET           /api/orders/search              controllers.OrderController.search(q: String, page: Int ?= 0, limit: Int ?= 20, sort: String ?= "createdAt")

# Multi-segment wildcard
GET           /api/assets/*file               controllers.AssetsController.at(file: String)

# Reverse routing
GET           /api/reports/:id/export         controllers.ReportController.export(id: String, format: String ?= "pdf", lang: String ?= "en")
```

## HTTP Method Routing

```scala
# conf/routes — all standard HTTP methods supported
GET     /api/products          controllers.ProductController.list
POST    /api/products          controllers.ProductController.create
PUT     /api/products/:id      controllers.ProductController.update(id: String)
PATCH   /api/products/:id      controllers.ProductController.partialUpdate(id: String)
DELETE  /api/products/:id      controllers.ProductController.delete(id: String)
HEAD    /api/products/:id      controllers.ProductController.exists(id: String)
OPTIONS /api/products          controllers.ProductController.options
```

## Content Negotiation

```scala
import play.api.http._
import play.api.mvc._

class ContentController @Inject()(cc: ControllerComponents) extends AbstractController(cc) {

  def get(id: String) = Action.async { implicit request =>
    render {
      case Accepts.Json() => orderService.findById(id).map {
        case Some(order) => Ok(Json.toJson(order))
        case None => NotFound(Json.obj("error" -> "Not found"))
      }
      case Accepts.Xml() => orderService.findById(id).map {
        case Some(order) => Ok(order.toXml)
        case None => NotFound(<error>Not found</error>)
      }
      case Accepts.Csv() => orderService.findById(id).map {
        case Some(order) => Ok(order.toCsv).as(CSV)
        case None => NotFound("Not found")
      }
      case _ => Future.successful(NotAcceptable(Json.obj(
        "error" -> "Supported formats: JSON, XML, CSV"
      )))
    }
  }
}

// Custom media type
val CSV = "text/csv"
implicit val csvAccept: Accept = Accepts(CSV)
```

## Controller Patterns

### Basic Action

```scala
class ProductController @Inject()(cc: ControllerComponents)
  extends AbstractController(cc) {

  def list = Action {
    Ok(Json.toJson(Seq("product-a", "product-b")))
  }
}
```

### Async Action

```scala
class ProductController @Inject()(
  productService: ProductService,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def list = Action.async {
    productService.findAll().map { products =>
      Ok(Json.toJson(products))
    }
  }
}
```

### Action with Body Parser

```scala
import play.api.libs.json._

class ProductController @Inject()(
  productService: ProductService,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def create = Action.async(parse.json) { implicit request =>
    request.body.validate[CreateProductRequest].fold(
      errors => Future.successful(BadRequest(Json.obj(
        "error" -> "Validation failed",
        "details" -> JsError.toJson(errors)
      ))),
      data => productService.create(data).map { product =>
        Created(Json.toJson(product))
      }
    )
  }
}
```

### Custom Body Parser

```scala
import play.api.libs.json._
import play.api.mvc._

class MaxSizeParser @Inject()(cc: ControllerComponents) extends AbstractController(cc) {

  val max10Kb = parse.raw(maxLength = 10240)

  def upload = Action.async(max10Kb) { request =>
    request.body.asBytes() match {
      case Some(data) =>
        processUpload(data).map(bytes => Ok(Json.obj("size" -> bytes.length)))
      case None =>
        Future.successful(BadRequest(Json.obj("error" -> "Empty body")))
    }
  }
}

// Custom body parser for validated JSON
def validatedJson[T](implicit reads: Reads[T]): BodyParser[T] =
  parse.json.validate { jsValue =>
    jsValue.validate[T].asEither.left.map { errors =>
      BadRequest(Json.obj(
        "error" -> "Validation failed",
        "details" -> JsError.toJson(errors)
      ))
    }
  }
```

### Request Object

```scala
// Accessing request components
class RequestDemoController @Inject()(cc: ControllerComponents)
  extends AbstractController(cc) {

  def demo = Action { request =>
    val headers = request.headers.toMap
    val cookies = request.cookies
    val queryString = request.queryString
    val contentType = request.contentType
    val remoteAddr = request.remoteAddress
    val method = request.method
    val uri = request.uri
    val path = request.path

    Ok(Json.obj(
      "method" -> method,
      "path" -> path,
      "contentType" -> contentType,
      "ip" -> remoteAddr
    ))
  }
}
```

## Action Composition

### Action Function Composition

```scala
import play.api.mvc._

// Logging action
def LoggingAction[A](action: Action[A]) = Action.async(action.parser) { request =>
  val start = System.currentTimeMillis()
  action(request).map { result =>
    val elapsed = System.currentTimeMillis() - start
    Logger.info(s"${request.method} ${request.uri} took ${elapsed}ms - ${result.header.status}")
    result.withHeaders("X-Response-Time" -> elapsed.toString)
  }
}
```

### Action Builder

```scala
import play.api.mvc._

case class AuthenticatedRequest[A](user: User, request: Request[A])
  extends WrappedRequest[A](request)

class AuthenticatedActionBuilder @Inject()(
  val parser: BodyParsers.Default,
  userService: UserService
)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent]
  with ActionTransformer[Request, AuthenticatedRequest] {

  override protected def transform[A](request: Request[A]): Future[AuthenticatedRequest[A]] = {
    request.headers.get("Authorization") match {
      case Some(header) if header.startsWith("Bearer ") =>
        userService.findByToken(header.drop(7)).map {
          case Some(user) => AuthenticatedRequest(user, request)
          case None => throw new UnauthorizedException("Invalid token")
        }
      case _ => Future.failed(new UnauthorizedException("Missing authorization header"))
    }
  }
}
```

### Action Composition with Refined

```scala
import play.api.mvc._
import eu.timepit.refined._
import eu.timepit.refined.api.Refined
import eu.timepit.refined.numeric.Positive

class PaginatedAction @Inject()(
  val parser: BodyParsers.Default
)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[PaginatedRequest, AnyContent]
  with ActionRefiner[Request, PaginatedRequest] {

  override protected def refine[A](request: Request[A]): Future[Either[Result, PaginatedRequest[A]]] = {
    val page = request.queryString.get("page").flatMap(_.headOption).flatMap(_.toIntOption).getOrElse(0)
    val limit = request.queryString.get("limit").flatMap(_.headOption).flatMap(_.toIntOption).getOrElse(20)

    if (page < 0 || limit < 1 || limit > 100) {
      Future.successful(Left(BadRequest(Json.obj(
        "error" -> "Invalid pagination parameters. page >= 0, 1 <= limit <= 100"
      ))))
    } else {
      Future.successful(Right(PaginatedRequest(page, limit, request)))
    }
  }
}

case class PaginatedRequest[A](page: Int, limit: Int, request: Request[A])
  extends WrappedRequest[A](request)
```

### Action Filter

```scala
import play.api.mvc._

class AdminFilter @Inject()(
  authenticatedAction: AuthenticatedActionBuilder
)(implicit ec: ExecutionContext)
  extends ActionFilter[AuthenticatedRequest] {

  override protected def filter[A](request: AuthenticatedRequest[A]): Future[Option[Result]] = {
    if (request.user.roles.contains("admin")) {
      Future.successful(None)
    } else {
      Future.successful(Some(Results.Forbidden(Json.obj("error" -> "Admin access required"))))
    }
  }
}

// Usage
class AdminController @Inject()(
  adminFilter: AdminFilter,
  authenticatedAction: AuthenticatedActionBuilder,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def adminDashboard = (authenticatedAction andThen adminFilter).async { request =>
    dashboardService.getStats().map { stats =>
      Ok(Json.toJson(stats))
    }
  }
}
```

### Composing Multiple Actions

```scala
class OrderController @Inject()(
  authAction: AuthenticatedActionBuilder,
  paginatedAction: PaginatedAction,
  adminFilter: AdminFilter,
  auditAction: AuditAction,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  // Single action composes multiple refiners/filters
  val authenticatedAndAudited = authAction andThen auditAction
  val adminPipeline = authenticatedAction andThen adminFilter andThen auditAction

  def list = (authAction andThen paginatedAction).async { request =>
    orderService.list(request.page, request.limit).map { result =>
      Ok(Json.toJson(result.items))
        .withHeaders("X-Total-Count" -> result.total.toString)
        .withHeaders("X-Page" -> request.page.toString)
    }
  }

  def adminDelete(id: String) = adminPipeline.async { request =>
    orderService.delete(id).map {
      case true => NoContent
      case false => NotFound(Json.obj("error" -> "Order not found"))
    }
  }
}
```

### EssentialAction (Low-level)

```scala
import play.api.mvc._

val timingEssentialAction = EssentialAction { request =>
  val start = System.currentTimeMillis()
  AkkaStreams.ignoreAfterCancellation(
    Accumulator[ByteString, Result]().map { result =>
      val elapsed = System.currentTimeMillis() - start
      Logger.info(s"${request.method} ${request.uri} took ${elapsed}ms")
      result.withHeaders("X-Time" -> elapsed.toString)
    }
  )
}
```

## JSON Handling

### Play JSON API — Reads

```scala
import play.api.libs.json._
import play.api.libs.functional.syntax._

case class Address(street: String, city: String, zipCode: String, country: String)
case class Customer(id: String, name: String, email: String, address: Address)

// Manual Reads definition
implicit val addressReads: Reads[Address] = (
  (JsPath \ "street").read[String] and
  (JsPath \ "city").read[String] and
  (JsPath \ "zip_code").read[String] and
  (JsPath \ "country").read[String]
)(Address.apply _)

implicit val customerReads: Reads[Customer] = (
  (JsPath \ "id").read[String] and
  (JsPath \ "name").read[String](minLength[String](1) andKeep maxLength[String](100)) and
  (JsPath \ "email").read[String](email) and
  (JsPath \ "address").read[Address]
)(Customer.apply _)
```

### Play JSON API — Writes

```scala
implicit val addressWrites: Writes[Address] = (
  (JsPath \ "street").write[String] and
  (JsPath \ "city").write[String] and
  (JsPath \ "zip_code").write[String] and
  (JsPath \ "country").write[String]
)(unlift(Address.unapply))

implicit val customerWrites: Writes[Customer] = (
  (JsPath \ "id").write[String] and
  (JsPath \ "name").write[String] and
  (JsPath \ "email").write[String] and
  (JsPath \ "address").write[Address]
)(unlift(Customer.unapply))

// Conditional serialization (omit null fields)
implicit val customerWritesOmitNull: Writes[Customer] = new Writes[Customer] {
  def writes(c: Customer) = Json.obj(
    "id" -> c.id,
    "name" -> c.name,
    "email" -> c.email,
    "address" -> Json.toJson(c.address)(addressWrites)
  ) - "email" // omit email if needed
}
```

### Play JSON API — Format (bidirectional)

```scala
import play.api.libs.json._

implicit val addressFormat: OFormat[Address] = Json.format[Address]

// Custom Format with validation
implicit val customerFormat: OFormat[Customer] = new OFormat[Customer] {
  override def reads(json: JsValue): JsResult[Customer] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "name").read[String] and
    (JsPath \ "email").read[String] and
    (JsPath \ "address").read[Address]
  )(Customer.apply _).reads(json)

  override def writes(c: Customer): JsObject = Json.obj(
    "id" -> c.id,
    "name" -> c.name,
    "email" -> c.email,
    "address" -> Json.toJson(c.address)
  )
}
```

### Json Macro Inception

```scala
import play.api.libs.json._

case class Product(id: String, name: String, price: BigDecimal, inStock: Boolean)

// Auto-generate all three
implicit val productFormat: OFormat[Product] = Json.format[Product]
implicit val productReads: Reads[Product] = Json.reads[Product]
implicit val productWrites: OWrites[Product] = Json.writes[Product]

// For single-field wrappers
case class UserId(value: String)
object UserId {
  implicit val format: Format[UserId] = Json.valueFormat[UserId]
}
```

### JSON Transformer

```scala
import play.api.libs.json._

// Transform incoming JSON: rename fields, add defaults
val snakeToCamelTransformer: Reads[JsObject] = __.json.update(
  (JsPath \ "userId").json.copyFrom((JsPath \ "user_id").json.pick)
) andThen (JsPath \ "user_id").json.prune

// Transform outgoing JSON: remove sensitive fields
val stripSecretsTransformer: Writes[JsObject] = __.json.update(
  (JsPath \ "role").json.put(JsString("redacted"))
) andThen (JsPath \ "password").json.prune andThen (JsPath \ "secretKey").json.prune

// Usage in controller
def getUser(id: String) = Action.async {
  userService.findById(id).map {
    case Some(user) =>
      val cleaned = Json.toJson(user).as[JsObject]
        .transform(stripSecretsTransformer)
        .getOrElse(Json.obj())
      Ok(cleaned)
    case None => NotFound(Json.obj("error" -> "User not found"))
  }
}

// Picking / copying paths
val pickNameAndEmail: Reads[JsObject] = __.json.pick(
  (JsPath \ "name").json.prune andThen (JsPath \ "email").json.prune
)
```

### JSON Validation Combinators

```scala
import play.api.libs.json._
import play.api.libs.json.Reads._

val email: Reads[String] = pattern(
  """^[a-zA-Z0-9\.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$""".r,
  "Invalid email format"
)

val nonEmptyText: Reads[String] = minLength[String](1) andKeep maxLength[String](500)

// Custom reads with validation
val positiveInt: Reads[Int] = Reads.min(0) andKeep Reads.max(Int.MaxValue)

// Composed validation
val createUserReads: Reads[CreateUserRequest] = (
  (JsPath \ "name").read[String](nonEmptyText) and
  (JsPath \ "email").read[String](email) and
  (JsPath \ "age").readNullable[Int](positiveInt) and
  (JsPath \ "role").readWithDefault[String]("user")
)(CreateUserRequest.apply _)
```

### Sealed Trait / Enum Serialization

```scala
import play.api.libs.json._

sealed trait OrderStatus
case object Pending extends OrderStatus
case object Confirmed extends OrderStatus
case object Shipped extends OrderStatus
case object Delivered extends OrderStatus
case object Cancelled extends OrderStatus

object OrderStatus {
  private val values: Map[String, OrderStatus] = Map(
    "pending" -> Pending, "confirmed" -> Confirmed,
    "shipped" -> Shipped, "delivered" -> Delivered,
    "cancelled" -> Cancelled
  )

  implicit val reads: Reads[OrderStatus] = Reads {
    case JsString(s) => values.get(s.toLowerCase)
      .map(JsSuccess(_))
      .getOrElse(JsError(s"Unknown order status: $s. Valid values: ${values.keys.mkString(", ")}"))
    case _ => JsError("Expected a string for order status")
  }

  implicit val writes: Writes[OrderStatus] = Writes {
    case Pending => JsString("pending")
    case Confirmed => JsString("confirmed")
    case Shipped => JsString("shipped")
    case Delivered => JsString("delivered")
    case Cancelled => JsString("cancelled")
  }

  implicit val format: Format[OrderStatus] = Format(reads, writes)
}

// Sealed trait with case class variants
sealed trait PaymentMethod
case class CreditCard(lastFour: String, brand: String) extends PaymentMethod
case class PayPal(email: String) extends PaymentMethod
case object CashOnDelivery extends PaymentMethod

object PaymentMethod {
  implicit val reads: Reads[PaymentMethod] = (JsPath \ "type").read[String].flatMap {
    case "credit_card" => (JsPath \ "last_four").read[String].map(CreditCard(_, "")) // simplified
    case "paypal" => (JsPath \ "email").read[String].map(PayPal(_))
    case "cash_on_delivery" => Reads.pure(CashOnDelivery)
    case other => Reads.failed(s"Unknown payment method: $other")
  }

  implicit val writes: Writes[PaymentMethod] = Writes {
    case CreditCard(lastFour, brand) => Json.obj("type" -> "credit_card", "last_four" -> lastFour, "brand" -> brand)
    case PayPal(email) => Json.obj("type" -> "paypal", "email" -> email)
    case CashOnDelivery => Json.obj("type" -> "cash_on_delivery")
  }

  implicit val format: Format[PaymentMethod] = Format(reads, writes)
}
```

### Custom Serializers

```scala
import play.api.libs.json._
import java.time.{Instant, LocalDateTime, ZoneOffset}
import java.util.UUID

// UUID serialization
implicit val uuidFormat: Format[UUID] = Format(
  Reads {
    case JsString(s) => Try(UUID.fromString(s)).map(JsSuccess(_))
      .getOrElse(JsError(s"Invalid UUID: $s"))
    case _ => JsError("Expected string for UUID")
  },
  Writes(u => JsString(u.toString))
)

// Instant serialization (ISO 8601)
implicit val instantFormat: Format[Instant] = Format(
  Reads {
    case JsString(s) => Try(Instant.parse(s)).map(JsSuccess(_))
      .getOrElse(JsError(s"Invalid ISO timestamp: $s"))
    case JsNumber(n) => JsSuccess(Instant.ofEpochMilli(n.toLong))
    case _ => JsError("Expected string or number for Instant")
  },
  Writes(i => JsString(i.toString))
)

// BigDecimal with precision handling
implicit val bigDecimalFormat: Format[BigDecimal] = Format(
  Reads {
    case JsNumber(n) => JsSuccess(n)
    case JsString(s) => Try(BigDecimal(s)).map(JsSuccess(_))
      .getOrElse(JsError(s"Invalid decimal: $s"))
    case _ => JsError("Expected number or string for BigDecimal")
  },
  Writes(d => JsNumber(d.setScale(2, BigDecimal.RoundingMode.HALF_UP)))
)

// LocalDateTime as Unix timestamp
implicit val localDateTimeFormat: Format[LocalDateTime] = Format(
  Reads {
    case JsNumber(n) => JsSuccess(LocalDateTime.ofEpochSecond(n.toLong, 0, ZoneOffset.UTC))
    case _ => JsError("Expected epoch seconds as number")
  },
  Writes(ldt => JsNumber(ldt.toEpochSecond(ZoneOffset.UTC)))
)
```

### Type-Safe JSON (Discriminated Unions)

```scala
import play.api.libs.json._

sealed trait Notification
case class Email(to: String, subject: String, body: String) extends Notification
case class SMS(phone: String, message: String) extends Notification
case class Push(deviceToken: String, title: String, body: String) extends Notification

object Notification {
  private val typeField = "type"

  implicit val format: Format[Notification] = new Format[Notification] {
    override def reads(json: JsValue): JsResult[Notification] = {
      (json \ typeField).validate[String].flatMap {
        case "email" => Json.format[Email].reads(json)
        case "sms" => Json.format[SMS].reads(json)
        case "push" => Json.format[Push].reads(json)
        case other => JsError(s"Unknown notification type: $other")
      }
    }

    override def writes(notification: Notification): JsValue = notification match {
      case e: Email => Json.format[Email].writes(e) ++ Json.obj(typeField -> "email")
      case s: SMS => Json.format[SMS].writes(s) ++ Json.obj(typeField -> "sms")
      case p: Push => Json.format[Push].writes(p) ++ Json.obj(typeField -> "push")
    }
  }
}
```

## Request Validation

### JSON Validation Combinators

```scala
import play.api.libs.json._
import play.api.libs.json.Reads._

case class CreateOrderRequest(
  customerId: String,
  items: List[OrderItem],
  shippingAddress: Address,
  couponCode: Option[String],
  notes: Option[String]
)

case class OrderItem(productId: String, quantity: Int, unitPrice: BigDecimal)

implicit val orderItemReads: Reads[OrderItem] = (
  (JsPath \ "product_id").read[String] and
  (JsPath \ "quantity").read[Int](min(1) andKeep max(999)) and
  (JsPath \ "unit_price").read[BigDecimal](min[BigDecimal](BigDecimal("0.01")))
)(OrderItem.apply _)

implicit val createOrderReads: Reads[CreateOrderRequest] = (
  (JsPath \ "customer_id").read[String] and
  (JsPath \ "items").read[List[OrderItem]](minLength[List[OrderItem]](1) andKeep maxLength[List[OrderItem]](50)) and
  (JsPath \ "shipping_address").read[Address] and
  (JsPath \ "coupon_code").readNullable[String] and
  (JsPath \ "notes").readNullable[String](maxLength[String](1000))
)(CreateOrderRequest.apply _)
```

### Case Class Validation

```scala
import play.api.libs.json._
import cats.data.ValidatedNec
import cats.syntax.all._

object OrderValidator {
  type ValidationResult[A] = ValidatedNec[String, A]

  def validateName(name: String): ValidationResult[String] =
    if (name.length < 1) "Name must not be empty".invalidNec
    else if (name.length > 100) "Name must be <= 100 chars".invalidNec
    else name.validNec

  def validateEmail(email: String): ValidationResult[String] =
    if (email.matches("""^[^@\s]+@[^@\s]+\.[^@\s]+$""")) email.validNec
    else "Invalid email format".invalidNec

  def validateAge(age: Int): ValidationResult[Int] =
    if (age >= 0 && age < 150) age.validNec
    else "Age must be between 0 and 149".invalidNec

  def validateUser(name: String, email: String, age: Int): ValidationResult[User] =
    (validateName(name), validateEmail(email), validateAge(age)).mapN(User.apply)
}
```

### Custom Validators

```scala
import play.api.libs.json._
import play.api.libs.json.Reads._

object CustomValidators {
  val nonEmptyTrimmedText: Reads[String] = Reads.StringReads
    .map(_.trim)
    .filter(JsonValidationError("text must not be empty"))(_.nonEmpty)

  def maxDecimalPlaces(places: Int): Reads[BigDecimal] = Reads {
    case JsNumber(n) =>
      if (n.scale <= places) JsSuccess(n)
      else JsError(s"Maximum $places decimal places allowed")
    case _ => JsError("Expected a number")
  }

  def validEnum[T](values: Seq[T], name: String)(toString: T => String): Reads[T] = Reads {
    case JsString(s) =>
      values.find(v => toString(v).equalsIgnoreCase(s))
        .map(JsSuccess(_))
        .getOrElse(JsError(s"Unknown $name: $s. Valid: ${values.map(toString).mkString(", ")}"))
    case _ => JsError(s"Expected a string for $name")
  }

  val phoneNumber: Reads[String] = pattern(
    """^\+?[1-9]\d{1,14}$""".r,
    "Must be a valid phone number (E.164 format)"
  )

  val isoDate: Reads[String] = pattern(
    """^\d{4}-\d{2}-\d{2}$""".r,
    "Must be ISO 8601 date (YYYY-MM-DD)"
  )
}
```

## Error Handling

### Global Error Handler

```scala
import play.api.http.HttpErrorHandler
import play.api.mvc.{RequestHeader, Result, Results}
import scala.concurrent.Future

class CustomErrorHandler extends HttpErrorHandler {

  override def onClientError(request: RequestHeader, statusCode: Int, message: String): Future[Result] = {
    statusCode match {
      case 400 =>
        Future.successful(Results.BadRequest(Json.obj(
          "error" -> "Bad Request",
          "detail" -> message,
          "status" -> 400,
          "path" -> request.path
        )))
      case 404 =>
        Future.successful(Results.NotFound(Json.obj(
          "error" -> "Resource not found",
          "detail" -> s"${request.path} does not exist",
          "status" -> 404,
          "path" -> request.path
        )))
      case 405 =>
        Future.successful(Results.MethodNotAllowed(Json.obj(
          "error" -> "Method not allowed",
          "method" -> request.method,
          "path" -> request.path,
          "status" -> 405
        )))
      case _ =>
        Future.successful(Results.Status(statusCode)(Json.obj(
          "error" -> "Client error",
          "detail" -> message,
          "status" -> statusCode
        )))
    }
  }

  override def onServerError(request: RequestHeader, exception: Throwable): Future[Result] = {
    Logger.error(s"Server error on ${request.method} ${request.uri}", exception)

    exception match {
      case e: UnauthorizedException =>
        Future.successful(Results.Unauthorized(Json.obj(
          "error" -> "Unauthorized",
          "detail" -> e.getMessage,
          "status" -> 401
        )))
      case e: ForbiddenException =>
        Future.successful(Results.Forbidden(Json.obj(
          "error" -> "Forbidden",
          "detail" -> e.getMessage,
          "status" -> 403
        )))
      case e: NotFoundException =>
        Future.successful(Results.NotFound(Json.obj(
          "error" -> "Not found",
          "detail" -> e.getMessage,
          "status" -> 404
        )))
      case e: ValidationException =>
        Future.successful(Results.BadRequest(Json.obj(
          "error" -> "Validation failed",
          "details" -> e.errors,
          "status" -> 400
        )))
      case e: RateLimitException =>
        Future.successful(Results.TooManyRequests(Json.obj(
          "error" -> "Rate limit exceeded",
          "retry_after" -> e.retryAfterSeconds,
          "status" -> 429
        )))
      case _ =>
        Future.successful(Results.InternalServerError(Json.obj(
          "error" -> "An unexpected error occurred",
          "request_id" -> request.id.toString,
          "status" -> 500
        )))
    }
  }
}
```

### RFC 7807 Problem Details

```scala
import play.api.libs.json._
import play.api.mvc.{Result, Results}

case class ProblemDetails(
  `type`: String,
  title: String,
  status: Int,
  detail: String,
  instance: Option[String] = None,
  extensions: Map[String, JsValue] = Map.empty
)

object ProblemDetails {
  implicit val format: OFormat[ProblemDetails] = Json.format[ProblemDetails]

  def badRequest(detail: String, instance: Option[String] = None): Result =
    Results.BadRequest(Json.toJson(ProblemDetails(
      `type` = "about:blank",
      title = "Bad Request",
      status = 400,
      detail = detail,
      instance = instance
    ))).withHeaders("Content-Type" -> "application/problem+json")

  def notFound(detail: String, instance: Option[String] = None): Result =
    Results.NotFound(Json.toJson(ProblemDetails(
      `type` = "about:blank",
      title = "Not Found",
      status = 404,
      detail = detail,
      instance = instance
    ))).withHeaders("Content-Type" -> "application/problem+json")

  def validationError(errors: Seq[String], instance: Option[String] = None): Result =
    Results.BadRequest(Json.toJson(ProblemDetails(
      `type` = "https://example.com/errors/validation",
      title = "Validation Error",
      status = 400,
      detail = "One or more fields failed validation",
      instance = instance,
      extensions = Map("errors" -> Json.toJson(errors))
    ))).withHeaders("Content-Type" -> "application/problem+json")
}
```

### Per-Controller Error Handling

```scala
import play.api.mvc._

abstract class BaseController(cc: ControllerComponents)
  extends AbstractController(cc) {

  protected def handleResult[A](result: Future[Either[AppError, A]])(toResult: A => Result): Future[Result] = {
    result.map {
      case Right(value) => toResult(value)
      case Left(error) => error.toResult
    }
  }

  protected def handleOption[T](result: Future[Option[T]], id: String)(toResult: T => Result): Future[Result] = {
    result.map {
      case Some(value) => toResult(value)
      case None => NotFound(Json.obj(
        "error" -> "Resource not found",
        "id" -> id
      ))
    }
  }
}

sealed trait AppError {
  def message: String
  def statusCode: Int
  def toResult: Result = Results.Status(statusCode)(Json.obj(
    "error" -> message,
    "status" -> statusCode
  ))
}

case class NotFoundError(message: String) extends AppError { val statusCode = 404 }
case class ValidationError(message: String, details: Seq[String] = Nil) extends AppError { val statusCode = 400 }
case class ConflictError(message: String) extends AppError { val statusCode = 409 }
case class RateLimitError(message: String, retryAfter: Int) extends AppError { val statusCode = 429 }
```

## Authentication

### Action Composition for Auth

```scala
import play.api.mvc._
import pdi.jwt.{Jwt, JwtAlgorithm, JwtClaim}

case class AuthenticatedUser(id: String, email: String, roles: Seq[String])

object JwtAuth {
  private val secretKey = sys.env.getOrElse("JWT_SECRET", "change-me-in-production")
  private val algorithm = JwtAlgorithm.HS256

  def encode(claims: JwtClaim): String = Jwt.encode(claims, secretKey, algorithm)
  def decode(token: String): Option[JwtClaim] = Jwt.decode(token, secretKey, Seq(algorithm)).toOption
}

class JwtAuthActionBuilder @Inject()(
  val parser: BodyParsers.Default
)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent] {

  override def invokeBlock[A](
    request: Request[A],
    block: AuthenticatedRequest[A] => Future[Result]
  ): Future[Result] = {
    extractToken(request) match {
      case Some(token) =>
        JwtAuth.decode(token) match {
          case Some(claims) =>
            val user = AuthenticatedUser(
              id = claims.getContent + claims.subject.getOrElse(""),
              email = claims.subject.getOrElse(""),
              roles = (claims \ "roles").asOpt[Seq[String]].getOrElse(Nil)
            )
            block(AuthenticatedRequest(user, request))
          case None =>
            Future.successful(Results.Unauthorized(Json.obj("error" -> "Invalid or expired token")))
        }
      case None =>
        Future.successful(Results.Unauthorized(Json.obj("error" -> "Missing authorization header")))
    }
  }

  private def extractToken(request: Request[A]): Option[String] = {
    request.headers.get("Authorization").collect {
      case h if h.startsWith("Bearer ") => h.stripPrefix("Bearer ")
    }
  }
}
```

### OAuth2 Client Integration

```scala
import play.api.libs.ws.WSClient
import play.api.mvc._
import play.api.libs.json._

class OAuth2Controller @Inject()(
  ws: WSClient,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  private val clientId = sys.env("OAUTH_CLIENT_ID")
  private val clientSecret = sys.env("OAUTH_CLIENT_SECRET")
  private val redirectUri = sys.env("OAUTH_REDIRECT_URI")
  private val authUrl = "https://provider.com/oauth2/authorize"
  private val tokenUrl = "https://provider.com/oauth2/token"

  def login = Action { implicit request =>
    val state = java.util.UUID.randomUUID().toString
    Redirect(authUrl)
      .addQueryStringParameters(
        "response_type" -> "code",
        "client_id" -> clientId,
        "redirect_uri" -> redirectUri,
        "state" -> state,
        "scope" -> "openid email profile"
      )
      .withSession("oauth_state" -> state)
  }

  def callback(code: String, state: String) = Action.async { implicit request =>
    request.session.get("oauth_state") match {
      case Some(savedState) if savedState == state =>
        ws.url(tokenUrl)
          .withHttpHeaders("Content-Type" -> "application/x-www-form-urlencoded")
          .post(Map(
            "grant_type" -> "authorization_code",
            "code" -> Seq(code),
            "redirect_uri" -> Seq(redirectUri),
            "client_id" -> Seq(clientId),
            "client_secret" -> Seq(clientSecret)
          ))
          .flatMap { response =>
            val accessToken = (response.json \ "access_token").as[String]
            val refreshToken = (response.json \ "refresh_token").asOpt[String]

            ws.url("https://provider.com/userinfo")
              .withHttpHeaders("Authorization" -> s"Bearer $accessToken")
              .get()
              .map { userResponse =>
                val userInfo = userResponse.json
                val jwtToken = createAppToken(userInfo, accessToken)
                Ok(Json.obj(
                  "token" -> jwtToken,
                  "refresh_token" -> refreshToken
                ))
              }
          }
      case _ =>
        Future.successful(Unauthorized(Json.obj("error" -> "Invalid state parameter")))
    }
  }
}
```

### JWT with Silhouette

```scala
import com.mohiva.play.silhouette.api.{Silhouette, LoginInfo}
import com.mohiva.play.silhouette.api.actions.SecuredRequest
import com.mohiva.play.silhouette.impl.authenticators.JWTAuthenticator
import com.mohiva.play.silhouette.impl.providers.CredentialsProvider

class SilhouetteAuthController @Inject()(
  silhouette: Silhouette[JWTAuthenticator],
  userService: UserService,
  credentialsProvider: CredentialsProvider,
  passwordHasher: PasswordHasher,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def login = Action.async(parse.json) { implicit request =>
    val email = (request.body \ "email").as[String]
    val password = (request.body \ "password").as[String]
    val loginInfo = LoginInfo(CredentialsProvider.ID, email)

    credentialsProvider.authenticate(loginInfo, password).flatMap {
      case Right(authInfo) =>
        silhouette.env.authenticatorService.create(loginInfo).flatMap { authenticator =>
          silhouette.env.eventBus.publish(LoginEvent(
            User(email), request
          ))
          silhouette.env.authenticatorService.init(authenticator).map { token =>
            Ok(Json.obj("token" -> token))
          }
        }
      case Left(_) =>
        Future.successful(Unauthorized(Json.obj("error" -> "Invalid credentials")))
    }
  }

  def profile = silhouette.SecuredAction.async { implicit request: SecuredRequest[JWTAuthenticator, _] =>
    val user = request.identity
    Future.successful(Ok(Json.obj(
      "email" -> user.email,
      "name" -> user.name
    )))
  }

  def logout = silhouette.SecuredAction.async { implicit request =>
    silhouette.env.authenticatorService.discard(request.authenticator, Ok(
      Json.obj("message" -> "Logged out successfully")
    ))
  }
}
```

### JWT with Pac4J

```scala
import org.pac4j.play.scala.SecurityComponents
import org.pac4j.jwt.config.signature.SecretSignatureConfiguration
import org.pac4j.jwt.credentials.authenticator.JwtAuthenticator
import org.pac4j.jwt.profile.JwtGenerator
import org.pac4j.core.profile.CommonProfile

class Pac4jAuthController @Inject()(
  override val components: SecurityComponents,
  userService: UserService
)(implicit ec: ExecutionContext) {

  val jwtGenerator = new JwtGenerator[CommonProfile](
    new SecretSignatureConfiguration("secret-key")
  )

  def login = Action.async(parse.json) { implicit request =>
    val email = (request.body \ "email").as[String]
    userService.findByEmail(email).map {
      case Some(user) =>
        val profile = new CommonProfile()
        profile.setId(user.id)
        profile.addAttribute("email", user.email)
        profile.addRole("user")
        val token = jwtGenerator.generate(profile)
        Ok(Json.obj("token" -> token))
      case None => Unauthorized(Json.obj("error" -> "User not found"))
    }
  }

  def secured = Secure("JwtClient").async { profiles =>
    Future.successful(Ok(Json.obj("profile" -> profiles.head.getAttribute("email"))))
  }
}
```

## Authorization

### Role-Based Access Control

```scala
import play.api.mvc._

class RoleBasedAuthAction @Inject()(
  authAction: JwtAuthActionBuilder
)(implicit ec: ExecutionContext) {

  def requireRole(role: String) = new ActionFilter[AuthenticatedRequest] {
    override protected def filter[A](request: AuthenticatedRequest[A]): Future[Option[Result]] = {
      if (request.user.roles.contains(role)) {
        Future.successful(None)
      } else {
        Future.successful(Some(Results.Forbidden(Json.obj(
          "error" -> "Insufficient permissions",
          "required_role" -> role,
          "user_roles" -> request.user.roles
        ))))
      }
    }
  }

  def requireAnyRole(roles: String*) = new ActionFilter[AuthenticatedRequest] {
    override protected def filter[A](request: AuthenticatedRequest[A]): Future[Option[Result]] = {
      if (roles.intersect(request.user.roles).nonEmpty) {
        Future.successful(None)
      } else {
        Future.successful(Some(Results.Forbidden(Json.obj(
          "error" -> "None of the required roles present",
          "required_roles" -> roles
        ))))
      }
    }
  }
}

// Usage
class AdminController @Inject()(
  authAction: JwtAuthActionBuilder,
  roleAuth: RoleBasedAuthAction,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  val adminOnly = authAction andThen roleAuth.requireRole("admin")
  val moderatorOrAbove = authAction andThen roleAuth.requireAnyRole("admin", "moderator")

  def deleteUser(id: String) = adminOnly.async { request =>
    userService.delete(id).map(_ => NoContent)
  }

  def moderateContent = moderatorOrAbove.async { request =>
    contentService.getFlagged().map(c => Ok(Json.toJson(c)))
  }
}
```

### Permission-Based Authorization

```scala
case class Permission(resource: String, action: String)

object Permissions {
  val ReadOrders = Permission("orders", "read")
  val WriteOrders = Permission("orders", "write")
  val DeleteOrders = Permission("orders", "delete")
  val AdminPanel = Permission("admin", "access")
}

class PermissionAuthAction @Inject()(
  authAction: JwtAuthActionBuilder,
  userService: UserService
)(implicit ec: ExecutionContext) {

  def requirePermission(permission: Permission) = new ActionRefiner[AuthenticatedRequest, AuthorizedRequest] {
    override protected def refine[A](request: AuthenticatedRequest[A]): Future[Either[Result, AuthorizedRequest[A]]] = {
      userService.getPermissions(request.user.id).map { permissions =>
        if (permissions.contains(permission) || permissions.contains(Permission("*", "*"))) {
          Right(AuthorizedRequest(request.user, request))
        } else {
          Left(Results.Forbidden(Json.obj(
            "error" -> "Permission denied",
            "required" -> Json.obj(
              "resource" -> permission.resource,
              "action" -> permission.action
            )
          )))
        }
      }
    }
  }
}

case class AuthorizedRequest[A](user: AuthenticatedUser, request: Request[A])
  extends WrappedRequest[A](request)
```

### Custom Authorizer (Resource-Based)

```scala
import play.api.mvc._

trait ResourceAuthorizer[T] {
  def authorize(user: AuthenticatedUser, resource: T): Future[Boolean]
}

class OrderAuthorizer @Inject()(orderService: OrderService)
  extends ResourceAuthorizer[Order] {

  override def authorize(user: AuthenticatedUser, resource: Order): Future[Boolean] = {
    if (user.roles.contains("admin")) Future.successful(true)
    else Future.successful(resource.customerId == user.id)
  }
}

class ResourceAuthAction @Inject()(
  authAction: JwtAuthActionBuilder,
  orderAuthorizer: OrderAuthorizer
)(implicit ec: ExecutionContext) {

  def authorizeResource[T](fetchResource: String => Future[Option[T]], resourceId: String)(
    authorizer: ResourceAuthorizer[T]
  ): ActionRefiner[AuthenticatedRequest, AuthorizedRequest] = new ActionRefiner[AuthenticatedRequest, AuthorizedRequest] {
    override protected def refine[A](request: AuthenticatedRequest[A]): Future[Either[Result, AuthorizedRequest[A]]] = {
      fetchResource(resourceId).flatMap {
        case Some(resource) =>
          authorizer.authorize(request.user, resource).map { allowed =>
            if (allowed) Right(AuthorizedRequest(request.user, request))
            else Left(Results.Forbidden(Json.obj("error" -> "You do not have access to this resource")))
          }
        case None =>
          Future.successful(Left(Results.NotFound(Json.obj("error" -> "Resource not found"))))
      }
    }
  }
}
```

## Database Integration

### Play Slick

```scala
import slick.jdbc.PostgresProfile.api._
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.jdbc.JdbcProfile

class OrderRepository @Inject()(
  protected val dbConfigProvider: DatabaseConfigProvider
)(implicit ec: ExecutionContext)
  extends HasDatabaseConfigProvider[JdbcProfile] {

  import profile.api._

  private val orders = TableQuery[OrderTable]

  def findById(id: String): Future[Option[Order]] =
    db.run(orders.filter(_.id === id).result.headOption)

  def list(page: Int, limit: Int): Future[Seq[Order]] =
    db.run(orders.drop(page * limit).take(limit).result)

  def create(order: Order): Future[Order] =
    db.run(orders += order).map(_ => order)

  def update(id: String, order: Order): Future[Int] =
    db.run(orders.filter(_.id === id).update(order))

  def delete(id: String): Future[Int] =
    db.run(orders.filter(_.id === id).delete)

  private class OrderTable(tag: Tag) extends Table[Order](tag, "orders") {
    def id = column[String]("id", O.PrimaryKey)
    def customerId = column[String]("customer_id")
    def totalAmount = column[BigDecimal]("total_amount")
    def status = column[String]("status")
    def createdAt = column[java.time.Instant]("created_at")
    def updatedAt = column[java.time.Instant]("updated_at")

    def * = (id, customerId, totalAmount, status, createdAt, updatedAt) <>
      ((Order.apply _).tupled, Order.unapply)
  }
}
```

### Plain Slick Queries

```scala
import slick.jdbc.PostgresProfile.api._

class AdvancedOrderRepository @Inject()(
  protected val dbConfigProvider: DatabaseConfigProvider
)(implicit ec: ExecutionContext) extends HasDatabaseConfigProvider[JdbcProfile] {

  import profile.api._

  def findByStatusWithCustomer(status: String): Future[Seq[(Order, Customer)]] = {
    val query = orders
      .filter(_.status === status)
      .join(customers).on(_.customerId === _.id)
      .sortBy(_._1.createdAt.desc)
    db.run(query.result)
  }

  def getOrderCountByStatus: Future[Map[String, Int]] = {
    val query = orders
      .groupBy(_.status)
      .map { case (status, group) => (status, group.length) }
    db.run(query.result).map(_.toMap)
  }

  def getTotalRevenue(forCustomer: Option[String]): Future[BigDecimal] = {
    val base = orders.filter(_.status === "delivered")
    val query = forCustomer match {
      case Some(cid) => base.filter(_.customerId === cid)
      case None => base
    }
    db.run(query.map(_.totalAmount).sum.result).map(_.getOrElse(BigDecimal(0)))
  }

  def bulkInsert(orders: Seq[Order]): Future[Option[Int]] = {
    db.run(this.orders ++= orders)
  }

  def transactionalCreate(order: Order, items: Seq[OrderItem]): Future[Order] = {
    db.run((for {
      _ <- this.orders += order
      _ <- orderItems ++= items.map(_.copy(orderId = order.id))
    } yield order).transactionally)
  }
}
```

### Anorm

```scala
import anorm._
import anorm.SqlParser._
import play.api.db.Database

class AnormOrderRepository @Inject()(db: Database) {

  private val orderParser: RowParser[Order] = {
    get[String]("id") ~
    get[String]("customer_id") ~
    get[BigDecimal]("total_amount") ~
    get[String]("status") ~
    get[java.time.Instant]("created_at") map {
      case id ~ customerId ~ amount ~ status ~ createdAt =>
        Order(id, customerId, amount, status, createdAt)
    }
  }

  def findById(id: String): Option[Order] = db.withConnection { implicit c =>
    SQL"SELECT * FROM orders WHERE id = $id".as(orderParser.singleOpt)
  }

  def list(page: Int, limit: Int): Seq[Order] = db.withConnection { implicit c =>
    SQL"SELECT * FROM orders ORDER BY created_at DESC LIMIT $limit OFFSET ${page * limit}"
      .as(orderParser.*)
  }

  def create(order: Order): Unit = db.withConnection { implicit c =>
    SQL"""
      INSERT INTO orders (id, customer_id, total_amount, status, created_at)
      VALUES (${order.id}, ${order.customerId}, ${order.totalAmount}, ${order.status}, ${order.createdAt})
    """.executeInsert()
  }

  def getStats: Option[(Long, BigDecimal)] = db.withConnection { implicit c =>
    SQL"SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'delivered'"
      .as((long("count") ~ bigDecimal("total")).map(flatten).singleOpt)
  }
}
```

### Doobie

```scala
import doobie._
import doobie.implicits._
import doobie.postgres._
import doobie.postgres.implicits._
import cats.effect.IO

class DoobieOrderRepository @Inject()(xa: Transactor[IO]) {

  def findById(id: String): IO[Option[Order]] = {
    sql"""SELECT id, customer_id, total_amount, status, created_at, updated_at
         FROM orders WHERE id = $id"""
      .query[Order].option.transact(xa)
  }

  def list(page: Int, limit: Int): IO[List[Order]] = {
    sql"""SELECT id, customer_id, total_amount, status, created_at, updated_at
         FROM orders ORDER BY created_at DESC LIMIT $limit OFFSET ${page * limit}"""
      .query[Order].to[List].transact(xa)
  }

  def create(order: Order): IO[Int] = {
    sql"""INSERT INTO orders (id, customer_id, total_amount, status, created_at, updated_at)
         VALUES (${order.id}, ${order.customerId}, ${order.totalAmount},
                 ${order.status}, ${order.createdAt}, ${order.updatedAt})"""
      .update.run.transact(xa)
  }
}
```

### Evolutions (Migrations)

```scala
// conf/evolutions/default/1.sql
// -- !Ups
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

// -- !Downs
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

// conf/evolutions/default/2.sql
// -- !Ups
ALTER TABLE orders ADD COLUMN shipping_address TEXT;

// -- !Downs
ALTER TABLE orders DROP COLUMN shipping_address;

// Disable auto-apply in dev (recommended)
// application.conf
play.evolutions {
  db.default.enabled = true
  db.default.autoApply = false
}
```

## Caching

### Play Cache API

```scala
import play.api.cache.{AsyncCacheApi, SyncCacheApi}

class CachedOrderService @Inject()(
  cache: AsyncCacheApi,
  repo: OrderRepository
)(implicit ec: ExecutionContext) {

  def getOrder(id: String): Future[Option[Order]] = {
    cache.getOrElseUpdate(s"order:$id", 3600) {
      repo.findById(id).map { result =>
        result.foreach(_ => Logger.debug(s"Cached order $id"))
        result
      }
    }
  }

  def invalidateOrder(id: String): Future[Unit] = {
    cache.remove(s"order:$id")
  }

  def getOrdersByCustomer(customerId: String): Future[Seq[Order]] = {
    cache.getOrElseUpdate(s"customer:orders:$customerId", 1800) {
      repo.findByCustomerId(customerId)
    }
  }

  def clearAll(): Future[Unit] = cache.removeAll()
}
```

### Redis Cache

```scala
// build.sbt
// libraryDependencies += "com.github.karelcemus" %% "play-redis" % "3.0.0"

// application.conf
play.cache {
  redis {
    host = "localhost"
    port = 6379
    database = 0
    timeout = 5s
    connection-pool-size = 10
  }
}

// Redis-specific features
import play.api.cache.redis._

class RedisCacheService @Inject()(
  cache: RedisCacheApi,
  repo: OrderRepository
)(implicit ec: ExecutionContext) {

  // Redis sets for collections
  def addToRecentOrders(orderId: String): Future[Unit] = {
    cache.set(s"recent:order:$orderId", orderId)
  }

  def getRecentOrders(limit: Int = 10): Future[Seq[Order]] = {
    cache.get[Seq[String]]("recent:order-ids").flatMap {
      case Some(ids) =>
        Future.sequence(ids.take(limit).map(id => repo.findById(id).map(_.get)))
      case None => Future.successful(Nil)
    }
  }
}
```

### Multi-Tier Caching

```scala
import javax.cache.Cache
import play.api.cache.{AsyncCacheApi, Cached}

class MultiTierCacheService @Inject()(
  localCache: SyncCacheApi,
  redisCache: AsyncCacheApi,
  repo: OrderRepository
)(implicit ec: ExecutionContext) {

  def getOrder(id: String): Future[Option[Order]] = {
    // L1: local cache (in-memory, fast)
    localCache.get[Order](s"order:$id") match {
      case Some(order) =>
        Logger.debug("L1 cache hit")
        Future.successful(Some(order))
      case None =>
        // L2: Redis cache
        redisCache.get[Order](s"order:$id").flatMap {
          case Some(order) =>
            Logger.debug("L2 cache hit")
            localCache.set(s"order:$id", order, 60) // populate L1
            Future.successful(Some(order))
          case None =>
            Logger.debug("Cache miss, fetching from DB")
            repo.findById(id).map { result =>
              result.foreach { order =>
                redisCache.set(s"order:$id", order, 3600)
                localCache.set(s"order:$id", order, 60)
              }
              result
            }
        }
    }
  }

  def invalidateOrder(id: String): Future[Unit] = {
    localCache.remove(s"order:$id")
    redisCache.remove(s"order:$id")
  }
}
```

## Web Services / WS Client

### External API Integration

```scala
import play.api.libs.ws.{WSClient, WSResponse}
import play.api.libs.json._

class PaymentGatewayClient @Inject()(
  ws: WSClient
)(implicit ec: ExecutionContext) {

  private val baseUrl = sys.env("PAYMENT_GATEWAY_URL")
  private val apiKey = sys.env("PAYMENT_API_KEY")

  def charge(amount: BigDecimal, currency: String, source: String): Future[ChargeResult] = {
    ws.url(s"$baseUrl/v1/charges")
      .withHttpHeaders(
        "Authorization" -> s"Bearer $apiKey",
        "Content-Type" -> "application/json",
        "Idempotency-Key" -> java.util.UUID.randomUUID().toString
      )
      .withRequestTimeout(30.seconds)
      .post(Json.obj(
        "amount" -> amount,
        "currency" -> currency,
        "source" -> source
      ))
      .map { response =>
        response.status match {
          case 200 | 201 => parseSuccess(response.json)
          case 402 => parseDeclined(response.json)
          case _ => parseError(response.status, response.json)
        }
      }
      .recover {
        case e: java.net.ConnectException =>
          Logger.error("Payment gateway unreachable", e)
          throw new ServiceUnavailableException("Payment gateway unavailable")
        case e: java.util.concurrent.TimeoutException =>
          Logger.error("Payment gateway timeout", e)
          throw new GatewayTimeoutException("Payment gateway did not respond in time")
      }
  }

  def refund(chargeId: String, amount: Option[BigDecimal]): Future[RefundResult] = {
    ws.url(s"$baseUrl/v1/charges/$chargeId/refunds")
      .withHttpHeaders("Authorization" -> s"Bearer $apiKey")
      .post(amount match {
        case Some(a) => Json.obj("amount" -> a)
        case None => Json.obj()
      })
      .map(_.json.as[RefundResult])
  }
}
```

### HTTP Client Configuration

```scala
// application.conf
play.ws {
  timeout {
    connection = 30s
    request = 60s
    idle = 5m
  }
  followRedirects = true
  maxUrlLength = 4096
  maxRequestInFlight = 100

  ahc {
    keepAlive = true
    maxConnectionsPerHost = 50
    maxConnectionsTotal = 200
    maxConnectionLifetime = 10m
    idleConnectionInPoolTimeout = 30s
    pooledConnectionIdleTimeout = 60s
  }

  ssl {
    checkRevocation = true
    loose {
      disableHostnameVerification = false
    }
  }
}
```

### Streaming with WS

```scala
import play.api.libs.ws.WSClient
import akka.util.ByteString
import akka.stream.scaladsl.{Source, Sink}

class StreamingWSClient @Inject()(
  ws: WSClient
)(implicit ec: ExecutionContext, materializer: Materializer) {

  def streamDownload(url: String, filePath: String): Future[Long] = {
    ws.url(url)
      .withMethod("GET")
      .withRequestTimeout(Duration.Inf)
      .stream()
      .flatMap { response =>
        response.bodyAsSource
          .runWith(FileIO.toPath(java.nio.file.Paths.get(filePath)))
      }
  }

  def streamUpload(url: String, filePath: String): Future[WSResponse] = {
    ws.url(url)
      .withHttpHeaders("Content-Type" -> "application/octet-stream")
      .withRequestTimeout(Duration.Inf)
      .put(FileIO.fromPath(java.nio.file.Paths.get(filePath)))
  }
}
```

## Streaming

### Response Streaming

```scala
import akka.stream.scaladsl.{FileIO, Source, StreamConverters}
import akka.util.ByteString
import play.api.mvc._
import java.nio.file.Paths

class StreamingController @Inject()(
  cc: ControllerComponents
)(implicit ec: ExecutionContext, mat: Materializer) extends AbstractController(cc) {

  def streamLargeFile(filePath: String) = Action {
    val path = Paths.get(filePath)
    if (path.toFile.exists()) {
      Result(
        header = ResponseHeader(OK, Map("Content-Disposition" -> s"attachment; filename=${path.getFileName}")),
        body = HttpEntity.Streamed(
          FileIO.fromPath(path, chunkSize = 8192),
          Some(path.toFile.length()),
          Some("application/octet-stream")
        )
      )
    } else {
      NotFound(Json.obj("error" -> "File not found"))
    }
  }

  def streamDatabaseRecords = Action.async {
    orderService.streamAll().map { source =>
      Ok.chunked(
        source.map(order => ByteString(Json.toJson(order).toString + "\n"))
      ).as("application/x-ndjson")
    }
  }
}
```

### Chunked Responses

```scala
import akka.stream.scaladsl.Source
import akka.util.ByteString
import play.api.mvc._
import scala.concurrent.duration._

class ChunkedController @Inject()(
  cc: ControllerComponents
)(implicit mat: Materializer) extends AbstractController(cc) {

  def streamNumbers = Action {
    val numbers = Source(1 to 100)
      .throttle(1, 1.second)
      .map(n => ByteString(s"data: $n\n\n"))

    Ok.chunked(numbers).as("text/event-stream")
  }

  def streamOrdersByStatus(status: String) = Action.async {
    orderService.findByStatusStream(status).map { orderSource =>
      Ok.chunked(
        orderSource.map(order => ByteString(Json.toJson(order).toString + "\n"))
      ).as("application/json-seq")
    }
  }
}
```

### Server-Sent Events

```scala
import akka.stream.scaladsl.Source
import play.api.libs.EventSource
import play.api.libs.json.Json
import scala.concurrent.duration._

class SSEController @Inject()(
  orderService: OrderService,
  cc: ControllerComponents
)(implicit ec: ExecutionContext, mat: Materializer) extends AbstractController(cc) {

  def orderUpdates = Action {
    val eventSource: Source[EventSource.Event, _] = orderService
      .orderEventStream()
      .map { event =>
        EventSource.Event(
          data = Json.toJson(event).toString,
          id = Some(event.id),
          name = Some(event.eventType),
          retry = Some(3000)
        )
      }

    Ok.chunked(eventSource via EventSource.flow).as("text/event-stream")
      .withHeaders("Cache-Control" -> "no-cache")
  }

  def healthStream = Action {
    val heartbeat = Source
      .tick(0.seconds, 30.seconds, "heartbeat")
      .map(_ => EventSource.Event(
        data = Json.obj("status" -> "ok", "timestamp" -> System.currentTimeMillis()).toString
      ))

    Ok.chunked(heartbeat via EventSource.flow).as("text/event-stream")
  }
}
```

### WebSockets

```scala
import akka.stream.scaladsl.{Flow, Sink, Source}
import play.api.mvc._
import play.api.libs.json._

class WebSocketController @Inject()(
  cc: ControllerComponents
)(implicit mat: Materializer) extends AbstractController(cc) {

  def chat = WebSocket.accept[String, String] { request =>
    Flow[String].map { msg =>
      s"Echo: $msg"
    }
  }

  def jsonWebSocket = WebSocket.accept[JsValue, JsValue] { request =>
    Flow[JsValue].map { json =>
      Json.obj(
        "received" -> json,
        "timestamp" -> System.currentTimeMillis()
      )
    }
  }

  def authenticatedWS = WebSocket.acceptOrResult[String, String] { request =>
    request.headers.get("Authorization") match {
      case Some(_) =>
        Future.successful(Right(Flow[String].map(msg => s"Authenticated echo: $msg")))
      case None =>
        Future.successful(Left(Forbidden(Json.obj("error" -> "Authentication required"))))
    }
  }
}
```

## Asynchronous Programming

### Future and ExecutionContext

```scala
import scala.concurrent.{ExecutionContext, Future, blocking}
import play.api.libs.concurrent.Futures

class AsyncOrderService @Inject()(
  repo: OrderRepository
)(implicit ec: ExecutionContext) {

  def getOrderWithCustomer(orderId: String): Future[OrderWithCustomer] = {
    for {
      order <- repo.findById(orderId)
      customer <- repo.findCustomerById(order.customerId)
    } yield OrderWithCustomer(order, customer)
  }

  def processInParallel(ids: List[String]): Future[List[Order]] = {
    Future.sequence(ids.map(repo.findById)).map(_.flatten)
  }

  def getWithTimeout(orderId: String): Future[Option[Order]] = {
    val orderFuture = repo.findById(orderId)
    val timeoutFuture = after(duration = 5.seconds)(Future.failed(
      new TimeoutException("Request timed out")
    ))
    Future.firstCompletedOf(Seq(orderFuture, timeoutFuture))
  }
}
```

### Custom Thread Pools

```scala
import play.api.inject.{SimpleModule, Bind}
import play.api.libs.concurrent.Akka

// Dedicated dispatcher for blocking DB operations
// application.conf
akka {
  actor {
    default-dispatcher {
      fork-join-executor {
        parallelism-min = 8
        parallelism-factor = 3.0
        parallelism-max = 64
      }
    }
  }

  # Blocking dispatcher for JDBC calls
  blocking-dispatcher {
    type = Dispatcher
    executor = "thread-pool-executor"
    thread-pool-executor {
      fixed-pool-size = 16
    }
    throughput = 1
  }
}

class BlockingExecutionContextProvider @Inject()(
  actorSystem: ActorSystem
) {
  val blockingEc: ExecutionContext = actorSystem.dispatchers.lookup("blocking-dispatcher")
}

// Usage
class JdbcOrderRepository @Inject()(
  blockinEcProvider: BlockingExecutionContextProvider,
  db: Database
) {
  private implicit val ec: ExecutionContext = blockinEcProvider.blockingEc

  def findById(id: String): Future[Option[Order]] = Future {
    blocking {
      db.withConnection { implicit c =>
        SQL"SELECT * FROM orders WHERE id = $id".as(orderParser.singleOpt)
      }
    }
  }(ec)
}
```

## Testing

### Specs2

```scala
import org.specs2.mutable.Specification
import org.specs2.concurrent.ExecutionEnv
import play.api.test._
import play.api.test.Helpers._

class OrderControllerSpec extends Specification {

  "OrderController" should {
    "return 200 for existing order" in { implicit ee: ExecutionEnv =>
      val controller = app.injector.instanceOf[OrderController]
      val result = controller.get("order-1").apply(FakeRequest())

      status(result) mustEqual OK
      contentType(result) must beSome("application/json")
    }

    "return 404 for non-existing order" in { implicit ee: ExecutionEnv =>
      val controller = app.injector.instanceOf[OrderController]
      val result = controller.get("non-existent").apply(FakeRequest())

      status(result) mustEqual NOT_FOUND
    }
  }
}
```

### ScalaTest with Play Specs

```scala
import org.scalatestplus.play._
import org.scalatestplus.play.guice._
import play.api.test._
import play.api.test.Helpers._

class OrderControllerScalaTest
  extends PlaySpec
  with GuiceOneAppPerTest
  with Injecting {

  "OrderController GET" should {
    "list orders with pagination" in {
      val controller = app.injector.instanceOf[OrderController]
      val request = FakeRequest(GET, "/orders?page=0&limit=10")
        .withHeaders("Authorization" -> "Bearer test-token")
      val result = controller.list().apply(request)

      status(result) mustBe OK
      contentType(result) mustBe Some("application/json")
      headers(result).get("X-Total-Count") mustBe defined
    }

    "create an order" in {
      val controller = app.injector.instanceOf[OrderController]
      val json = """{"customer_id":"cust-1","items":[{"product_id":"prod-1","quantity":2}]}"""
      val request = FakeRequest(POST, "/orders")
        .withHeaders("Content-Type" -> "application/json")
        .withBody(Json.parse(json))
      val result = controller.create().apply(request)

      status(result) mustBe CREATED
    }
  }
}
```

### Route Tests

```scala
import play.api.test._
import play.api.test.Helpers._

class RoutesSpec extends PlaySpec {

  "Routes" should {
    "route GET /api/orders" in {
      val request = FakeRequest(GET, "/api/orders")
      val result = route(app, request).get

      status(result) mustBe OK
    }

    "route POST /api/orders" in {
      val request = FakeRequest(POST, "/api/orders")
        .withJsonBody(Json.obj("customer_id" -> "c1"))
      val result = route(app, request).get

      status(result) mustBe CREATED
    }

    "return 404 for unknown route" in {
      val request = FakeRequest(GET, "/api/nonexistent")
      route(app, request) mustBe None
    }
  }
}
```

### Server Tests

```scala
import org.scalatestplus.play.guice.GuiceOneServerPerSuite
import play.api.libs.ws.WSClient

class IntegrationSpec extends PlaySpec with GuiceOneServerPerSuite {

  val wsClient = app.injector.instanceOf[WSClient]
  val baseUrl = s"http://localhost:$port/api"

  "Order API" should {
    "complete full order lifecycle" in {
      val createResponse = await(wsClient.url(s"$baseUrl/orders")
        .withHttpHeaders("Content-Type" -> "application/json")
        .post(Json.obj("customer_id" -> "int-test-customer"))
      )
      createResponse.status mustBe 201
      val orderId = (createResponse.json \ "id").as[String]

      val getResponse = await(wsClient.url(s"$baseUrl/orders/$orderId").get())
      getResponse.status mustBe 200

      val deleteResponse = await(wsClient.url(s"$baseUrl/orders/$orderId").delete())
      deleteResponse.status mustBe 204
    }
  }
}
```

### withServer (Embedded Server)

```scala
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.routing.Router
import play.api.test._

class EmbeddedServerSpec extends PlaySpec {

  "Embedded server" should {
    "serve routes" in {
      val application = new GuiceApplicationBuilder()
        .configure("play.http.router" -> "test.Routes")
        .build()

      Helpers.running(TestServer(port = 19001, application)) {
        val result = await(play.api.test.WsTestClient
          .wsUrl("http://localhost:19001/api/health").get())
        result.status mustBe 200
      }
    }
  }
}
```

## Configuration

### application.conf Patterns

```hocon
# conf/application.conf
play {
  http {
    secret.key = ${?APPLICATION_SECRET}
    secret.key = "dev-secret-change-in-prod"

    session {
      cookieName = "SESSION"
      secure = true
      httpOnly = true
      maxAge = 86400
    }

    errorHandler = "com.example.ErrorHandler"
  }

  filters {
    disabled += "play.filters.csrf.CSRFFilter"
    disabled += "play.filters.hosts.AllowedHostsFilter"
  }
}

# Database
slick.dbs.default {
  profile = "slick.jdbc.PostgresProfile$"
  db {
    url = ${?JDBC_DATABASE_URL}
    url = "jdbc:postgresql://localhost:5432/orders_dev"
    driver = org.postgresql.Driver
    user = ${?DB_USER}
    user = "dev_user"
    password = ${?DB_PASSWORD}
    password = "dev_password"
    numThreads = 10
    maxConnections = 10
    minConnections = 2
    connectionTimeout = 30.second
    idleTimeout = 10.minutes
    maxLifetime = 30.minutes
  }
}

# Redis
redis {
  host = ${?REDIS_HOST}
  host = "localhost"
  port = ${?REDIS_PORT}
  port = 6379
  timeout = 5s
}

# Custom app config
app {
  pagination {
    maxLimit = 100
    defaultLimit = 20
  }
  upload.maxSize = "10mb"
  rateLimit.perMinute = 60
}
```

### Environment-Specific Config

```hocon
// conf/application.conf — base config

// conf/application.dev.conf
include "application"
play.http.secret.key = "dev-secret"
slick.dbs.default.db.url = "jdbc:postgresql://localhost:5432/orders_dev"

// conf/application.prod.conf
include "application"
play.http.secret.key = ${?APPLICATION_SECRET}
slick.dbs.default.db {
  url = ${?JDBC_DATABASE_URL}
  user = ${?DB_USER}
  password = ${?DB_PASSWORD}
}

// sbt run with environment
// sbt -Dconfig.resource=application.dev.conf run

// Production startup
// ./bin/order-service -Dconfig.resource=application.prod.conf -Dhttp.port=8080
```

### Secrets Management

```hocon
// NEVER hardcode secrets. Use environment variables or a vault.

// application.conf
play.http.secret.key = ${?APPLICATION_SECRET}
slick.dbs.default.db.password = ${?DB_PASSWORD}
payment.apiKey = ${?PAYMENT_API_KEY}
jwt.secret = ${?JWT_SECRET}

// Fallback for local dev only (never commit real secrets)
jwt.secret = "dev-jwt-secret-change-in-prod"

// For HashiCorp Vault integration
class VaultSecretProvider @Inject()(
  ws: WSClient,
  config: Configuration
)(implicit ec: ExecutionContext) {

  private val vaultUrl = config.get[String]("vault.url")
  private val vaultToken = config.get[String]("vault.token")

  def getSecret(path: String, key: String): Future[String] = {
    ws.url(s"$vaultUrl/v1/$path")
      .withHttpHeaders("X-Vault-Token" -> vaultToken)
      .get()
      .map { response =>
        (response.json \ "data" \ "data" \ key).as[String]
      }
  }
}
```

## Swagger / OpenAPI

### Swagger Play Integration

```scala
// build.sbt
// libraryDependencies += "io.swagger" %% "swagger-play2" % "2.1.0"

// conf/routes
// GET     /api-docs                   controllers.ApiHelpController.getResources
// GET     /api-docs/:id               controllers.ApiHelpController.getResource(path)

import io.swagger.annotations._

@Api(value = "/orders", description = "Order management operations")
class OrderSwaggerController @Inject()(
  orderService: OrderService,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  @ApiOperation(
    value = "List all orders",
    nickname = "listOrders",
    httpMethod = "GET",
    response = classOf[Order],
    responseContainer = "List"
  )
  @ApiResponses(Array(
    new ApiResponse(code = 200, message = "List of orders"),
    new ApiResponse(code = 401, message = "Unauthorized")
  ))
  def list(
    @ApiParam(value = "Page number", defaultValue = "0") page: Int,
    @ApiParam(value = "Items per page", defaultValue = "20") limit: Int
  ) = Action.async { ... }

  @ApiOperation(
    value = "Get order by ID",
    nickname = "getOrder",
    httpMethod = "GET",
    response = classOf[Order]
  )
  @ApiResponses(Array(
    new ApiResponse(code = 200, message = "Order found"),
    new ApiResponse(code = 404, message = "Order not found")
  ))
  def get(@ApiParam(value = "Order ID", required = true) id: String) = Action.async { ... }
}
```

### OpenAPI Generation

```yaml
# conf/openapi.yaml (manual or tool-generated)
openapi: 3.0.3
info:
  title: Order Service API
  version: 1.0.0
  description: REST API for order management
servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging.example.com/v1
    description: Staging
paths:
  /orders:
    get:
      summary: List orders
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 0 }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
        - name: status
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Paginated order list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Order'
    post:
      summary: Create order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
components:
  schemas:
    Order:
      type: object
      properties:
        id: { type: string, format: uuid }
        customerId: { type: string }
        totalAmount: { type: number, format: decimal }
        status: { type: string, enum: [pending, confirmed, shipped, delivered, cancelled] }
        createdAt: { type: string, format: date-time }
      required: [id, customerId, totalAmount, status]
```

## Performance Tuning

```hocon
// Thread pool tuning — application.conf
play {
  server {
    akka {
      requestTimeout = infinite
      http2.enabled = true
    }
  }

  akka {
    actor {
      default-dispatcher {
        fork-join-executor {
          parallelism-min = 8
          parallelism-factor = 3.0
          parallelism-max = 64
        }
      }
    }
  }
}

// Connection pooling (HikariCP)
slick.dbs.default.db {
  numThreads = 20
  maxConnections = 20
  minConnections = 5
  connectionTimeout = 30.seconds
  idleTimeout = 10.minutes
  maxLifetime = 30.minutes
  connectionPool = "HikariCP"
}

// akka-http tuning
akka.http {
  server {
    pipelining-limit = 16
    max-connections = 1024
    backlog = 100
    socket-options {
      tcp-keepalive = true
      tcp-nodelay = true
    }
  }
  client {
    connecting-timeout = 10s
    idle-timeout = 60s
  }
}
```

## Security

### CORS

```hocon
# application.conf
play.filters.cors {
  pathPrefixes = ["/api"]
  allowedOrigins = ${?CORS_ORIGINS}
  allowedOrigins = ["https://app.example.com", "https://admin.example.com"]
  allowedHttpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  allowedHttpHeaders = ["Content-Type", "Authorization", "X-Requested-With", "If-None-Match"]
  exposedHeaders = ["X-Total-Count", "X-Page", "X-Response-Time", "ETag"]
  supportsCredentials = true
  preflightMaxAge = 24h
}
```

### CSP (Content Security Policy)

```hocon
# application.conf
play.filters.headers {
  contentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
  contentTypeOptions = "nosniff"
  xssProtection = "1; mode=block"
  frameOptions = "DENY"
  referrerPolicy = "strict-origin-when-cross-origin"
  permissionsPolicy = "camera=(), microphone=(), geolocation=()"
}

// Override in controller
class SecureController @Inject()(cc: ControllerComponents) extends AbstractController(cc) {
  def index = Action { implicit request =>
    Ok(views.html.index())
      .withHeaders("Content-Security-Policy" -> "default-src 'self'")
  }
}
```

### HTTPS Configuration

```hocon
# application.conf
play.server.https {
  port = 9443
  keyStore {
    path = ${?SSL_KEYSTORE_PATH}
    type = "PKCS12"
    password = ${?SSL_KEYSTORE_PASSWORD}
  }
}

# Redirect HTTP to HTTPS
class HttpsRedirectFilter extends EssentialFilter {
  def apply(next: EssentialAction) = EssentialAction { request =>
    if (request.secure) next(request)
    else Accumulator.done(Results.MovedPermanently(
      s"https://${request.host}${request.uri}"
    ))
  }
}
```

## Versioning Strategies

### URL-Based Versioning

```scala
// conf/routes
GET     /api/v1/orders          controllers.v1.OrderController.list
POST    /api/v1/orders          controllers.v1.OrderController.create
GET     /api/v2/orders          controllers.v2.OrderController.list
POST    /api/v2/orders          controllers.v2.OrderController.create

// Version router
class ApiRouter @Inject()(
  v1Routes: v1.Routes,
  v2Routes: v2.Routes
) extends SimpleRouter {
  def routes: Routes = {
    case prefix if prefix.uri.startsWith("/api/v1/") =>
      v1Routes.routes
    case prefix if prefix.uri.startsWith("/api/v2/") =>
      v2Routes.routes
  }
}
```

### Header-Based Versioning

```scala
class VersioningAction @Inject()(
  v1Controller: v1.OrderController,
  v2Controller: v2.OrderController
)(implicit ec: ExecutionContext) {

  def routeByVersion = Action.async { request =>
    val version = request.headers.get("Accept-Version").getOrElse("1")

    version match {
      case "1" => v1Controller.list.apply(request)
      case "2" => v2Controller.list.apply(request)
      case _ => Future.successful(
        Status(400)(Json.obj("error" -> s"Unsupported API version: $version"))
      )
    }
  }
}
```

## Pagination, Filtering, Sorting

```scala
case class PageParams(page: Int, limit: Int) {
  def offset: Int = page * limit
}

case class SortParams(sortBy: String, direction: SortDirection)

sealed trait SortDirection
case object Asc extends SortDirection
case object Desc extends SortDirection

case class QueryParams(
  page: PageParams,
  sort: Option[SortParams],
  filters: Map[String, String]
)

class PaginatedOrderController @Inject()(
  orderService: OrderService,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def list = Action.async { implicit request =>
    val queryParams = extractQueryParams(request)
    orderService.search(queryParams).map { result =>
      Ok(Json.toJson(result.items))
        .withHeaders(
          "X-Total-Count" -> result.total.toString,
          "X-Page" -> queryParams.page.page.toString,
          "X-Limit" -> queryParams.page.limit.toString
        )
    }
  }

  def listCursors = Action.async { implicit request =>
    val cursor = request.getQueryString("cursor")
    val limit = request.getQueryString("limit").flatMap(_.toIntOption).getOrElse(20)
    orderService.listCursor(cursor, limit).map { result =>
      Ok(Json.toJson(result.items))
        .withHeaders(
          "X-Has-More" -> result.hasMore.toString,
          "X-Next-Cursor" -> result.nextCursor.getOrElse("")
        )
    }
  }

  private def extractQueryParams(request: Request[AnyContent]): QueryParams = {
    val page = request.getQueryString("page").flatMap(_.toIntOption).getOrElse(0)
    val limit = request.getQueryString("limit").flatMap(_.toIntOption).getOrElse(20)
    val sortBy = request.getQueryString("sort_by")
    val sortDir = request.getQueryString("sort_dir").map {
      case "asc" => Asc
      case _ => Desc
    }.getOrElse(Desc)

    val filters = request.queryString.filterKeys(k =>
      !Seq("page", "limit", "sort_by", "sort_dir", "cursor").contains(k)
    ).map { case (k, v) => k -> v.head }

    QueryParams(
      page = PageParams(page, limit),
      sort = sortBy.map(sb => SortParams(sb, sortDir)),
      filters = filters
    )
  }
}
```

## Middleware / Filters

### EssentialFilter

```scala
import play.api.mvc._
import akka.stream.Materializer
import scala.concurrent.ExecutionContext

class RequestLoggingFilter @Inject()(
  implicit val mat: Materializer,
  ec: ExecutionContext
) extends EssentialFilter {

  def apply(next: EssentialAction) = EssentialAction { request =>
    val start = System.currentTimeMillis()
    next(request).map { result =>
      val elapsed = System.currentTimeMillis() - start
      Logger.info(s"${request.method} ${request.uri} returned ${result.header.status} in ${elapsed}ms")
      result.withHeaders("X-Response-Time" -> s"${elapsed}ms")
    }
  }
}

class RateLimitFilter @Inject()(
  rateLimiter: RateLimiter,
  implicit val mat: Materializer,
  ec: ExecutionContext
) extends EssentialFilter {

  def apply(next: EssentialAction) = EssentialAction { request =>
    rateLimiter.isAllowed(request.remoteAddress, request.path).flatMap {
      case true => next(request)
      case false =>
        Accumulator.done(Results.TooManyRequests(Json.obj(
          "error" -> "Rate limit exceeded",
          "retry_after" -> rateLimiter.retryAfterSeconds
        )))
    }
  }
}
```

### Filter Composition

```scala
import play.api.inject.{SimpleModule, _}

class FiltersModule extends SimpleModule(
  bind[EssentialFilter].to[RequestLoggingFilter],
  bind[EssentialFilter].to[RateLimitFilter],
  bind[EssentialFilter].to[CorsFilter],
  bind[EssentialFilter].to[GzipFilter]
)

// Or with ordering
class OrderedFilters @Inject()(
  logging: RequestLoggingFilter,
  rateLimit: RateLimitFilter,
  cors: CorsFilter
) extends HttpFilters {
  def filters = Seq(logging, cors, rateLimit)
}
```

### Request/Response Transformation

```scala
import play.api.mvc._

class ResponseTransformFilter @Inject()(
  implicit val mat: akka.stream.Materializer,
  ec: ExecutionContext
) extends EssentialFilter {

  def apply(next: EssentialAction) = EssentialAction { request =>
    next(request).map { result =>
      result.withHeaders(
        "X-Request-Id" -> request.id.toString,
        "X-Application-Version" -> BuildInfo.version
      )
    }
  }
}

class RequestIdFilter @Inject()(
  implicit val mat: akka.stream.Materializer,
  ec: ExecutionContext
) extends EssentialFilter {

  def apply(next: EssentialAction) = EssentialAction { request =>
    val requestId = request.headers.get("X-Request-Id").getOrElse(java.util.UUID.randomUUID().toString)
    val wrappedRequest = request.withHeaders(request.headers.add("X-Request-Id" -> requestId))
    MDC.put("requestId", requestId)

    next(wrappedRequest).map { result =>
      MDC.remove("requestId")
      result.withHeaders("X-Request-Id" -> requestId)
    }
  }
}
```
