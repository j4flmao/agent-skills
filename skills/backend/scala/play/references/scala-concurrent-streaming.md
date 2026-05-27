# Scala Concurrent & Streaming Reference

## Concurrency Primitives

### Future

```scala
import scala.concurrent.{ExecutionContext, Future, Promise, Await}
import scala.concurrent.duration._
import scala.util.{Try, Success, Failure}

val f1: Future[Int] = Future { 42 }
val f2: Future[Int] = Future { Thread.sleep(1000); 21 + 21 }
val f3: Future[String] = Future.successful("immediate")
val f4: Future[Int] = Future.failed(new RuntimeException("failed"))
val f5: Future[Int] = Future.fromTry(Try(42))

val future: Future[Int] = Future { computeResult() }
future.onComplete {
  case Success(value) => println(s"Result: $value")
  case Failure(e) => println(s"Error: ${e.getMessage}")
}

future.onSuccess { case result => println(result) }
future.onFailure { case e => Logger.error("Failed", e) }

val result = Await.result(future, 5.seconds)
val optional = Await.ready(future, 5.seconds).value
```

### Promise

```scala
import scala.concurrent.{Promise, Future}

val promise = Promise[String]()
val future: Future[String] = promise.future

promise.success("completed")
promise.failure(new RuntimeException("error"))

promise.complete(Try("result"))
promise.completeWith(Future { "another future" } )

val wasCompleted: Boolean = promise.trySuccess("value")

def bridgeCallbackApi(param: String): Future[Int] = {
  val promise = Promise[Int]()
  callbackBasedApi.doSomething(param) { (error, result) =>
    if (error != null) promise.failure(error)
    else promise.success(result)
  }
  promise.future
}

def fromCompletableFuture[T](cf: CompletableFuture[T]): Future[T] = {
  val promise = Promise[T]()
  cf.whenComplete { (value, error) =>
    if (error != null) promise.failure(error)
    else promise.success(value)
  }
  promise.future
}
```

### ExecutionContext

```scala
import scala.concurrent.{ExecutionContext, Future, blocking}
import scala.concurrent.ExecutionContext.Implicits.global

implicit val ec: ExecutionContext = ExecutionContext.global

import java.util.concurrent.ForkJoinPool
val forkJoinPool = new ForkJoinPool(8)
implicit val forkJoinEc: ExecutionContext = ExecutionContext.fromExecutor(forkJoinPool)

import java.util.concurrent.{Executors, ThreadPoolExecutor, LinkedBlockingQueue}

val dbPool = Executors.newFixedThreadPool(10, (r: Runnable) => {
  val t = new Thread(r, "db-pool-thread")
  t.setDaemon(true)
  t
})
implicit val dbEc: ExecutionContext = ExecutionContext.fromExecutor(dbPool)

implicit val workStealingEc: ExecutionContext = ExecutionContext.fromExecutor(
  java.util.concurrent.Executors.newWorkStealingPool(8)
)
```

### Blocking Consideration

```scala
import scala.concurrent.{ExecutionContext, Future, blocking}

class BlockingAwareService(implicit ec: ExecutionContext) {

  def badBlockingCall(): Future[Int] = Future {
    Thread.sleep(5000)
    42
  }

  def goodBlockingCall(): Future[Int] = Future {
    blocking {
      Thread.sleep(5000)
      42
    }
  }

  def bestBlockingCall()(implicit blockingEc: ExecutionContext): Future[Int] = Future {
    Thread.sleep(5000)
    42
  }(blockingEc)
}
```

## Future Composition

### map / flatMap

```scala
import scala.concurrent.Future

class OrderService(repo: OrderRepository)(implicit ec: ExecutionContext) {

  def getOrderCustomerEmail(orderId: String): Future[String] = {
    repo.findById(orderId)
      .flatMap {
        case Some(order) => repo.findCustomer(order.customerId)
        case None => Future.failed(new NotFoundException(s"Order $orderId not found"))
      }
      .map(_.email)
  }

  def getOrderDetails(orderId: String): Future[OrderDetails] = {
    for {
      order <- repo.findById(orderId).map(_.getOrElse(
        throw new NotFoundException(s"Order $orderId")
      ))
      customer <- repo.findCustomer(order.customerId)
      items <- repo.findItems(orderId)
    } yield OrderDetails(order, customer, items)
  }

  def getOrderCount: Future[Int] = {
    repo.countAll()
      .transform {
        case Success(count) => Success(count)
        case Failure(_) => Success(0)
      }
  }

  def getOrderWithFallback(orderId: String): Future[Option[Order]] = {
    repo.findById(orderId).transformWith {
      case Success(order) => Future.successful(order)
      case Failure(_) => Future.successful(None)
    }
  }
}
```

### sequence / traverse

```scala
import scala.concurrent.Future

class BatchService(repo: OrderRepository)(implicit ec: ExecutionContext) {

  def getOrdersSequential(ids: List[String]): Future[List[Order]] = {
    Future.sequence(ids.map(repo.findById)).map(_.flatten)
  }

  def getOrdersTraverse(ids: List[String]): Future[List[Order]] = {
    Future.traverse(ids)(id =>
      repo.findById(id).map(_.getOrElse(
        throw new NotFoundException(s"Order $id")
      ))
    )
  }

  def processOrders(orders: List[Order]): Future[List[ProcessedOrder]] = {
    val grouped = orders.grouped(10).toList
    Future.traverse(grouped) { batch =>
      Future.sequence(batch.map(processOne))
    }.map(_.flatten)
  }

  private def processOne(order: Order): Future[ProcessedOrder] = ???
}
```

### fold / reduce

```scala
import scala.concurrent.Future

class AggregationService(repo: OrderRepository)(implicit ec: ExecutionContext) {

  def totalRevenue(orders: List[Order]): Future[BigDecimal] = {
    Future.foldLeft(orders.map(o => calculateRevenue(o)))(BigDecimal(0))(_ + _)
  }

  def maxOrderValue(orders: List[Order]): Future[BigDecimal] = {
    Future.reduceLeft(orders.map(o => calculateTotal(o)))(_ max _)
  }

  def totalRevenueWithEC(orders: List[Order]): Future[BigDecimal] = {
    Future.foldLeft(orders.map(o => calculateRevenue(o)))(BigDecimal(0))(_ + _)(ec)
  }
}
```

### recover / recoverWith

```scala
import scala.concurrent.Future

class ResilientService(repo: OrderRepository)(implicit ec: ExecutionContext) {

  def getOrderCount: Future[Int] = {
    repo.countAll().recover {
      case e: java.sql.SQLException =>
        Logger.error("DB error, returning 0", e)
        0
      case e: TimeoutException =>
        Logger.warn("Timeout, retrying from cache")
        cachedCount
    }
  }

  def getOrder(id: String): Future[Option[Order]] = {
    repo.findById(id).recoverWith {
      case _: TimeoutException =>
        Logger.warn(s"Timeout fetching order $id, retrying once")
        repo.findById(id)
      case _: java.sql.SQLException =>
        Logger.error(s"DB error fetching order $id, trying replica")
        replicaRepo.findById(id)
    }
  }

  def getConfig(key: String): Future[String] = {
    configService.getFromRedis(key)
      .fallbackTo(configService.getFromDb(key))
      .fallbackTo(Future.successful(defaultValue))
  }

  def retry[T](f: => Future[T], maxRetries: Int = 3, delay: FiniteDuration = 100.millis): Future[T] = {
    f.recoverWith {
      case _ if maxRetries > 0 =>
        after(delay)(retry(f, maxRetries - 1, delay * 2))
    }
  }

  private def after[T](delay: FiniteDuration)(block: => Future[T]): Future[T] = {
    val promise = Promise[T]()
    promise.future
  }
}
```

## Async Libraries

### scala-async

