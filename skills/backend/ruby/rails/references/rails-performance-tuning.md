# Rails Performance Tuning Reference

## Table of Contents

- [Database Performance](#database-performance)
- [Bullet Gem for N+1 Detection](#bullet-gem-for-n1-detection)
- [Eager Loading Strategies](#eager-loading-strategies)
- [Caching Strategies](#caching-strategies)
- [Low-Level Caching](#low-level-caching)
- [Counter Caches and Cache Invalidation](#counter-caches-and-cache-invalidation)
- [Background Jobs](#background-jobs)
- [Memory Management](#memory-management)
- [Memory Bloat Detection and Fixes](#memory-bloat-detection-and-fixes)
- [View Performance](#view-performance)
- [Asset Pipeline Optimization](#asset-pipeline-optimization)
- [Connection Pooling](#connection-pooling)
- [Puma Configuration](#puma-configuration)
- [Middleware Stack Optimization](#middleware-stack-optimization)
- [SQL Query Optimization](#sql-query-optimization)
- [ActiveRecord Performance](#activerecord-performance)
- [Slow Query Logging and Analysis](#slow-query-logging-and-analysis)
- [Garbage Collection Tuning](#garbage-collection-tuning)
- [Best Practices and Anti-Patterns](#best-practices-and-anti-patterns)

---

## Database Performance

### Query Optimization Fundamentals

```sql
-- Use EXPLAIN ANALYZE to understand query execution
EXPLAIN ANALYZE SELECT users.* FROM users
INNER JOIN orders ON orders.user_id = users.id
WHERE users.active = true
ORDER BY users.created_at DESC
LIMIT 20;

-- Look for:
-- - Seq Scan on large tables (needs index)
-- - Sort operations on unindexed columns
-- - Nested Loop joins without index lookups
-- - High "rows removed by filter" counts
```

### Missing Index Detection

```sql
-- PostgreSQL: Find missing indexes
SELECT
  relname AS table_name,
  seq_scan - idx_scan AS too_much_seq,
  CASE
    WHEN seq_scan - idx_scan > 0 THEN 'Missing Index?'
    ELSE 'OK'
  END AS index_advice,
  pg_size_pretty(pg_relation_size(relid)) AS table_size
FROM pg_stat_all_tables
WHERE schemaname = 'public'
  AND seq_scan > idx_scan
  AND seq_scan > 100
ORDER BY too_much_seq DESC;

-- PostgreSQL: Find unused indexes
SELECT
  schemaname, tablename, indexname,
  idx_scan, idx_tup_read, idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### N+1 Query Detection

```ruby
# N+1 example (BAD)
users = User.all
users.each do |user|
  puts user.orders.count  # Executes a query per user
end

# Fixed with eager loading
users = User.includes(:orders)
users.each do |user|
  puts user.orders.size   # No additional queries (uses loaded association)
end

# Use `size` (uses cached count if loaded), not `count` (always queries)
```

### EXPLAIN ANALYZE in Rails

```ruby
# Use the `explain` method on ActiveRecord relations
puts User.where(active: true)
  .joins(:orders)
  .group("users.id")
  .having("COUNT(orders.id) > 5")
  .explain

# Output:
# EXPLAIN for: SELECT "users".* FROM "users" ...
# QUERY PLAN
# ----------------------------------------------------------
# HashAggregate  (cost=...)
#   ...

# For EXPLAIN ANALYZE, use the SQL directly
sql = User.where(active: true)
  .joins(:orders)
  .group("users.id")
  .having("COUNT(orders.id) > 5")
  .to_sql

ActiveRecord::Base.connection.execute("EXPLAIN ANALYZE #{sql}")
```

### Common Query Performance Issues

```ruby
# BAD: Loading all records into memory
@users = User.all
@users.each { |u| send_email(u) }

# GOOD: Batch processing
User.find_each(batch_size: 1000) { |u| send_email(u) }

# BAD: COUNT queries in loops
users.each { |u| u.orders.count }

# GOOD: Use counter cache or preload counts
User.left_joins(:orders)
    .group(:id)
    .select("users.*, COUNT(orders.id) AS orders_count")

# BAD: Loading unnecessary columns
@users = User.all  # loads ALL columns

# GOOD: Select only needed columns
@users = User.select(:id, :email, :name)

# BAD: N+1 through serializers
render json: users, each_serializer: UserSerializer
# UserSerializer accesses user.orders - N+1!

# GOOD: Preload before serialization
@users = User.includes(:orders).all
render json: users, each_serializer: UserSerializer
```

---

## Bullet Gem for N+1 Detection

### Installation and Configuration

```ruby
# Gemfile
group :development, :test do
  gem "bullet"
end

# config/environments/development.rb
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true                 # JavaScript alert in browser
  Bullet.bullet_logger = true         # Log to Rails.root/log/bullet.log
  Bullet.console = true               # Log to browser console
  Bullet.rails_logger = true          # Add to Rails log
  Bullet.add_footer = true            # Display in page footer
  Bullet.counter_cache = true         # Detect missing counter caches
  Bullet.stacktrace_includes = %w[MyApp]
  Bullet.unused_eager_loading = true  # Detect unnecessary includes
  Bullet.slack = { webhook_url: ENV["SLACK_WEBHOOK"] }  # Optional Slack alert
end

# config/environments/test.rb
config.after_initialize do
  Bullet.enable = true
  Bullet.bullet_logger = true
  Bullet.raise = true  # Raise errors in tests (preferred)
end
```

### Bullet Workflow

```
# Typical Bullet alert flow:
1. Bullet detects N+1 query in development
2. Log entry in log/bullet.log:
     N+1 Query detected
     User => [:orders]
     Add to your query: .includes([:orders])
     Call stack: app/views/users/index.html.erb:5:in `each'

3. Developer adds .includes(:orders) to the controller query
4. Run again to verify alert disappears
5. If .includes loads associations that aren't used, Bullet warns:
     AVOID eager loading [:orders] - it's never used
6. Remove unused .includes calls
```

### Bullet in Test Suite

```ruby
# spec/rails_helper.rb
RSpec.configure do |config|
  config.before(:each) do
    Bullet.start_request if Bullet.enable?
  end

  config.after(:each) do
    Bullet.perform_out_of_channel_notifications if Bullet.enable?
    Bullet.end_request if Bullet.enable?
  end
end

# Use bullet in request specs to catch N+1
RSpec.describe "Users API", type: :request do
  it "avoids N+1 queries" do
    create_list(:user, 5, :with_orders)

    expect {
      get "/api/v1/users", headers: auth_headers
    }.to make_database_queries(count: 2..3)  # 1 for users, 1-2 for associations
  end
end
```

---

## Eager Loading Strategies

### includes vs preload vs eager_load

```ruby
# includes - Rails chooses between 2 queries or LEFT JOIN
#   Uses preload strategy by default (2 queries)
#   Falls back to eager_load (LEFT JOIN) if WHERE clause references joined table
User.includes(:orders).all
# => 2 queries: SELECT * FROM users; SELECT * FROM orders WHERE user_id IN (...)

User.includes(:orders).where(orders: { status: "pending" })
# => 1 query with LEFT JOIN (auto-switches to eager_load)

# preload - Always 2 separate queries
User.preload(:orders).all
# => 2 queries: SELECT * FROM users; SELECT * FROM orders WHERE user_id IN (...)

User.preload(:orders).where(orders: { status: "pending" })
# => ERROR: references orders table but uses preload

# eager_load - Always LEFT JOIN (single query)
User.eager_load(:orders).all
# => SELECT users.* FROM users LEFT OUTER JOIN orders ON orders.user_id = users.id
```

### Advanced Eager Loading

```ruby
# Nested associations
User.includes(orders: :line_items).all
# => Users with orders, each order with line items

# Multiple associations
User.includes(:profile, :settings, orders: :line_items).all

# Conditional eager loading
User.includes(:orders).where(active: true).references(:orders)

# Eager loading with scope
class User < ApplicationRecord
  has_many :recent_orders, -> { where("created_at > ?", 30.days.ago) },
           class_name: "Order"

  has_many :paid_orders, -> { where(status: "paid") },
           class_name: "Order"
end

User.includes(:recent_orders, :paid_orders).all

# Strict loading - raise if lazy loading occurs
class ApplicationRecord < ActiveRecord::Base
  self.strict_loading_by_default = true
end

# Per-query strict loading
User.strict_loading.all
# => Raises ActiveRecord::StrictLoadingViolationError if any association is lazy loaded

# Per-association strict loading
class User < ApplicationRecord
  has_many :orders, strict_loading: true
end

# Custom strict loading mode
User.strict_loading(:n_plus_one_only).all
```

### joins with select

```ruby
# Use joins + select for efficient aggregate queries
# BAD: Loading all records
users = User.all
users.map { |u| u.orders.count }

# GOOD: Single query with joins
User.joins(:orders)
    .select("users.*, COUNT(orders.id) AS orders_count")
    .group("users.id")
    .order("orders_count DESC")

# GOOD: LEFT JOIN for users with zero orders
User.left_joins(:orders)
    .select("users.id, users.email, COUNT(orders.id) AS orders_count")
    .group("users.id")

# Conditional aggregation
User.left_joins(:orders)
    .select(
      "users.id",
      "COUNT(orders.id) FILTER (WHERE orders.status = 'paid') AS paid_orders",
      "COUNT(orders.id) FILTER (WHERE orders.status = 'pending') AS pending_orders",
      "COALESCE(SUM(orders.total), 0) AS total_revenue"
    )
    .group("users.id")
```

---

## Caching Strategies

### Russian Doll Caching

```ruby
# app/views/api/v1/users/index.json.jbuilder
json.cache! ["users", @users.maximum(:updated_at)] do
  json.array! @users do |user|
    json.cache! user do
      json.id user.id
      json.email user.email
      json.full_name "#{user.first_name} #{user.last_name}"
      json.updated_at user.updated_at

      json.cache! [user, "orders"] do
        json.orders user.orders do |order|
          json.cache! order do
            json.id order.id
            json.total order.total
            json.status order.status
          end
        end
      end
    end
  end
end

# Invalidate: touch the parent when children change
class Order < ApplicationRecord
  belongs_to :user, touch: true  # Updates user.updated_at when order changes
end
```

### Fragment Caching in Views

```erb
<%# app/views/users/index.html.erb %>
<% cache("user_stats_#{Date.current}") do %>
  <div class="stats">
    <%= render "stats" %>
  </div>
<% end %>

<% @users.each do |user| %>
  <% cache(user) do %>
    <%= render user %>
  <% end %>
<% end %>
```

### HTTP Caching

```ruby
# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def index
    users = User.includes(:orders).all
    fresh_when(
      last_modified: users.maximum(:updated_at),
      etag: [users, params[:page], current_user]
    )
  end

  def show
    user = User.find(params[:id])
    fresh_when(
      last_modified: user.updated_at,
      etag: [user, current_user],
      public: !user.private?
    )
  end

  # Conditional GET manually
  def show
    user = User.find(params[:id])
    response.headers["Last-Modified"] = user.updated_at.httpdate
    response.headers["ETag"] = Digest::MD5.hexdigest(user.cache_key)

    if request.headers["If-None-Match"] == response.headers["ETag"] ||
       request.headers["If-Modified-Since"] == user.updated_at.httpdate
      head :not_modified
    else
      render json: UserSerializer.new(user).serialize
    end
  end
end
```

### Action Caching (HTTP Cache-Based)

```ruby
# Don't use the deprecated actionpack-action_caching gem
# Instead, use http_cache or etag-based caching
class Api::V1::PostsController < ApplicationController
  etag { current_user&.id }
  etag { flash[:notice] }

  def index
    @posts = Post.published.includes(:author).all
    fresh_when(@posts)
  end
end
```

---

## Low-Level Caching

### Rails.cache with Redis

```ruby
# Gemfile
gem "redis-rails"

# config/environments/production.rb
config.cache_store = :redis_cache_store, {
  url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
  expires_in: 1.hour,
  namespace: "cache",
  pool_size: (ENV.fetch("RAILS_MAX_THREADS") { 5 }).to_i + 5,
  pool_timeout: 5,
  error_handler: ->(method:, returning:, exception:) {
    Rails.logger.error("Redis cache error: #{exception.message}")
    Raven.capture_exception(exception)
  }
}
```

### Cache Usage Patterns

```ruby
# Simple key-value
Rails.cache.write("user:#{user.id}:profile", profile_data, expires_in: 1.hour)
data = Rails.cache.read("user:#{user.id}:profile")

# Fetch with block
profile = Rails.cache.fetch("user:#{user.id}:profile", expires_in: 1.hour) do
  generate_expensive_profile(user)
end

# Multi-fetch
user_ids = [1, 2, 3, 4, 5]
profiles = Rails.cache.fetch_multi(*user_ids.map { |id| "user:#{id}:profile" }) do |key|
  user_id = key.split(":").second.to_i
  generate_expensive_profile(User.find(user_id))
end

# Race condition TTL (stale-while-revalidate)
@profile = Rails.cache.fetch("user:#{user.id}:profile", expires_in: 1.hour,
                             race_condition_ttl: 10) do
  generate_expensive_profile(user)
end

# Raw Redis access
redis = Redis.new(url: ENV.fetch("REDIS_URL"))
redis.pipelined do
  redis.set("key1", "value1")
  redis.set("key2", "value2")
  redis.expire("key1", 3600)
  redis.expire("key2", 3600)
end

# Redis cache increment (for counters, rate limiting)
Rails.cache.increment("page_views:#{post.id}", 1)
Rails.cache.decrement("remaining_stock:#{product.id}", 1)
```

### Cache Stores Comparison

| Store                  | Speed     | Persistence | Distributed | Expiry | Use Case                |
|------------------------|-----------|-------------|-------------|--------|-------------------------|
| MemoryStore            | Fastest   | No          | No          | Yes    | Dev/test only           |
| FileStore              | Slow      | Yes         | No          | Yes    | Dev/test only           |
| MemCacheStore          | Fast      | No          | Yes         | Yes    | Multi-server production |
| RedisCacheStore        | Fast      | Optional    | Yes         | Yes    | Production (preferred)  |
| NullStore              | N/A       | No          | No          | N/A    | Disable caching         |

```ruby
# Switching to Memcached
config.cache_store = :mem_cache_store, "memcached-1.example.com:11211",
  "memcached-2.example.com:11211",
  {
    namespace: "app_cache",
    expires_in: 1.hour,
    compress: true,
    compression_threshold: 1024 * 4
  }
```

### Cache Keys and Versioning

```ruby
# ActiveRecord cache_key format: "users/123-20240101120000"
user.cache_key  # => "users/123-20240101120000"
user.cache_version  # => "20240101120000"

# Custom cache keys
Rails.cache.fetch(["api", "v1", "users", user, "profile"], expires_in: 1.hour)

# Cache key with version
Rails.cache.fetch("users/stats/#{DataVersion.for(:user_stats)}", expires_in: 1.hour)

# Collection cache key
User.maximum(:updated_at).to_f  # Use as collection-level cache key
```

---

## Counter Caches and Cache Invalidation

### Counter Cache Setup

```ruby
# db/migrate/xxxx_add_counter_cache_to_users.rb
class AddCounterCacheToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :orders_count, :integer, default: 0, null: false
    add_column :articles, :comments_count, :integer, default: 0, null: false
  end
end

# app/models/user.rb
class User < ApplicationRecord
  has_many :orders, counter_cache: true
  # Automatically: user.orders_count incremented/decremented
end

# Custom counter cache column
class Article < ApplicationRecord
  has_many :comments, counter_cache: :total_comments
end

# Conditional counter cache (custom implementation)
class Order < ApplicationRecord
  belongs_to :user, counter_cache: true

  after_update :adjust_user_orders_count, if: :saved_change_to_status?

  private

  def adjust_user_orders_count
    if status == "paid"
      user.increment!(:paid_orders_count)
    elsif status_before_last_save == "paid"
      user.decrement!(:paid_orders_count)
    end
  end
end
```

### Cache Invalidation Strategies

```ruby
# Touch-based invalidation
class Order < ApplicationRecord
  belongs_to :user, touch: true  # Updates user.updated_at
  belongs_to :article, touch: true  # Also touch article
end

# If user.updated_at changes, all caches keyed on user expire

# Custom callbacks for invalidation
class User < ApplicationRecord
  after_save :expire_user_cache
  after_destroy :expire_user_cache

  private

  def expire_user_cache
    Rails.cache.delete("user:#{id}")
    Rails.cache.delete("user:#{id}:profile")
    Rails.cache.delete("users/page/#{cache_page_number}")
  end

  def cache_page_number
    (self.id / 20.0).ceil
  end
end

# Sweeper-style invalidation with observers
class UserCacheSweeper < ActiveSupport::Sweeper
  observe User, Order

  def after_save(record)
    if record.is_a?(User)
      expire_user_caches(record)
    elsif record.is_a?(Order)
      expire_user_caches(record.user)
    end
  end
end
```

### Key-Based Cache Expiration

```ruby
# Automatic expiration using cache_key
# When user.updated_at changes, the cache key changes
# Old caches naturally expire or get evicted by TTL

# Collection-level key based on max updated_at
def collection_cache_key(collection)
  "#{collection.model_name.cache_key}/collection-#{collection.maximum(:updated_at).to_f}"
end

# View-level cache keys
json.cache!(["user-profile", @user.cache_key_with_version]) do
  json.partial! "user", user: @user
end

# Invalidation through observation pattern
class OrderObserver
  def after_create(order)
    # Invalidate user's orders cache
    order.user.touch
    # Invalidate admin stats cache if needed
    Rails.cache.delete("admin/dashboard/stats")
  end
end
```

---

## Background Jobs

### Sidekiq Optimization

```ruby
# config/sidekiq.yml
:concurrency: <%= ENV.fetch("SIDEKIQ_CONCURRENCY") { 10 } %>
:queues:
  - [critical, 5]
  - [webhooks, 4]
  - [mailers, 3]
  - [default, 2]
  - [exports, 1]
  - [cleanup, 1]
:max_retries: 3
:timeout: 25
:dead_max_jobs: 1000
:pidfile: tmp/pids/sidekiq.pid

# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV.fetch("REDIS_URL") { "redis://localhost:6379/1" },
    pool_size: ENV.fetch("SIDEKIQ_CONCURRENCY") { 10 }.to_i + 5,
    network_timeout: 5
  }

  config.server_middleware do |chain|
    chain.add Sidekiq::Middleware::Server::RetryJobs, max_retries: 3
  end

  # Schedule polling
  config.average_scheduled_poll_interval = 5
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV.fetch("REDIS_URL") { "redis://localhost:6379/1" },
    pool_size: 5,
    network_timeout: 5
  }
end
```

### Queue Management

```ruby
# Job prioritization by queue
class CriticalJob < ApplicationJob
  queue_as :critical
  sidekiq_options retry: 5, dead: false
end

class EmailJob < ApplicationJob
  queue_as :mailers
  sidekiq_options retry: 3, backtrace: true
end

class CsvExportJob < ApplicationJob
  queue_as :exports
  sidekiq_options retry: 1, expire_in: 1.hour
end

# Job with unique enforcement (prevents duplicates)
class ProcessPaymentJob < ApplicationJob
  queue_as :critical
  sidekiq_options unique: :until_executed, unique_expiration: 1.hour

  def perform(order_id)
    Order.find(order_id).process_payment!
  end
end
```

### Job Batching

```ruby
# Processing large datasets in batches
class ProcessUsersBatchJob < ApplicationJob
  queue_as :default

  def perform(start_id, end_id)
    User.where(id: start_id..end_id).find_each do |user|
      ProcessSingleUserJob.perform_later(user.id)
    end
  end
end

# Sidekiq batch (sidekiq-pro feature, alternative below)
# Manual batch tracking
class BatchProcessor
  def initialize(record_ids, job_class, batch_size: 100)
    @record_ids = record_ids
    @job_class = job_class
    @batch_size = batch_size
  end

  def process
    @record_ids.each_slice(@batch_size) do |batch_ids|
      @job_class.perform_later(batch_ids)
    end
  end
end

# Processing within a single job (for moderate datasets)
class OrderExportJob < ApplicationJob
  queue_as :exports
  sidekiq_options retry: 2, expire_in: 30.minutes

  def perform(order_ids)
    orders = Order.where(id: order_ids)
    csv_data = generate_csv(orders)
    upload_to_s3(csv_data)
    notify_user(csv_data)
  end

  private

  def generate_csv(orders)
    CSV.generate do |csv|
      csv << %w[ID Total Status Date]
      orders.find_each(batch_size: 500) do |order|
        csv << [order.id, order.total, order.status, order.created_at.iso8601]
      end
    end
  end
end
```

### Concurrency Control

```ruby
# Limit concurrent execution per resource
class ProcessOrderJob < ApplicationJob
  queue_as :default

  sidekiq_options lock: :until_executed,
                  lock_ttl: 30.minutes,
                  on_conflict: :reject

  def perform(order_id)
    order = Order.find(order_id)
    order.process!
  end
end

# Rate-limited job execution
class ApiWebhookJob < ApplicationJob
  queue_as :webhooks
  sidekiq_options throttle: {
    threshold: 50,
    period: 1.minute,
    key: ->(webhook_id) { "webhook:#{Webhook.find(webhook_id).user_id}" }
  }

  def perform(webhook_id, event)
    WebhookDeliveryService.new(webhook_id, event).call
  end
end
```

### ActiveJob Performance

```ruby
# Configure the queue adapter
# config/application.rb
config.active_job.queue_adapter = :sidekiq

# Default queue
class ApplicationJob < ActiveJob::Base
  queue_as :default

  # Retry configuration
  retry_on ActiveRecord::Deadlocked, wait: :exponentially_longer, attempts: 5
  retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 3
  discard_on ActiveJob::DeserializationError

  # Logging
  before_perform do |job|
    Rails.logger.info "Starting job: #{job.class} ##{job.job_id}"
  end
end
```

---

## Memory Management

### Object Allocation Tracking

```ruby
# Gemfile
group :development do
  gem "memory_profiler"
  gem "allocation_tracer"
  gem "derailed_benchmarks"
  gem "rack-mini-profiler"
end

# Using memory_profiler
require "memory_profiler"

report = MemoryProfiler.report do
  User.where(active: true).map(&:email)
end

report.pretty_print(to_file: "tmp/memory_report.txt")

# Focus on:
# Total allocated: 50.0 MB
# Total retained: 1.2 MB
# Object count: 250000
# String count: 120000
# Hash count: 30000
```

### Using allocation_tracer

```ruby
# config/initializers/allocation_trace.rb
if Rails.env.development?
  require "allocation_tracer"

  # Trace object allocations in specific methods
  ObjectSpace::AllocationTracer.setup(%i{type class path line method})

  trace = ObjectSpace::AllocationTracer.trace do
    100.times { User.where(active: true).to_a }
  end

  trace.group_by(&:first).transform_values(&:size)
  # => {[:T_STRING, User, ...]=>150, [:T_HASH, Hash, ...]=>50, ...}
end
```

### Derailed Benchmarks

```bash
# Check memory usage of different parts of the app
bundle exec derailed bundle:mem   # Check bundle memory
bundle exec derailed app:mem      # Check app object memory
bundle exec derailed app:objects  # List retained objects

# Per-request memory profiling
GETS=1 bundle exec derailed exec perf:mem
# Output:
# Total allocated: 50.23 MB (374936 objects)
# Total retained: 1.19 MB (8914 objects)
# Allocated memory by file:
#  app/serializers/user_serializer.rb: 5.2 MB
#  app/models/user.rb: 3.8 MB
#  ...

# Compare before/after a change
bundle exec derailed exec perf:mem > before.txt
# [make changes]
bundle exec derailed exec perf:mem > after.txt
diff before.txt after.txt
```

### GC Tuning

```ruby
# config/initializers/gc_tuning.rb
if Rails.env.production?
  # Configure GC settings based on application needs
  GC::Profiler.enable

  # Collect GC stats
  ActiveSupport::Notifications.subscribe "gc.gc" do |*args|
    event = ActiveSupport::Notifications::Event.new(*args)
    stat = GC.stat

    if stat[:minor_gc_count].to_i % 10 == 0
      Rails.logger.info({
        type: "gc_stats",
        major_gc_count: stat[:major_gc_count],
        minor_gc_count: stat[:minor_gc_count],
        heap_live_slots: stat[:heap_live_slots],
        heap_free_slots: stat[:heap_free_slots],
        total_allocated_objects: stat[:total_allocated_objects],
        time: event.duration
      })
    end
  end
end
```

### Object Retention Analysis

```ruby
# Use ObjectSpace to find retained objects
class ObjectRetentionAnalyzer
  def initialize
    @objects_before = []
  end

  def snapshot!
    @objects_before = ObjectSpace.count_objects
  end

  def analyze!
    after = ObjectSpace.count_objects
    diff = {}

    after.each do |type, count|
      before_count = @objects_before[type] || 0
      diff[type] = count - before_count
    end

    Rails.logger.info("Object retention diff: #{diff.inspect}")

    diff.each do |type, change|
      next if change <= 0
      Rails.logger.warn("Potential memory leak: #{type} increased by #{change}")
    end
  end

  def find_leaked_objects(klass)
    ObjectSpace.each_object(klass).select do |obj|
      obj.respond_to?(:created_at) && obj.created_at < 1.hour.ago
    end
  end
end
```

---

## Memory Bloat Detection and Fixes

### Common Memory Bloat Sources

```ruby
# 1. String allocations in loops (BAD)
users = User.all
result = ""
users.each do |user|
  result += user.email  # Creates new string each iteration!
end

# FIX: Use Array#join
result = User.pluck(:email).join

# 2. Hash allocations in loops (BAD)
result = []
users.each do |user|
  result << { id: user.id, email: user.email, name: user.name }
end

# FIX: Use pluck with multiple columns
data = User.pluck(:id, :email, :name)
result = data.map { |id, email, name| { id: id, email: email, name: name } }

# 3. ActiveRecord object retention (BAD)
User.all.each do |user|
  # User objects retained until loop finishes
end

# FIX: Batch processing
User.find_each(batch_size: 1000) do |user|
  # Each batch released after iteration
end

# 4. String concatenation in views (BAD)
<% @users.each do |user| %>
  <div><%= user.name + " - " + user.email %></div>
<% end %>

# FIX: String interpolation (same performance, more readable)
<div><%= "#{user.name} - #{user.email}" %></div>

# 5. Allocating large arrays
# BAD
all_ids = User.pluck(:id)  # Loads all IDs into memory
all_ids.each_slice(1000) { |batch| process(batch) }

# FIX
User.in_batches(of: 1000) { |batch| process(batch.pluck(:id)) }
```

### Memory Bloat Detection Tools

```ruby
# config/initializers/memory_monitor.rb
if Rails.env.production?
  module MemoryMonitor
    THRESHOLD_MB = 500

    def self.check!
      rss = GetProcessMem.new.mb
      return if rss < THRESHOLD_MB

      Rails.logger.warn("High memory usage: #{rss.round(2)} MB")

      if rss > THRESHOLD_MB * 2
        Rails.logger.error("Critical memory usage: #{rss.round(2)} MB, restarting...")
        # Trigger graceful restart
        raise "Memory limit exceeded"
      end
    end
  end

  # Check memory periodically
  Thread.new do
    loop do
      sleep 60
      MemoryMonitor.check!
    end
  end
end

# Gemfile
group :production do
  gem "get_process_mem"
  gem "memory_profiler"
end
```

### Fixing Memory Bloat

```ruby
# Strategy 1: Batch processing
# Before (bloated):
User.all.each { |user| SendEmailJob.perform_later(user.id) }

# After:
User.find_each(batch_size: 1000) { |user| SendEmailJob.perform_later(user.id) }

# Strategy 2: Pluck instead of AR objects
# Before:
emails = User.all.map(&:email)

# After:
emails = User.pluck(:email)

# Strategy 3: Selective column loading
# Before:
User.all

# After:
User.select(:id, :email, :name)

# Strategy 4: Use in_batches for mutations
# Before:
User.where(active: true).each { |u| u.update!(last_checked: Time.current) }

# After:
User.where(active: true).in_batches.update_all(last_checked: Time.current)

# Strategy 5: String pooling with -@ (frozen string literal)
# frozen_string_literal: true
# Or use .-@ for deduplication
email = user.email.-@  # Returns frozen, deduplicated string

# Strategy 6: Clear large variables when done
def process_export
  data = generate_large_csv
  upload_to_s3(data)
  data = nil  # Allow GC to collect
  GC.start    # Force GC if needed (use sparingly)
end
```

---

## View Performance

### Rendering Collections

```erb
<%# BAD: Rendering partials in a loop %>
<% @users.each do |user| %>
  <%= render partial: "user", locals: { user: user } %>
<% end %>

<%# GOOD: Using render collection (automatic batching) %>
<%= render partial: "user", collection: @users, cached: true %>

<%# BEST: Render collection with caching %>
<%= render partial: "user", collection: @users, cached: ->(user) { user } %>
```

### Partial Caching

```ruby
# app/views/users/_user.html.erb
<% cache(user) do %>
  <div class="user-card">
    <%= user.name %>
    <%= render user.orders %>
  </div>
<% end %>

# app/views/orders/_order.html.erb
<% cache(order) do %>
  <div class="order-item">
    <span><%= order.total %></span>
    <span><%= order.status %></span>
  </div>
<% end %>
```

### Streaming Templates

```ruby
# config/initializers/streaming.rb
# Enable response streaming for large collections
class Api::V1::UsersController < ApplicationController
  include ActionController::Live

  def index
    response.headers["Content-Type"] = "application/json"
    response.headers["Last-Modified"] = Time.current.httpdate
    response.headers["Cache-Control"] = "no-cache"

    respond_to do |format|
      format.json do
        response.stream.write('{"data":[')

        first = true
        User.find_each(batch_size: 100) do |user|
          response.stream.write(",") unless first
          first = false
          response.stream.write(UserSerializer.new(user).serialize.to_json)
        end

        response.stream.write('],"meta":{"total":')
        response.stream.write(User.count.to_s)
        response.stream.write('}}')
      ensure
        response.stream.close
      end
    end
  end
end

# Simplified streaming with Enumerator
class Api::V1::UsersController < ApplicationController
  def index
    set_charset!
    render body: UserStreamer.new(User.all)
  end
end

class UserStreamer
  def initialize(relation)
    @relation = relation
  end

  def each
    yield '{"data":'
    yield @relation.to_json
    yield ',"meta":{"total":'
    yield @relation.count.to_s
    yield "}}"
  end
end
```

### View Rendering Benchmarks

```ruby
# Benchmark different rendering approaches
require "benchmark"

users = User.limit(100)

Benchmark.mb do |x|
  x.report("render collection") do
    render partial: "user", collection: users
  end

  x.report("each with partial") do
    users.each { |u| render partial: "user", locals: { user: u } }
  end

  x.report("inline") do
    users.map { { id: u.id, name: u.name } }
  end
end
```

---

## Asset Pipeline Optimization

### Sprockets vs Propshaft

```ruby
# Rails 7+: Propshaft (new default, simpler, faster)
# Gemfile
gem "propshaft"

# config/assets/manifest.js (Propshaft)
//= link_tree ../images
//= link_tree ../builds
//= link application.css
//= link application.js

# Pre-compress assets
# config/environments/production.rb
config.assets.css_compressor = :sass
config.assets.js_compressor = :terser

# Propshaft is faster because it doesn't process assets at runtime
# No more asset pipeline precompile issues
```

### Bundling with importmap / jsbundling / cssbundling

```ruby
# Option 1: importmap (no transpilation, no bundling - fastest)
# Gemfile
gem "importmap-rails"

# config/importmap.rb
pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true

# Option 2: jsbundling-rails (esbuild/rollup/webpack)
# Gemfile
gem "jsbundling-rails"
gem "cssbundling-rails"

# package.json scripts
# "build": "esbuild app/javascript/*.* --bundle --sourcemap --outdir=app/assets/builds"

# Production: precompile and compress
NODE_ENV=production rails assets:precompile
```

### CSS/JS Compression

```ruby
# config/environments/production.rb

# Enable gzip/brotli compression
config.middleware.use Rack::Deflater

# CSS compression
config.assets.css_compressor = :sass

# JS compression (requires terser gem or node)
# Gemfile
gem "terser"
# config/environments/production.rb
config.assets.js_compressor = :terser

# Or use YUI Compressor
# config.assets.js_compressor = :yui
```

### Asset Precompilation

```ruby
# config/initializers/assets.rb
Rails.application.config.assets.version = "1.0"

# Add additional asset precompile paths
Rails.application.config.assets.precompile += %w[
  admin.js
  admin.css
  *.svg
  *.eot
  *.woff
  *.woff2
]

# Enable asset fingerprinting
# config/environments/production.rb
config.assets.digest = true
```

---

## Connection Pooling

### Database Connection Pool Tuning

```ruby
# config/database.yml
production:
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  timeout: 5000
  database: myapp_production
  username: myapp
  password: <%= Rails.application.credentials.database_password %>

# Connection pool calculation
# RAILS_MAX_THREADS = PUMA_THREADS * WORKERS + SIDEKIQ_CONCURRENCY + EXTRA
# Example:
#   Puma: 3 workers * 5 threads = 15
#   Sidekiq: 10 concurrency
#   Extra (console, etc): 5
#   Total pool: 30

# config/puma.rb
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count
```

### PgBouncer Configuration

```ini
# pgbouncer.ini
[databases]
myapp = host=localhost port=5432 dbname=myapp_production

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool modes:
# session - connection returned after session ends (default, safest)
# transaction - connection returned after transaction (higher perf)
# statement - connection returned after statement (highest perf, risky)

# For Rails, use session or transaction mode
pool_mode = transaction

# Pool sizing
default_pool_size = 25
max_client_conn = 100
max_db_connections = 50
reserve_pool_size = 5
reserve_pool_timeout = 3.0

# Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 30
```

### PgBouncer vs Rails Pool

```ruby
# When using PgBouncer:
# - Set Rails pool LARGER than without PgBouncer
# - PgBouncer acts as a proxy, handling the actual DB connections
# - Rails connections are just client connections to PgBouncer

# config/database.yml with PgBouncer
production:
  adapter: postgresql
  host: localhost
  port: 6432  # PgBouncer port
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 25 } %>  # Larger pool
  database: myapp
  username: myapp
  password: <%= Rails.application.credentials.database_password %>

# config/initializers/connection_pool_monitor.rb
module ConnectionPoolMonitor
  def self.log_stats
    pool = ActiveRecord::Base.connection_pool
    Rails.logger.info({
      type: "connection_pool",
      size: pool.size,
      connections: pool.connections.size,
      active: pool.connections.count(&:in_use?),
      idle: pool.connections.count(&:idle?),
      waiting: pool.num_waiting_in_queue
    })
  end
end

# Monitor every 5 minutes
Thread.new do
  loop do
    sleep 300
    ConnectionPoolMonitor.log_stats
  end
end
```

---

## Puma Configuration

### Threads vs Workers

```ruby
# config/puma.rb

# Thread configuration
# Single mode (development)
max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Worker configuration (production)
# Workers provide parallelism through multiple processes
# Threads provide concurrency within each worker
if ENV.fetch("RAILS_ENV") { "development" } == "production"
  worker_count = ENV.fetch("WEB_CONCURRENCY") { 2 }.to_i
  workers worker_count if worker_count > 0
end

# Recommendation:
# - I/O heavy app: More threads per worker (less workers)
# - CPU heavy app: More workers (less threads per worker)
# - General: 2-4 workers with 5-10 threads each

# Thread safety: All code must be thread-safe when using multiple threads
# - Avoid class variables
# - Use Mutex for shared resources
# - Ensure gems are thread-safe
```

### preload_app! and on_worker_boot

```ruby
# config/puma.rb

# Preload the application in the master process
# Saves memory through copy-on-write (CoW)
# Workers fork from the preloaded master
preload_app!

# Called in the master before forking workers
on_master_boot do
  # Warm up caches
  Rails.cache.fetch("config/feature_flags") { FeatureFlag.all.to_a }

  # Establish database connection in master (for CoW benefits)
  ActiveRecord::Base.connection.disconnect!
end

# Called in each worker after forking
on_worker_boot do
  # Re-establish database connections (connections NOT shared across fork)
  ActiveRecord::Base.establish_connection

  # Re-establish Redis connections
  Redis.current.disconnect!
  Redis.current = Redis.new(url: ENV.fetch("REDIS_URL"))
end

# on_worker_shutdown - cleanup before worker exits
on_worker_shutdown do
  Redis.current.disconnect!
end

# Graceful shutdown
# SIGQUIT - Graceful shutdown (stop accepting requests, finish current, exit)
# SIGTERM - Forceful shutdown (stop immediately)
```

### Cluster Mode Configuration

```ruby
# config/puma.rb

# Production cluster configuration
workers ENV.fetch("WEB_CONCURRENCY") { 2 }.to_i
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }.to_i
threads threads_count, threads_count

preload_app!

rackup DefaultRackup
port ENV.fetch("PORT") { 3000 }
environment ENV.fetch("RAILS_ENV") { "production" }

# Worker timeout (kill workers that hang)
worker_timeout 30

# Restart workers periodically to prevent memory leaks
# Restart every 5000 requests (helps with memory bloat)
if ENV.fetch("RAILS_ENV") { "development" } == "production"
  worker_timeout 30
  # phased_restart available in cluster mode
end

# Low-level error handling
lowlevel_error_handler do |ex|
  Raven.capture_exception(ex)
  [500, {}, ["Internal Server Error"]]
end
```

### Puma Memory Tuning

```ruby
# config/puma.rb

# Memory-based worker rotation
before_fork do
  require "puma_worker_killer"

  # Restart workers that exceed memory threshold
  PumaWorkerKiller.config do |config|
    config.ram = ENV.fetch("PUMA_RAM_MB") { 1024 }.to_i  # Total RAM in MB
    config.frequency = 30  # Check every 30 seconds
    config.percent_usage = 0.85  # Restart when 85% of RAM used
    config.rolling_restart_frequency = 12 * 3600  # Restart every 12 hours
  end
  PumaWorkerKiller.start
end
```

---

## Middleware Stack Optimization

### Removing Unused Middleware

```ruby
# config/environments/production.rb

# API-only: remove session/cookie middleware
Rails.application.config.middleware.delete ActionDispatch::Cookies
Rails.application.config.middleware.delete ActionDispatch::Session::CookieStore
Rails.application.config.middleware.delete ActionDispatch::Flash
Rails.application.config.middleware.delete ActionDispatch::ContentSecurityPolicy::Middleware

# Remove debug middleware in production
Rails.application.config.middleware.delete Rack::MethodOverride  # If not using forms

# Check current middleware stack
# rails middleware
# Output:
# use ActionDispatch::HostAuthorization
# use Rack::Sendfile
# use ActionDispatch::Static
# use ActionDispatch::Executor
# ...
```

### Compression Middleware

```ruby
# config/environments/production.rb

# Enable gzip compression
config.middleware.use Rack::Deflater

# Or use Brotli for better compression
# Gemfile
gem "rack-brotli"

# config/environments/production.rb
config.middleware.insert_before Rack::Deflater, Rack::Brotli

# Configures compression level (1-11, higher = slower but smaller)
Rack::Brotli.configure do |config|
  config.quality = 5  # Balance between speed and compression
end

# Don't compress already-compressed content
config.middleware.use Rack::Deflater do |body|
  body.bytesize > 1024  # Only compress responses > 1KB
end
```

### Custom Middleware for Performance

```ruby
# app/middleware/request_timer.rb
class RequestTimer
  def initialize(app)
    @app = app
  end

  def call(env)
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    status, headers, body = @app.call(env)
    duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start
    headers["X-Runtime"] = (duration * 1000).round(3).to_s
    [status, headers, body]
  end
end

# app/middleware/db_runtime.rb
class DbRuntime
  def initialize(app)
    @app = app
  end

  def call(env)
    db_runtime = 0
    ActiveSupport::Notifications.subscribe("sql.active_record") do |*args|
      event = ActiveSupport::Notifications::Event.new(*args)
      db_runtime += event.duration
    end

    status, headers, body = @app.call(env)
    headers["X-Db-Runtime"] = db_runtime.round(2).to_s
    [status, headers, body]
  end
end
```

---

## SQL Query Optimization

### Composite Indexes

```ruby
# db/migrate/xxxx_add_composite_indexes.rb
class AddCompositeIndexes < ActiveRecord::Migration[7.1]
  def change
    # Composite index for common query patterns
    # WHERE status = 'active' AND created_at > '2024-01-01' ORDER BY created_at DESC
    add_index :users, [:status, :created_at], order: { created_at: :desc }

    # Composite index with includes
    add_index :orders, [:user_id, :status, :created_at],
              name: "idx_orders_user_status_date"

    # Index for join queries
    add_index :line_items, [:order_id, :product_id],
              name: "idx_line_items_order_product"

    # Unique composite index
    add_index :memberships, [:user_id, :organization_id], unique: true
  end
end
```

### Partial Indexes

```ruby
# PostgreSQL-only: indexes on a subset of rows

# Instead of indexing all users, index only active ones
add_index :users, :created_at, where: "active = true",
          name: "idx_users_active_created_at"

# Index for a specific query pattern
add_index :orders, :created_at, where: "status = 'pending'",
          name: "idx_orders_pending_created"

# Conditional index for soft-delete queries
add_index :products, :category_id, where: "deleted_at IS NULL",
          name: "idx_products_active_category"
```

### Covering Indexes

```ruby
# PostgreSQL: Include additional columns in the index
# Avoids visiting the table (index-only scan)

# When you always select these columns together
add_index :users, [:organization_id],
          include: [:email, :first_name, :last_name],
          name: "idx_users_org_covering"

# Query that can use index-only scan:
User.where(organization_id: 1).select(:email, :first_name, :last_name)
# => No table access needed, all data in index!

# For sorted queries
add_index :orders, [:user_id, :created_at],
          include: [:total, :status],
          name: "idx_orders_user_created_covering"
```

### Query Optimization Examples

```ruby
# BAD: Full table scan for date range
Order.where("created_at > ?", 7.days.ago).where(status: "paid")

# FIX: Add composite index
add_index :orders, [:status, :created_at], order: { created_at: :desc }

# BAD: ORDER BY without proper index
User.where(organization_id: 1).order(last_name: :asc, first_name: :asc)

# FIX: Matching index for sort
add_index :users, [:organization_id, :last_name, :first_name]

# BAD: LIKE query with leading wildcard
User.where("email LIKE ?", "%@example.com")

# FIX: Use trigram index for pattern matching
# enable extension :pg_trgm
add_index :users, :email, using: :gin, opclass: :gin_trgm_ops

# BAD: COUNT(DISTINCT) on large table
User.where(organization_id: 1).distinct.count(:email)

# FIX: Use COUNT with proper index
add_index :users, [:organization_id, :email]

# BAD: Subquery
User.where("id IN (SELECT user_id FROM orders WHERE total > 100)")

# FIX: JOIN with DISTINCT (often faster)
User.joins(:orders).where(orders: { total: 101.. }).distinct
```

### Optimizer Hints

```ruby
# PostgreSQL optimizer hints (with pg_hint_plan extension)
User.optimizer_hints("SET enable_hashjoin = off")
    .joins(:orders)
    .where(orders: { status: "paid" })

# Force index usage
User.from("#{User.table_name} WITH (index(users_idx_status_created))")
    .where(status: "active")
    .order(created_at: :desc)
```

---

## ActiveRecord Performance

### Batch Processing

```ruby
# find_each - Default batch size 1000
User.find_each do |user|
  SendNotificationJob.perform_later(user.id)
end

# Custom batch size
User.find_each(batch_size: 5000) do |user|
  user.update!(last_checked: Time.current)
end

# find_in_batches - Works with batches of records
User.find_in_batches(batch_size: 1000) do |users|
  User.where(id: users.map(&:id)).update_all(processed: true)
end

# in_batches - Works with relation scope (PostgreSQL)
User.where(active: true).in_batches(of: 1000) do |relation|
  relation.update_all(checked_at: Time.current)
  relation.delete_all
end

# Each with batch order
User.in_batches(of: 1000, order: :desc) do |relation|
  relation.where("created_at < ?", 1.year.ago).delete_all
end
```

### pluck vs select

```ruby
# pluck - Returns raw values, no AR instantiation
# BAD
emails = User.where(active: true).map(&:email)
# SELECT * FROM users WHERE active = true (loads all columns)

# GOOD
emails = User.where(active: true).pluck(:email)
# SELECT email FROM users WHERE active = true

# Multiple columns
data = User.where(active: true).pluck(:id, :email, :name)
# Returns array of arrays

# pluck with joins
User.joins(:orders)
    .where(orders: { status: "paid" })
    .pluck("users.id", "users.email", "orders.total")

# select - Creates AR objects with limited columns
users = User.select(:id, :email).where(active: true)
# Returns User objects (with nil for unloaded attributes)
users.first.email  # Works
users.first.name   # nil (not loaded) - raises ActiveModel::MissingAttributeError
```

### strict_loading

```ruby
# Prevent lazy loading globally
class ApplicationRecord < ActiveRecord::Base
  self.strict_loading_by_default = true
end

# Per-model enforcement
class User < ApplicationRecord
  has_many :orders, strict_loading: true
end

# Per-query enforcement
User.strict_loading.includes(:orders).find_each do |user|
  user.orders  # Safe - already loaded
end

# Without strict_loading:
User.find_each do |user|
  user.orders  # N+1 - not caught except by Bullet
end

# With strict_loading:
User.find_each do |user|
  user.orders  # Raises ActiveRecord::StrictLoadingViolationError!
end

# N+1 only mode (Rails 7.1+)
User.strict_loading(:n_plus_one_only).find_each do |user|
  user.orders  # Still N+1 but only warns/raises for association access
end
```

### exists? vs any? vs present?

```ruby
# exists? - Fastest, generates EXISTS query
User.exists?(email: "test@example.com")
# SELECT 1 AS one FROM users WHERE email = 'test@example.com' LIMIT 1

# any? - Loads records if not already loaded
users.any? { |u| u.active? }
# Checks in-memory if loaded, otherwise queries

# present? - Opposite of blank?, loads all records
users.present?
# Loads ALL records just to check count

# empty? - Checks if collection is empty
users.empty?
# Uses COUNT if not loaded

# Performance order:
# exists? > empty? (with COUNT) >> any? (with LIMIT) >> present? (loads all)
```

### Bulk Operations

```ruby
# insert_all - Bulk insert (fast, no callbacks)
User.insert_all([
  { email: "a@test.com", name: "A", created_at: Time.current, updated_at: Time.current },
  { email: "b@test.com", name: "B", created_at: Time.current, updated_at: Time.current }
])

# upsert_all - Insert or update
User.upsert_all(
  [
    { email: "a@test.com", name: "A" },
    { email: "b@test.com", name: "B" }
  ],
  unique_by: :email
)

# update_all - Bulk update (fast, no callbacks)
User.where(organization_id: 1).update_all(role: "member", updated_at: Time.current)

# delete_all - Bulk delete (fast, no callbacks)
User.where("last_sign_in_at < ?", 1.year.ago).delete_all

# destroy_all - Slow, runs callbacks
User.where("last_sign_in_at < ?", 1.year.ago).destroy_all

# touch_all (Rails 7.1+)
User.where(organization_id: 1).touch_all
```

### Database-Level Operations

```ruby
# Use database defaults for performance
add_column :users, :login_count, :integer, default: 0, null: false
add_column :users, :settings, :jsonb, default: {}

# Use generated columns (PostgreSQL 12+)
add_column :orders, :total_cents, :integer, null: false
add_column :orders, :total_dollars, :virtual,
           type: :decimal, as: "total_cents / 100.0", stored: true

# Use materialized views for complex aggregations
# db/views/user_stats.sql
CREATE MATERIALIZED VIEW user_stats AS
SELECT
  user_id,
  COUNT(*) AS order_count,
  SUM(total) AS total_revenue,
  MAX(created_at) AS last_order_date
FROM orders
GROUP BY user_id;

# Refresh periodically
UserStats.refresh

# Or concurrently (no lock)
Scenic.database.refresh_materialized_view("user_stats", concurrently: true)
```

---

## Slow Query Logging and Analysis

### Rails Slow Query Logging

```ruby
# config/initializers/slow_query_log.rb
if Rails.env.production?
  ActiveSupport::Notifications.subscribe("sql.active_record") do |*args|
    event = ActiveSupport::Notifications::Event.new(*args)
    payload = event.payload

    if event.duration > 100  # Queries slower than 100ms
      Rails.logger.warn({
        type: "slow_query",
        duration: event.duration.round(2),
        sql: payload[:sql].squish,
        name: payload[:name],
        cached: payload[:cached] || false,
        connection_id: payload[:connection_id]
      })
    end
  end
end

# Rails 7.1+: built-in slow query logging
# config/environments/production.rb
config.active_record.slow_query_log_threshold = 100  # milliseconds
config.active_record.slow_query_log_source = "production"
```

### pgHero Configuration

```ruby
# Gemfile
gem "pghero"

# config/initializers/pghero.rb
PgHero.show_multi_factor = true
PgHero.long_running_query_sec = 60
PgHero.slow_query_ms = 100
PgHero.total_connections_graph = true

# Mount in routes
Rails.application.routes.draw do
  mount PgHero::Engine, at: "pghero" if Rails.env.production?
end

# Track query stats
# Schedule this to run periodically:
PgHero.capture_query_stats
PgHero.capture_space_stats

# Analyze slow queries
PgHero.slow_queries  # List slow queries
PgHero.kill(pid)     # Kill a long-running query
```

### rack-mini-profiler

```ruby
# Gemfile
gem "rack-mini-profiler", group: :development

# config/initializers/mini_profiler.rb
Rack::MiniProfiler.config.position = "bottom-right"
Rack::MiniProfiler.config.start_hidden = false
Rack::MiniProfiler.config.auto_inject = true

# Show memory profiling
Rack::MiniProfiler.config.enable_advanced_debugging_tools = true

# For API-only apps, enable via query param
# Add ?pp=help to see all options
# ?pp=profile-memory - Memory profile
# ?pp=flamegraph - Flame graph
# ?pp=env - Environment variables
```

### Scout / Skylight Configuration

```ruby
# Gemfile
gem "scout_apm"
gem "skylight"

# config/scout_apm.yml
common: &defaults
  name: MyApp
  key: <%= ENV["SCOUT_KEY"] %>
  monitor: true
  dev_trace: false

production:
  <<: *defaults

# config/skylight.yml
authentication: <%= ENV["SKYLIGHT_AUTHENTICATION"] %>
enable_sidekiq: true
ignored_endpoints:
  - HealthController#show

# Monitor specific operations
class User < ApplicationRecord
  include Skylight::Helpers

  instrument_method
  def expensive_operation
    # ...
  end

  instrument_class_method
  def self.batch_process
    # ...
  end
end
```

### pgBadger

```bash
# Generate report from PostgreSQL logs
pgbadger /var/log/postgresql/postgresql-*.log -o report.html

# Enable query logging in PostgreSQL
# postgresql.conf
log_min_duration_statement = 100  # Log queries > 100ms
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h'
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0
```

---

## Garbage Collection Tuning

### GC Settings for Rails

```ruby
# config/initializers/gc.rb
if Rails.env.production?
  # Tune GC for web requests (short-lived objects)
  # These reduce major GC frequency at cost of more minor GCs

  # Increase heap slots to reduce GC cycles
  ENV["RUBY_GC_HEAP_INIT_SLOTS"] ||= "1000000"
  ENV["RUBY_GC_HEAP_FREE_SLOTS"] ||= "4096"
  ENV["RUBY_GC_HEAP_GROWTH_FACTOR"] ||= "1.1"
  ENV["RUBY_GC_HEAP_GROWTH_MAX_SLOTS"] ||= "100000"
  ENV["RUBY_GC_HEAP_OLDOBJECT_LIMIT_FACTOR"] ||= "2.0"

  # OLDSIZE (old generation limit) for major GC frequency
  ENV["RUBY_GC_OLDMALLOC_LIMIT"] ||= "60000000"
  ENV["RUBY_GC_MALLOC_LIMIT"] ||= "80000000"

  # Disable GC in specific scenarios
  class GcOptimizer
    def self.optimize_for_web
      # During request: more frequent minor GC
      GC::Profiler.enable
    end

    def self.optimize_for_batch
      # During batch jobs: reduce GC frequency
      GC.disable
      yield
    ensure
      GC.enable
      GC.start
    end
  end
end
```

### GC Tuning Strategy

```ruby
# Monitor GC behavior per request
# config/initializers/gc_monitor.rb
module GCMonitor
  def self.log_stats
     stats = GC.stat
     time = GC::Profiler.total_time

     Rails.logger.info({
       type: "gc_stats",
       minor_gc_count: stats[:minor_gc_count],
       major_gc_count: stats[:major_gc_count],
       heap_used: stats[:heap_used_slots],
       heap_free: stats[:heap_free_slots],
       old_objects: stats[:old_objects],
       time_spent_ms: (time * 1000).round(2)
     })

     GC::Profiler.clear
   end
end

# Attach to request lifecycle
ActiveSupport::Notifications.subscribe "process_action.action_controller" do |*args|
  GCMonitor.log_stats
end

# Key metrics to watch:
# - major_gc_count: Should stay low (< 1 per request)
# - heap_used_slots: Steady growth may indicate memory leak
# - old_objects: Growth indicates object promotion (potential leak)
```

### GC Configuration Comparison

```ruby
# Conservative (stable, default-like)
# RUBY_GC_HEAP_INIT_SLOTS=100000
# RUBY_GC_HEAP_GROWTH_FACTOR=1.8
# RUBY_GC_HEAP_OLDOBJECT_LIMIT_FACTOR=2.0
# Pro: Stable memory, less tuning needed
# Con: More frequent major GCs

# Aggressive (for high-throughput APIs)
# RUBY_GC_HEAP_INIT_SLOTS=1000000
# RUBY_GC_HEAP_GROWTH_FACTOR=1.1
# RUBY_GC_HEAP_GROWTH_MAX_SLOTS=100000
# RUBY_GC_HEAP_OLDOBJECT_LIMIT_FACTOR=3.0
# Pro: Fewer major GCs, better throughput
# Con: Higher peak memory usage

# Memory-constrained (for low-memory environments)
# RUBY_GC_HEAP_INIT_SLOTS=50000
# RUBY_GC_HEAP_GROWTH_FACTOR=1.05
# RUBY_GC_HEAP_OLDOBJECT_LIMIT_FACTOR=1.3
# RUBY_GC_MALLOC_LIMIT=16000000
# Pro: Lower memory footprint
# Con: More frequent GC cycles
```

### Forcing GC in Workers

```ruby
# config/initializers/gc_worker.rb
module GcWorker
  SCHEDULE = [
    { after: 10.seconds, type: :lazy },
    { after: 30.seconds, type: :full },
    { after: 60.seconds, type: :full },
    { after: 120.seconds, type: :full }
  ].freeze

  def self.start_worker_timer
    Thread.new do
      loop do
        sleep 120  # Run every 2 minutes
        GC.start(full_mark: true, immediate_sweep: true)
      end
    end
  end
end

# In Puma worker boot
on_worker_boot do
  GcWorker.start_worker_timer
end
```

---

## Best Practices and Anti-Patterns

### Performance Anti-Patterns

```ruby
# 1. Loading all records (memory bloat)
# BAD
User.all.each { |u| process(u) }
# GOOD
User.find_each { |u| process(u) }

# 2. N+1 queries in serializers
# BAD
class UserSerializer
  attributes :id, :email
  has_many :orders  # N+1 if not eager loaded
end
# GOOD
render json: User.includes(:orders).all, each_serializer: UserSerializer

# 3. COUNT in loops
# BAD
users.each { |u| u.orders.count }
# GOOD
User.left_joins(:orders).select("users.*, COUNT(orders.id) AS order_count").group("users.id")

# 4. Missing indexes on foreign keys
# BAD
add_reference :orders, :user  # No index created by default
# GOOD
add_reference :orders, :user, foreign_key: true, index: true

# 5. Loading AR objects just for one field
# BAD
User.all.map(&:email)  # Loads all columns, all rows
# GOOD
User.pluck(:email)

# 6. Using count on large tables repeatedly
# BAD
User.count  # Full table scan each time
# GOOD
# Use approximate count if exact not needed
User.estimated_count  # PostgreSQL: uses pg_class.reltuples
Rails.cache.fetch("user_count", expires_in: 5.minutes) { User.count }

# 7. Not using strict_loading in development
# BAD
# config/environments/development.rb - missing strict_loading
# GOOD
config.active_record.strict_loading_by_default = true

# 8. Unoptimized ORDER BY with LIMIT
# BAD
User.where(active: true).order(:created_at).limit(20)
# Missing index on (active, created_at)

# 9. Serializing entire object unnecessarily
# BAD
render json: @user.to_json  # Includes everything, including sensitive data
# GOOD
render json: UserSerializer.new(@user).serializable_hash

# 10. Not using database constraints for data integrity
# BAD
validates :email, presence: true  # Only application-level
# GOOD
add_index :users, :email, unique: true  # Database-level too
```

### Performance Checklist

- [ ] Are all database queries covered by indexes? Check with `EXPLAIN ANALYZE`
- [ ] Are N+1 queries eliminated? Verify with Bullet in development
- [ ] Are list endpoints paginated with cursor-based pagination for large datasets?
- [ ] Is eager loading used in all controller index/show actions?
- [ ] Are counter caches configured for frequently counted associations?
- [ ] Are background jobs used for slow/expensive operations?
- [ ] Is `strict_loading` enabled in development?
- [ ] Are `pluck`/`select` used instead of full object loading when only few fields needed?
- [ ] Are `find_each`/`find_in_batches` used for batch operations on large tables?
- [ ] Are Redis/Memcached responses cached for expensive computations?
- [ ] Is the database connection pool sized correctly for Puma/Sidekiq?
- [ ] Are HTTP cache headers set on GET endpoints?
- [ ] Are unused middleware removed (especially in API-only apps)?
- [ ] Is gzip/brotli compression enabled?
- [ ] Are background job queues prioritized correctly?
- [ ] Is GC tuned for the workload pattern (web vs batch)?
- [ ] Are memory profilers run periodically to detect leaks?
- [ ] Is `preload_app!` enabled in Puma for CoW memory savings?
- [ ] Are composite indexes covering common query patterns?
- [ ] Is query logging configured for slow queries (>100ms)?
- [ ] Are materialized views considered for complex aggregations?

### Monitoring Alerts

```ruby
# Configure alerts for:
# 1. Response time > 500ms P95
# 2. Database query time > 100ms average
# 3. Puma worker memory > 500MB
# 4. Sidekiq queue depth > 1000
# 5. Database connection pool saturation (>80% utilization)
# 6. GC major count > 10 per minute
# 7. Slow queries > 100ms count > 100/minute
# 8. Error rate > 1% of requests
# 9. Background job failure rate > 5%
# 10. Cache hit rate < 80%
```

### Performance Budget

```ruby
# Establish and enforce performance budgets
PERFORMANCE_BUDGETS = {
  response_time_p95_ms: 500,
  db_query_time_avg_ms: 50,
  view_rendering_time_ms: 100,
  memory_per_request_mb: 50,
  objects_per_request: 10000,
  db_queries_per_request: 15,
  asset_size_kb: {
    js: 200,
    css: 100,
    images: 500
  },
  api_response_payload_size_kb: 100
}.freeze

# Check in CI
# spec/performance/response_time_spec.rb
RSpec.describe "API performance" do
  it "responds within budget" do
    expect {
      get "/api/v1/users", headers: auth_headers
    }.to perform_under(500).ms
  end

  it "executes reasonable number of queries" do
    expect {
      get "/api/v1/users", headers: auth_headers
    }.to make_database_queries(count: { maximum: 15 })
  end
end
```
