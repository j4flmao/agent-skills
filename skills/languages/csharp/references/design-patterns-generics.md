# Design Patterns with Generics in C#

## 1. The Specification Pattern (Domain-Driven Design)
The Specification pattern encapsulates a business rule into a single, reusable class. Before C# generics, you had to write a specification for every single entity type. With generics, we can chain specifications dynamically.

### Implementation
```csharp
public abstract class Specification<T>
{
    // The core rule
    public abstract Expression<Func<T, bool>> ToExpression();

    public bool IsSatisfiedBy(T entity)
    {
        Func<T, bool> predicate = ToExpression().Compile();
        return predicate(entity);
    }

    // Allows chaining: spec1.And(spec2)
    public Specification<T> And(Specification<T> specification)
    {
        return new AndSpecification<T>(this, specification);
    }
}

// Generic Combinator
public class AndSpecification<T> : Specification<T>
{
    private readonly Specification<T> _left;
    private readonly Specification<T> _right;

    public AndSpecification(Specification<T> left, Specification<T> right)
    {
        _left = left;
        _right = right;
    }

    public override Expression<Func<T, bool>> ToExpression()
    {
        var leftExp = _left.ToExpression();
        var rightExp = _right.ToExpression();
        
        var invokedExpr = Expression.Invoke(rightExp, leftExp.Parameters.Cast<Expression>());
        return Expression.Lambda<Func<T, bool>>(
            Expression.AndAlso(leftExp.Body, invokedExpr), leftExp.Parameters);
    }
}
```

### Usage
```csharp
public class IsActiveUserSpec : Specification<User>
{
    public override Expression<Func<User, bool>> ToExpression() => u => u.IsActive;
}

public class IsPremiumUserSpec : Specification<User>
{
    public override Expression<Func<User, bool>> ToExpression() => u => u.Subscription == "Premium";
}

// Usage in a generic repository
var targetAudienceSpec = new IsActiveUserSpec().And(new IsPremiumUserSpec());
var usersToEmail = userRepository.Find(targetAudienceSpec);
```

## 2. Generic Result/Either Pattern (Monadic Error Handling)
Instead of throwing Exceptions for business logic (which is slow and unpredictable), C# generics allow us to implement the `Result<T, E>` pattern seen in Rust.

```csharp
public class Result<T, E>
{
    public bool IsSuccess { get; }
    public T Value { get; }
    public E Error { get; }

    private Result(T value, E error, bool isSuccess)
    {
        Value = value;
        Error = error;
        IsSuccess = isSuccess;
    }

    public static Result<T, E> Ok(T value) => new Result<T, E>(value, default, true);
    public static Result<T, E> Fail(E error) => new Result<T, E>(default, error, false);

    // Pattern Matching support
    public TOut Match<TOut>(Func<T, TOut> onSuccess, Func<E, TOut> onFailure)
    {
        return IsSuccess ? onSuccess(Value) : onFailure(Error);
    }
}
```