```scala
import scala.async.Async.{async, await}
import scala.concurrent.Future

class AsyncService(repo: OrderRepository)(implicit ec: ExecutionContext) {

  def getOrderDetails(orderId: String): Future[OrderDetails] = async {
    val order = await(repo.findById(orderId)).getOrElse(
      throw new NotFoundException(s"Order $orderId")
    )
    val customer = await(repo.findCustomer(order.customerId))
    val items = await(repo.findItems(orderId))
    OrderDetails(order, customer, items)
  }

  def processWithTimeout(orderId: String): Future[Option[Order]] = async {
    val orderF = repo.findById(orderId)
    val timeoutF = after(5.seconds)(Future.failed(
      new TimeoutException("timed out")
    ))
    await(Future.firstCompletedOf(Seq(orderF, timeoutF)))
  }
}
```

### Twitter Util Futures

```scala
import com.twitter.util.{Future, Promise, Return, Throw}
import com.twitter.conversions.DurationOps._

class TwitterFutureService(client: HttpClient) {

  def getUser(id: String): Future[User] = {
    client.fetch(s"/users/$id").flatMap { response =>
      if (response.status == 200) {
        Future(value = parseUser(response.content))
      } else {
        Future.exception(new Exception(s"HTTP ${response.status}"))
      }
    }
  }

  def getOrderWithRetry(orderId: String): Future[Order] = {
    fetchOrder(orderId).rescue {
      case _: TimeoutException => fetchOrder(orderId)
    }.within(3.seconds)
  }

  def parallelFetch(ids: List[String]): Future[Seq[Order]] = {
    Future.collect(ids.map(fetchOrder))
  }

  def sequentialFetch(ids: List[String]): Future[Seq[Order]] = {
    Future.reduceLeft(ids.map(fetchOrder)) { (acc, order) =>
      acc :+ order
    }
  }
}
```

## Cats Effect IO

```scala
import cats.effect.{IO, IOApp, Resource, Sync, Timer, ContextShift}
import cats.implicits._
import scala.concurrent.duration._

val hello: IO[String] = IO.pure("hello")
val delayed: IO[String] = IO.delay { println("running"); "result" }
val failed: IO[String] = IO.raiseError(new RuntimeException("fail"))

val composed: IO[String] = for {
  a <- IO.pure("hello")
  b <- IO.pure("world")
} yield s"$a $b"

val mapped: IO[Int] = IO.pure(42).map(_ + 1)
val flatMapped: IO[Int] = IO.pure(10).flatMap(n => IO.pure(n * 2))

val safe: IO[Int] = IO(throw new RuntimeException("boom"))
  .handleErrorWith { e => IO.pure(0) }

val recovered: IO[Int] = IO(42).recover { case _ => 0 }
val attempted: IO[Either[Throwable, Int]] = IO(42).attempt

def readFile(path: String): IO[String] = {
  val acquire = IO { scala.io.Source.fromFile(path) }
  acquire.bracket { source =>
    IO { source.getLines().mkString("\n") }
  } { source =>
    IO { source.close() }
  }
}

def openFile(path: String): Resource[IO, scala.io.Source] =
  Resource.make(IO(scala.io.Source.fromFile(path)))(s => IO(s.close()))

val content: IO[String] = openFile("data.txt").use { source =>
  IO { source.getLines().mkString("\n") }
}

implicit val cs: ContextShift[IO] = IO.contextShift(ExecutionContext.global)
implicit val timer: Timer[IO] = IO.timer(ExecutionContext.global)

val shifted: IO[Int] = for {
  _ <- IO.shift(cs)
  result <- IO { compute() }
  _ <- IO.shift(cs)
} yield result

val parResult: IO[(Int, String)] = (
  IO { compute1() },
  IO { compute2() }
).parTupled

val withTimeout: IO[Int] = IO {
  Thread.sleep(5000)
  42
}.timeout(3.seconds)
```

## ZIO

```scala
import zio._
import zio.clock.Clock
import zio.console._
import zio.duration._

val hello: UIO[String] = ZIO.succeed("hello")
val delayed: Task[String] = ZIO.effect { println("running"); "result" }
val failed: IO[RuntimeException, Nothing] = ZIO.fail(new RuntimeException("fail"))

val composed: UIO[String] = for {
  a <- ZIO.succeed("hello")
  b <- ZIO.succeed("world")
} yield s"$a $b"

val safe: UIO[Int] = ZIO
  .effect { throw new RuntimeException("boom"); 42 }
  .catchAll(_ => ZIO.succeed(0))

val recovered: UIO[Int] = ZIO
  .effect(42)
  .catchSome { case _: TimeoutException => ZIO.succeed(0) }

def openFile(path: String): ZManaged[Any, Throwable, java.io.FileInputStream] =
  ZManaged.make(
    ZIO.effect(new java.io.FileInputStream(path))
  )(is => ZIO.effect(is.close()).orDie)

val content: Task[Array[Byte]] = openFile("data.txt").use { is =>
  ZIO.effect {
    val bytes = new Array[Byte](1024)
    is.read(bytes)
    bytes
  }
}

val data: Task[Array[Byte]] = ZIO.effect(
  new java.io.FileInputStream("data.txt")
).bracket(
  release = is => ZIO.effect(is.close()).orDie
)(is => ZIO.effect { val b = new Array[Byte](1024); is.read(b); b })

val fiber: UIO[Fiber[Nothing, Int]] = ZIO.succeed(42).fork
val joined: UIO[Int] = fiber.flatMap(_.join)

val raced: IO[Throwable, String] = callService1.race(callService2)
val timed: IO[Throwable, Int] = longComputation.timeoutFail(new TimeoutException)(5.seconds)

val par: UIO[(Int, String)] = (ZIO.succeed(1) <&> ZIO.succeed("a"))

type MyEnv = Clock with Console
val program: ZIO[MyEnv, Nothing, Unit] = for {
  _ <- putStrLn("hello")
  time <- currentTime(TimeUnit.MILLISECONDS)
} yield ()
```

## Monix Task

```scala
import monix.eval.{Task, Coeval}
import monix.execution.Scheduler
import scala.concurrent.duration._

val task: Task[Int] = Task.eval(42)
val delayed: Task[Int] = Task.eval { Thread.sleep(1000); 42 }
val failed: Task[Int] = Task.raiseError(new RuntimeException("fail"))
val now: Task[Int] = Task.now(42)
val defer: Task[Int] = Task.defer(Task(42))

val result: Task[Int] = for {
  a <- Task.eval(10)
  b <- Task.eval(20)
} yield a + b

val mapped: Task[Int] = Task(42).map(_ + 1)
val flat: Task[Int] = Task(10).flatMap(n => Task(n * 2))

val safe: Task[Int] = Task(throw new Exception("boom"))
  .onErrorHandle(_ => 0)

val recovered: Task[Int] = Task(42)
  .onErrorRecover { case _: TimeoutException => 0 }

val restarted: Task[Int] = Task(42)
  .onErrorRestart(maxRetries = 3)

val restartWithDelay: Task[Int] = Task(42)
  .onErrorRestartBackoff(3, 1.second, 10.seconds)

val memoized: Task[Int] = expensiveComputation.memoizeOnSuccess

val raced: Task[Int] = Task.race(task1, task2).map(_.merge)

val par: Task[(Int, String)] = Task.parMap2(Task(1), Task("a"))((a, b) => (a, b))

implicit val scheduler: Scheduler = Scheduler.global
implicit val schedulerCustom: Scheduler = Scheduler.io(name = "my-io")
implicit val schedulerComputation: Scheduler = Scheduler.computation(parallelism = 8)

val future: CancelableFuture[Int] = task.runToFuture
val async: Unit = task.runAsync {
  case Right(v) => println(v)
  case Left(e) => println(e)
}
```

## Akka Streams

### Source, Flow, Sink

