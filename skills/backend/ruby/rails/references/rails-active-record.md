# Rails ActiveRecord Patterns

## Scopes
```ruby
class Order < ApplicationRecord
  scope :active, -> { where(deleted_at: nil) }
  scope :pending, -> { active.where(status: 'pending') }
end
```

## N+1 Prevention
```ruby
# BAD
Order.all.each { |o| o.items }
# GOOD
Order.includes(:items).all
```

## Migration Pattern
```ruby
class AddStatusToOrders < ActiveRecord::Migration[7.1]
  def change
    add_column :orders, :status, :string, null: false, default: 'pending'
    add_index :orders, :status
  end
end
```
