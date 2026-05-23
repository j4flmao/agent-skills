# Play Framework Setup Guide

## Prerequisites
- JDK 17+
- SBT 1.9+

## Project Initialization
```bash
# Scala
sbt new playframework/play-scala-seed.g8 --name=order-service

# Java
sbt new playframework/play-java-seed.g8 --name=order-service

# Or with Giter8
sbt new playframework/play-scala-seed.g8
```

## build.sbt
```scala
name := "order-service"
version := "1.0.0"

lazy val root = (project in file("."))
  .enablePlugins(PlayScala)
  .settings(
    scalaVersion := "2.13.12",
    libraryDependencies ++= Seq(
      guice,
      "org.playframework" %% "play-slick" % "6.1.0",
      "org.playframework" %% "play-slick-evolutions" % "6.1.0",
      "org.postgresql" % "postgresql" % "42.7.1",
      "com.typesafe.play" %% "play-json" % "2.10.1",
      "org.scalatestplus.play" %% "scalatestplus-play" % "7.0.0" % Test,
    ),
    scalacOptions ++= Seq("-deprecation", "-feature", "-Xfatal-warnings"),
  )
```

## application.conf
```hocon
play {
  http {
    secret.key = ${?APPLICATION_SECRET}
    errorHandler = "com.example.ErrorHandler"
  }
  filters {
    disabled += "play.filters.csrf.CSRFFilter"
  }
}

slick.dbs.default {
  profile = "slick.jdbc.PostgresProfile$"
  db {
    url = ${?JDBC_URL}
    driver = org.postgresql.Driver
    user = ${?DB_USER}
    password = ${?DB_PASSWORD}
  }
}
```

## Running the App
```bash
# Development (auto-reload)
sbt run

# Production stage
sbt stage
./target/universal/stage/bin/order-service

# Production dist
sbt dist
# unzip target/universal/order-service-1.0.0.zip
```

## Common Commands

| Command | Purpose |
|---|---|
| `sbt run` | Dev server on 9000 |
| `sbt test` | Run all tests |
| `sbt ~compile` | Continuous compile |
| `sbt clean stage` | Production artifact |
| `sbt docker:publishLocal` | Docker image |

## Routes File
```scala
# GET /api/orders/...
GET     /api/orders                   controllers.OrderController.list(page: Int ?= 0, size: Int ?= 20)
GET     /api/orders/:id               controllers.OrderController.get(id: String)
POST    /api/orders                   controllers.OrderController.create
PUT     /api/orders/:id               controllers.OrderController.update(id: String)
DELETE  /api/orders/:id               controllers.OrderController.delete(id: String)
POST    /api/orders/:id/cancel        controllers.OrderController.cancel(id: String)

# Health
GET     /health                       controllers.HealthController.ping

# Assets
GET     /assets/*file                 controllers.Assets.versioned(path="/public", file: Asset)
```

## Twirl Templates
```scala
@(orders: Seq[Order])

@main("Orders") {
  <h1>Orders</h1>
  <ul>
  @for(order <- orders) {
    <li>@order.id - @order.status</li>
  }
  </ul>
}
```
