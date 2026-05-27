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

## Rules
- API-only mode for new backends unless views explicitly needed.
- Service objects encapsulate business logic — keep controllers thin.
- UUID primary keys for all tables.
- Serializers for JSON output — never render model attributes directly.
- Pundit for authorization policies.
- Sidekiq or GoodJob for background jobs.
- RSpec + FactoryBot for testing.
- API versioning via namespace (Api::V1).

## References
  - references/rails-active-record.md — Rails ActiveRecord Patterns
  - references/rails-api-conventions.md — Rails API Conventions
  - references/rails-background-jobs.md — Rails Background Jobs Reference
  - references/rails-performance.md — Rails Performance
  - references/rails-security.md — Rails Security Reference
  - references/rails-testing.md — Rails Testing
## Handoff
Hand off to `backend/universal/database-patterns/SKILL.md` for database rules.
