---
name: scala-play
description: >
  Use this skill when building Scala Play Framework applications — MVC architecture, Slick database access, JSON handling with Play JSON, async actions, and testing. This skill enforces: thin controllers, service layer, Slick for database, Play JSON (reads/writes) for serialization, Future-based async actions. Requires Scala 2.13+ or 3 and Play Framework 3.x. Do NOT use for: Akka HTTP, http4s, ZIO, or non-Play Scala backends.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, scala, play, phase-7]
---

# Scala Play Framework

## Purpose
Build Play Framework applications with clean MVC architecture, Slick database access, Play JSON serialization, async actions, and comprehensive testing.

## Agent Protocol

### Trigger
User request includes: `Play Framework`, `Play Scala`, `Play controller`, `Play Slick`, `Play JSON`, `Play action`, `Play test`, `Play routes`.

### Input Context
- Scala version (2.13, 3)
- Play version (3.x)
- Database (PostgreSQL via Slick)
- JSON library (Play JSON, Circe)
- Testing (ScalaTest, Specs2)

### Output Artifact
Controller, model, Slick table definition, JSON reads/writes, routes, test.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Controller action returns Future[Result]
- Slick table mapped to case class
- JSON Format (Reads/Writes/OFormat) defined
- Routes file with HTTP method binding
- Service layer for business logic

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Play vs Akka HTTP vs http4s vs ZIO HTTP

| Criterion | Play | Akka HTTP | http4s | ZIO HTTP |
|-----------|------|-----------|--------|----------|
| Ecosystem | Full (MVC, Slick, JSON) | HTTP + Akka ecosystem | Functional + Cats | ZIO ecosystem |
| Async | Future-based | Akka Streams | IO/Cats Effect | ZIO |
| Type level | Moderate | Moderate | High (functional) | High |
| Learning curve | Low-Moderate | Moderate | High (FP concepts) | High (ZIO) |
| Community | Large (Scala standard) | Medium | Medium | Growing |

Decision: Full framework (MVC, DB, JSON) → Play. Lightweight HTTP → http4s. Streaming/Akka → Akka HTTP. ZIO stack → ZIO HTTP.

### Slick vs Doobie vs Quill

| Criterion | Slick | Doobie | Quill |
|-----------|-------|--------|-------|
| Approach | Scala query DSL | Free monad (SQL strings) | Macro-based Quill DSL |
| Type safety | High | High | High |
| SQL control | Medium (DSL maps to SQL) | Full (raw SQL) | Medium (Quill DSL) |
| Migration | Play Evolutions + Flyway | Flyway/Liquibase | Manual |
| Learning curve | Moderate | High (Free monad) | Moderate |

Decision: Play integration → Slick. Raw SQL / JDBC → Doobie. Compile-time query generation → Quill.

## Workflow

### Step 1: Project Structure (Play)

```
app/
  controllers/
    UserController.scala
    OrderController.scala
  models/
    User.scala
    Order.scala
  services/
    UserService.scala
    OrderService.scala
  repositories/
    UserRepository.scala
  views/
    (not in API mode)
  dto/
    CreateUserRequest.scala
    UserResponse.scala
  error/
    ErrorHandler.scala
    AppError.scala
conf/
  routes
  application.conf
  evolutions/
    default/
      1.sql
project/
  build.properties
  plugins.sbt
build.sbt
test/
  controllers/
    UserControllerSpec.scala
  services/
    UserServiceSpec.scala
```

### Step 2: build.sbt

```scala
name := "my-api"
version := "1.0.0"
scalaVersion := "2.13.12"

lazy val root = (project in file("."))
  .enablePlugins(PlayScala)
  .settings(
    libraryDependencies ++= Seq(
      guice,
      "org.playframework" %% "play-slick" % "6.0.0",
      "org.playframework" %% "play-slick-evolutions" % "6.0.0",
      "org.postgresql" % "postgresql" % "42.7.0",
      "org.mindrot" % "jbcrypt" % "0.4",
      "com.github.jwt-scala" %% "jwt-play" % "9.4.0",
      "org.scalatestplus.play" %% "scalatestplus-play" % "7.0.0" % Test,
    )
  )
```

### Step 3: Model and Slick Table