```scala
import akka.stream.scaladsl.{Source, Flow, Sink, Keep}
import akka.stream.{Materializer, ActorMaterializer, OverflowStrategy}
import akka.{Done, NotUsed}
import akka.util.ByteString
import scala.concurrent.Future
import scala.concurrent.duration._

val source: Source[Int, NotUsed] = Source(1 to 100)
val singleSource: Source[String, NotUsed] = Source.single("hello")
val emptySource: Source[Nothing, NotUsed] = Source.empty
val futureSource: Source[Int, NotUsed] = Source.future(Future(42))
val repeatSource: Source[Int, NotUsed] = Source.repeat(1)
val cycleSource: Source[String, NotUsed] = Source.cycle(() => List("a", "b", "c").iterator)
val tickSource: Source[String, NotUsed] = Source.tick(1.second, 1.second, "tick")
val fromIterator: Source[Int, NotUsed] = Source.fromIterator(() => (1 to 1000).iterator)

val doubleFlow: Flow[Int, Int, NotUsed] = Flow[Int].map(_ * 2)
val filterFlow: Flow[Int, Int, NotUsed] = Flow[Int].filter(_ > 0)
val takeFlow: Flow[Int, Int, NotUsed] = Flow[Int].take(10)

val printSink: Sink[Any, Future[Done]] = Sink.foreach(println)
val headSink: Sink[Int, Future[Int]] = Sink.head[Int]
val headOptionSink: Sink[Int, Future[Option[Int]]] = Sink.headOption[Int]
val ignoreSink: Sink[Any, Future[Done]] = Sink.ignore
val foldSink: Sink[Int, Future[Int]] = Sink.fold[Int, Int](0)(_ + _)
val seqSink: Sink[Int, Future[Seq[Int]]] = Sink.seq[Int]

val graph: RunnableGraph[NotUsed] = source.via(doubleFlow).to(printSink)
val materialized: Future[Done] = graph.run()

val materializedValue: Future[Seq[Int]] = source
  .via(doubleFlow)
  .take(5)
  .runWith(Sink.seq[Int])
```

### Materialization

```scala
import akka.stream.scaladsl.{Keep, RunnableGraph, Sink, Source}
import akka.stream.Materializer
import scala.concurrent.Future

val source: Source[Int, NotUsed] = Source(1 to 10)

val result1: Future[Seq[Int]] = source.runWith(Sink.seq[Int])

val result2: NotUsed = source.to(Sink.ignore).run()

val result3: (NotUsed, Future[Seq[Int]]) = source.toMat(Sink.seq)(Keep.both).run()

val kvSource: Source[(String, Int), Future[Option[String]]] = Source
  .single(("key", 42))
  .mapMaterializedValue(_ => Future.successful(Some("metadata")))
```

### Backpressure

```scala
import akka.stream.{OverflowStrategy, Backpressure}
import akka.stream.scaladsl.{Source, Flow, Sink, SourceQueueWithComplete}
import scala.concurrent.Promise

val throttled: Source[Int, NotUsed] = Source(1 to 100)
  .throttle(10, 1.second, 10, ThrottleMode.Shaping)

Source.queue[Int](bufferSize = 100, OverflowStrategy.backpressure)
Source.queue[Int](bufferSize = 1000, OverflowStrategy.dropHead)
Source.queue[Int](bufferSize = 100, OverflowStrategy.dropTail)
Source.queue[Int](bufferSize = 100, OverflowStrategy.dropNew)
Source.queue[Int](bufferSize = 10, OverflowStrategy.fail)

val (queue: SourceQueueWithComplete[Int], done: Future[Done]) = Source
  .queue[Int](bufferSize = 100, OverflowStrategy.backpressure)
  .toMat(Sink.foreach(println))(Keep.both)
  .run()

Future {
  for (i <- 1 to 1000) {
    queue.offer(i).onComplete {
      case Success(QueueOfferResult.Enqueued) =>
      case Success(QueueOfferResult.Dropped) =>
      case Success(QueueOfferResult.Failure(e)) =>
      case Success(QueueOfferResult.QueueClosed) =>
      case Failure(e) =>
    }
  }
}
queue.complete()
```

### Graph DSL

```scala
import akka.stream.{ClosedShape, FanOutShape, FanInShape}
import akka.stream.scaladsl.{GraphDSL, Broadcast, Merge, Zip, Balance, RunnableGraph, Source, Sink}

val broadcastGraph = RunnableGraph.fromGraph(GraphDSL.create() { implicit builder =>
  import GraphDSL.Implicits._

  val src = builder.add(Source(1 to 10))
  val bcast = builder.add(Broadcast[Int](2))
  val sink1 = builder.add(Sink.foreach[Int](x => println(s"sink1: $x")))
  val sink2 = builder.add(Sink.foreach[Int](x => println(s"sink2: $x")))

  src ~> bcast ~> sink1
          bcast ~> sink2

  ClosedShape
})

val mergeGraph = RunnableGraph.fromGraph(GraphDSL.create() { implicit builder =>
  import GraphDSL.Implicits._

  val src1 = builder.add(Source(1 to 5))
  val src2 = builder.add(Source(6 to 10))
  val merge = builder.add(Merge[Int](2))
  val sink = builder.add(Sink.foreach(println))

  src1 ~> merge ~> sink
  src2 ~> merge

  ClosedShape
})

val zipGraph = RunnableGraph.fromGraph(GraphDSL.create() { implicit builder =>
  import GraphDSL.Implicits._

  val src1 = builder.add(Source(1 to 5))
  val src2 = builder.add(Source(List("a", "b", "c", "d", "e")))
  val zip = builder.add(Zip[Int, String]())
  val sink = builder.add(Sink.foreach(println))

  src1 ~> zip.in0
  src2 ~> zip.in1
  zip.out ~> sink

  ClosedShape
})

val balance = builder.add(Balance[Int](3))
```

### Operators

```scala
import akka.stream.scaladsl.{Source, Flow, Sink}
import akka.stream.ThrottleMode
import scala.concurrent.duration._

val source = Source(1 to 100)

source.map(_ * 2)
source.filter(_ % 2 == 0)
source.collect { case n if n > 50 => s"big: $n" }

source.flatMapConcat(n => Source(n to n + 2))
source.flatMapMerge(maxFans = 4, n => Source(n to n + 2))
source.mapConcat(n => List(n, n * 10))

source.grouped(10)
source.sliding(windowSize = 5, step = 1)

source.throttle(elements = 10, per = 1.second)
source.throttle(elements = 10, per = 1.second, maximumBurst = 5, ThrottleMode.Shaping)

source.conflate((acc, n) => acc + n)
source.conflateWithSeed(seed = (_: Int) => 0)(aggregate = (acc, n) => acc + 1)

source.expand(i => Iterator.iterate(i)(_ * 2))

source.buffer(100, OverflowStrategy.backpressure)
source.buffer(50, OverflowStrategy.dropHead)

source.idleTimeout(30.seconds)
source.keepAlive(maxIdle = 1.second, injectedElem = () => 0)

source.log("my-stream")

source.watchTermination()((_, done) => done.onComplete {
  case Success(_) => println("Stream completed")
  case Failure(e) => println(s"Stream failed: $e")
})
```

### Error Handling & Supervision

```scala
import akka.stream.{Supervision, ActorAttributes}
import akka.stream.Supervision.{Stop, Resume, Restart}
import akka.stream.scaladsl.{Source, Flow, Sink}

val decider: Supervision.Decider = {
  case _: ArithmeticException => Resume
  case _: IllegalArgumentException => Stop
  case _ => Restart
}

Source(1 to 10)
  .map { n =>
    if (n == 5) throw new ArithmeticException("div by zero")
    n
  }
  .withAttributes(ActorAttributes.supervisionStrategy(decider))
  .runWith(Sink.seq)

val safeFlow: Flow[Int, Int, NotUsed] = Flow[Int]
  .map { n => 100 / n }
  .withAttributes(ActorAttributes.supervisionStrategy {
    case _: ArithmeticException => Supervision.Resume
  })

Source(1 to 10)
  .map(n => if (n == 5) throw new RuntimeException else n)
  .recover { case _: RuntimeException => -1 }
  .runWith(Sink.seq)

Source(1 to 10)
  .map(n => if (n > 3) throw new RuntimeException else n)
  .recoverWithRetries(attempts = 1, { case _ => Source(-1 to -5) })

import akka.stream.restart.RestartSource
import scala.concurrent.duration._

RestartSource.withBackoff(
  minBackoff = 1.second,
  maxBackoff = 30.seconds,
  randomFactor = 0.2
) { () =>
  Source.futureSource {
    createConnection().map { conn =>
      Source.fromIterator(() => conn.stream())
    }
  }
}
```

