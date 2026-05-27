# Rails Background Jobs Reference

## Active Job Setup

```ruby
# app/jobs/application_job.rb
class ApplicationJob < ActiveJob::Base
  queue_as :default
  
  retry_on ActiveRecord::Deadlocked, wait: :exponentially_longer, attempts: 5
  retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 3
  
  discard_on ActiveJob::DeserializationError

  around_perform :log_performance

  private

  def log_performance
    start = Time.current
    yield
    duration = Time.current - start
    Rails.logger.info "#{self.class.name} completed in #{duration.round(2)}s"
  end
end
```

## Job Types

```ruby
# app/jobs/order_confirmation_job.rb
class OrderConfirmationJob < ApplicationJob
  queue_as :mailers

  def perform(order_id)
    order = Order.find(order_id)
    OrderMailer.confirmation(order).deliver_now
  end
end

# app/jobs/inventory_update_job.rb
class InventoryUpdateJob < ApplicationJob
  queue_as :default

  def perform(order_id)
    order = Order.find(order_id)
    order.items.each do |item|
      InventoryService.decrement(item.sku, item.quantity)
    end
  end
end

# app/jobs/report_generation_job.rb
class ReportGenerationJob < ApplicationJob
  queue_as :low_priority

  def perform(report_type, params = {})
    report = ReportBuilder.new(report_type, params)
    report.generate!
    report.export_to_storage!
  end
end
```

## Sidekiq Configuration

```ruby
# config/sidekiq.yml
:concurrency: 5
:queues:
  - [mailers, 3]
  - [default, 2]
  - [low_priority, 1]

# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = { url: ENV['REDIS_URL'] }
  
  config.death_handlers << ->(job, ex) do
    Rails.logger.error "Job #{job['class']} died: #{ex.message}"
    NotificationService.alert_admins("Job failure: #{job['class']}")
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV['REDIS_URL'] }
end
```

## Scheduling with Sidekiq-Cron

```ruby
# config/initializers/sidekiq_cron.rb
Sidekiq::Cron::Job.create(
  name: 'Daily report - every day at 6am',
  cron: '0 6 * * *',
  class: 'ReportGenerationJob',
  args: ['daily_summary', { date: Date.yesterday.to_s }]
)

Sidekiq::Cron::Job.create(
  name: 'Cleanup expired sessions - every hour',
  cron: '0 * * * *',
  class: 'SessionCleanupJob'
)
```

## Batch Processing

```ruby
# app/jobs/batch_process_job.rb
class BatchProcessJob < ApplicationJob
  queue_as :default

  def perform(batch_id)
    batch = Batch.find(batch_id)
    batch.update!(status: 'processing')

    batch.items.find_each do |item|
      ProcessItemJob.perform_later(item.id)
    end

    batch.update!(status: 'completed')
  end
end
```

## Job Monitoring

```ruby
# config/initializers/sidekiq_monitoring.rb
Sidekiq.configure_server do |config|
  config.server_middleware do |chain|
    chain.add Sidekiq::Middleware::Server::RetryJobs
  end
end

# app/middleware/job_logger.rb
class JobLogger
  def call(worker, job, queue)
    Rails.logger.info "Starting #{worker.class.name} (#{job['jid']})"
    yield
    Rails.logger.info "Completed #{worker.class.name} (#{job['jid']})"
  rescue => e
    Rails.logger.error "Failed #{worker.class.name}: #{e.message}"
    raise
  end
end
```

## Testing Jobs

```ruby
class OrderConfirmationJobTest < ActiveJob::TestCase
  test 'sends confirmation email' do
    order = orders(:pending)
    
    assert_enqueued_with(job: OrderConfirmationJob, args: [order.id]) do
      OrderConfirmationJob.perform_later(order.id)
    end
    
    perform_enqueued_jobs
    assert_emails 1
  end
end
```

## Key Points

- Active Job provides unified interface across queue adapters
- Sidekiq uses Redis for fast, persistent job processing
- Retry with exponential backoff handles transient failures
- Job queues prioritized: mailers > default > low_priority
- Cron scheduling enables recurring task execution
- Batch processing splits large datasets into individual jobs
- Death handlers alert on unrecoverable job failures
- Performance logging tracks job duration
- Test helpers assert job enqueuing and execution
- Unique job IDs enable deduplication and monitoring
