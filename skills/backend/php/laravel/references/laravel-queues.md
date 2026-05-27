# Laravel Queue Jobs

## Queue Configuration

### Connection Setup
```php
// config/queue.php
'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => 'default',
        'retry_after' => 90,
        'block_for' => null,
        'after_commit' => true,
    ],

    'database' => [
        'driver' => 'database',
        'table' => 'jobs',
        'queue' => 'default',
        'retry_after' => 90,
        'after_commit' => true,
    ],

    'sqs' => [
        'driver' => 'sqs',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'prefix' => env('SQS_PREFIX'),
        'queue' => env('SQS_QUEUE'),
        'suffix' => env('SQS_SUFFIX'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],
],
```

## Job Classes

### Basic Job
```php
<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\EmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function handle(EmailService $emailService): void
    {
        $emailService->sendWelcomeEmail($this->user);
    }
}
```

### Job with Middleware
```php
<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\Middleware\ThrottlesExceptions;

class ProcessUserReport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300;
    public $tries = 3;
    public $backoff = [10, 30, 60];
    public $maxExceptions = 3;

    public function __construct(public User $user) {}

    public function handle(): void
    {
        // Process report...
    }

    public function middleware(): array
    {
        return [
            new RateLimited('reports'),
            (new ThrottlesExceptions(10, 5))->backoff(2),
        ];
    }

    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(10);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('Report generation failed', [
            'user_id' => $this->user->id,
            'error' => $e->getMessage(),
        ]);
    }
}
```

## Job Dispatching

### Dispatch Methods
```php
// Basic dispatch
SendWelcomeEmail::dispatch($user);

// Delayed dispatch
SendWelcomeEmail::dispatch($user)->delay(now()->addMinutes(15));

// Specific queue
SendWelcomeEmail::dispatch($user)->onQueue('emails');

// Specific connection
SendWelcomeEmail::dispatch($user)->onConnection('sqs');

// Chain jobs
Bus::chain([
    new ProcessOrder($order),
    new SendOrderConfirmation($order),
    new UpdateInventory($order),
])->dispatch();

// Batch jobs
$batch = Bus::batch([
    new ProcessUserReport($user1),
    new ProcessUserReport($user2),
    new ProcessUserReport($user3),
])->then(function (Batch $batch) {
    // All jobs completed
})->catch(function (Batch $batch, \Throwable $e) {
    // Job failed
})->finally(function (Batch $batch) {
    // Batch finished
})->dispatch();
```

### Conditional Dispatch
```php
class OrderService
{
    public function placeOrder(OrderData $data): Order
    {
        $order = Order::create($data->toArray());

        // Dispatch conditionally based on settings
        if ($order->requires_approval) {
            SendApprovalRequest::dispatch($order)
                ->delay(now()->addMinutes(5));
        }

        // DispatchIf helper
        SendWelcomeEmail::dispatchIf(
            $order->user->hasNeverLoggedIn(),
            $order->user
        );

        return $order;
    }
}
```

## Queue Worker

### Worker Configuration
```bash
# Start worker
php artisan queue:work redis --queue=high,default,low

# Start with specific options
php artisan queue:work redis \
    --queue=emails \
    --tries=3 \
    --delay=5 \
    --backoff=10 \
    --memory=256 \
    --timeout=300 \
    --sleep=3

# Process single job
php artisan queue:work --once

# Supervisor configuration
```

```ini
; /etc/supervisor/conf.d/laravel-worker.conf
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/artisan queue:work redis --queue=high,default --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=forge
numprocs=8
redirect_stderr=true
stdout_logfile=/var/www/storage/logs/worker.log
stopwaitsecs=3600
```

### Worker Events
```php
// AppServiceProvider::boot()
use Illuminate\Support\Facades\Queue;

Queue::before(function (JobProcessing $event) {
    Log::info('Processing job', [
        'connection' => $event->connectionName,
        'job' => $event->job->resolveName(),
    ]);
});

Queue::after(function (JobProcessed $event) {
    // Job completed successfully
});

Queue::failing(function (JobFailed $event) {
    Log::error('Job failed', [
        'job' => $event->job->resolveName(),
        'exception' => $event->exception->getMessage(),
    ]);
});

Queue::looping(function () {
    // Run before worker fetches next job
    if (cache('maintenance_mode')) {
        die('Maintenance mode active');
    }
});
```

## Queue Monitoring

### Dashboard Metrics
```php
class QueueMonitor
{
    public function getMetrics(): array
    {
        return [
            'jobs_pending' => Queue::size('default'),
            'jobs_failed' => DB::table('failed_jobs')->count(),
            'average_wait_time' => DB::table('jobs')
                ->avg('available_at - created_at'),
            'slowest_jobs' => DB::table('jobs')
                ->orderByDesc('available_at - created_at')
                ->limit(10)
                ->get(),
        ];
    }

    public function getFailedJobs(): Collection
    {
        return DB::table('failed_jobs')
            ->orderByDesc('failed_at')
            ->limit(50)
            ->get();
    }
}
```

### Failed Job Management
```bash
# List failed jobs
php artisan queue:failed

# Retry specific failed job
php artisan queue:retry <id>

# Retry all failed jobs
php artisan queue:retry all

# Remove failed job
php artisan queue:forget <id>

# Flush all failed jobs
php artisan queue:flush

# Prune failed jobs (older than 7 days)
php artisan queue:prune-failed --hours=168
```

## Unique Jobs

### Preventing Duplicates
```php
<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Foundation\Bus\Dispatchable;

class ProcessWebhook implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public $uniqueFor = 60; // Seconds

    public function __construct(
        public string $webhookId,
        public array $payload,
    ) {}

    public function uniqueId(): string
    {
        return $this->webhookId;
    }

    public function handle(): void
    {
        // Process webhook (will only run once per webhookId within 60s)
    }
}
```

## Job Lifecycle Hooks

### Available Hooks
```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class MonitoredJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public function handle(): void
    {
        // Main job logic
    }

    // Hook methods
    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(10);
    }

    public function backoff(): array
    {
        return [5, 10, 30];
    }

    public function maxAttempts(): int
    {
        return 3;
    }

    public function tags(): array
    {
        return ['monitored', 'batch:' . $this->batchId];
    }

    public function failed(\Throwable $e): void
    {
        // Handle failure
    }
}
```

## Key Points
- Queue connections: Redis (fast), Database (reliable), SQS (serverless)
- Jobs implement ShouldQueue and use Dispatchable trait
- Middleware adds rate limiting and exception throttling to jobs
- Job batching groups related jobs with completion callbacks
- Worker configuration via Supervisor for production reliability
- Unique jobs prevent duplicate processing within a time window
- Failed job commands enable retry and cleanup workflows
- Lifecycle hooks: retryUntil, backoff, maxAttempts, failed, tags
- Event listeners (before, after, failing) enable monitoring integration
