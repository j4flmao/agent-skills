# Laravel Eloquent ORM

## Relationships

### One-to-One
```php
class User extends Model
{
    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }
}
```

### One-to-Many
```php
class Order extends Model
{
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
```

### Many-to-Many
```php
class User extends Model
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)
            ->withTimestamps()
            ->withPivot('assigned_by');
    }
}
```

### Has-Many-Through
```php
class Country extends Model
{
    public function posts(): HasManyThrough
    {
        return $this->hasManyThrough(Post::class, User::class);
    }
}
```

### Polymorphic
```php
class Comment extends Model
{
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}
```

## Eager Loading

```php
// Basic
Order::with('items')->get();

// Nested
Order::with('items.product')->get();

// Constrained
Order::with(['items' => fn($q) => $q->where('quantity', '>', 1)])->get();

// Specific columns
Order::with('items:order_id,product_id,quantity')->get();

// Lazy eager load (after query)
$orders = Order::all();
$orders->load('items.product');

// Always load (in model)
protected $with = ['items'];
```

## Scopes

```php
// Local scope
public function scopePending($query)
{
    return $query->where('status', 'pending');
}

public function scopeRecent($query, int $days = 30)
{
    return $query->where('created_at', '>=', now()->subDays($days));
}

// Global scope (class)
class ActiveScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where('active', true);
    }
}

// Usage
Order::pending()->recent(7)->get();
```

## Accessors & Mutators

```php
// Accessor (get)
protected function fullName(): Attribute
{
    return Attribute::make(
        get: fn(mixed $value, array $attr) => "{$attr['first_name']} {$attr['last_name']}"
    );
}

// Mutator (set)
protected function password(): Attribute
{
    return Attribute::make(
        set: fn(string $value) => bcrypt($value)
    );
}

// Cast
protected function casts(): array
{
    return [
        'email_verified_at' => 'datetime',
        'is_admin' => 'boolean',
        'metadata' => 'array',
        'total' => 'decimal:2',
        'options' => AsCollection::class,
        'status' => OrderStatusEnum::class,
    ];
}
```

## Custom Casts

```php
<?php
namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class MoneyCast implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attrs): string
    {
        return number_format($value / 100, 2);
    }

    public function set(Model $model, string $key, mixed $value, array $attrs): int
    {
        return (int) round((float) str_replace(',', '', $value) * 100);
    }
}
```

## Factories

```php
class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'total' => fake()->randomFloat(2, 10, 1000),
            'status' => fake()->randomElement(['pending', 'processing', 'shipped']),
        ];
    }

    public function shipped(): static
    {
        return $this->state(fn(array $attrs) => [
            'status' => 'shipped',
            'shipped_at' => now(),
        ]);
    }
}

// Usage
Order::factory()->count(10)->create();
Order::factory()->shipped()->create(['user_id' => $user->id]);
```

## Seeders

```php
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::factory()->create(['email' => 'admin@example.com']);
        Order::factory()
            ->count(50)
            ->for($user)
            ->has(OrderItem::factory()->count(3), 'items')
            ->create();
    }
}
```

## Query Builder

```php
// Select
Order::select('id', 'total')
    ->where('status', 'pending')
    ->whereBetween('created_at', [now()->subWeek(), now()])
    ->orderBy('total', 'desc')
    ->paginate(20);

// Aggregates
Order::where('user_id', $id)->sum('total');
Order::avg('total');
Order::count();

// Raw (use sparingly)
Order::selectRaw('DATE(created_at) as date, COUNT(*) as count')
    ->groupBy('date')
    ->get();

// Subquery
Order::addSelect(['last_item' => OrderItem::select('name')
    ->whereColumn('order_id', 'orders.id')
    ->latest()
    ->take(1)
]);

// Where exists
Order::whereHas('items', fn($q) => $q->where('price', '>', 100))->get();
```

## Performance Tips

```php
// N+1 prevention — always eager load
// Bad: N+1 queries inside loop
// Good: Order::with('items')->get()

// Chunk large datasets
Order::chunk(100, fn($orders) => /* process */);

// Cursor for memory efficiency
foreach (Order::cursor() as $order) { /* no memory buildup */ }

// Select only needed columns
Order::select('id', 'total', 'status')->get();

// DB::transaction for atomicity
DB::transaction(function () { /* all or nothing */ });

// Avoid ::all() on large tables — use paginate() or cursor()
```

## Model Events

```php
// In AppServiceProvider::boot()
Order::creating(fn($order) => $order->order_number = 'ORD-' . strtoupper(Str::random(8)));
Order::created(fn($order) => Log::info('Order created', ['id' => $order->id]));
Order::updated(fn($order) => /* ... */);
Order::deleted(fn($order) => /* ... */);

// Or use Observer class
php artisan make:observer OrderObserver --model=Order

class OrderObserver
{
    public function creating(Order $order): void { /* ... */ }
    public function created(Order $order): void { /* ... */ }
}
```
