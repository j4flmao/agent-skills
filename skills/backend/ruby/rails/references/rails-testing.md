# Rails Testing

## RSpec Setup

```ruby
# Gemfile
group :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'shoulda-matchers'
  gem 'webmock'
  gem 'database_cleaner-active_record'
end
```

## Factory Patterns

```ruby
# spec/factories/orders.rb
FactoryBot.define do
  factory :order do
    association :customer, factory: :user
    status { 'pending' }
    total { 100.00 }

    trait :confirmed do
      status { 'confirmed' }
    end

    trait :with_items do
      after(:create) do |order|
        create_list(:order_item, 3, order: order)
      end
    end
  end
end
```

## Request Spec

```ruby
RSpec.describe 'Orders API', type: :request do
  let(:user) { create(:user) }
  let(:headers) { { 'Authorization' => "Bearer #{jwt_token(user)}" } }

  describe 'GET /api/v1/orders' do
    let!(:orders) { create_list(:order, 3, customer: user) }

    it 'returns paginated orders' do
      get '/api/v1/orders', headers: headers
      expect(response).to have_http_status(:ok)
      expect(json['data'].length).to eq(3)
      expect(json).to have_key('pagination')
    end
  end

  describe 'POST /api/v1/orders' do
    let(:valid_params) { { order: { items: [product_id: '1', quantity: 2] } } }

    it 'creates a new order' do
      post '/api/v1/orders', params: valid_params, headers: headers
      expect(response).to have_http_status(:created)
      expect(json['status']).to eq('pending')
    end
  end
end
```

## Model Spec

```ruby
RSpec.describe Order, type: :model do
  describe 'scopes' do
    let!(:pending_order) { create(:order, status: 'pending') }
    let!(:confirmed_order) { create(:order, :confirmed) }

    it 'filters by status' do
      expect(Order.pending).to include(pending_order)
      expect(Order.pending).not_to include(confirmed_order)
    end
  end
end
```

## Service Spec

```ruby
RSpec.describe OrderService do
  subject(:service) { described_class.new }

  describe '#place_order' do
    let(:user) { create(:user) }
    let(:items) { [{ product_id: '1', quantity: 2 }] }

    it 'creates order with items' do
      result = service.place_order(user: user, items: items)
      expect(result).to be_success
      expect(result.order.items.count).to eq(1)
    end
  end
end
```

## Test Best Practices

- Use `let` + `let!` for test data — never `before` with instance variables.
- Use traits for variant factories.
- Mock external HTTP calls with WebMock.
- Use DatabaseCleaner with truncation for integration tests.
- Test JSON response structure, not exact values.