```scala
// app/models/User.scala
package models

import java.time.Instant
import java.util.UUID

case class User(
  id: UUID,
  email: String,
  name: String,
  role: String,
  active: Boolean,
  createdAt: Instant,
)

// app/repositories/UserRepository.scala
package repositories

import javax.inject.{Inject, Singleton}
import models.User
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import java.time.Instant
import java.util.UUID
import scala.concurrent.Future

@Singleton
class UserRepository @Inject()(
  protected val dbConfigProvider: DatabaseConfigProvider
) extends HasDatabaseConfigProvider[JdbcProfile] {

  import profile.api._

  class UserTable(tag: Tag) extends Table[User](tag, "users") {
    def id = column[UUID]("id", O.PrimaryKey)
    def email = column[String]("email", O.Unique)
    def name = column[String]("name")
    def role = column[String]("role", O.Default("user"))
    def active = column[Boolean]("active", O.Default(true))
    def createdAt = column[Instant]("created_at")
    def * : ProvenShape[User] = (id, email, name, role, active, createdAt) <> (User.tupled, User.unapply)
  }

  val users = TableQuery[UserTable]

  def findById(id: UUID): Future[Option[User]] =
    db.run(users.filter(_.id === id).result.headOption)

  def findByEmail(email: String): Future[Option[User]] =
    db.run(users.filter(_.email === email).result.headOption)

  def findAll(page: Int, pageSize: Int): Future[Seq[User]] =
    db.run(users.sortBy(_.createdAt.desc).drop((page - 1) * pageSize).take(pageSize).result)

  def count(): Future[Int] =
    db.run(users.length.result)

  def save(user: User): Future[Int] =
    db.run(users += user)

  def update(id: UUID, user: User): Future[Int] =
    db.run(users.filter(_.id === id).update(user))

  def delete(id: UUID): Future[Int] =
    db.run(users.filter(_.id === id).delete)
}
```

### Step 4: JSON Reads/Writes (DTO)

```scala
// app/dto/CreateUserRequest.scala
package dto

import play.api.libs.json.{Json, Reads}

case class CreateUserRequest(
  email: String,
  name: String,
  role: Option[String],
)

object CreateUserRequest {
  implicit val reads: Reads[CreateUserRequest] = Json.reads[CreateUserRequest]
}

// app/dto/UserResponse.scala
package dto

import models.User
import play.api.libs.json.{Json, OWrites, Writes}
import java.time.Instant
import java.util.UUID

case class UserResponse(
  id: UUID,
  email: String,
  name: String,
  role: String,
  active: Boolean,
  createdAt: Instant,
)

object UserResponse {
  implicit val writes: OWrites[UserResponse] = Json.writes[UserResponse]

  def from(user: User): UserResponse =
    UserResponse(user.id, user.email, user.name, user.role, user.active, user.createdAt)
}

// app/dto/PaginatedResponse.scala
package dto

import play.api.libs.json.{Json, OWrites}

case class PaginatedResponse[T](
  data: Seq[T],
  total: Int,
  page: Int,
  pageSize: Int,
)

object PaginatedResponse {
  implicit def writes[T](implicit tWrites: OWrites[T]): OWrites[PaginatedResponse[T]] =
    Json.writes[PaginatedResponse[T]]
}
```

### Step 5: Service Layer

```scala
// app/services/UserService.scala
package services

import dto.{CreateUserRequest, UserResponse}
import models.User
import repositories.UserRepository
import org.mindrot.jbcrypt.BCrypt

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}
import java.time.Instant
import java.util.UUID

@Singleton
class UserService @Inject()(
  userRepository: UserRepository,
)(implicit ec: ExecutionContext) {

  def create(request: CreateUserRequest): Future[UserResponse] =
    userRepository.findByEmail(request.email).flatMap {
      case Some(_) =>
        Future.failed(new AppError.Conflict("Email already exists"))
      case None =>
        val user = User(
          id = UUID.randomUUID(),
          email = request.email.toLowerCase,
          name = request.name,
          role = request.role.getOrElse("user"),
          active = true,
          createdAt = Instant.now,
        )
        userRepository.save(user).map(_ => UserResponse.from(user))
    }

  def findById(id: UUID): Future[UserResponse] =
    userRepository.findById(id).flatMap {
      case Some(user) => Future.successful(UserResponse.from(user))
      case None => Future.failed(new AppError.NotFound("User"))
    }

  def findAll(page: Int, pageSize: Int): Future[PaginatedResponse[UserResponse]] =
    for {
      users <- userRepository.findAll(page, pageSize)
      total <- userRepository.count()
    } yield PaginatedResponse(
      data = users.map(UserResponse.from),
      total = total,
      page = page,
      pageSize = pageSize,
    )

  def delete(id: UUID): Future[Unit] =
    userRepository.delete(id).map {
      case 1 => ()
      case 0 => throw new AppError.NotFound("User")
    }
}
```

