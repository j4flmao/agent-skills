# C# Testing (xUnit & Moq)

## 1. xUnit Framework
xUnit is the modern standard for .NET testing (replacing NUnit and MSTest).
- `[Fact]`: A test that is always true (no parameters).
- `[Theory]` & `[InlineData]`: A data-driven test that runs multiple times with different inputs.

```csharp
using Xunit;

public class MathTests
{
    [Fact]
    public void Add_TwoPositiveNumbers_ReturnsCorrectSum()
    {
        Assert.Equal(4, MathHelper.Add(2, 2));
    }

    [Theory]
    [InlineData(1, 1, 2)]
    [InlineData(-1, -1, -2)]
    [InlineData(100, 200, 300)]
    public void Add_MultipleInputs_ReturnsCorrectSum(int a, int b, int expected)
    {
        Assert.Equal(expected, MathHelper.Add(a, b));
    }
}
```

## 2. Mocking with `Moq`
Moq uses Expression Trees (`() => ...`) to configure mock behavior.

```csharp
using Moq;
using Xunit;

public class UserServiceTests
{
    [Fact]
    public void GetUser_WhenUserExists_ReturnsUser()
    {
        // 1. Arrange
        var mockRepo = new Mock<IUserRepository>();
        
        // Setup the mock to return a specific object when called with ID 1
        mockRepo.Setup(repo => repo.GetByIdAsync(1))
                .ReturnsAsync(new User { Id = 1, Name = "Alice" });

        var service = new UserService(mockRepo.Object);

        // 2. Act
        var result = service.GetUserDetails(1).Result;

        // 3. Assert
        Assert.Equal("Alice", result.Name);
        
        // Verify the method was called exactly once
        mockRepo.Verify(repo => repo.GetByIdAsync(1), Times.Once);
    }
}
```

## 3. FluentAssertions
Instead of `Assert.Equal(expected, actual)`, modern C# developers use `FluentAssertions` for extreme readability.

```csharp
using FluentAssertions;

// Standard xUnit
Assert.NotNull(user);
Assert.Equal("Alice", user.Name);
Assert.True(user.Age > 18);

// FluentAssertions
user.Should().NotBeNull();
user.Name.Should().Be("Alice");
user.Age.Should().BeGreaterThan(18);

// Collection assertions
users.Should().HaveCount(3)
     .And.ContainSingle(u => u.Name == "Alice");
```
