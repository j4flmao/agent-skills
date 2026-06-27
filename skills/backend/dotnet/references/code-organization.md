# Code Organization in .NET 8

## Purpose
This document describes best practices for structuring .NET 8 projects, managing namespaces, and implementing modular monoliths.

## Minimal API Organization
Instead of placing all routes in `Program.cs`, use extension methods or Carter modules to organize endpoints.


```csharp
// Endpoint Module Example 0
public static class UserEndpoints_0
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 1
public static class UserEndpoints_1
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 2
public static class UserEndpoints_2
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 3
public static class UserEndpoints_3
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 4
public static class UserEndpoints_4
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 5
public static class UserEndpoints_5
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 6
public static class UserEndpoints_6
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 7
public static class UserEndpoints_7
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 8
public static class UserEndpoints_8
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 9
public static class UserEndpoints_9
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 10
public static class UserEndpoints_10
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 11
public static class UserEndpoints_11
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 12
public static class UserEndpoints_12
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 13
public static class UserEndpoints_13
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 14
public static class UserEndpoints_14
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 15
public static class UserEndpoints_15
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 16
public static class UserEndpoints_16
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 17
public static class UserEndpoints_17
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 18
public static class UserEndpoints_18
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 19
public static class UserEndpoints_19
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 20
public static class UserEndpoints_20
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 21
public static class UserEndpoints_21
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 22
public static class UserEndpoints_22
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 23
public static class UserEndpoints_23
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 24
public static class UserEndpoints_24
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 25
public static class UserEndpoints_25
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 26
public static class UserEndpoints_26
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 27
public static class UserEndpoints_27
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 28
public static class UserEndpoints_28
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 29
public static class UserEndpoints_29
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 30
public static class UserEndpoints_30
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 31
public static class UserEndpoints_31
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 32
public static class UserEndpoints_32
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 33
public static class UserEndpoints_33
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 34
public static class UserEndpoints_34
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 35
public static class UserEndpoints_35
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 36
public static class UserEndpoints_36
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 37
public static class UserEndpoints_37
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 38
public static class UserEndpoints_38
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.

```csharp
// Endpoint Module Example 39
public static class UserEndpoints_39
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserRepository repo) => 
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id}", async (int id, IUserRepository repo) =>
        {
            var user = await repo.GetByIdAsync(id);
            return user is not null ? Results.Ok(user) : Results.NotFound();
        });

        group.MapPost("/", async (User user, IUserRepository repo) =>
        {
            await repo.AddAsync(user);
            return Results.Created($"/api/users/{user.Id}", user);
        });
    }
}
```
By organizing endpoints into logical groups, the `Program.cs` file remains clean and maintainable. This approach scales well as the API surface grows.