### Step 6: Error Handling

```scala
// app/error/AppError.scala
package error

sealed trait AppError extends Exception with Product with Serializable {
  def statusCode: Int
  def code: String
  def message: String
}

object AppError {
  case class NotFound(entity: String)
    extends RuntimeException(s"$entity not found") with AppError {
    val statusCode = 404
    val code = "NOT_FOUND"
    val message = s"$entity not found"
  }
  case class Conflict(msg: String)
    extends RuntimeException(msg) with AppError {
    val statusCode = 409
    val code = "CONFLICT"
    val message = msg
  }
  case class Validation(details: Seq[(String, String)])
    extends RuntimeException("Validation error") with AppError {
    val statusCode = 422
    val code = "VALIDATION_ERROR"
    val message = "Validation error"
  }
}

// app/error/ErrorHandler.scala
package error

import play.api.http.HttpErrorHandler
import play.api.http.Status._
import play.api.libs.json.Json
import play.api.mvc.{RequestHeader, Result, Results}

import javax.inject.Singleton
import scala.concurrent.Future

@Singleton
class ErrorHandler extends HttpErrorHandler {
  def onClientError(request: RequestHeader, statusCode: Int, message: String): Future[Result] =
    Future.successful {
      Results.Status(statusCode)(Json.obj(
        "error" -> Json.obj("code" -> "CLIENT_ERROR", "message" -> message)
      ))
    }

  def onServerError(request: RequestHeader, exception: Throwable): Future[Result] = {
    val (status, body) = exception match {
      case e: AppError =>
        e.statusCode -> Json.obj("error" -> Json.obj("code" -> e.code, "message" -> e.message))
      case _ =>
        INTERNAL_SERVER_ERROR -> Json.obj("error" -> Json.obj("code" -> "INTERNAL_ERROR", "message" -> "Server error"))
    }
    Future.successful(Results.Status(status)(body))
  }
}
```

### Step 7: Controller

```scala
// app/controllers/UserController.scala
package controllers

import dto.{CreateUserRequest, UserResponse}
import error.AppError
import play.api.libs.json.{JsError, Json}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}
import services.UserService

import javax.inject.{Inject, Singleton}
import scala.concurrent.{ExecutionContext, Future}
import java.util.UUID

@Singleton
class UserController @Inject()(
  cc: ControllerComponents,
  userService: UserService,
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def list(page: Int, pageSize: Int): Action[AnyContent] = Action.async {
    userService.findAll(page, pageSize).map { result =>
      Ok(Json.toJson(result))
    }.recover(errorHandler)
  }

  def getById(id: UUID): Action[AnyContent] = Action.async {
    userService.findById(id).map { user =>
      Ok(Json.toJson(user))
    }.recover(errorHandler)
  }

  def create: Action[AnyContent] = Action.async { request =>
    request.body.asJson.map { json =>
      json.validate[CreateUserRequest].fold(
        errors => Future.successful(BadRequest(JsError.toJson(errors))),
        createReq => userService.create(createReq).map { user =>
          Created(Json.toJson(user))
        }.recover(errorHandler)
      )
    }.getOrElse(Future.successful(BadRequest(Json.obj("error" -> "Invalid JSON"))))
  }

  def delete(id: UUID): Action[AnyContent] = Action.async {
    userService.delete(id).map { _ =>
      NoContent
    }.recover(errorHandler)
  }

  private val errorHandler: PartialFunction[Throwable, play.api.mvc.Result] = {
    case AppError.NotFound(entity) => NotFound(Json.obj("error" -> s"$entity not found"))
    case AppError.Conflict(msg)    => Conflict(Json.obj("error" -> msg))
    case e                         => InternalServerError(Json.obj("error" -> "Server error"))
  }
}
```

