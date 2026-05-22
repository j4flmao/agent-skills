# Laravel Middleware & Validation

## Middleware Pipeline

```php
// app/Http/Kernel.php (Laravel 10) or bootstrap/app.php (Laravel 11)
->withMiddleware(function (Middleware $middleware) {
    $middleware->append(EnsureEmailIsVerified::class);

    $middleware->api(prepend: [
        \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        'throttle:api',
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ]);

    $middleware->alias([
        'admin' => \App\Http\Middleware\RedirectIfNotAdmin::class,
    ]);
})
```

### Custom Middleware

```php
<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfNotAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            abort(403, 'Admin access required.');
        }

        return $next($request);
    }
}
```

### Middleware Groups
```php
// api group: auth:sanctum, throttle:api, bindings
// web group: sessions, cookies, CSRF, auth

// Custom group in bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->group('api.v2', [
        \App\Http\Middleware\ApiVersion::class . ':v2',
        'auth:sanctum',
        'throttle:100,1',
    ]);
})
```

## Form Requests

### Basic Validation

```php
<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['exists:roles,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered.',
            'password.min' => 'Password must be at least 8 characters.',
        ];
    }

    public function attributes(): array
    {
        return [
            'email' => 'email address',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower($this->email),
        ]);
    }
}
```

### Custom Validation Rules

```php
// As a Rule class
php artisan make:rule ValidPhoneNumber

class ValidPhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!preg_match('/^\+?[1-9]\d{1,14}$/', $value)) {
            $fail('The :attribute is not a valid phone number.');
        }
    }
}

// Inline rule
use Illuminate\Validation\Rule;

$request->validate([
    'status' => [Rule::in(['pending', 'active', 'inactive'])],
    'email' => [Rule::unique('users')->ignore($user->id)],
]);

// Closure rule
$request->validate([
    'coupon' => ['required', function (string $attr, mixed $value, Closure $fail) {
        if (!Coupon::isValid($value)) {
            $fail('The :attribute is invalid or expired.');
        }
    }],
]);
```

### Controller Validation

```php
// Inline (for simple cases)
$validated = $request->validate([
    'title' => 'required|string|max:255',
    'body' => 'required|string',
    'published_at' => 'nullable|date',
]);
```

## Validation Rules Reference

### String Rules
```php
'field' => 'string|min:2|max:255|starts_with:prefix|ends_with:suffix'
'field' => 'alpha|alpha_num|alpha_dash'  // letters only, alphanumeric, with dashes
'field' => 'regex:/^[A-Z]+$/'            // custom regex
```

### Numeric Rules
```php
'field' => 'integer|min:1|max:100'
'field' => 'numeric|between:0.01,999.99'
'field' => 'integer|gt:0|lt:1000'       // greater than, less than
```

### Date Rules
```php
'field' => 'date|after:today|before:next_week'
'field' => 'date_format:Y-m-d'
'field' => 'after_or_equal:start_date'
```

### Array Rules
```php
'items' => 'required|array|min:1|max:100'
'items.*' => 'exists:products,id'
'items.*.quantity' => 'integer|min:1'
```

### File Rules
```php
'avatar' => 'required|file|image|max:2048|mimes:jpg,jpeg,png'
'document' => 'mimetypes:application/pdf|max:10240'
```

### Conditional Rules
```php
'payment_method' => 'required|in:card,bank'
'card_number'    => 'required_if:payment_method,card|string'
'bank_account'   => 'required_if:payment_method,bank|string'
```

## Custom Form Request After Validation

```php
protected function passedValidation(): void
{
    $this->merge(['total' => $this->calculateTotal()]);
}

protected function failedValidation(Validator $validator): void
{
    throw new HttpResponseException(response()->json([
        'error' => ['code' => 'VALIDATION_FAILED', 'message' => $validator->errors()->first()],
    ], 422));
}
```

## Validation with API Resource

```php
<?php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'total' => $this->total,
            'status' => $this->status,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
        ];
    }
}

// Controller
return new OrderResource($order);
return OrderResource::collection(Order::paginate());
```
