---
name: rails
description: >
  Use this skill when designing Ruby on Rails backends — MVC, ActiveRecord, gems, API mode, testing, background jobs, authentication. This skill enforces: API-only mode structure, service object pattern, UUID primary keys, RSpec testing conventions. Do NOT use for: frontend Rails views, database schema design outside ActiveRecord, non-Rails Ruby projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, ruby, rails, phase-4]
---

# Ruby on Rails

## Purpose
Define and enforce Ruby on Rails backend architecture, API conventions, and service object patterns.

## Agent Protocol

### Trigger
User request includes: `rails`, `ruby on rails`, `ror`, `active record`, `rails api`, `ruby backend`, `rails migration`, `rails model`, `rails controller`.

### Input Context
- Rails version (7.x)
- Mode (API-only, full Rails)
- Database (PostgreSQL, MySQL, SQLite)
- Authentication (Devise, JWT)

### Output Artifact
A markdown document containing:
- Project structure
- Model/controller/service design
- API conventions
- Database migration patterns
- Background jobs (Sidekiq, GoodJob)
- Testing (RSpec, FactoryBot)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Project Structure (API-only)
```
app/
├── controllers/
│   ├── application_controller.rb
│   └── api/
│       └── v1/
│           ├── orders_controller.rb
│           └── products_controller.rb
├── models/
│   ├── application_record.rb
│   ├── order.rb
│   └── order_item.rb
├── services/
│   ├── order_service.rb
│   └── payment_service.rb
├── serializers/          # jbuilder, active_model_serializers, blueprinter
│   ├── order_serializer.rb
│   └── product_serializer.rb
├── policies/             # Pundit authorization
│   └── order_policy.rb
└── jobs/
    ├── application_job.rb
    └── order_confirmation_job.rb
```

### Step 2: Design API Controller
```ruby
module Api
  module V1
    class OrdersController < ApplicationController
      before_action :authenticate_user!

      def index
        orders = Order.where(user: current_user)
                      .includes(:items)
                      .page(params[:page])
                      .per(params[:per_page] || 20)
        render json: OrderSerializer.new(orders).serializable_hash
      end

      def show
        order = Order.find(params[:id])
        authorize order
        render json: OrderSerializer.new(order).serializable_hash
      end

      def create
        result = Orders::CreateOrder.call(order_params.merge(user: current_user))
        if result.success?
          render json: OrderSerializer.new(result.order), status: :created
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end
    end
  end
end
```

### Step 3: Implement Service Object Pattern
```ruby
# app/services/orders/create_order.rb
module Orders
  class CreateOrder < ApplicationService
    def initialize(params)
      @params = params
    end

    def call
      order = Order.create!(@params)
      OrderConfirmationJob.perform_async(order.id)
      Result.success(order)
    rescue ActiveRecord::RecordInvalid => e
      Result.failure(e.record.errors)
    end
  end
end
```

### Step 4: Create Database Migration
```ruby
class CreateOrders < ActiveRecord::Migration[7.1]
  def change
    create_table :orders, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :status, null: false, default: 'pending'
      t.decimal :total, precision: 19, scale: 4, null: false
      t.timestamps
    end
    add_index :orders, [:status, :created_at]
  end
end
```

### Step 5: Write Tests with RSpec
```ruby
RSpec.describe Api::V1::OrdersController, type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  describe 'GET /api/v1/orders' do
    it 'returns paginated orders' do
      create_list(:order, 3, user: user)
      get '/api/v1/orders', headers: headers
      expect(response).to have_http_status(:ok)
      expect(json['data'].length).to eq(3)
    end
  end
end
```

## Rails 8 Patterns