### Step 8: Routes

```
# conf/routes
GET     /api/v1/users                   controllers.UserController.list(page: Int ?= 1, pageSize: Int ?= 20)
GET     /api/v1/users/:id               controllers.UserController.getById(id: java.util.UUID)
POST    /api/v1/users                   controllers.UserController.create
DELETE  /api/v1/users/:id               controllers.UserController.delete(id: java.util.UUID)
```

## Production Considerations

### Configuration
```hocon
# conf/application.conf
play.http.errorHandler = "error.ErrorHandler"
play.filters.hosts.allowed = [".example.com"]
play.filters.headers.contentSecurityPolicy = "default-src 'self'"

slick.dbs.default {
  profile = "slick.jdbc.PostgresProfile$"
  db {
    driver = "org.postgresql.Driver"
    url = ${?DATABASE_URL}
    user = ${?DB_USER}
    password = ${?DB_PASS}
    numThreads = 10
    maxConnections = 20
    connectionPool = HikariCP
  }
}
```

### Thread Pool Configuration
```hocon
# Thread pool for DB operations (Slick uses application context)
play.akka {
  actor-system = "my-system"
  default-dispatcher {
    fork-join-executor {
      parallelism-factor = 3.0
      parallelism-max = 24
    }
  }
}
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Blocking DB access in Action | Blocks Play's small thread pool | Always return Future[Result] |
| Business logic in controller | Untestable, violates MVC | Service layer |
| No error handling in actions | 500 on any failure | Recover with error handler |
| Global JSON formatters | Implicit conflicts | Per-DTO `implicit val` |
| Await.result in controller | Blocks thread, deadlock risk | Return Future[Result] |
| String IDs | Performance, type safety | UUID or Long IDs |

## Security Considerations
- Play's `AllowedHostsFilter` and `CSPFilter` enabled by default
- CSRF protection for session-based auth; `play.filters.csrf.CSRFFilter`
- SQL injection: Slick uses parameterized queries — safe by default
- JSON validation with `Reads` — rejects malformed input
- JWT with `jwt-play` — validate signature, expiration, issuer
- CORS: `play.filters.cors.CORSFilter` with explicit origins

## Testing Strategies

```scala
// test/controllers/UserControllerSpec.scala
class UserControllerSpec extends PlaySpec with GuiceOneAppPerTest with Injecting {
  "UserController" should {
    "return 201 on create" in {
      val request = FakeRequest(POST, "/api/v1/users")
        .withJsonBody(Json.obj("email" -> "test@test.com", "name" -> "Test"))
      val result = route(app, request).get
      status(result) mustBe CREATED
    }

    "return 200 on list" in {
      val request = FakeRequest(GET, "/api/v1/users")
      val result = route(app, request).get
      status(result) mustBe OK
    }
  }
}
```

Use `ScalaTest + PlaySpec` for controller tests. Use `Mockito` or `ScalaMock` for service mocking. Use `scalacheck` for property-based testing.

## Rules
- All controller actions return `Future[Result]` — never `Action { ... }` blocking.
- Slick queries in repositories, wrapped with `Future` — never raw `db.run` in controllers.
- JSON serialization via `play.api.libs.json` — `Reads` for input, `Writes`/`OWrites` for output.
- Service layer for business logic — controllers call services, services call repositories.
- Error handling via `AppError` sealed trait + `HttpErrorHandler`.
- `Guice` DI via `@Inject()` and `@Singleton` — Play's default DI container.
- Routes file is the API contract — one line per endpoint with type-safe parameters.

## References
  - references/play-architecture.md — Play Architecture
  - references/play-framework-rest-api.md — REST API with Play
  - references/play-performance.md — Performance
  - references/play-rest-api.md — Play REST API Patterns
  - references/play-security.md — Play Security
  - references/play-setup.md — Setup Guide
  - references/play-testing.md — Testing Play
  - references/scala-concurrent-streaming.md — Concurrency and Streaming
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response formatting or `backend/universal/backend-testing/SKILL.md` for test patterns.