## Reactive Streams

```scala
import org.reactivestreams.{Publisher, Subscriber, Subscription, Processor}
import akka.stream.scaladsl.{Source, Sink}

val source = Source(1 to 100)
val publisher: Publisher[Int] = source.runWith(Sink.asPublisher(fanout = false))

val subscriber: Subscriber[Int] = Source.asSubscriber[Int]
val sink = Sink.fromSubscriber(subscriber)

source.to(Sink.fromSubscriber(new Subscriber[Int] {
  override def onSubscribe(s: Subscription): Unit = s.request(Long.MaxValue)
  override def onNext(t: Int): Unit = println(t)
  override def onError(t: Throwable): Unit = t.printStackTrace()
  override def onComplete(): Unit = println("done")
}))

class RangePublisher(from: Int, to: Int) extends Publisher[Int] {
  override def subscribe(s: Subscriber[_ >: Int]): Unit = {
    val sub = new RangeSubscription(from, to, s)
    s.onSubscribe(sub)
  }
}

class RangeSubscription(from: Int, to: Int, subscriber: Subscriber[_ >: Int])
  extends Subscription {

  private var current = from
  private var cancelled = false

  override def request(n: Long): Unit = {
    var requested = n
    while (requested > 0 && current <= to && !cancelled) {
      subscriber.onNext(current)
      current += 1
      requested -= 1
    }
    if (current > to && !cancelled) {
      subscriber.onComplete()
    }
  }

  override def cancel(): Unit = { cancelled = true }
}
```

## Alpakka Connectors

### Alpakka Kafka

```scala
import akka.kafka.{ConsumerSettings, ProducerSettings, Subscriptions}
import akka.kafka.scaladsl.{Consumer, Producer, Committer}
import akka.kafka.CommitterSettings
import org.apache.kafka.common.serialization.{StringDeserializer, StringSerializer}
import org.apache.kafka.clients.consumer.ConsumerConfig
import akka.stream.scaladsl.{Source, Flow, Sink}

val producerSettings = ProducerSettings(system, new StringSerializer, new StringSerializer)
  .withBootstrapServers("localhost:9092")

val produce: Source[String, NotUsed] = Source(1 to 100).map(_.toString)
produce
  .map(value => new ProducerRecord[String, String]("topic", value))
  .runWith(Producer.plainSink(producerSettings))

val consumerSettings = ConsumerSettings(system, new StringDeserializer, new StringDeserializer)
  .withBootstrapServers("localhost:9092")
  .withGroupId("group1")
  .withProperty(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")

Consumer
  .committableSource(consumerSettings, Subscriptions.topics("topic"))
  .map { msg =>
    println(s"Received: ${msg.record.value}")
    msg.committableOffset
  }
  .via(Committer.flow(CommitterSettings(system)))
  .toMat(Sink.ignore)(Keep.right)
  .run()

val transactionalProducerSettings = producerSettings
  .withTransactionalId("transactional-id")

Consumer
  .transactionalSource(consumerSettings, Subscriptions.topics("input"))
  .via(businessFlow)
  .map { msg =>
    ProducerMessage.single(
      new ProducerRecord[String, String]("output", msg),
      msg.partitionOffset
    )
  }
  .via(Producer.flexiFlow(transactionalProducerSettings))
  .to(Committer.sink(CommitterSettings(system)))
  .run()
```

### Alpakka S3

```scala
import akka.stream.alpakka.s3.scaladsl.S3
import akka.stream.alpakka.s3.{S3Settings, AccessStyle}
import akka.stream.scaladsl.{Source, Sink}
import akka.util.ByteString
import akka.{Done, NotUsed}

val fileSource: Source[ByteString, _] = FileIO.fromPath(Paths.get("file.pdf"))
val s3Sink: Sink[ByteString, Future[MultipartUploadResult]] =
  S3.multipartUpload("bucket", "path/file.pdf")

fileSource.runWith(s3Sink)

val download: Source[ByteString, Future[Option[(Source[ByteString, NotUsed], ObjectMetadata)]]] =
  S3.download("bucket", "path/file.pdf")

download.flatMapConcat {
  case Some((source, metadata)) =>
    source.to(FileIO.toPath(Paths.get("downloaded.pdf")))
  case None =>
    Source.single(ByteString.empty)
}

val listing: Source[S3Object, NotUsed] =
  S3.listBucket("bucket", Some("prefix/"))

listing.runForeach(obj => println(s"${obj.key} - ${obj.size} bytes"))

S3.deleteObject("bucket", "path/file.pdf")
```

### Alpakka SQS

```scala
import akka.stream.alpakka.sqs.scaladsl.{SqsSink, SqsSource}
import akka.stream.alpakka.sqs.{SqsSourceSettings, MessageAction}
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.sqs.SqsAsyncClient

implicit val sqsClient: SqsAsyncClient = SqsAsyncClient.builder()
  .region(Region.US_EAST_1)
  .build()

val queueUrl = "https://sqs.us-east-1.amazonaws.com/12345/my-queue"

SqsSource(queueUrl, SqsSourceSettings().withMaxBufferSize(100))
  .map { message =>
    println(s"Received: ${message.body}")
    MessageAction.Delete(message)
  }
  .runWith(SqsSink(queueUrl))

Source(1 to 100)
  .map(_.toString)
  .runWith(SqsSink.messageSink(queueUrl))
```

### Alpakka File Connector

```scala
import akka.stream.alpakka.file.scaladsl.{Directory, LogRotatorSink}
import akka.stream.alpakka.file.{ArchiveZip, TarArchive, GzipCompression}
import akka.stream.scaladsl.{FileIO, Source, Sink, Flow}
import akka.util.ByteString

val tailSource: Source[ByteString, _] =
  FileIO.fromPath(Paths.get("app.log"), chunkSize = 8192)

Directory
  .changes(Paths.get("./uploads"))
  .runForeach(path => println(s"File changed: $path"))

val files = Seq(
  (Paths.get("file1.txt"), "file1.txt"),
  (Paths.get("file2.txt"), "file2.txt")
)

Source(files)
  .flatMapConcat { case (path, entryName) =>
    FileIO.fromPath(path).map { byteString =>
      (ArchiveZip.FileMetadata(entryName), byteString)
    }
  }
  .via(ArchiveZip.zip())
  .runWith(FileIO.toPath(Paths.get("archive.zip")))
```

## FS2 (Functional Streams)

### Stream, Pipe, Pull

```scala
import fs2.{Stream, Pipe, Pull, Pure, Chunk}
import cats.effect.{IO, IOApp}
import scala.concurrent.duration._

val stream: Stream[Pure, Int] = Stream(1, 2, 3)
val emitted: Stream[Pure, Int] = Stream.emit(42)
val ranged: Stream[Pure, Int] = Stream.range(0, 100)
val repeated: Stream[Pure, Int] = Stream.constant(1)
val iterated: Stream[Pure, Int] = Stream.iterate(0)(_ + 1)
val unfolded: Stream[Pure, Int] = Stream.unfold(0)(s => Some((s, s + 1)))

val effectful: Stream[IO, String] = Stream.eval(IO { println("running"); "data" })
val evalSeq: Stream[IO, Int] = Stream.evalSeq(IO { List(1, 2, 3) })
val resource: Stream[IO, String] = Stream.bracket(IO {
  new java.io.FileInputStream("data.txt")
})(is => IO(is.close())).flatMap { is =>
  Stream.eval(IO { new String(is.readAllBytes()) })
}

val double: Pipe[Pure, Int, Int] = _.map(_ * 2)
val even: Pipe[Pure, Int, Int] = _.filter(_ % 2 == 0)
val take5: Pipe[Pure, Int, Int] = _.take(5)

val chunked: Stream[Pure, Int] = Stream.chunk(Chunk(1, 2, 3))
val reChunked: Stream[Pure, Int] = stream.rechunkRandomlyWithSeed(0.5)(42)
```

### FS2 Concurrency

