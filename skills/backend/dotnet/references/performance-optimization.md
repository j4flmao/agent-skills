# Performance Optimization in .NET 8

## Purpose
This guide covers performance tuning in .NET 8, highlighting Minimal APIs, memory management, EF Core optimization, and asynchronous programming best practices.

## EF Core Query Optimization
Avoid tracking overhead for read-only queries.


```csharp
// EF Core Optimization Example 0
public class ProductService_0
{
    private readonly AppDbContext _context;

    public ProductService_0(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 1
public class ProductService_1
{
    private readonly AppDbContext _context;

    public ProductService_1(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 2
public class ProductService_2
{
    private readonly AppDbContext _context;

    public ProductService_2(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 3
public class ProductService_3
{
    private readonly AppDbContext _context;

    public ProductService_3(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 4
public class ProductService_4
{
    private readonly AppDbContext _context;

    public ProductService_4(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 5
public class ProductService_5
{
    private readonly AppDbContext _context;

    public ProductService_5(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 6
public class ProductService_6
{
    private readonly AppDbContext _context;

    public ProductService_6(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 7
public class ProductService_7
{
    private readonly AppDbContext _context;

    public ProductService_7(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 8
public class ProductService_8
{
    private readonly AppDbContext _context;

    public ProductService_8(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 9
public class ProductService_9
{
    private readonly AppDbContext _context;

    public ProductService_9(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 10
public class ProductService_10
{
    private readonly AppDbContext _context;

    public ProductService_10(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 11
public class ProductService_11
{
    private readonly AppDbContext _context;

    public ProductService_11(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 12
public class ProductService_12
{
    private readonly AppDbContext _context;

    public ProductService_12(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 13
public class ProductService_13
{
    private readonly AppDbContext _context;

    public ProductService_13(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 14
public class ProductService_14
{
    private readonly AppDbContext _context;

    public ProductService_14(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 15
public class ProductService_15
{
    private readonly AppDbContext _context;

    public ProductService_15(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 16
public class ProductService_16
{
    private readonly AppDbContext _context;

    public ProductService_16(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 17
public class ProductService_17
{
    private readonly AppDbContext _context;

    public ProductService_17(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 18
public class ProductService_18
{
    private readonly AppDbContext _context;

    public ProductService_18(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 19
public class ProductService_19
{
    private readonly AppDbContext _context;

    public ProductService_19(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 20
public class ProductService_20
{
    private readonly AppDbContext _context;

    public ProductService_20(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 21
public class ProductService_21
{
    private readonly AppDbContext _context;

    public ProductService_21(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 22
public class ProductService_22
{
    private readonly AppDbContext _context;

    public ProductService_22(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 23
public class ProductService_23
{
    private readonly AppDbContext _context;

    public ProductService_23(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 24
public class ProductService_24
{
    private readonly AppDbContext _context;

    public ProductService_24(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 25
public class ProductService_25
{
    private readonly AppDbContext _context;

    public ProductService_25(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 26
public class ProductService_26
{
    private readonly AppDbContext _context;

    public ProductService_26(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 27
public class ProductService_27
{
    private readonly AppDbContext _context;

    public ProductService_27(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 28
public class ProductService_28
{
    private readonly AppDbContext _context;

    public ProductService_28(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 29
public class ProductService_29
{
    private readonly AppDbContext _context;

    public ProductService_29(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 30
public class ProductService_30
{
    private readonly AppDbContext _context;

    public ProductService_30(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 31
public class ProductService_31
{
    private readonly AppDbContext _context;

    public ProductService_31(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 32
public class ProductService_32
{
    private readonly AppDbContext _context;

    public ProductService_32(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 33
public class ProductService_33
{
    private readonly AppDbContext _context;

    public ProductService_33(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 34
public class ProductService_34
{
    private readonly AppDbContext _context;

    public ProductService_34(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 35
public class ProductService_35
{
    private readonly AppDbContext _context;

    public ProductService_35(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 36
public class ProductService_36
{
    private readonly AppDbContext _context;

    public ProductService_36(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 37
public class ProductService_37
{
    private readonly AppDbContext _context;

    public ProductService_37(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 38
public class ProductService_38
{
    private readonly AppDbContext _context;

    public ProductService_38(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.

```csharp
// EF Core Optimization Example 39
public class ProductService_39
{
    private readonly AppDbContext _context;

    public ProductService_39(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> GetActiveProductsAsync()
    {
        // Use AsNoTracking() for read-only scenarios to reduce memory footprint and improve performance
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }
}
```
Performance tuning also involves understanding garbage collection. By minimizing allocations (e.g., using `readonly struct` or `ref struct`), we reduce Gen 0 collections.
