---
name: ruby-rails
description: >
  Use this skill when building Ruby on Rails applications — MVC, ActiveRecord, service objects, API mode, background jobs, and testing. This skill enforces: thin controllers, service objects for business logic, ActiveRecord query best practices, Rails API mode conventions, and RSpec testing patterns. Requires Rails 7+ and Ruby 3.1+. Do NOT use for: Sinatra, Rack apps, Hanami, or non-Rails Ruby projects.
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
Build Rails applications with clean MVC separation, service objects, ActiveRecord optimization, API mode conventions, Sidekiq background jobs, and RSpec testing patterns.

## Agent Protocol

### Trigger
User request includes: `Rails`, `Ruby on Rails`, `Rails API`, `ActiveRecord`, `Rails controller`, `Rails model`, `Rails service`, `Rails job`, `Rails spec`, `Rails migration`.

### Input Context
- Rails version (7.0+, 7.1+)
- Ruby version (3.1+, 3.2+, 3.3+)
- Database (PostgreSQL, MySQL, SQLite)
- Mode (API-only, full MVC)
- Auth (Devise, JWT, OAuth)
- Background jobs (Sidekiq, GoodJob, Solid Queue)

### Output Artifact
Controller, model, service object, job class, migration, RSpec test.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Controller delegates to service objects
- ActiveRecord model with scopes, validations, associations
- Service object encapsulates business logic
- Background job with retry configuration
- Request spec covers CRUD with JSON
- Migration with proper indexes

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Service Objects vs PORO Models vs Concerns

| Criterion | Service Object | Fat Model | Concern |
|-----------|---------------|-----------|---------|
| Business logic location | `app/services/` | `app/models/` | `app/concerns/` |
| Testability | Easy (isolated) | Moderate (needs DB) | Moderate |
| Reusability | High (injectable) | Low (AR callbacks) | Medium (mixed into models) |
| Complexity per unit | Low | High (grows unbound) | Medium |
| Rails conventions | No (manual) | Yes (default) | Yes (Rails 4+) |

Decision: Complex business rules → Service Object. Simple validations/scopes → Model. Cross-model behavior → Concern.

### ActiveRecord vs ActiveRecord::Base vs Sequel

| Criterion | ActiveRecord | Sequel | ROM.rb |
|-----------|-------------|--------|--------|
| Rails integration | Native | Adapter | Adapter |
| Performance | Moderate | High | High |
| Query interface | Rich DSL | Sequel DSL | Relation-based |
| Associations | Declarative | Declarative | Explicit |
| Migration system | Built-in | Built-in | Standalone |

Decision: Rails project → ActiveRecord. Heavy data pipeline → Sequel. Hexagonal/clean arch → ROM.rb.

## Workflow

### Step 1: Rails API Setup

```bash
rails new my_api --api --database=postgresql --skip-test
cd my_api
```

### Step 2: Directory Conventions (API Mode)

```
app/
  controllers/
    application_controller.rb
    api/
      v1/
        users_controller.rb
        orders_controller.rb
  models/
    user.rb
    order.rb
  services/
    users/
      create_service.rb
      update_service.rb
    orders/
      place_order_service.rb
  serializers/
    user_serializer.rb
    order_serializer.rb
  jobs/
    process_order_job.rb
  policies/
    user_policy.rb
config/
  routes.rb
spec/
  requests/
    users_spec.rb
  services/
    users/
      create_service_spec.rb
```

### Step 3: Routes

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users, only: [:index, :show, :create, :update, :destroy]
      resources :orders, only: [:index, :show, :create]
    end
  end