```scala
import fs2.{Stream, Pipe}
import cats.effect.{IO, ContextShift, Timer}
import cats.effect.concurrent.{Ref, Signal, Queue, Topic}
import scala.concurrent.duration._

implicit val cs: ContextShift[IO] = IO.contextShift(global)
implicit val timer: Timer[IO] = IO.timer(global)

val s1: Stream[IO, Int] = Stream.iterate(0)(_ + 1).metered(1.second)
val s2: Stream[IO, Int] = Stream.iterate(100)(_ + 1).metered(500.millis)

val merged: Stream[IO, Int] = s1.merge(s2)
merged.take(10).compile.toList

val streams: Stream[IO, Stream[IO, Int]] = Stream(
  Stream(1, 2, 3),
  Stream(4, 5, 6),
  Stream(7, 8, 9)
)
val joined: Stream[IO, Int] = streams.parJoin(maxOpen = 2)

val signal: Stream[IO, Boolean] = Stream.sleep(5.seconds) ++ Stream.emit(true)
val main: Stream[IO, Int] = Stream.iterate(0)(_ + 1).metered(100.millis)

val interrupted: Stream[IO, Int] = main.interruptWhen(signal)

val data: Stream[IO, Int] = Stream(1, 2, 3).covary[IO]
val heartbeat: Stream[IO, Nothing] = Stream
  .fixedRate[IO](1.second)
  .as(Nothing)

data.concurrently(heartbeat)

val queueProgram: IO[Vector[Int]] = for {
  q <- Queue.bounded[IO, Int](10)
  _ <- Stream(
    Stream.evalSeq(IO { List(1, 2, 3) }).through(q.enqueue),
    q.dequeue.through(calculatedSink)
  ).parJoin(2).compile.drain
} yield ()

val topicProgram: IO[Unit] = Topic[IO, Int].flatMap { topic =>
  val publisher = Stream.range(0, 100).covary[IO].through(topic.publish)
  val subscriber1 = topic.subscribe(10).map(n => s"sub1: $n")
  val subscriber2 = topic.subscribe(10).map(n => s"sub2: $n")
  publisher.merge(subscriber1).merge(subscriber2).compile.drain
}
```

### FS2 Resource Safety

```scala
import fs2.Stream
import cats.effect.{IO, Resource}

def openFile(path: String): Resource[IO, java.io.RandomAccessFile] =
  Resource.make(
    IO { new java.io.RandomAccessFile(path, "r") }
  )(file => IO { file.close() })

val fileStream: Stream[IO, Byte] = Stream.resource(openFile("data.bin"))
  .flatMap { file =>
    Stream.eval(IO {
      val buf = new Array[Byte](1024)
      val bytesRead = file.read(buf)
      if (bytesRead == -1) None
      else Some(Chunk.bytes(buf, 0, bytesRead))
    }).unNoneTerminate.flatMap(Stream.chunk)
  }

val bracketed: Stream[IO, Int] = Stream.bracket(IO {
  println("acquire")
  42
})(a => IO(println("release"))).flatMap(Stream.emit)

val finalized: Stream[IO, Int] = Stream(1, 2, 3).onFinalize(IO(println("done")))

val safe: Stream[IO, Int] = Stream.eval(IO(throw new Exception("boom")))
  .handleErrorWith(_ => Stream(0, -1, -2))
```

## ZIO Streams

### ZStream, ZSink, ZPipeline

```scala
import zio._
import zio.stream._
import zio.clock.Clock
import scala.concurrent.duration._

val stream: ZStream[Any, Nothing, Int] = ZStream(1, 2, 3)
val ranged: ZStream[Any, Nothing, Int] = ZStream.range(0, 100)
val repeated: ZStream[Any, Nothing, Int] = ZStream.repeat(42)
val iterated: ZStream[Any, Nothing, Int] = ZStream.iterate(0)(_ + 1)
val fromIterable: ZStream[Any, Nothing, Int] = ZStream.fromIterable(1 to 1000)

val effectful: ZStream[Any, Throwable, String] = ZStream.fromEffect(
  Task { scala.io.Source.fromFile("data.txt").getLines().toList }
).flatMap(ZStream.fromIterable)

val sumSink: ZSink[Any, Nothing, Int, Int, Int] = ZSink.sum[Int]
val collectSink: ZSink[Any, Nothing, Int, Nothing, Chunk[Int]] = ZSink.collectAll[Int]
val headSink: ZSink[Any, Nothing, Int, Int, Option[Int]] = ZSink.head[Int]
val foldSink: ZSink[Any, Nothing, Int, Nothing, Int] = ZSink.foldLeft[Int, Int](0)(_ + _)
val foreachSink: ZSink[Any, Nothing, Int, Nothing, Unit] = ZSink.foreach(println)

val double: ZPipeline[Any, Nothing, Int, Int] = ZPipeline.map(_ * 2)
val filterEven: ZPipeline[Any, Nothing, Int, Int] = ZPipeline.filter(_ % 2 == 0)
val take10: ZPipeline[Any, Nothing, Int, Int] = ZPipeline.take(10)
val grouped: ZPipeline[Any, Nothing, Int, Chunk[Int]] = ZPipeline.grouped(5)

val result: ZIO[Any, Throwable, Long] = ZStream(1 to 100)
  .via(double)
  .via(filterEven)
  .run(ZSink.sum[Int])

val transduced: ZIO[Any, Nothing, Chunk[Chunk[Int]]] = ZStream(1 to 20)
  .transduce(ZPipeline.grouped(5))
  .runCollect
```

### ZIO Streams Concurrency

```scala
import zio._
import zio.stream._
import zio.clock.Clock
import zio.duration._

val s1: ZStream[Any, Nothing, Int] = ZStream.iterate(0)(_ + 1).schedule(Schedule.spaced(1.second))
val s2: ZStream[Any, Nothing, Int] = ZStream.iterate(100)(_ + 1).schedule(Schedule.spaced(500.millis))

val merged: ZStream[Any, Nothing, Int] = s1.merge(s2)
merged.take(10).runCollect

val streams: Chunk[ZStream[Any, Nothing, Int]] = Chunk(
  ZStream(1, 2, 3),
  ZStream(4, 5, 6),
  ZStream(7, 8, 9)
)
val allMerged: ZStream[Any, Nothing, Int] = ZStream.mergeAll(streams)(2)

val interruptSignal: ZStream[Any, Nothing, Unit] =
  ZStream.schedule(Schedule.duration(5.seconds)).unit
val mainStream: ZStream[Any, Nothing, Int] =
  ZStream.iterate(0)(_ + 1).schedule(Schedule.spaced(100.millis))

val interrupted: ZStream[Any, Nothing, Int] =
  mainStream.interruptWhen(interruptSignal)

val throttled: ZStream[Any, Nothing, Int] = ZStream(1, 2, 3).schedule(
  Schedule.spaced(1.second)
).flatMap(ZStream.fromIterable)

val broadcastProgram: ZIO[Any, Throwable, Unit] = ZStream(1 to 10).broadcast(2, 100).use {
  case Chunk(left, right) =>
    for {
      f1 <- left.runCollect.fork
      f2 <- right.run(Sink.foreach(println)).fork
      _ <- f1.join *> f2.join
    } yield ()
}
```

## Reactive Kafka

### Alpakka Kafka Consumer/Producer