### Current Best Practices (Rails 7.1+ / 8.0)
```yaml
rails_8_patterns:
  authentication:
    default: "has_secure_password (Rails 7.1+) for API tokens"
    alternatives: ["Devise for full auth UI", "JWT for stateless API auth"]
    recommendation: "Use has_secure_token for API key generation, has_secure_password for password hashing"
    
  background_jobs:
    production_default: "Solid Queue (Rails 8 default) — SQLite/PostgreSQL-backed, no Redis dependency"
    alternative: "Sidekiq for high-throughput (>10k jobs/min) with Redis"
    comparison:
      solid_queue: "Lower ops overhead, no Redis, good for 90% of apps"
      sidekiq: "Higher throughput, mature ecosystem, Redis dependency"
    
  caching:
    strategies:
      - "Russian doll caching for view fragments"
      - "Low-level caching for expensive queries (Rails.cache)"
      - "HTTP caching (ETags, Last-Modified) for API responses"
      - "Solid Cache (Rails 8) — database-backed cache store"
    
  database:
    default: "PostgreSQL — UUID primary keys, pgvector, JSONB"
    alternatives: "SQLite for single-server apps with Solid Stack (Rails 8)"
    migration_gems: ["strong_migrations for safe production migrations", "lhm for zero-downtime DDL"]
    
  api_mode:
    defaults:
      - "API-only mode (rails new app --api)"
      - "JSON:API specification with serializers (blueprinter, jsonapi-serializer)"
      - "Request validation (dry-validation, JSON Schema)"
      - "Rate limiting (rack-attack)"
      - "CORS configuration (rack-cors)"
```

### Service Object Patterns
```yaml
service_object_patterns:
  basic_service:
    pattern: "Callable object with single responsibility"
    convention: "Returns Result object (success? with value or failure? with errors)"
    example:
      class: "Orders::CreateOrder < ApplicationService"
      call_method: "Receives params, creates order, returns Result"
      
  orchestrator:
    pattern: "Coordinates multiple services for complex workflows"
    example: "CheckoutService calls → CartService.lock, PaymentService.charge, OrderService.create, NotificationService.send"
    
  policy_object:
    pattern: "Authorization rules extracted from controllers"
    convention: "Pundit policies — one policy class per model"
    
  query_object:
    pattern: "Complex database queries extracted from models"
    convention: "Class method returns ActiveRecord::Relation for composability"
```

## Rails Performance Patterns

```yaml
rails_performance:
  database:
    n_plus_1: "Use includes, eager_load, or preload for associations"
    pagination: "Cursor-based pagination (pagy) over offset-based for large datasets"
    query_tuning: "Bullet gem detects N+1 in dev/test, pghero for query analysis"
    connection_pool: "Size = thread_count + background_job_concurrency + 2"
    
  caching:
    fragment: "Russian doll caching for complex views"
    low_level: "Rails.cache.fetch for expensive computations"
    http: "Etag + Last-Modified for API responses — return 304 Not Modified"
    query: "Cache result counts and aggregation queries"
    
  background_jobs:
    async: "Move email, notification, report generation to background jobs"
    batching: "Batch large operations (import, export, cleanup) with find_each"
    queues: "Separate queues by priority — critical, default, low"
```

## Rules
- API-only mode for new backends unless views explicitly needed.
- Service objects encapsulate business logic — keep controllers thin.
- UUID primary keys for all tables.
- Serializers for JSON output — never render model attributes directly.
- Pundit for authorization policies.
- Sidekiq or GoodJob for background jobs.
- RSpec + FactoryBot for testing.
- API versioning via namespace (Api::V1).
- Use strong_migrations for production database migrations — detect dangerous operations.
- Every migration must be reversible (up/down or change with reversible limitations).
- Solid Queue (Rails 8) for new apps unless specific need for Sidekiq.

## References
  - references/rails-active-record.md — Rails ActiveRecord Patterns
  - references/rails-api-conventions.md — Rails API Conventions
  - references/rails-background-jobs.md — Rails Background Jobs Reference
  - references/rails-performance.md — Rails Performance
  - references/rails-security.md — Rails Security Reference
  - references/rails-testing.md — Rails Testing
## Handoff
Hand off to `backend/universal/database-patterns/SKILL.md` for database rules.
