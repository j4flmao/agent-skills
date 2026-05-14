---
name: rails
description: Ruby on Rails architecture — MVC, ActiveRecord, gems, API mode, testing, background jobs, authentication.
---

# Ruby on Rails

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

## Project Structure (API-only)

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

## API Controller

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

## Service Object Pattern

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

## Database Migration

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

## Testing

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

## References

### Reference Files
- `references/rails-api-conventions.md` — Rails API conventions, versioning, serialization
- `references/rails-active-record.md` — AR patterns, scopes, N+1 prevention, migrations

### Related Skills
- `backend/universal/api-response/SKILL.md` — Response envelope
- `backend/universal/database-patterns/SKILL.md` — Database design
- `backend/universal/design-patterns/SKILL.md` — Service objects, policies

## Handoff

Hand off to `backend/universal/database-patterns/SKILL.md` for database rules.