```scala
import akka.kafka.{ConsumerSettings, ProducerSettings, Subscriptions, CommitterSettings}
import akka.kafka.scaladsl.{Consumer, Producer, Committer, Transactional}
import akka.kafka.scaladsl.Consumer.{Control, DrainingControl}
import akka.Done
import akka.stream.scaladsl.{Flow, Sink, Source, Keep}
import akka.stream.Materializer
import org.apache.kafka.common.serialization._
import org.apache.kafka.clients.consumer.ConsumerConfig

class KafkaStreamingService @Inject()(
  system: ActorSystem
)(implicit mat: Materializer, ec: ExecutionContext) {

  private val consumerSettings = ConsumerSettings(system, new StringDeserializer, new StringDeserializer)
    .withBootstrapServers("localhost:9092")
    .withGroupId("order-service")
    .withProperty(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")
    .withProperty(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false")
    .withStopTimeout(30.seconds)

  private val producerSettings = ProducerSettings(system, new StringSerializer, new StringSerializer)
    .withBootstrapServers("localhost:9092")

  def processOrders(inputTopic: String, outputTopic: String): Source[Done, Control] = {
    Consumer
      .committableSource(consumerSettings, Subscriptions.topics(inputTopic))
      .mapAsync(10) { msg =>
        processOrder(msg.record.value()).map { result =>
          (result, msg.committableOffset)
        }
      }
      .map { case (result, offset) =>
        ProducerMessage.single(
          new ProducerRecord(outputTopic, result),
          passThrough = offset
        )
      }
      .via(Producer.flexiFlow(producerSettings))
      .map(_.passThrough)
      .via(Committer.flow(CommitterSettings(system)))
      .toMat(Sink.ignore)(Keep.left)
  }

  def consumePartition(topic: String, partition: Int): Source[String, Control] = {
    Consumer
      .plainSource(
        consumerSettings,
        Subscriptions.assignment(new TopicPartition(topic, partition))
      )
      .map(_.value())
  }

  val drainingControl: DrainingControl[Done] =
    Consumer
      .committableSource(consumerSettings, Subscriptions.topics("topic"))
      .mapAsync(1)(processMessage)
      .toMat(Sink.ignore)(Keep.both)
      .mapMaterializedValue(DrainingControl.apply)
      .run()
}
```

### FS2 Kafka

```scala
import fs2.kafka._
import cats.effect.{IO, IOApp}
import fs2.Stream

val consumerSettings = ConsumerSettings[IO, String, String]
  .withBootstrapServers("localhost:9092")
  .withGroupId("order-service")
  .withAutoOffsetReset(AutoOffsetReset.Earliest)
  .withEnableAutoCommit(false)

val consumerStream: Stream[IO, Unit] =
  KafkaConsumer.stream(consumerSettings)
    .evalTap(_.subscribeTo("orders"))
    .flatMap(_.stream)
    .mapAsync(25) { committable =>
      processOrder(committable.record.value).as(committable.offset)
    }
    .through(commitBatchWithin(100, 5.seconds))

val producerSettings = ProducerSettings[IO, String, String]
  .withBootstrapServers("localhost:9092")

val produceStream: Stream[IO, Unit] =
  KafkaProducer.stream(producerSettings)
    .flatMap { producer =>
      Stream(1 to 100).flatMap { range =>
        Stream.emits(range.toList).map { n =>
          ProducerRecords.one(ProducerRecord("topic", n.toString))
        }
      }.through(producer.pipe)
    }
```

### ZIO Kafka

```scala
import zio.kafka.consumer.{Consumer, ConsumerSettings, Subscription}
import zio.kafka.producer.{Producer, ProducerSettings}
import zio.kafka.serde.{Serde, Deserializer, Serializer}
import zio._
import zio.stream._

val consumerSettings = ConsumerSettings(List("localhost:9092"))
  .withGroupId("order-service")

val producerSettings = ProducerSettings(List("localhost:9092"))

val consumerStream: ZStream[Any, Throwable, CommittableRecord[String, String]] =
  Consumer.plainStream(
    Subscription.topics("orders"),
    Serde.string, Serde.string
  ).provideSomeLayer(Consumer.live(consumerSettings))

val processAndProduce: ZIO[Any, Throwable, Unit] =
  consumerStream
    .mapAsync(10) { record =>
      processOrder(record.value)
        .as(record.committableOffset)
    }
    .aggregateAsync(Committer.offsetBatches)
    .mapM(_.commit)
    .runDrain
```

## Streaming File I/O

```scala
import akka.stream.scaladsl.{FileIO, Source, Sink, Flow}
import akka.stream.{IOResult, Materializer}
import akka.util.ByteString
import java.nio.file.{Path, Paths, StandardOpenOption}
import scala.concurrent.Future

class LargeFileProcessor(implicit mat: Materializer) {

  def processLargeFile(input: Path, output: Path): Future[IOResult] = {
    FileIO.fromPath(input, chunkSize = 65536)
      .via(transformChunks)
      .runWith(FileIO.toPath(output, Set(
        StandardOpenOption.CREATE,
        StandardOpenOption.WRITE,
        StandardOpenOption.TRUNCATE_EXISTING
      )))
  }

  private val transformChunks: Flow[ByteString, ByteString, NotUsed] =
    Flow[ByteString].map { chunk =>
      ByteString(chunk.utf8String.toUpperCase)
    }

  def processLines(input: Path): Future[Seq[String]] = {
    FileIO.fromPath(input)
      .via(Framing.delimiter(
        ByteString("\n"),
        maximumFrameLength = 8192,
        allowTruncation = true
      ))
      .map(_.utf8String)
      .filter(_.nonEmpty)
      .runWith(Sink.seq)
  }

  def readLastLines(file: Path, n: Int): Future[Seq[String]] = {
    FileIO.fromPath(file)
      .via(Framing.delimiter(ByteString("\n"), 8192, true))
      .map(_.utf8String)
      .buffer(1000, OverflowStrategy.dropHead)
      .runWith(Sink.seq)
      .map(_.takeRight(n))
  }
}
```

## HTTP Streaming

### Akka HTTP Streaming

```scala
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.model.{HttpEntity, ContentTypes, StatusCodes}
import akka.stream.scaladsl.{Source, FileIO}
import akka.util.ByteString
import scala.concurrent.duration._

class AkkaHttpStreamingRoute {

  val route =
    path("stream") {
      get {
        val numbers = Source(1 to 1000)
          .throttle(10, 1.second)
          .map(n => ByteString(s"$n\n"))

        complete(HttpEntity(ContentTypes.`text/plain(UTF-8)`, numbers))
      }
    } ~
    path("download" / Remaining) { fileName =>
      get {
        val filePath = java.nio.file.Paths.get(s"/data/$fileName")
        if (filePath.toFile.exists()) {
          val fileSource = FileIO.fromPath(filePath, chunkSize = 65536)
          complete(HttpEntity(ContentTypes.`application/octet-stream`, fileSource))
        } else {
          complete(StatusCodes.NotFound)
        }
      }
    }
}
```

### Play Streaming

```scala
import akka.stream.scaladsl.{Source, FileIO, StreamConverters}
import akka.util.ByteString
import play.api.mvc._
import java.nio.file.Paths
import scala.concurrent.duration._

class PlayStreamingController @Inject()(
  cc: ControllerComponents
)(implicit mat: Materializer) extends AbstractController(cc) {

  def streamLargeFile(fileName: String) = Action {
    val path = Paths.get(s"/data/$fileName")
    if (path.toFile.exists()) {
      Result(
        header = ResponseHeader(OK, Map(
          "Content-Disposition" -> s"""attachment; filename="$fileName""""
        )),
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

  def streamNDJson = Action.async {
    orderService.streamAll().map { source =>
      Ok.chunked(
        source
          .throttle(100, 1.second)
          .map(order => ByteString(Json.toJson(order).toString + "\n"))
      ).as("application/x-ndjson")
    }
  }

  def streamCSV = Action {
    val header = ByteString("id,name,email\n")
    val data = Source(1 to 10000)
      .map(i => ByteString(s"$i,user$i@example.com\n"))

    Ok.chunked(Source.single(header).concat(data))
      .as("text/csv")
      .withHeaders("Content-Disposition" -> "attachment; filename=users.csv")
  }
}
```

### Chunked Transfer Encoding

```scala
import akka.stream.scaladsl.Source
import akka.util.ByteString
import play.api.mvc._
import scala.concurrent.duration._

class ChunkedController @Inject()(
  cc: ControllerComponents
)(implicit mat: Materializer) extends AbstractController(cc) {

  def generateReport = Action {
    val chunks: Source[ByteString, _] = Source
      .single(ByteString("Report header\n"))
      .concat(Source(1 to 1000)
        .throttle(50, 1.second)
        .map(i => ByteString(s"Line $i: ${generateLine(i)}\n"))
      )
      .concat(Source.single(ByteString("Report footer\n")))

    Ok.chunked(chunks).as("text/plain")
  }

  def streamProgress = Action {
    val progress = Source
      .tick(0.seconds, 1.second, ())
      .scan(0)((acc, _) => acc + 1)
      .take(101)
      .map(p => ByteString(s"{\"progress\": $p}\n"))

    Ok.chunked(progress).as("application/x-ndjson")
  }
}
```

