# Laravel Artisan Commands

## Common Make Commands

```bash
php artisan make:model Order -a                  # Model + Migration + Factory + Seeder + Controller
php artisan make:model Order -mfs                # Model + Migration + Factory + Seeder
php artisan make:controller OrderController      # Empty controller
php artisan make:controller OrderController --resource  # Resource controller
php artisan make:controller OrderController --api      # API resource controller
php artisan make:request StoreOrderRequest        # Form request
php artisan make:middleware EnsureEmailIsVerified # Middleware
php artisan make:job ProcessPayment               # Queue job
php artisan make:event OrderShipped               # Event
php artisan make:listener SendShipmentNotification --event=OrderShipped  # Listener
php artisan make:notification OrderConfirmation   # Notification
php artisan make:mail WelcomeUser                 # Mail
php artisan make:rule ValidPhoneNumber            # Custom validation rule
php artisan make:command SyncUsers                # Artisan command
php artisan make:policy OrderPolicy --model=Order # Policy
php artisan make:scope TrendingProducts           # Eloquent scope
php artisan make:cast MoneyCast                   # Custom cast
php artisan make:channel OrderChannel             # Broadcasting channel
php artisan make:observer OrderObserver --model=Order  # Observer
```

## Custom Command

```php
<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SyncService;

class SyncUsers extends Command
{
    protected $signature = 'sync:users {--force : Skip confirmation}';
    protected $description = 'Sync users from external CRM';

    public function handle(SyncService $sync): int
    {
        if (!$this->option('force') && !$this->confirm('Sync users from CRM?')) {
            return self::FAILURE;
        }

        $this->info('Starting sync...');
        $bar = $this->output->createProgressBar($sync->count());
        $bar->start();

        $sync->process(function () use ($bar) {
            $bar->advance();
        });

        $bar->finish();
        $this->newLine();
        $this->info('Sync completed.');
        return self::SUCCESS;
    }
}
```

## Task Scheduling

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('sync:users')->hourly();
Schedule::command('sync:users --force')->dailyAt('03:00');
Schedule::job(new ProcessPendingOrders)->everyFiveMinutes();
Schedule::call(fn() => Cache::flush())->weekly();
Schedule::command('horizon:snapshot')->everyFiveMinutes();

// Run scheduler (add to cron):
// * * * * * cd /project && php artisan schedule:run >> /dev/null 2>&1
```

## Database Migrations

```bash
php artisan make:migration create_orders_table
php artisan migrate
php artisan migrate:fresh       # Drop all tables and re-run
php artisan migrate:refresh     # Rollback and re-run
php artisan migrate:rollback    # Rollback last batch
php artisan db:seed             # Run all seeders
php artisan migrate:fresh --seed  # Reset + seed
```

## Queue / Horizon

```bash
php artisan queue:work                           # Process queue
php artisan queue:work --queue=high,default      # Priority queues
php artisan horizon                               # Start Horizon
php artisan horizon:snapshot                      # Capture metrics
php artisan queue:failed                          # List failed jobs
php artisan queue:retry all                       # Retry all failed
```

## Cache / Config

```bash
php artisan cache:clear          # Clear app cache
php artisan config:cache         # Cache config files
php artisan route:cache          # Cache routes
php artisan view:cache           # Cache Blade views
php artisan optimize             # Bootstrap cache
```

## Maintenance Mode

```bash
php artisan down --secret=bypass-key  # Maintenance mode
php artisan up                         # Bring back up
# Access: https://app.com/bypass-key
```

## Development

```bash
php artisan serve                    # Dev server at localhost:8000
php artisan make:filament-resource Order   # Filament resource
php artisan livewire:make OrderTable       # Livewire component
php artisan sail:install                   # Docker environment
php artisan storage:link                   # Create public/storage symlink
```

## Model States (Laravel 11+)

```bash
php artisan make:state OrderState
```
```php
use Illuminate\Database\Eloquent\Model;
use App\States\Order\PendingState;

protected function registerStates(): void
{
    $this->addState('status', PendingState::class);
}
```

## Artisan Command Options Reference

| Option | Description |
|---|---|
| `--model=Order` | Generate with model (make:controller) |
| `--resource` | Resourceful controller |
| `--api` | API-only controller (no create/edit) |
| `-a` | All (model + migration + factory + seeder + controller) |
| `-m` | Create migration |
| `-f` | Create factory |
| `-s` | Create seeder |
| `-c` | Create controller |
| `-p` | Create pivot table migration |
| `--policy` | Create policy |
| `--requests` | Create form requests |
