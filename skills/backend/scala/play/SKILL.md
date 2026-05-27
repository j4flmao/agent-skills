---
name: play-framework-backend
description: >
  Use this skill when building Play Framework backend applications — reactive, type-safe, Scala/Java, Akka-based HTTP, SBT build. This skill enforces: action composition, async handling, proper routing with the routes DSL, template engine conventions. Do NOT use for: Akka HTTP directly, Lagom projects, ZIO-based apps.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, scala, java, jvm, phase-4]
---

# Play Framework Backend

## Purpose
Define Play Framework backend application architecture: reactive routes, action composition, SBT configuration, and type-safe templates.

## Agent Protocol

### Trigger
User request includes: `play framework`, `play scala`, `play java`, `play backend`, `sbt play`, `play routes`, `play action`, `play template`, `play akka`.

### Input Context
- Language (Scala, Java)
- SBT version (1.9+)
- Play version (3.x, 2.8+)
- Database (Anorm, Slick, JPA, EBean)
- Template engine (Twirl)
- Auth mechanism (Play Auth, Silhouette, custom)

### Output Artifact
A markdown document containing:
- Project structure (SBT layout)
- Routes file conventions
- Action composition patterns
- Controller structure
- Template (Twirl) conventions
- Error handling (ErrorHandler trait)
- Configuration (application.conf)
- Testing (ScalaTest, Specs2, PlaySpec)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging. Compress output.

### Completion Criteria
- Routes file defines clean RESTful endpoints
- Action composition separates cross-cutting concerns
- ErrorHandler catches all exceptions globally
- Twirl templates follow consistent naming
- Configuration externalized via application.conf

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
sbt new playframework/play-scala-seed.g8
sbt new playframework/play-java-seed.g8
```

### Step 2: Project Structure
```
app/
├── controllers/
│   ├── HomeController.scala
│   ├── OrderController.scala
│   └── Assets.scala
├── models/
│   ├── Order.scala
│   └── OrderRepository.scala
├── services/
│   └── OrderService.scala
├── views/
│   ├── main.scala.html
│   ├── order/
│   │   ├── list.scala.html
│   │   └── detail.scala.html
│   └── error/
│       ├── 404.scala.html
│       └── 5xx.scala.html
└── filters/
    └── LoggingFilter.scala
conf/
├── routes
├── application.conf
└── logback.xml
```

### Step 3: Routes File
```scala
# conf/routes
GET     /api/orders                    controllers.OrderController.list(page: Int ?= 0)
GET     /api/orders/:id                controllers.OrderController.get(id: java.util.UUID)
POST    /api/orders                    controllers.OrderController.create
PUT     /api/orders/:id                controllers.OrderController.update(id: java.util.UUID)
DELETE  /api/orders/:id                controllers.OrderController.delete(id: java.util.UUID)

# Health
GET     /health                        controllers.HealthController.ping

# Map static resources from the /public folder
GET     /assets/*file                  controllers.Assets.versioned(path="/public", file: Asset)
```

### Step 4: Action Composition
```scala
import play.api.mvc._

case class AuthenticatedRequest[A](userId: String, request: Request[A]) extends WrappedRequest[A](request)

class AuthenticatedAction(val parser: BodyParsers.Default)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent] with ActionRefiner[Request, AuthenticatedRequest] {

  override protected def refine[A](request: Request[A]): Future[Either[Result, AuthenticatedRequest[A]]] = {
    request.headers.get("Authorization") match {
      case Some(token) if isValid(token) =>
        Future.successful(Right(AuthenticatedRequest(extractUser(token), request)))
      case _ =>
        Future.successful(Left(Results.Unauthorized(ErrorResponse("Invalid token"))))
    }
  }

  private def isValid(token: String): Boolean = true
  private def extractUser(token: String): String = "user-1"
}
```

### Step 5: Controller
```scala
class OrderController @Inject()(
  cc: ControllerComponents,
  authAction: AuthenticatedAction,
  orderService: OrderService
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def get(id: UUID) = authAction.async { request =>
    orderService.findById(id).map {
      case Some(order) => Ok(Json.toJson(order))
      case None => NotFound(Json.obj("error" -> "Order not found"))
    }
  }

  def create = authAction.async(parse.json[CreateOrderRequest]) { request =>
    orderService.create(request.body).map { order =>
      Created(Json.toJson(order))
    }
  }
}
```

## Rules
- Routes file is the single source of truth for URL mapping.
- Action composition for auth, logging, metrics — not inline in controllers.
- Controllers are thin — delegate to service layer.
- All async actions return Future — never block.
- Global ErrorHandler trait for unhandled exceptions.
- Twirl templates minimal — HTML logic in view models.

## References
  - references/play-architecture.md — Play Architecture Guide
  - references/play-performance.md — Play Framework Performance
  - references/play-rest-api.md — Play Framework REST API Reference
  - references/play-security.md — Play Framework Security Reference
  - references/play-setup.md — Play Framework Setup Guide
  - references/play-testing.md — Play Framework Testing
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response standards.