## WebSocket Streaming

### Akka HTTP WebSockets

```scala
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.model.ws.{Message, TextMessage, BinaryMessage}
import akka.stream.scaladsl.{Flow, Source, Sink}
import akka.stream.{OverflowStrategy, Materializer}
import scala.concurrent.duration._

class AkkaWebSocketHandler {

  val echoWebSocket: Flow[Message, Message, Any] =
    Flow[Message].map {
      case TextMessage.Strict(text) => TextMessage.Strict(s"Echo: $text")
      case TextMessage.Streamed(textStream) =>
        TextMessage.Streamed(textStream)
      case bm: BinaryMessage =>
        bm.dataStream.runWith(Sink.ignore)
        TextMessage.Strict("Binary not supported")
    }

  val chatWebSocket: Flow[Message, Message, Any] = {
    val inbound: Sink[Message, _] = Flow[Message]
      .mapConcat {
        case tm: TextMessage => tm.textStream.toList.map(_.toLowerCase)
        case _ => Nil
      }
      .to(Sink.foreach(println))

    val outbound: Source[Message, _] =
      Source.tick(1.second, 1.second, "ping")
        .map(TextMessage.Strict)

    Flow.fromSinkAndSource(inbound, outbound)
  }

  val route =
    path("ws" / "echo") {
      get {
        handleWebSocketMessages(echoWebSocket)
      }
    } ~
    path("ws" / "chat") {
      handleWebSocketMessages(chatWebSocket)
    }
}
```

### Play WebSockets

```scala
import akka.stream.scaladsl.{Flow, Sink, Source, BroadcastHub, MergeHub}
import play.api.mvc._
import play.api.libs.json._
import scala.concurrent.duration._

class PlayWebSocketController @Inject()(
  cc: ControllerComponents
)(implicit mat: Materializer, ec: ExecutionContext) extends AbstractController(cc) {

  def echo: WebSocket = WebSocket.accept[String, String] { _ =>
    Flow[String].map(msg => s"Echo: $msg")
  }

  def jsonWs: WebSocket = WebSocket.accept[JsValue, JsValue] { _ =>
    Flow[JsValue].map { json =>
      Json.obj(
        "type" -> "response",
        "data" -> json,
        "timestamp" -> System.currentTimeMillis()
      )
    }
  }

  def authenticatedWs: WebSocket = WebSocket.acceptOrResult[String, String] { request =>
    request.headers.get("Authorization") match {
      case Some(token) if token.startsWith("Bearer ") =>
        validateToken(token.drop(7)).map {
          case Some(user) => Right(createUserFlow(user))
          case None => Left(Forbidden(Json.obj("error" -> "Invalid token")))
        }
      case _ => Future.successful(
        Left(Unauthorized(Json.obj("error" -> "Missing token")))
      )
    }
  }

  private def createUserFlow(user: User): Flow[String, String, _] = {
    Flow[String].map { msg =>
      s"${user.email}: $msg"
    }
  }

  def chatRoom: WebSocket = WebSocket.accept[String, String] { _ =>
    val (hubSink, hubSource) = MergeHub.source[String]
      .toMat(BroadcastHub.sink[String])(Keep.both).run()

    val inbound = Flow[String].map { msg =>
      println(s"Chat received: $msg")
      msg
    }.to(hubSink)

    val outbound = hubSource

    Flow.fromSinkAndSource(inbound, outbound)
  }
}
```

### GraphQL Subscriptions

```scala
import akka.stream.scaladsl.{Source, Flow, Sink}
import sangria.streaming.akkaStreams._
import scala.concurrent.duration._

class GraphQLSubscriptionController @Inject()(
  cc: ControllerComponents
)(implicit mat: Materializer) extends AbstractController(cc) {

  def subscribe: WebSocket = WebSocket.accept[String, String] { _ =>
    Flow[String]
      .mapAsync(1) { query =>
        executeSubscription(query)
      }
      .flatMapConcat(identity)
      .recover {
        case e: Exception => s"Error: ${e.getMessage}"
      }
  }

  private def executeSubscription(query: String): Future[Source[String, _]] = {
    Future.successful(
      Source.tick(1.second, 1.second, "update")
        .map(_ => """{"data": {"orderUpdated": {"id": "1", "status": "shipped"}}}""")
    )
  }
}
```

## Rate Limiting and Throttling

```scala
import akka.stream.ThrottleMode
import akka.stream.scaladsl.{Source, Flow, Sink}
import scala.concurrent.duration._
import java.time.Instant

class RateLimitedProcessor(implicit mat: Materializer) {

  def throttledStream: Source[Int, _] = {
    Source(1 to 10000)
      .throttle(
        elements = 100,
        per = 1.second,
        maximumBurst = 10,
        mode = ThrottleMode.Shaping
      )
  }

  def perUserThrottle(userId: String): Flow[Int, Int, _] = {
    val quota = getUserQuota(userId)
    Flow[Int].throttle(
      elements = quota,
      per = 1.minute,
      maximumBurst = quota / 10,
      mode = ThrottleMode.Shaping
    )
  }

  def slidingWindowThrottle(windowSize: Int, windowDuration: FiniteDuration): Flow[Int, Int, _] = {
    Flow[Int].statefulMapConcat { () =>
      val window = scala.collection.mutable.Queue.empty[(Instant, Int)]

      { element =>
        val now = Instant.now()
        while (window.nonEmpty && window.head._1.isBefore(now.minusNanos(windowDuration.toNanos))) {
          window.dequeue()
        }
        val currentCount = window.map(_._2).sum
        if (currentCount < windowSize) {
          window.enqueue((now, 1))
          element :: Nil
        } else {
          Nil // drop
        }
      }
    }
  }

  def tokenBucketFlow(capacity: Int, refillRate: Int, refillPeriod: FiniteDuration): Flow[Int, Int, _] = {
    Flow[Int].mapAsync(1) { element =>
      tokenBucket.acquire(capacity, refillRate, refillPeriod).map(_ => element)
    }
  }
}
```

## Testing Streaming Applications

### Akka Streams TestKit

```scala
import akka.stream.scaladsl.{Source, Flow, Sink}
import akka.stream.testkit.scaladsl.{TestSink, TestSource}
import akka.stream.testkit.TestSubscriber
import akka.testkit.TestKit
import akka.actor.ActorSystem
import org.scalatest.BeforeAndAfterAll
import scala.concurrent.duration._

class StreamTestSpec
  extends TestKit(ActorSystem("StreamTest"))
  with WordSpecLike
  with BeforeAndAfterAll {

  "A stream" should {
    "process elements correctly" in {
      val sourceUnderTest = Source(1 to 10).map(_ * 2)

      sourceUnderTest
        .runWith(TestSink[Int]())
        .request(5)
        .expectNext(2, 4, 6, 8, 10)
        .expectNoMessage(100.millis)
        .request(5)
        .expectNext(12, 14, 16, 18, 20)
        .expectComplete()
    }

    "handle errors with supervision" in {
      val source = Source(1 to 5)
        .map(n => if (n == 3) throw new RuntimeException else n)

      source
        .withAttributes(ActorAttributes.supervisionStrategy(Supervision.Resume))
        .runWith(TestSink[Int]())
        .request(5)
        .expectNext(1, 2, 4, 5)
        .expectComplete()
    }

    "backpressure correctly" in {
      val (pub, sub) = TestSource.probe[Int]
        .toMat(TestSink[Int]())(Keep.both)
        .run()

      sub.request(2)
      pub.sendNext(1)
      pub.sendNext(2)
      sub.expectNext(1, 2)
      pub.sendComplete()
      sub.expectComplete()
    }
  }

  override def afterAll(): Unit = {
    TestKit.shutdownActorSystem(system)
  }
}
```

### Test Probes