end
```

### Step 4: ActiveRecord Model

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Enums
  enum :role, { user: 0, admin: 1, moderator: 2 }, default: :user

  # Validations
  validates :email, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }

  # Scopes
  scope :active, -> { where(active: true) }
  scope :by_role, ->(role) { where(role: role) }
  scope :recent, -> { order(created_at: :desc) }
  scope :search, ->(query) {
    where('name ILIKE :q OR email ILIKE :q', q: "%#{sanitize_sql_like(query)}%")
  }

  # Associations
  has_many :orders, dependent: :destroy

  # Callbacks
  after_create :send_welcome_email

  private

  def send_welcome_email
    UserMailer.welcome(self).deliver_later
  end
end

# db/migrate/xxxx_create_users.rb
class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users, id: :uuid do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.integer :role, default: 0, null: false
      t.boolean :active, default: true, null: false
      t.timestamps
    end
    add_index :users, :email, unique: true
    add_index :users, :role
    add_index :users, [:active, :role]
  end
end
```

### Step 5: Serializer

```ruby
# app/serializers/user_serializer.rb
class UserSerializer
  include JSONAPI::Serializer

  attributes :name, :email, :role, :active
  attribute :created_at do |user|
    user.created_at.iso8601
  end
  has_many :orders, serializer: OrderSerializer
end
```

### Step 6: Service Object

```ruby
# app/services/users/create_service.rb
module Users
  class CreateService < ApplicationService
    attr_reader :params

    def initialize(params)
      @params = params
    end

    def call
      validate_email_uniqueness!
      user = User.new(user_attributes)

      ActiveRecord::Base.transaction do
        user.save!
        create_audit_log(user)
      end

      Result.success(user)
    rescue ActiveRecord::RecordInvalid => e
      Result.failure(e.record.errors.full_messages)
    rescue ActiveRecord::RecordNotUnique
      Result.failure(['Email has already been taken'])
    end

    private

    def user_attributes
      {
        name: params[:name],
        email: params[:email].downcase.strip,
        role: params[:role] || :user,
      }
    end

    def validate_email_uniqueness!
      if User.exists?(email: params[:email])
        raise ActiveRecord::RecordNotUnique, "Email taken"
      end
    end

    def create_audit_log(user)
      AuditLog.create!(action: 'user_created', target: user)
    end
  end
end

# app/services/application_service.rb
class ApplicationService
  Result = Struct.new(:success?, :data, :errors, keyword_init: true)

  def self.call(...)
    new(...).call
  end
end
```

### Step 7: Thin Controller

```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_user!
      before_action :set_user, only: [:show, :update, :destroy]

      def index
        users = User.active.recent.page(params[:page]).per(params[:per_page] || 20)
        render json: UserSerializer.new(users).serializable_hash
      end

      def show
        render json: UserSerializer.new(@user).serializable_hash
      end

      def create
        result = Users::CreateService.call(user_params.to_h)

        if result.success?
          render json: UserSerializer.new(result.data).serializable_hash, status: :created
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def update
        result = Users::UpdateService.call(@user, user_params.to_h)

        if result.success?
          render json: UserSerializer.new(result.data).serializable_hash
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        @user.update!(active: false)
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def user_params
        params.permit(:name, :email, :role)
      end
    end
  end
end
```

### Step 8: Background Job

```ruby
# app/jobs/process_order_job.rb
class ProcessOrderJob < ApplicationJob
  queue_as :default
  retry_on StandardError, attempts: 3, wait: :exponentially_longer
  discard_on ActiveRecord::RecordNotFound

  def perform(order_id)
    order = Order.find(order_id)
    InventoryService.new.reserve_items(order)
    order.update!(status: :processing)
    OrderMailer.confirmation(order).deliver_later
  rescue InsufficientInventoryError => e
    order.update!(status: :failed, failure_reason: e.message)
    raise
  end
end
```

## Implementation Patterns

### Pattern: Query Object

```ruby
# app/queries/user_orders_query.rb
class UserOrdersQuery
  def initialize(relation = Order.all)
    @relation = relation
  end

  def by_user(user_id)
    @relation.where(user_id: user_id)
  end

  def with_status(status)
    @relation.where(status: status)
  end

  def recent_first
    @relation.order(created_at: :desc)
  end

  def paginated(page:, per_page: 20)
    @relation.page(page).per(per_page)
  end
end
```

