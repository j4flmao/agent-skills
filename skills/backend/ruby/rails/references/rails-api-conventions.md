# Rails API Conventions

## Versioning
```ruby
# routes.rb
namespace :api do
  namespace :v1 do
    resources :orders
  end
end
```

## Serialization (Blueprinter)
```ruby
class OrderSerializer < Blueprinter::Base
  fields :id, :status, :total, :created_at
  association :items, blueprint: OrderItemSerializer
end
```

# Rails ActiveRecord Patterns

## Scopes
```ruby
class Order < ApplicationRecord
  scope :active, -> { where(deleted_at: nil) }
  scope :pending, -> { active.where(status: 'pending') }
  scope :recent, -> { order(created_at: :desc) }
end
```

## N+1 Prevention
```ruby
# BAD: N+1
Order.all.each { |o| o.items }

# GOOD: eager load
Order.includes(:items).all
```