```scala
import akka.stream.testkit.TestPublisher
import akka.stream.testkit.TestSubscriber
import akka.stream.scaladsl.{Source, Flow, Sink}

class StreamProbeTest extends PlaySpec {

  "Stream" should {
    "allow manual element injection" in {
      val flowUnderTest = Flow[Int].map(_ * 3).filter(_ > 10)

      val (pub, sub) = TestSource.probe[Int]
        .via(flowUnderTest)
        .toMat(TestSink.probe[Int])(Keep.both)
        .run()

      sub.request(2)
      pub.sendNext(5)  // 15
      pub.sendNext(2)  // 6 (filtered out)
      pub.sendNext(4)  // 12
      sub.expectNext(15)
      sub.expectNext(12)
      pub.sendComplete()
      sub.expectComplete()
    }
  }
}
```

### Virtual Time

```scala
import akka.testkit.TestKit
import akka.actor.ActorSystem
import akka.stream.testkit.scaladsl.TestSink
import akka.stream.scaladsl.Source
import akka.testkit.TestProbe
import scala.concurrent.duration._

class VirtualTimeTest
  extends TestKit(ActorSystem("VirtualTimeTest"))
  with WordSpecLike {

  "Virtual time" should {
    "accelerate time-based streams" in {
      val source = Source
        .tick(1.second, 1.second, "tick")
        .take(3)

      source
        .runWith(TestSink[String]())
        .request(3)
        .expectNext("tick", "tick", "tick")
    }

    "test throttled stream without real waiting" in {
      val throttled = Source(1 to 5)
        .throttle(1, 1.hour, 0, ThrottleMode.Shaping)

      throttled
        .runWith(TestSink[Int]())
        .request(5)
        .expectNext(1)
        .expectNoMessage(100.millis)
    }
  }
}
```

## Integration Patterns

### Pipes-and-Filters

```scala
import akka.stream.scaladsl.{Flow, Source, Sink}
import akka.NotUsed

class PipesAndFilters {

  type Filter[A, B] = Flow[A, B, NotUsed]

  val validateOrder: Filter[Order, ValidatedOrder] =
    Flow[Order].map { order =>
      if (order.items.isEmpty) throw new ValidationException("Empty order")
      else ValidatedOrder(order)
    }

  val enrichWithCustomer: Filter[ValidatedOrder, EnrichedOrder] =
    Flow[ValidatedOrder].mapAsync(4) { order =>
      customerService.findById(order.customerId).map { customer =>
        EnrichedOrder(order, customer)
      }
    }

  val calculateTotals: Filter[EnrichedOrder, PricedOrder] =
    Flow[EnrichedOrder].map { enriched =>
      val total = enriched.order.items.map(i => i.quantity * i.unitPrice).sum
      PricedOrder(enriched, total)
    }

  val applyDiscounts: Filter[PricedOrder, FinalOrder] =
    Flow[PricedOrder].map { priced =>
      val discount = if (priced.total > 100) priced.total * 0.1 else BigDecimal(0)
      FinalOrder(priced, priced.total - discount)
    }

  val notifyCustomer: Filter[FinalOrder, FinalOrder] =
    Flow[FinalOrder].mapAsync(1) { order =>
      notificationService.sendConfirmation(order.customer.email, order)
        .map(_ => order)
    }

  val orderPipeline: Flow[Order, FinalOrder, NotUsed] =
    validateOrder
      .via(enrichWithCustomer)
      .via(calculateTotals)
      .via(applyDiscounts)
      .via(notifyCustomer)
}
```

### CQRS / Event Sourcing

```scala
import akka.stream.scaladsl.{Source, Flow, Sink}
import akka.persistence.query.{EventEnvelope, PersistenceQuery}
import akka.persistence.query.scaladsl.{EventsByTagQuery, CurrentEventsByTagQuery}
import akka.NotUsed

class CQRSEventStream @Inject()(
  system: ActorSystem
)(implicit mat: Materializer) {

  private val readJournal = PersistenceQuery(system)
    .readJournalFor[EventsByTagQuery]("akka.persistence.query.journal.leveldb")

  def eventStream(tag: String): Source[EventEnvelope, NotUsed] =
    readJournal.eventsByTag(tag, offset = Sequence(0))

  def currentEvents(tag: String): Source[EventEnvelope, NotUsed] =
    readJournal.currentEventsByTag(tag, offset = Sequence(0))

  class OrderProjection {
    val eventHandler: Flow[EventEnvelope, ProjectionUpdate, NotUsed] =
      Flow[EventEnvelope].mapAsync(1) { envelope =>
        envelope.event match {
          case OrderCreated(order) =>
            db.run(ordersTable += order).map(_ => OrderInserted(envelope.persistenceId))
          case OrderShipped(orderId, tracking) =>
            db.run(ordersTable.filter(_.id === orderId)
              .map(_.tracking).update(Some(tracking)))
              .map(_ => TrackingUpdated(orderId, tracking))
          case OrderCancelled(orderId, reason) =>
            db.run(ordersTable.filter(_.id === orderId)
              .map(_.status).update("cancelled"))
              .map(_ => OrderCancelledUpdate(orderId))
        }
      }
  }
}
```

### Event-Driven Architecture

```scala
import akka.stream.scaladsl.{Source, Flow, Sink, MergeHub, BroadcastHub, Keep}

class EventBus(implicit mat: Materializer) {

  private val (sink, source) = MergeHub.source[Event]
    .toMat(BroadcastHub.sink[Event])(Keep.both)
    .run()

  def publish(event: Event): Unit = {
    Source.single(event).runWith(sink)
  }

  def subscribe(): Source[Event, _] = source

  def filteredSubscription(eventType: Class[_]): Source[Event, _] =
    source.filter(eventType.isInstance)
}

class EventDrivenService @Inject()(
  eventBus: EventBus
)(implicit mat: Materializer) {

  eventBus.subscribe()
    .collect { case e: OrderEvent => e }
    .filter(_.status == "shipped")
    .mapAsync(4) { event =>
      notificationService.sendShippingNotification(event)
    }
    .to(Sink.ignore)
    .run()

  eventBus.subscribe()
    .collect { case e: AuditEvent => e }
    .mapAsync(1) { event =>
      auditService.log(event)
    }
    .to(Sink.ignore)
    .run()
}
```

## Performance Considerations

```scala
// Parallelism
import akka.stream.scaladsl.{Flow, Source, Sink}

// mapAsync — controlled parallelism
val parallelFlow: Flow[Int, Int, _] = Flow[Int]
  .mapAsync(parallelism = 8) { n =>
    expensiveComputation(n)
  }

// unordered for out-of-order results (faster)
val unorderedFlow: Flow[Int, Int, _] = Flow[Int]
  .mapAsyncUnordered(8)(expensiveComputation)

// Buffering
val buffered: Flow[Int, Int, _] = Flow[Int]
  .buffer(1000, OverflowStrategy.backpressure)

// Fusion — Akka automatically fuses stages
// Disable fusion for debugging: akka.stream.materializer.auto-fusing = off

// Asynchronous boundaries (break fusion for CPU-bound stages)
import akka.stream.Attributes
val asyncFlow: Flow[Int, Int, _] = Flow[Int]
  .map(_ * 2)
  .async
  .map(_.toString)
  .async

// Dispatcher configuration
val blockingFlow: Flow[Int, Int, _] = Flow[Int]
  .mapAsync(1) { n =>
    Future {
      blocking { jdbcQuery(n) }
    }(blockingEc)
  }

// Stream materialization settings
import akka.stream.{ActorMaterializerSettings, Supervision}

val settings = ActorMaterializerSettings(system)
  .withSupervisionStrategy(Supervision.resumingDecider)
  .withInputBuffer(initialSize = 64, maxSize = 64)
  .withFuzzing(false)

implicit val mat: Materializer = system.materializer

// Materialization cost — prefer reusing RunnableGraphs
val graph = Source(1 to 100).toMat(Sink.seq)(Keep.right)
val result1: Future[Seq[Int]] = graph.run()
val result2: Future[Seq[Int]] = graph.run()  // reuse
```