### Pattern: Policy Object

```ruby
# app/policies/user_policy.rb
class UserPolicy
  def initialize(current_user, target_user)
    @current_user = current_user
    @target_user = target_user
  end

  def show?
    @current_user == @target_user || @current_user.admin?
  end

  def update?
    @current_user == @target_user || @current_user.admin?
  end

  def destroy?
    @current_user.admin?
  end
end
```

## Production Considerations

### Database Performance
- Add `id: :uuid` for distributed systems, `:bigint` for sequential
- Index all foreign keys and frequently queried columns
- Use `includes(:associations)` for eager loading — never lazy load in views
- Use `pluck` for single column queries instead of loading full records
- Use `find_each`/`in_batches` for large data processing (not `all.each`)
- Connection pooling: `pool: ENV.fetch('RAILS_MAX_THREADS', 5)` in database.yml

### Sidekiq Configuration
```ruby
# config/sidekiq.yml
:concurrency: 5
:queues:
  - critical
  - default
  - low
:schedule:
  cleanup_job:
    cron: "0 0 * * *"
    class: CleanupJob
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Callbacks for cross-model logic | Hidden dependencies, hard to test | Service objects |
| Fat models with > 200 lines | SRP violation, unmaintainable | Extract service/query objects |
| N+1 queries in serializers | 100+ queries per response | `includes` in controller |
| `all.each` on large tables | Memory exhaustion | `find_each` or `in_batches` |
| Logic in `before_action` | Hard to trace, test | Policy objects or direct checks |
| Strong params in controller | Repetitive across actions | Permitted params in service object |

## Security Considerations
- `has_secure_password` for bcrypt — never store plain passwords
- Devise or JWT for auth — never custom token implementation
- Strong parameters in every controller — prevent mass assignment
- `before_action :authenticate_user!` on protected controllers
- SQL injection: ActiveRecord is safe (parameterized), but `where("name = '#{param}'")` is not
- `config.force_ssl = true` in production
- CORS gem (`rack-cors`) for API mode — restrict origins
- Rate limiting with `rack-attack` gem

## Testing Strategies

```ruby
# spec/requests/api/v1/users_spec.rb
RSpec.describe 'Users API', type: :request do
  describe 'POST /api/v1/users' do
    let(:valid_params) { { name: 'John', email: 'john@test.com' } }

    it 'creates a new user' do
      post '/api/v1/users', params: valid_params, as: :json
      expect(response).to have_http_status(:created)
      expect(json['data']['attributes']['email']).to eq('john@test.com')
    end

    it 'returns 422 with invalid params' do
      post '/api/v1/users', params: { name: '' }, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
```

Use `factory_bot_rails` for test data. Use `shoulda-matchers` for model specs. Use `database_cleaner` for test isolation. Use `webmock`/`vcr` for external HTTP. Use `rspec-sidekiq` for job testing.

## Rules
- Controllers are thin — one line of business logic per action.
- Service objects in `app/services/` — call with `.call(params)` returning `Result`.
- ActiveRecord models under 150 lines — validations, scopes, associations only.
- Serializers via `jsonapi-serializer` or `active_model_serializers`.
- Background jobs have `retry_on` with limits and `discard_on` for known failures.
- All database migrations have `add_index` for foreign keys and filtered columns.
- API mode Rails — no views, no cookies (token-based auth).

## References
  - references/rails-active-record.md — ActiveRecord Best Practices
  - references/rails-api-conventions.md — Rails API Conventions
  - references/rails-api-design.md — Rails API Design
  - references/rails-background-jobs.md — Background Jobs
  - references/rails-performance-tuning.md — Performance Tuning
  - references/rails-performance.md — Rails Performance
  - references/rails-security.md — Rails Security
  - references/rails-testing.md — Testing Rails Applications
## Handoff
Hand off to `backend/universal/api-response/SKILL.md` for API response formatting or `backend/universal/backend-testing/SKILL.md` for test patterns.
