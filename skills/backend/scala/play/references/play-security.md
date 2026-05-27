# Play Framework Security Reference

## Authentication with Silhouette

```scala
import com.mohiva.play.silhouette.api.{Silhouette, LoginInfo}
import com.mohiva.play.silhouette.impl.authenticators.JWTAuthenticator

class AuthController @Inject()(
  silhouette: Silhouette[JWTAuthenticator],
  userService: UserService,
  passwordHasher: PasswordHasher,
  cc: ControllerComponents
) extends AbstractController(cc) {

  def login = Action.async(parse.json) { implicit request =>
    val credentials = request.body.as[LoginCredentials]
    userService.retrieve(LoginInfo("email", credentials.email)).flatMap {
      case Some(user) if passwordHasher.matches(credentials.password, user.password) =>
        silhouette.env.authenticatorService.create(LoginInfo("email", user.email)).map { auth =>
          silhouette.env.eventBus.publish(LoginEvent(user, request))
          Ok(Json.obj("token" -> auth.id))
        }
      case _ => Future.successful(Unauthorized(Json.obj("error" -> "Invalid credentials")))
    }
  }

  def secured = silhouette.SecuredAction.async { implicit request =>
    Future.successful(Ok(Json.obj("user" -> request.identity.email)))
  }
}
```

## Action Composition

```scala
import play.api.mvc._

case class AuthenticatedRequest[A](user: User, request: Request[A]) extends WrappedRequest[A](request)

class AuthenticatedAction @Inject()(val parser: BodyParsers.Default)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent] with ActionTransformer[Request, AuthenticatedRequest] {

  override protected def transform[A](request: Request[A]): Future[AuthenticatedRequest[A]] = {
    request.headers.get("Authorization") match {
      case Some(token) if token.startsWith("Bearer ") =>
        userService.findByToken(token.drop(7)).map {
          case Some(user) => new AuthenticatedRequest(user, request)
          case None => throw new UnauthorizedException("Invalid token")
        }
      case _ => Future.failed(new UnauthorizedException("Missing token"))
    }
  }
}

class AdminAction @Inject()(authenticated: AuthenticatedAction)(implicit ec: ExecutionContext)
  extends ActionFilter[AuthenticatedRequest] {

  override protected def filter[A](request: AuthenticatedRequest[A]): Future[Option[Result]] = {
    if (request.user.roles.contains("admin")) {
      Future.successful(None)
    } else {
      Future.successful(Some(Results.Forbidden(Json.obj("error" -> "Insufficient permissions"))))
    }
  }
}
```

## CSRF Protection

```scala
import play.filters.csrf.CSRFFilter
import play.filters.csrf.CSRF.ConfigTokenSigner

// application.conf
play.filters.csrf {
  token.sign = true
  cookie.name = "csrf-token"
  cookie.secure = true
  cookie.httpOnly = true
}
```

## CORS Configuration

```scala
// application.conf
play.filters.cors {
  allowedOrigins = ["https://app.example.com"]
  allowedHttpMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  allowedHttpHeaders = ["Content-Type", "Authorization", "X-Requested-With"]
  exposedHeaders = ["X-Total-Count"]
  supportsCredentials = true
}
```

## Security Headers Filter

```scala
import javax.inject.Inject
import play.api.mvc._
import scala.concurrent.{ExecutionContext, Future}

class SecurityHeadersFilter @Inject()(implicit ec: ExecutionContext) extends EssentialFilter {
  override def apply(next: EssentialAction): EssentialAction = EssentialAction { request =>
    next(request).map { result =>
      result.withHeaders(
        "X-Content-Type-Options" -> "nosniff",
        "X-Frame-Options" -> "DENY",
        "X-XSS-Protection" -> "1; mode=block",
        "Strict-Transport-Security" -> "max-age=31536000; includeSubDomains",
        "Referrer-Policy" -> "strict-origin-when-cross-origin"
      )
    }
  }
}
```

## Input Validation

```scala
import play.api.libs.json._

case class CreateOrderRequest(customerId: String, items: List[OrderItem])
case class OrderItem(sku: String, quantity: Int, price: BigDecimal)

implicit val orderItemReads: Reads[OrderItem] = (
  (JsPath \ "sku").read[String](minLength[String](1)) and
  (JsPath \ "quantity").read[Int](min(1)) and
  (JsPath \ "price").read[BigDecimal](min(BigDecimal(0.01)))
)(OrderItem.apply _)

implicit val createOrderReads: Reads[CreateOrderRequest] = (
  (JsPath \ "customer_id").read[String](minLength[String](1)) and
  (JsPath \ "items").read[List[OrderItem]](minLength[List[OrderItem]](1))
)(CreateOrderRequest.apply _)
```

## Key Points

- Silhouette provides modular authentication with JWT support
- Action composition enables reusable auth and authorization
- CSRF filter protects cookie-based authentication
- CORS filter restricts cross-origin requests
- Security headers middleware sets response headers
- JSON validation with Reads combinators ensures type safety
- bcrypt or scrypt for password hashing
- Token-based auth for API, session-based for web
- Action transformers extract user from request
- Custom filters modify request/response pipeline
