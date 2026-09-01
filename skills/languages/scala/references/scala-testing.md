# Scala Testing

## 1. ScalaTest Framework
ScalaTest is the most popular testing framework. It supports multiple testing styles (FlatSpec, FunSuite, WordSpec).

```scala
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CalculatorSpec extends AnyFlatSpec with Matchers {
  
  "A Calculator" should "add two numbers correctly" in {
    val result = 2 + 2
    result shouldEqual 4 // Readable Matcher syntax
  }

  it should "throw an exception when dividing by zero" in {
    assertThrows[ArithmeticException] {
      10 / 0
    }
  }
}
```

## 2. Property-Based Testing (ScalaCheck)
Instead of writing 3 or 4 specific test cases (e.g., `add(2, 2)`, `add(-1, 5)`), you write properties that must hold true for *all* inputs, and ScalaCheck generates hundreds of random edge cases.

```scala
import org.scalacheck.Properties
import org.scalacheck.Prop.forAll

object ListProperties extends Properties("List") {

  // The property: Reversing a list twice should yield the original list
  property("doubleReverse") = forAll { (l: List[Int]) =>
    l.reverse.reverse == l
  }
}
```
If this property fails, ScalaCheck will "shrink" the random input to find the absolute minimum failing case (e.g., if `List(1, 400, -23, 0)` fails, it will shrink to find out if `List(1)` or `List.empty` also fails).
