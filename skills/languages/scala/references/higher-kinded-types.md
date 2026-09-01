# Scala: Higher-Kinded Types (HKT) and Type Classes

## 1. Beyond Standard Generics
Most languages (Java, C#, TypeScript) support standard generics like `List<T>`. You can abstract over the *inner* type (`T`).
But what if you want to abstract over the *container itself*?

For example, what if you want to write a function that maps over *any* container (a List, an Option, a Future) without caring what the container is? Standard languages cannot do this. **Scala can, using Higher-Kinded Types (HKT)**.

## 2. Higher-Kinded Types syntax: `F[_]`
An HKT is a type that takes another type as a parameter. In Scala, it is denoted as `F[_]`.

```scala
import scala.language.higherKinds

// A Type Class defining the 'Functor' design pattern
// F[_] represents ANY container (e.g., List, Option, Future)
trait Functor[F[_]] {
  def map[A, B](fa: F[A])(f: A => B): F[B]
}
```

## 3. The Functor Pattern (Type Class)
Instead of relying on OOP inheritance (`class List extends Functor`), Scala uses **Type Classes**. We provide implementations of the Functor for specific containers using `given` (Scala 3) or `implicit` (Scala 2).

```scala
// Provide evidence that Option is a Functor
given optionFunctor: Functor[Option] with
  def map[A, B](fa: Option[A])(f: A => B): Option[B] = fa match {
    case Some(a) => Some(f(a))
    case None    => None
  }

// Provide evidence that List is a Functor
given listFunctor: Functor[List] with
  def map[A, B](fa: List[A])(f: A => B): List[B] = fa.map(f)
```

## 4. The Ultimate Generic Function
Now we can write a method that operates on *any* container wrapping *any* type!

```scala
// F[_] is the container (e.g., Option)
// F[Int] is the container holding an Int (e.g., Option[Int])
// (using F: Functor[F]) pulls in the Type Class implementation automatically
def incrementAll[F[_]](container: F[Int])(using F: Functor[F]): F[Int] = {
  F.map(container)(x => x + 1)
}

@main def run() = {
  val myOption = Some(10)
  val myList = List(1, 2, 3)

  // The EXACT SAME function works on both Options and Lists!
  println(incrementAll(myOption)) // Output: Some(11)
  println(incrementAll(myList))   // Output: List(2, 3, 4)
}
```
This is the foundation of purely functional architectures (like Cats and Scalaz), allowing architectures to be entirely agnostic of the side-effect context (Sync vs Async, Option vs Either).
