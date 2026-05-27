# Rails Security Reference

## Authentication with Devise

```ruby
# Gemfile
gem 'devise'
gem 'devise-jwt'

# config/initializers/devise.rb
Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = ENV['DEVISE_JWT_SECRET']
    jwt.expiration_time = 1.hour
  end
end

# app/models/user.rb
class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist
end
```

## Authorization with Pundit

```ruby
# app/policies/order_policy.rb
class OrderPolicy < ApplicationPolicy
  def show?
    user.admin? || record.user_id == user.id
  end

  def create?
    true
  end

  def update?
    user.admin? || record.user_id == user.id
  end

  def destroy?
    user.admin?
  end

  class Scope < Scope
    def resolve
      if user.admin?
        scope.all
      else
        scope.where(user_id: user.id)
      end
    end
  end
end

# app/controllers/orders_controller.rb
class OrdersController < ApplicationController
  def show
    @order = authorize Order.find(params[:id])
  end

  def index
    @orders = policy_scope(Order)
  end
end
```

## CORS Configuration

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch('ALLOWED_ORIGINS', '').split(',')

    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ['X-Total-Count', 'X-Page'],
      max_age: 600
  end
end
```

## Rate Limiting

```ruby
# config/initializers/rack_attack.rb
class Rack::Attack
  throttle('api/ip', limit: 300, period: 5.minutes) do |req|
    req.ip if req.path.start_with?('/api/')
  end

  throttle('auth/ip', limit: 5, period: 15.minutes) do |req|
    req.ip if req.path == '/api/login' && req.post?
  end
end
```

## Strong Parameters

```ruby
# app/controllers/orders_controller.rb
class OrdersController < ApplicationController
  def create
    @order = Order.new(order_params)
    if @order.save
      render json: @order, status: :created
    else
      render json: { errors: @order.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def order_params
    params.require(:order).permit(
      :customer_id,
      items_attributes: [:sku, :quantity, :price]
    )
  end
end
```

## SQL Injection Prevention

```ruby
# BAD — string interpolation
User.where("email = '#{params[:email]}'")

# GOOD — parameterized query
User.where(email: params[:email])

# GOOD — sanitized LIKE
User.where('email LIKE ?', "%#{ActiveRecord::Base.sanitize_sql_like(params[:query])}%")
```

## Mass Assignment Protection

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Only these attributes can be set via mass assignment
  attr_accessor :email, :name
  
  # Prevent role from being set via params
  private
  
  def user_params
    params.require(:user).permit(:email, :name, :password)
    # :role is NOT in the permitted list
  end
end
```

## Content Security Policy

```ruby
# config/initializers/content_security_policy.rb
Rails.application.config.content_security_policy do |policy|
  policy.default_src :self, :https
  policy.font_src    :self, :https, :data
  policy.img_src     :self, :https, :data
  policy.object_src  :none
  policy.script_src  :self, :https
  policy.style_src   :self, :https
end
```

## Key Points

- Devise handles authentication with multiple strategies (JWT, session, OAuth)
- Pundit provides policy-based authorization at controller and view level
- Rack::Attack throttles API and login endpoints by IP
- Strong parameters whitelist permitted attribute values
- Parameterized queries prevent SQL injection
- Mass assignment protection keeps sensitive attributes safe
- CORS middleware restricts API access to allowed origins
- Content Security Policy prevents XSS attacks
- Secure cookies configured in production only
- Environment-specific credentials stored in Rails encrypted credentials
