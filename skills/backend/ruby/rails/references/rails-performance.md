# Rails Performance

## Database Optimization

### N+1 Prevention
```ruby
# Bad
orders = Order.all
orders.each { |o| puts o.customer.name }

# Good
orders = Order.includes(:customer, :order_items)

# Good — selective includes
orders = Order.includes(customer: :address, order_items: :product)
```

### Indexing
```ruby
class AddIndexesToOrders < ActiveRecord::Migration[7.1]
  def change
    add_index :orders, [:customer_id, :status]
    add_index :orders, :created_at, order: :desc
    add_index :order_items, :order_id, where: 'deleted_at IS NULL'
  end
end
```

### Query Optimization
```ruby
# Use pluck instead of loading objects
Order.where(status: 'confirmed').pluck(:id, :total)

# Batch processing for large datasets
Order.in_batches(of: 1000) { |batch| batch.update_all(status: 'archived') }
```

## Caching

```ruby
# Russian doll caching in views
<% cache @order do %>
  <div class="order">
    <%= @order.total %>
    <% cache @order.order_items do %>
      <% @order.order_items.each do |item| %>
        <div><%= item.name %></div>
      <% end %>
    <% end %>
  </div>
<% end %>

# Low-level caching
class Order < ApplicationRecord
  def total_with_cache
    Rails.cache.fetch("order_#{id}_total", expires_in: 1.hour) do
      order_items.sum('quantity * unit_price')
    end
  end
end
```

## Background Jobs

```ruby
# Use Sidekiq or GoodJob for heavy operations
class OrderConfirmationJob < ApplicationJob
  queue_as :default

  def perform(order_id)
    order = Order.find(order_id)
    OrderMailer.confirmation(order).deliver_now
  end
end

# In controller — fire and forget
OrderConfirmationJob.perform_later(@order.id)
```

## General Tips

- Use `bullet` gem to detect N+1 queries in development.
- Enable `config.cache_classes = true` in production.
- Use Puma with appropriate threads and workers.
- Enable `config.active_record.collection_cache_versioning`.
- Use connection pooling: `pool: ENV.fetch('RAILS_MAX_THREADS', 5)`.
- Configure `Rack::Deflater` for response compression.
