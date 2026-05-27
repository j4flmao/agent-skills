# Rails API Design Reference

## Table of Contents

- [RESTful API Design](#restful-api-design)
- [JSON Serialization](#json-serialization)
- [Request Validation](#request-validation)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Rate Limiting](#rate-limiting)
- [Pagination](#pagination)
- [Filtering and Sorting](#filtering-and-sorting)
- [Error Handling](#error-handling)
- [API Versioning](#api-versioning)
- [API Documentation](#api-documentation)
- [Testing APIs](#testing-apis)
- [Performance Optimization](#performance-optimization)
- [Background Processing](#background-processing)
- [Webhooks](#webhooks)
- [File Uploads](#file-uploads)
- [CORS](#cors)
- [Monitoring and Observability](#monitoring-and-observability)
- [Best Practices](#best-practices)

---

## RESTful API Design

### Resource Naming Conventions

Use plural nouns for resources, snake_case for attributes, and kebab-case for URL paths.

```ruby
# Good
GET   /api/v1/users
GET   /api/v1/users/:id
POST  /api/v1/users
PATCH /api/v1/users/:id
DELETE /api/v1/users/:id

# Nested resources
GET   /api/v1/articles/:article_id/comments
POST  /api/v1/articles/:article_id/comments

# Custom actions on collection/member (use sparingly)
GET   /api/v1/users/:id/orders   # sub-resource
POST  /api/v1/users/:id/archive  # member action
GET   /api/v1/users/search       # collection action (prefer filtering)
```

### HTTP Methods and Their Semantics

| Method   | Purpose               | Idempotent | Safe | Response Codes           |
|----------|-----------------------|------------|------|--------------------------|
| GET      | Retrieve resource(s)  | Yes        | Yes  | 200, 404                 |
| POST     | Create resource       | No         | No   | 201, 422, 400            |
| PUT      | Full replacement      | Yes        | No   | 200, 204, 422            |
| PATCH    | Partial update        | No         | No   | 200, 204, 422            |
| DELETE   | Remove resource       | Yes        | No   | 200, 204, 404            |
| HEAD     | Response headers only | Yes        | Yes  | 200, 404                 |
| OPTIONS  | Available methods     | Yes        | Yes  | 200                      |

### HTTP Status Codes

Use standard status codes consistently:

```ruby
# 2xx Success
200 OK                           # GET, PATCH success with body
201 Created                      # POST success
202 Accepted                     # Async operation accepted
204 No Content                   # DELETE or PATCH success without body

# 3xx Redirection
301 Moved Permanently            # Resource migrated
304 Not Modified                 # Conditional GET with cache valid

# 4xx Client Error
400 Bad Request                  # Malformed request body
401 Unauthorized                 # Missing or invalid credentials
403 Forbidden                    # Authenticated but not authorized
404 Not Found                    # Resource does not exist
405 Method Not Allowed           # Wrong HTTP method
406 Not Acceptable               # Unacceptable content type in Accept header
409 Conflict                     # Resource conflict (e.g., duplicate)
410 Gone                         # Resource permanently deleted
422 Unprocessable Entity         # Validation failure
429 Too Many Requests            # Rate limit exceeded

# 5xx Server Error
500 Internal Server Error        # Unexpected server error
502 Bad Gateway                  # Upstream service failed
503 Service Unavailable          # Server overloaded or down
504 Gateway Timeout              # Upstream service timeout
```

### Routes Configuration

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users, only: [:index, :show, :create, :update, :destroy] do
        resources :orders, only: [:index, :show]
        member do
          post :archive
        end
        collection do
          get :active
        end
      end

      resources :articles, only: [:index, :show, :create, :update] do
        resources :comments, only: [:index, :create]
      end

      # Singular resource for singleton
      resource :profile, only: [:show, :update]
    end
  end

  # Health check (no version needed)
  get "/health", to: "health#show"
end
```

---

## JSON Serialization

### ActiveModelSerializers

Legacy but still widely used. Define serializer classes per model.

```ruby
# Gemfile
gem "active_model_serializers", "~> 0.10"

# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :full_name, :created_at

  has_many :orders

  attribute :full_name do
    "#{object.first_name} #{object.last_name}"
  end
end

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    render json: user, serializer: UserSerializer, status: :ok
  end

  def index
    users = User.all
    render json: users, each_serializer: UserSerializer, meta: { total: users.count }
  end
end
```

### Jbuilder

Default in Rails 7+. Uses template files to build JSON structure.

```ruby
# Gemfile (included by default in Rails 7+)
gem "jbuilder"

# app/views/api/v1/users/show.json.jbuilder
json.id @user.id
json.email @user.email
json.full_name "#{@user.first_name} #{@user.last_name}"
json.created_at @user.created_at.iso8601

json.orders @user.orders do |order|
  json.id order.id
  json.total order.total
  json.status order.status
end

json.meta do
  json.request_id request.request_id
  json.timestamp Time.current.iso8601
end

# app/controllers/api/v1/users_controller.rb
def show
  @user = User.find(params[:id])
  render :show, formats: :json
end
```

### Alba

Modern, fast serializer with good performance and multiple adapters.

```ruby
# Gemfile
gem "alba"

# app/serializers/user_serializer.rb
class UserSerializer
  include Alba::Resource

  attributes :id, :email, :created_at

  attribute :full_name do |user|
    "#{user.first_name} #{user.last_name}"
  end

  many :orders, resource: OrderSerializer
end

# app/serializers/order_serializer.rb
class OrderSerializer
  include Alba::Resource

  attributes :id, :total, :status, :created_at
end

# Controller usage
class Api::V1::UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    render json: UserSerializer.new(user).serialize, status: :ok
  end

  def index
    users = User.includes(:orders).all
    render json: UserSerializer.new(users).serialize, status: :ok
  end
end
```

### Blueprinter

Simple, fast, and focused JSON serializer.

```ruby
# Gemfile
gem "blueprinter"

# app/blueprints/user_blueprint.rb
class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :email, :created_at

  field :full_name do |user|
    "#{user.first_name} #{user.last_name}"
  end

  association :orders, blueprint: OrderBlueprint

  # Dynamic fields based on context
  field :admin_notes do |user, options|
    options[:include_admin] ? user.internal_notes : nil
  end
end

# app/blueprints/order_blueprint.rb
class OrderBlueprint < Blueprinter::Base
  identifier :id
  fields :total, :status, :created_at
end

# Controller usage
class Api::V1::UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    render json: UserBlueprint.render(user, view: :extended), status: :ok
  end

  def index
    users = User.all
    render json: UserBlueprint.render(users, view: :normal), status: :ok
  end
end
```

### fast_jsonapi (JSONAPI::Serializer)

Performance-focused, follows JSON:API spec.

```ruby
# Gemfile
gem "jsonapi-serializer"

# app/serializers/user_serializer.rb
class UserSerializer
  include JSONAPI::Serializer

  attributes :email, :first_name, :last_name, :created_at

  attribute :full_name do |user|
    "#{user.first_name} #{user.last_name}"
  end

  has_many :orders, serializer: OrderSerializer

  # Conditional attributes
  attribute :internal_notes, if: proc { |user, params|
    params[:include_admin] == true
  }
end

# Controller usage
class Api::V1::UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    options = { params: { include_admin: current_user.admin? } }
    render json: UserSerializer.new(user, options).serializable_hash, status: :ok
  end
end
```

### Serialization Best Practices

- Always whitelist attributes — never expose `serializable_hash` without explicit fields
- Use `iso8601` for all datetime fields
- Nested associations: warn about N+1 — use `includes` in the controller
- Provide a `:meta` key for pagination metadata
- Use `views` or `options` to control field exposure by context
- Consider using `as_json` with `only`/`include` for simple cases, but prefer dedicated serializers
- Keep serializers small — extract complex formatting into helper methods

```ruby
# Common meta wrapper
module SerializationHelper
  def self.success(data, meta: {}, status: :ok)
    {
      data: data,
      meta: {
        request_id: RequestStore.store[:request_id],
        timestamp: Time.current.iso8601
      }.merge(meta)
    }
  end

  def self.error(errors, status:, meta: {})
    {
      errors: errors,
      meta: {
        request_id: RequestStore.store[:request_id],
        timestamp: Time.current.iso8601
      }.merge(meta)
    }
  end
end
```

---

## Request Validation

### Strong Parameters

First line of defense in controllers.

```ruby
class Api::V1::UsersController < ApplicationController
  def create
    user = User.new(user_params)
    if user.save
      render json: UserSerializer.new(user).serialize, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(
      :email, :password, :password_confirmation,
      :first_name, :last_name,
      profile_attributes: [:bio, :avatar, :website],
      roles: []
    )
  end
end
```

### dry-validation

Powerful schema-based validation gem.

```ruby
# Gemfile
gem "dry-validation"

# app/contracts/user_contract.rb
class UserContract < Dry::Validation::Contract
  params do
    required(:email).filled(:string, format?: /\A[\w+\-.]+@[a-z\d\-]+(\.[a-z\d\-]+)*\.[a-z]+\z/i)
    required(:password).filled(:string, min_size?: 8)
    required(:password_confirmation).filled(:string)
    required(:first_name).filled(:string, max_size?: 50)
    required(:last_name).filled(:string, max_size?: 50)
    optional(:bio).maybe(:string, max_size?: 500)
    optional(:roles).array(:string, included_in?: %w[admin moderator user])
  end

  rule(:password) do
    key.failure("must match confirmation") if values[:password] != values[:password_confirmation]
  end

  rule(:email) do
    key.failure("is already taken") if User.exists?(email: values[:email])
  end
end

# app/controllers/concerns/contract_validatable.rb
module ContractValidatable
  extend ActiveSupport::Concern

  def validate_with(contract_class)
    contract = contract_class.new
    result = contract.call(params.to_unsafe_h.deep_symbolize_keys)

    if result.success?
      yield result.to_h
    else
      render json: { errors: result.errors.to_h }, status: :unprocessable_entity
    end
  end
end

# Controller usage
class Api::V1::UsersController < ApplicationController
  include ContractValidatable

  def create
    validate_with(UserContract) do |validated_params|
      user = User.new(validated_params)
      if user.save
        render json: UserSerializer.new(user).serialize, status: :created
      else
        render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end
```

### JSON Schema Validation

Validate request bodies against a JSON Schema.

```ruby
# Gemfile
gem "json-schema"

# app/schemas/user_create_schema.rb
module Schemas
  module UserCreate
    SCHEMA = {
      type: :object,
      required: %w[email password password_confirmation first_name last_name],
      properties: {
        email: { type: :string, format: :email },
        password: { type: :string, minLength: 8 },
        password_confirmation: { type: :string, minLength: 8 },
        first_name: { type: :string, maxLength: 50 },
        last_name: { type: :string, maxLength: 50 },
        bio: { type: :string, maxLength: 500 },
        roles: {
          type: :array,
          items: { type: :string, enum: %w[admin moderator user] }
        }
      },
      additionalProperties: false
    }.freeze
  end
end

# app/middleware/json_schema_validator.rb
class JsonSchemaValidator
  def initialize(app)
    @app = app
  end

  def call(env)
    request = Rack::Request.new(env)

    if json_request?(request) && request.post? && !valid_json?(request.body)
      return [400, { "Content-Type" => "application/json" },
        [{ error: "Invalid JSON in request body" }.to_json]]
    end

    @app.call(env)
  end

  private

  def json_request?(request)
    request.content_type&.include?("application/json")
  end

  def valid_json?(body)
    body.rewind
    JSON.parse(body.read)
    true
  rescue JSON::ParserError
    false
  end
end
```

### Validation Best Practices

- Validate at the controller boundary with strong parameters
- Use contract objects (dry-validation) for complex input validation
- Validate business rules at the model/service layer
- Return consistent 422 responses for validation failures
- Never trust client-side validation alone
- Log validation failures for monitoring

```ruby
# app/services/concerns/validatable.rb
module Validatable
  extend ActiveSupport::Concern

  included do
    attr_reader :errors
  end

  def errors?
    @errors.present?
  end

  private

  def add_error(field, message)
    @errors ||= []
    @errors << { field: field, message: message }
  end
end

# app/services/users/create_service.rb
class Users::CreateService
  include Validatable

  def initialize(params)
    @params = params
  end

  def call
    validate_user
    return nil if errors?

    User.create!(@params)
  end

  private

  def validate_user
    add_error(:email, "is already taken") if User.exists?(email: @params[:email])
    add_error(:email, "is invalid") unless @params[:email]&.match?(URI::MailTo::EMAIL_REGEXP)
  end
end
```

---

## Authentication

### Devise for API-Only Apps

Devise configured for stateless authentication.

```ruby
# Gemfile
gem "devise"
gem "devise-jwt"  # for JWT tokens

# config/initializers/devise.rb
Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = Rails.application.credentials.devise_jwt_secret_key
    jwt.dispatch_requests = [
      ["POST", %r{^/api/v1/auth/login$}]
    ]
    jwt.revocation_requests = [
      ["DELETE", %r{^/api/v1/auth/logout$}]
    ]
    jwt.expiration_time = 24.hours
  end

  # API-only: disable cookie-based authentication
  config.navigational_formats = []
  config.skip_session_storage = [:http_auth, :params_auth]
end

# app/models/user.rb
class User < ApplicationController
  devise :database_authenticatable, :jwt_authenticatable,
         :registerable, :recoverable,
         jwt_revocation_strategy: JwtDenylist
end

# app/models/jwt_denylist.rb
class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist

  self.table_name = "jwt_denylists"
end

# app/controllers/api/v1/auth_controller.rb
class Api::V1::AuthController < ApplicationController
  def login
    user = User.find_by(email: params[:email])

    if user&.valid_password?(params[:password])
      token = JWT.encode(
        { user_id: user.id, exp: 24.hours.from_now.to_i },
        Rails.application.credentials.devise_jwt_secret_key,
        "HS256"
      )
      render json: { token: token, user: UserSerializer.new(user).serialize }, status: :ok
    else
      render json: { error: "Invalid email or password" }, status: :unauthorized
    end
  end

  def logout
    token = request.headers["Authorization"]&.split(" ")&.last
    if token
      payload = JWT.decode(token, Rails.application.credentials.devise_jwt_secret_key, true).first
      JwtDenylist.create!(jti: payload["jti"], exp: Time.at(payload["exp"]))
      render json: { message: "Logged out successfully" }, status: :ok
    else
      render json: { error: "No token provided" }, status: :unprocessable_entity
    end
  end
end
```

### JWT Authentication (Manual Implementation)

```ruby
# Gemfile
gem "jwt"

# app/lib/json_web_token.rb
class JsonWebToken
  SECRET_KEY = Rails.application.credentials.secret_key_base
  ALGORITHM = "HS256"

  def self.encode(payload, exp = 24.hours.from_now)
    payload[:exp] = exp.to_i
    payload[:iat] = Time.current.to_i
    payload[:jti] = SecureRandom.uuid
    JWT.encode(payload, SECRET_KEY, ALGORITHM)
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET_KEY, true, algorithm: ALGORITHM)
    HashWithIndifferentAccess.new(decoded.first)
  rescue JWT::DecodeError, JWT::ExpiredSignature, JWT::VerificationError => e
    nil
  end
end

# app/controllers/concerns/authenticatable.rb
module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_request!
    attr_reader :current_user
  end

  private

  def authenticate_request!
    token = extract_token
    return unauthorized_response unless token

    decoded = JsonWebToken.decode(token)
    return unauthorized_response unless decoded

    @current_user = User.find_by(id: decoded[:user_id])
    return unauthorized_response unless @current_user
  end

  def extract_token
    header = request.headers["Authorization"]
    header&.split(" ")&.last
  end

  def unauthorized_response
    render json: { error: "Authentication required" }, status: :unauthorized
  end
end
```

### OAuth2 with Doorkeeper

```ruby
# Gemfile
gem "doorkeeper"

# config/initializers/doorkeeper.rb
Doorkeeper.configure do
  orm :active_record

  resource_owner_authenticator do
    User.find_by(id: session[:user_id]) || redirect_to(new_user_session_url)
  end

  # API-only: skip session-based auth for API requests
  api_only

  # Grant flows
  grant_flows %w[authorization_code client_credentials password]

  # Access token expiration
  access_token_expires_in 2.hours

  # Use JWT for access tokens
  access_token_generator "Doorkeeper::JWT"

  # Scopes
  default_scopes :read
  optional_scopes :write, :admin
end

# config/initializers/doorkeeper_jwt.rb
Doorkeeper::JWT.configure do
  secret_key { Rails.application.credentials.doorkeeper_jwt_secret_key }
  encryption_method { :hs256 }
  expiration_method { :exp }
  token_payload do |opts|
    user = User.find(opts[:resource_owner_id])
    {
      user_id: user.id,
      email: user.email,
      roles: user.roles
    }
  end
end

# app/controllers/concerns/doorkeeper_authenticatable.rb
module DoorkeeperAuthenticatable
  extend ActiveSupport::Concern

  included do
    before_action :doorkeeper_authorize!
  end

  private

  def current_user
    @current_user ||= User.find(doorkeeper_token.resource_owner_id) if doorkeeper_token
  end
end
```

### API Key Authentication

```ruby
# app/models/api_key.rb
class ApiKey < ApplicationRecord
  belongs_to :user

  has_secure_token :access_token

  scope :active, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  before_create :set_expiry

  def revoke!
    update!(revoked_at: Time.current)
  end

  private

  def set_expiry
    self.expires_at ||= 1.year.from_now
  end
end

# app/middleware/api_key_auth.rb
class ApiKeyAuth
  def initialize(app)
    @app = app
  end

  def call(env)
    request = Rack::Request.new(env)
    key = request.params["api_key"] || request.env["HTTP_X_API_KEY"]

    if key
      api_key = ApiKey.active.find_by(access_token: key)
      if api_key
        env["current_user_id"] = api_key.user_id
        env["api_key_id"] = api_key.id
      else
        return unauthorized
      end
    end

    @app.call(env)
  end

  private

  def unauthorized
    [401, { "Content-Type" => "application/json" },
      [{ error: "Invalid or expired API key" }.to_json]]
  end
end
```

### Token-Based Auth (Custom)

```ruby
# db/migrate/xxxx_add_auth_token_to_users.rb
class AddAuthTokenToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :auth_token, :string
    add_index :users, :auth_token, unique: true
    add_column :users, :token_expires_at, :datetime
  end
end

# app/models/concerns/token_authenticatable.rb
module TokenAuthenticatable
  extend ActiveSupport::Concern

  def generate_auth_token!
    loop do
      token = SecureRandom.urlsafe_base64(32)
      self.auth_token = Digest::SHA256.hexdigest(token)
      self.token_expires_at = 30.days.from_now
      save!
      break token
    end
  end

  def valid_auth_token?(raw_token)
    hashed = Digest::SHA256.hexdigest(raw_token)
    auth_token == hashed && token_expires_at > Time.current
  end

  def expire_token!
    update!(auth_token: nil, token_expires_at: nil)
  end
end
```

---

## Authorization

### Pundit

Policy-based authorization, preferred for modern Rails APIs.

```ruby
# Gemfile
gem "pundit"

# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  include Pundit::Authorization

  rescue_from Pundit::NotAuthorizedError, with: :unauthorized_response

  private

  def unauthorized_response
    render json: { error: "You are not authorized to perform this action" },
           status: :forbidden
  end
end

# app/policies/user_policy.rb
class UserPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index?
    user.admin? || user.moderator?
  end

  def show?
    user == record || user.admin?
  end

  def create?
    true  # Anyone can register
  end

  def update?
    user == record || user.admin?
  end

  def destroy?
    user.admin?
  end

  def archive?
    user.admin? || user.moderator?
  end

  # Scope class for filtering collections
  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      if user.admin?
        scope.all
      else
        scope.where(id: user.id)
      end
    end
  end
end

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  include Authenticatable

  def index
    users = policy_scope(User)
    render json: UserSerializer.new(users).serialize
  end

  def show
    user = User.find(params[:id])
    authorize user
    render json: UserSerializer.new(user).serialize
  end

  def update
    user = User.find(params[:id])
    authorize user
    if user.update(user_params)
      render json: UserSerializer.new(user).serialize
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def archive
    user = User.find(params[:id])
    authorize user, :archive?
    user.update!(archived_at: Time.current)
    render json: { message: "User archived" }, status: :ok
  end
end
```

### CanCanCan

Declarative authorization, simpler than Pundit for basic use cases.

```ruby
# Gemfile
gem "cancancan"

# app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= User.new  # Guest user

    if user.admin?
      can :manage, :all
    elsif user.moderator?
      can :manage, Article
      can :manage, Comment
      can :read, User
    else
      can :read, Article, published: true
      can :create, User
      can :manage, User, id: user.id
      can :create, Comment
      can :manage, Comment, user_id: user.id
    end

    # Cannot delete users (even admin)
    cannot :destroy, User
  end
end

# App controller integration
class ApplicationController < ActionController::API
  def current_ability
    @current_ability ||= Ability.new(current_user)
  end
end

# Controller usage
class Api::V1::ArticlesController < ApplicationController
  def update
    @article = Article.find(params[:id])
    authorize! :update, @article
    @article.update!(article_params)
    render json: ArticleSerializer.new(@article).serialize
  rescue CanCan::AccessDenied
    render json: { error: "Not authorized" }, status: :forbidden
  end
end
```

### Roles and Permissions

```ruby
# app/models/concerns/roleable.rb
module Roleable
  extend ActiveSupport::Concern

  ROLES = %w[admin moderator user guest].freeze

  included do
    store_accessor :permissions, :roles

    validates :roles, array: { in: ROLES }
  end

  def admin?
    roles.include?("admin")
  end

  def moderator?
    roles.include?("moderator")
  end

  def role?(role)
    roles.include?(role.to_s)
  end

  def grant_role(role)
    return unless ROLES.include?(role.to_s)
    self.roles = (roles || []) | [role.to_s]
    save!
  end

  def revoke_role(role)
    self.roles = (roles || []) - [role.to_s]
    save!
  end
end

# Permission table for fine-grained access
# db/migrate/xxxx_create_permissions.rb
class CreatePermissions < ActiveRecord::Migration[7.1]
  def change
    create_table :permissions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :subject_class, null: false  # e.g. "Article"
      t.string :action, null: false          # e.g. "read", "write"
      t.references :subject, polymorphic: true
      t.timestamps
    end

    add_index :permissions, [:user_id, :subject_class, :action],
              unique: true, where: "subject_id IS NULL",
              name: "idx_permissions_user_subject_action"
  end
end
```

---

## Rate Limiting

### rack-attack

```ruby
# Gemfile
gem "rack-attack"

# config/initializers/rack_attack.rb
class Rack::Attack
  # Throttle all requests by IP
  throttle("req/ip", limit: 100, period: 1.minute) do |req|
    req.ip
  end

  # Throttle authenticated user by user ID
  throttle("req/user", limit: 200, period: 1.minute) do |req|
    req.env["current_user_id"]
  end

  # Throttle login attempts by email
  throttle("logins/email", limit: 5, period: 20.seconds) do |req|
    if req.path == "/api/v1/auth/login" && req.post?
      req.params["email"].presence
    end
  end

  # Throttle login attempts by IP
  throttle("logins/ip", limit: 20, period: 1.minute) do |req|
    if req.path == "/api/v1/auth/login" && req.post?
      req.ip
    end
  end

  # Custom response when throttled
  self.throttled_responder = lambda do |req|
    now = Time.current
    match_data = req.env["rack.attack.match_data"]
    retry_after = (match_data[:period] - (now.to_i % match_data[:period])).to_s

    [
      429,
      {
        "Content-Type" => "application/json",
        "Retry-After" => retry_after,
        "X-RateLimit-Limit" => match_data[:limit].to_s,
        "X-RateLimit-Remaining" => "0",
        "X-RateLimit-Reset" => (now + match_data[:period]).to_i.to_s
      },
      [{
        error: "Rate limit exceeded",
        retry_after: retry_after.to_i
      }.to_json]
    ]
  end
end

# config/application.rb
config.middleware.use Rack::Attack
```

### Redis-Backed Rate Limiting

```ruby
# app/services/rate_limiter.rb
class RateLimiter
  def initialize(key, limit:, period:)
    @key = key
    @limit = limit
    @period = period
  end

  def allowed?
    current_count = redis.get(cache_key).to_i
    current_count < @limit
  end

  def increment!
    redis.pipelined do |pipeline|
      pipeline.incr(cache_key)
      pipeline.expire(cache_key, @period)
    end
  end

  def remaining
    @limit - redis.get(cache_key).to_i
  end

  def reset_at
    ttl = redis.ttl(cache_key)
    ttl.positive? ? Time.current + ttl.seconds : Time.current
  end

  private

  def cache_key
    "rate_limit:#{@key}:#{Time.current.to_i / @period}"
  end

  def redis
    Redis.current
  end
end

# Middleware for per-user rate limiting
class RateLimitMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    request = Rack::Request.new(env)
    user_id = env["current_user_id"]
    key = user_id || request.ip
    limiter = RateLimiter.new("api:#{key}", limit: 100, period: 1.minute)

    if limiter.allowed?
      limiter.increment!
      status, headers, body = @app.call(env)
      headers["X-RateLimit-Limit"] = "100"
      headers["X-RateLimit-Remaining"] = limiter.remaining.to_s
      headers["X-RateLimit-Reset"] = limiter.reset_at.to_i.to_s
      [status, headers, body]
    else
      [429, { "Content-Type" => "application/json" },
        [{ error: "Rate limit exceeded", retry_after: limiter.reset_at.to_i }.to_json]]
    end
  end
end
```

---

## Pagination

### Kaminari

```ruby
# Gemfile
gem "kaminari"

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def index
    users = User.page(params[:page]).per(params[:per_page] || 20)
    render json: {
      data: UserSerializer.new(users).serialize,
      meta: {
        current_page: users.current_page,
        total_pages: users.total_pages,
        total_count: users.total_count,
        per_page: users.limit_value
      },
      links: {
        first: url_for(page: 1, per_page: users.limit_value),
        last: url_for(page: users.total_pages, per_page: users.limit_value),
        prev: users.prev_page ? url_for(page: users.prev_page, per_page: users.limit_value) : nil,
        next: users.next_page ? url_for(page: users.next_page, per_page: users.limit_value) : nil
      }
    }
  end
end
```

### Pagy

Faster, lighter alternative to Kaminari.

```ruby
# Gemfile
gem "pagy", "~> 9"

# app/controllers/application_controller.rb
include Pagy::Backend

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def index
    pagy, users = pagy(User.all, items: params[:per_page] || 20)
    render json: {
      data: UserSerializer.new(users).serialize,
      meta: pagy_metadata(pagy)
    }
  end

  private

  def pagy_metadata(pagy)
    {
      current_page: pagy.page,
      total_pages: pagy.pages,
      total_count: pagy.count,
      per_page: pagy.items
    }
  end
end
```

### Cursor-Based Pagination

Scalable pagination for large datasets (no OFFSET).

```ruby
# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def index
    users = User.order(created_at: :desc, id: :desc)
    users = users.where("(created_at, id) < (?, ?)", cursor_time, cursor_id) if cursor?

    users = users.limit(params[:per_page] || 20)
    next_cursor = users.last&.then { |u| { created_at: u.created_at.iso8601, id: u.id } }

    render json: {
      data: UserSerializer.new(users).serialize,
      meta: {
        cursor: next_cursor,
        has_more: users.size == (params[:per_page] || 20).to_i
      }
    }
  end

  private

  def cursor?
    params[:cursor].present?
  end

  def cursor
    @cursor ||= JSON.parse(Base64.decode64(params[:cursor])).symbolize_keys
  rescue
    nil
  end

  def cursor_time
    cursor ? Time.parse(cursor[:created_at]) : Time.current
  end

  def cursor_id
    cursor ? cursor[:id] : 0
  end
end
```

### Keyset Pagination

```ruby
# using a composite index on (created_at, id DESC)
# app/models/user.rb
scope :keyset_paginate, ->(before: nil, after: nil, limit: 20) {
  if before.present?
    where("(created_at, id) > (?, ?)", Time.parse(before[:created_at]), before[:id])
      .order(created_at: :asc, id: :asc)
      .limit(limit)
  elsif after.present?
    where("(created_at, id) < (?, ?)", Time.parse(after[:created_at]), after[:id])
      .order(created_at: :desc, id: :desc)
      .limit(limit)
  else
    order(created_at: :desc, id: :desc).limit(limit)
  end
}
```

---

## Filtering and Sorting

### Ransack

Search and filter via query parameters.

```ruby
# Gemfile
gem "ransack"

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def index
    @q = User.ransack(params[:q])
    @users = @q.result.page(params[:page]).per(params[:per_page])

    render json: {
      data: UserSerializer.new(@users).serialize,
      meta: pagy_metadata(@users)
    }
  end
end

# Example queries:
# GET /api/v1/users?q[email_cont]=@example.com
# GET /api/v1/users?q[created_at_gteq]=2024-01-01
# GET /api/v1/users?q[roles_in]=admin
# GET /api/v1/users?q[s]=email+asc

# Whitelist only safe predicates
# app/models/user.rb
class User < ApplicationRecord
  def self.ransackable_attributes(auth_object = nil)
    %w[email first_name last_name created_at roles]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[orders]
  end
end
```

### Custom Scopes

```ruby
# app/models/user.rb
class User < ApplicationRecord
  scope :active, -> { where(archived_at: nil) }
  scope :by_role, ->(role) { where("? = ANY(roles)", role) }
  scope :created_after, ->(date) { where("created_at >= ?", date) }
  scope :created_before, ->(date) { where("created_at <= ?", date) }
  scope :search_by_email, ->(query) { where("email ILIKE ?", "%#{sanitize_sql_like(query)}%") }
  scope :order_by, ->(column, direction = "asc") {
    allowed = %w[email created_at updated_at last_sign_in_at]
    direction = %w[asc desc].include?(direction.downcase) ? direction : "asc"
    column = allowed.include?(column) ? column : "created_at"
    order(column => direction)
  }
end

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  FILTER_PARAMS = %i[role email_query created_after created_before].freeze

  def index
    users = User.active

    if params[:role].present?
      users = users.by_role(params[:role])
    end

    if params[:email_query].present?
      users = users.search_by_email(params[:email_query])
    end

    if params[:created_after].present?
      users = users.created_after(params[:created_after])
    end

    if params[:created_before].present?
      users = users.created_before(params[:created_before])
    end

    if params[:sort].present?
      column, direction = params[:sort].split(",")
      users = users.order_by(column, direction)
    end

    render json: UserSerializer.new(users.page(params[:page])).serialize
  end
end
```

### JSON:API Filtering

```ruby
# config/initializers/json_api.rb
module JsonApiFiltering
  def apply_filters(scope, filters)
    return scope unless filters.is_a?(ActionController::Parameters)

    filters.each do |key, value|
      scope = apply_filter(scope, key, value)
    end
    scope
  end

  private

  def apply_filter(scope, key, value)
    case key
    when "email"
      scope.where("email ILIKE ?", "%#{value}%")
    when "created_at"
      if value.is_a?(Hash)
        scope = scope.where("created_at >= ?", value[:gte]) if value[:gte]
        scope = scope.where("created_at <= ?", value[:lte]) if value[:lte]
        scope
      else
        scope.where(created_at: value)
      end
    when "ids"
      scope.where(id: value.split(","))
    else
      scope.where(key => value)
    end
  end
end
```

---

## Error Handling

### rescue_from

Centralized error handling in the base controller.

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
  rescue_from ActiveRecord::RecordNotUnique, with: :conflict
  rescue_from ActionController::ParameterMissing, with: :bad_request
  rescue_from ActionController::UnpermittedParameters, with: :bad_request
  rescue_from Pundit::NotAuthorizedError, with: :forbidden
  rescue_from JWT::DecodeError, with: :unauthorized
  rescue_from JWT::ExpiredSignature, with: :unauthorized
  rescue_from RateLimitExceededError, with: :too_many_requests
  rescue_from ApiError::Base, with: :api_error_handler

  private

  def not_found(exception)
    render_error(
      status: :not_found,
      title: "Resource not found",
      detail: exception.message,
      code: "NOT_FOUND"
    )
  end

  def unprocessable_entity(exception)
    render_error(
      status: :unprocessable_entity,
      title: "Validation failed",
      detail: exception.record.errors.full_messages.join(", "),
      code: "VALIDATION_ERROR",
      source: { pointer: "/data" }
    )
  end

  def bad_request(exception)
    render_error(
      status: :bad_request,
      title: "Bad request",
      detail: exception.message,
      code: "BAD_REQUEST"
    )
  end

  def forbidden(exception)
    render_error(
      status: :forbidden,
      title: "Forbidden",
      detail: "You are not authorized to perform this action",
      code: "FORBIDDEN"
    )
  end

  def unauthorized(exception)
    render_error(
      status: :unauthorized,
      title: "Unauthorized",
      detail: exception.message,
      code: "UNAUTHORIZED"
    )
  end

  def conflict(exception)
    render_error(
      status: :conflict,
      title: "Conflict",
      detail: "Resource already exists",
      code: "CONFLICT"
    )
  end

  def too_many_requests(exception)
    render_error(
      status: :too_many_requests,
      title: "Rate limit exceeded",
      detail: exception.message,
      code: "RATE_LIMITED"
    )
  end

  def api_error_handler(exception)
    render_error(
      status: exception.http_status,
      title: exception.title,
      detail: exception.message,
      code: exception.code
    )
  end

  def render_error(status:, title:, detail:, code:, source: nil)
    body = {
      errors: [
        {
          status: Rack::Utils.status_code(status).to_s,
          code: code,
          title: title,
          detail: detail,
          source: source
        }.compact
      ]
    }
    render json: body, status: status
  end
end
```

### Error Serialization (RFC 7807)

Standardized error format for machine-readable error responses.

```ruby
# app/lib/problem_json.rb
class ProblemJson
  def initialize(status, title, detail, type: nil, instance: nil, extensions: {})
    @status = Rack::Utils.status_code(status)
    @title = title
    @detail = detail
    @type = type || "about:blank"
    @instance = instance
    @extensions = extensions
  end

  def to_h
    {
      type: @type,
      title: @title,
      status: @status,
      detail: @detail,
      instance: @instance,
      timestamp: Time.current.iso8601,
      request_id: RequestStore.store[:request_id]
    }.merge(@extensions).compact
  end

  def to_json(*args)
    to_h.to_json(*args)
  end
end

# Controller usage
class ApplicationController < ActionController::API
  def render_problem(status:, title:, detail:, type: nil, extensions: {})
    problem = ProblemJson.new(
      status, title, detail,
      type: type,
      instance: request.path,
      extensions: extensions
    )
    render json: problem, status: status,
           content_type: "application/problem+json"
  end
end
```

### Custom Error Classes

```ruby
# app/errors/api_error.rb
module ApiError
  class Base < StandardError
    attr_reader :http_status, :title, :code, :details

    def initialize(message = nil, details: nil)
      super(message || self.class.name.demodulize.titleize)
      @details = details
    end
  end

  class NotFound < Base
    def initialize(resource = "resource")
      @http_status = :not_found
      @title = "Not Found"
      @code = "NOT_FOUND"
      super("#{resource.titleize} not found")
    end
  end

  class Unauthorized < Base
    def initialize(message = "Authentication required")
      @http_status = :unauthorized
      @title = "Unauthorized"
      @code = "UNAUTHORIZED"
      super(message)
    end
  end

  class Forbidden < Base
    def initialize(message = "You are not permitted to perform this action")
      @http_status = :forbidden
      @title = "Forbidden"
      @code = "FORBIDDEN"
      super(message)
    end
  end

  class UnprocessableEntity < Base
    def initialize(errors)
      @http_status = :unprocessable_entity
      @title = "Unprocessable Entity"
      @code = "UNPROCESSABLE_ENTITY"
      super(errors.full_messages.join(", "), details: errors.messages)
    end
  end

  class Conflict < Base
    def initialize(message = "Resource already exists")
      @http_status = :conflict
      @title = "Conflict"
      @code = "CONFLICT"
      super(message)
    end
  end

  class RateLimited < Base
    def initialize(retry_after: nil)
      @http_status = :too_many_requests
      @title = "Too Many Requests"
      @code = "RATE_LIMITED"
      @retry_after = retry_after
      super("Rate limit exceeded. Please try again later.")
    end
  end

  class BadRequest < Base
    def initialize(message = "Bad request")
      @http_status = :bad_request
      @title = "Bad Request"
      @code = "BAD_REQUEST"
      super(message)
    end
  end

  class ExternalServiceError < Base
    def initialize(service_name, message = nil)
      @http_status = :bad_gateway
      @title = "External Service Error"
      @code = "EXTERNAL_SERVICE_ERROR"
      super(message || "#{service_name} returned an error")
    end
  end
end
```

---

## API Versioning

### URL-Based Versioning

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users
    end

    namespace :v2 do
      resources :users
    end
  end
end

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def index
    # V1 implementation
  end
end

# app/controllers/api/v2/users_controller.rb
class Api::V2::UsersController < ApplicationController
  def index
    # V2 implementation with different serialization
  end
end
```

### Header-Based Versioning

```ruby
# config/routes.rb
Rails.application.routes.draw do
  scope module: :api do
    resources :users, controller: "users"
  end
end

# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  before_action :resolve_version

  private

  def resolve_version
    version = request.headers["Accept"]&.scan(/version=(\d+)/)&.flatten&.first || "1"
    request.env["api.version"] = version

    case version
    when "2"
      extend Api::V2::Overrides
    end
  end
end

# app/controllers/api/v2/overrides.rb
module Api::V2
  module Overrides
    def index
      users = User.all
      render json: V2UserSerializer.new(users).serialize
    end
  end
end
```

### Media Type Versioning

```ruby
# config/initializers/mime_types.rb
Mime::Type.register "application/vnd.myapp.v1+json", :v1_json
Mime::Type.register "application/vnd.myapp.v2+json", :v2_json

# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  before_action :check_media_type

  private

  def check_media_type
    client_version = request.headers["Accept"]&.scan(/vnd\.myapp\.v(\d+)/)&.flatten&.first

    case client_version
    when "2"
      @api_version = 2
    else
      @api_version = 1
    end
  end
end
```

### Versioning Strategy Best Practices

- Prefer URL-based versioning for simplicity and cacheability
- Maintain at most 2 active versions (current + previous)
- Deprecate versions with clear Sunset headers
- Use `API-Version` and `Sunset` response headers
- Document deprecation dates in API docs

```ruby
# app/middleware/version_headers.rb
class VersionHeaders
  SUPPORTED_VERSIONS = {
    "v1" => { sunset: "2025-06-01", deprecation: true },
    "v2" => { sunset: nil, deprecation: false }
  }.freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    status, headers, body = @app.call(env)
    version = env["api.version"]

    if version && SUPPORTED_VERSIONS[version]
      config = SUPPORTED_VERSIONS[version]
      headers["API-Version"] = version

      if config[:deprecation] && config[:sunset]
        headers["Sunset"] = config[:sunset]
        headers["Deprecation"] = "true"
      end
    end

    [status, headers, body]
  end
end
```

---

## API Documentation

### RSwag (OpenAPI)

Rspe integration for OpenAPI documentation.

```ruby
# Gemfile
gem "rswag-api"
gem "rswag-ui"

# spec/requests/api/v1/users_spec.rb
require "swagger_helper"

describe "Users API" do
  path "/api/v1/users" do
    get "Retrieves users" do
      tags "Users"
      produces "application/json"
      parameter name: :page, in: :query, type: :integer, required: false
      parameter name: :per_page, in: :query, type: :integer, required: false

      response "200", "users list" do
        schema type: :object,
          properties: {
            data: { type: :array, items: { "$ref" => "#/components/schemas/user" } },
            meta: { "$ref" => "#/components/schemas/pagination_meta" }
          }

        run_test!
      end
    end

    post "Creates a user" do
      tags "Users"
      consumes "application/json"
      parameter name: :user, in: :body, schema: {
        type: :object,
        properties: {
          email: { type: :string },
          password: { type: :string },
          first_name: { type: :string },
          last_name: { type: :string }
        },
        required: %w[email password first_name last_name]
      }

      response "201", "user created" do
        schema "$ref" => "#/components/schemas/user"
        run_test!
      end

      response "422", "validation error" do
        schema "$ref" => "#/components/schemas/error_response"
        run_test!
      end
    end
  end
end

# spec/swagger_helper.rb
RSpec.configure do |config|
  config.swagger_root = Rails.root.join("swagger").to_s
  config.swagger_docs = {
    "v1/swagger.yaml" => {
      openapi: "3.0.1",
      info: {
        title: "API V1",
        version: "v1"
      },
      paths: {},
      components: {
        schemas: {
          user: {
            type: :object,
            properties: {
              id: { type: :integer },
              email: { type: :string },
              full_name: { type: :string },
              created_at: { type: :string, format: "date-time" }
            }
          },
          pagination_meta: {
            type: :object,
            properties: {
              current_page: { type: :integer },
              total_pages: { type: :integer },
              total_count: { type: :integer },
              per_page: { type: :integer }
            }
          },
          error_response: {
            type: :object,
            properties: {
              errors: {
                type: :array,
                items: {
                  type: :object,
                  properties: {
                    status: { type: :string },
                    title: { type: :string },
                    detail: { type: :string },
                    code: { type: :string }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
end
```

### Apipie

```ruby
# Gemfile
gem "apipie-rails"

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  api :GET, "/api/v1/users", "List users"
  param :page, :number, desc: "Page number", required: false
  param :per_page, :number, desc: "Items per page", required: false
  param :q, Hash, desc: "Ransack filters" do
    param :email_cont, String, desc: "Email contains"
    param :created_at_gteq, String, desc: "Created after"
  end
  returns array_of: :user, code: 200
  def index
    # ...
  end

  api :POST, "/api/v1/users", "Create a user"
  param :user, Hash, required: true do
    param :email, String, required: true, desc: "User email"
    param :password, String, required: true, desc: "User password"
    param :first_name, String, required: true
    param :last_name, String, required: true
  end
  returns code: 201
  error code: 422, desc: "Validation error"
  def create
    # ...
  end
end
```

### Grape-Swagger

```ruby
# Gemfile
gem "grape"
gem "grape-swagger"
gem "grape-swagger-rails"

# app/api/api.rb
class API < Grape::API
  prefix "api"
  format :json

  mount Api::V1::Users

  add_swagger_documentation(
    api_version: "v1",
    base_path: "/api",
    hide_documentation_path: true,
    mount_path: "/swagger_doc"
  )
end

# app/api/api/v1/users.rb
module Api
  module V1
    class Users < Grape::API
      resource :users do
        desc "Return list of users"
        params do
          optional :page, type: Integer, default: 1
          optional :per_page, type: Integer, default: 20
        end
        get do
          users = User.page(params[:page]).per(params[:per_page])
          present users, with: Api::Entities::User
        end

        desc "Create a user"
        params do
          requires :email, type: String, desc: "User email"
          requires :password, type: String, desc: "User password"
          requires :first_name, type: String
          requires :last_name, type: String
        end
        post do
          user = User.create!(declared(params))
          present user, with: Api::Entities::User
        end
      end
    end
  end
end

# app/api/api/entities/user.rb
module Api
  module Entities
    class User < Grape::Entity
      expose :id, :email, :full_name, :created_at
    end
  end
end
```

---

## Testing APIs

### Request Specs

```ruby
# spec/requests/api/v1/users_spec.rb
require "rails_helper"

RSpec.describe "Api::V1::Users", type: :request do
  let(:headers) { { "Content-Type" => "application/json", "Accept" => "application/json" } }
  let(:auth_headers) { headers.merge("Authorization" => "Bearer #{token}") }
  let(:user) { create(:user) }
  let(:token) { JsonWebToken.encode(user_id: user.id) }

  describe "GET /api/v1/users" do
    let!(:users) { create_list(:user, 3) }

    context "when authenticated" do
      it "returns a list of users" do
        get "/api/v1/users", headers: auth_headers

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json["data"].size).to eq(3)
      end

      it "respects pagination" do
        get "/api/v1/users", params: { page: 1, per_page: 2 }, headers: auth_headers

        json = JSON.parse(response.body)
        expect(json["data"].size).to eq(2)
        expect(json["meta"]["current_page"]).to eq(1)
        expect(json["meta"]["total_pages"]).to eq(2)
      end
    end

    context "when not authenticated" do
      it "returns 401" do
        get "/api/v1/users", headers: headers

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "POST /api/v1/users" do
    let(:valid_params) do
      {
        user: {
          email: "test@example.com",
          password: "password123",
          password_confirmation: "password123",
          first_name: "John",
          last_name: "Doe"
        }
      }
    end

    it "creates a user" do
      expect {
        post "/api/v1/users", params: valid_params.to_json, headers: headers
      }.to change(User, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it "returns validation errors for invalid data" do
      post "/api/v1/users", params: { user: { email: "invalid" } }.to_json, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to be_present
    end
  end

  describe "PATCH /api/v1/users/:id" do
    it "updates user attributes" do
      patch "/api/v1/users/#{user.id}",
            params: { user: { first_name: "Jane" } }.to_json,
            headers: auth_headers

      expect(response).to have_http_status(:ok)
      expect(user.reload.first_name).to eq("Jane")
    end
  end

  describe "DELETE /api/v1/users/:id" do
    it "deletes a user" do
      user # create
      expect {
        delete "/api/v1/users/#{user.id}", headers: auth_headers
      }.to change(User, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
```

### Contract Testing with Dredd

```yaml
# dredd.yml
dry-run: null
hookfiles: spec/dredd_hooks.rb
language: ruby
server: bin/rails server -p 7000
server-wait: 3
init: false
custom:
  - api_blueprint: ./apiary.apib
names: false
only: []
reporter: []
output: []
header: []
sorted: false
user: nil
inline-errors: false
details: false
method: []
color: true
level: info
timestamp: false
silent: false
path: []
hooks-worker-timeout: 5000
sandbox: false
id: []
```

### Integration Testing Best Practices

- Use `let!` and `create_list` from FactoryBot for setup
- Test response structure, not just status codes
- Test error scenarios thoroughly
- Test pagination edge cases (empty, single page, last page)
- Test every auth/authorization boundary
- Use `shared_examples` for reusable test patterns

```ruby
# spec/support/shared_examples/api_errors.rb
RSpec.shared_examples "an unauthorized request" do
  it "returns 401" do
    subject
    expect(response).to have_http_status(:unauthorized)
  end

  it "returns an error message" do
    subject
    json = JSON.parse(response.body)
    expect(json["errors"]).to be_present
  end
end

RSpec.shared_examples "a forbidden request" do
  it "returns 403" do
    subject
    expect(response).to have_http_status(:forbidden)
  end

  it "returns an error message" do
    subject
    json = JSON.parse(response.body)
    expect(json["errors"]).to be_present
  end
end
```

---

## Performance Optimization

### Eager Loading

```ruby
# Always eager load associations in index actions
def index
  # N+1: loads orders separately for each user
  # User.all.each { |u| u.orders }
  @users = User.includes(:orders, :profile).all
end

# Use preload vs includes vs eager_load appropriately
User.includes(:orders).all                    # 2 queries unless filtered by orders
User.preload(:orders).all                       # Always 2 queries
User.eager_load(:orders).all                    # LEFT OUTER JOIN, 1 query
User.joins(:orders).select("users.*").distinct  # INNER JOIN, 1 query
```

### Query Optimization

```ruby
# Use pluck instead of loading AR objects
# Bad: User.all.map { |u| u.email }
emails = User.pluck(:email)

# Use select to limit columns
User.select(:id, :email, :created_at)

# Batch processing for large datasets
User.find_each(batch_size: 1000) do |user|
  # process user
end

# Use find_in_batches for lower memory
User.find_in_batches(batch_size: 1000) do |users|
  User.where(id: users.map(&:id)).update_all(processed: true)
end

# Bulk inserts
users = [
  { email: "a@test.com", first_name: "A", last_name: "B" },
  { email: "c@test.com", first_name: "C", last_name: "D" }
]
User.insert_all(users)

# Upsert
User.upsert_all(users, unique_by: :email)
```

### Caching

```ruby
# Fragment caching in views
# app/views/api/v1/users/index.json.jbuilder
json.cache! ["users", @users.maximum(:updated_at)] do
  json.array! @users do |user|
    json.cache! user do
      json.id user.id
      json.email user.email
      json.full_name "#{user.first_name} #{user.last_name}"
    end
  end
end

# Low-level caching
class User < ApplicationRecord
  def cached_orders_count
    Rails.cache.fetch("user:#{id}:orders_count", expires_in: 1.hour) do
      orders.count
    end
  end

  def invalidate_orders_cache
    Rails.cache.delete("user:#{id}:orders_count")
  end
end

# HTTP caching in controllers
class Api::V1::UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    fresh_when(
      last_modified: user.updated_at,
      etag: [user, current_user]
    )
  end
end
```

---

## Background Processing

### ActiveJob Configuration

```ruby
# app/jobs/application_job.rb
class ApplicationJob < ActiveJob::Base
  queue_as :default

  retry_on ActiveRecord::Deadlocked, wait: :exponentially_longer, attempts: 5
  retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 3

  discard_on ActiveJob::DeserializationError

  before_perform do |job|
    Rails.logger.info "Starting job: #{job.class} ##{job.job_id}"
  end

  after_perform do |job|
    Rails.logger.info "Completed job: #{job.class} ##{job.job_id}"
  end
end

# app/jobs/send_welcome_email_job.rb
class SendWelcomeEmailJob < ApplicationJob
  queue_as :mailers
  sidekiq_options retry: 3, dead: false

  def perform(user_id)
    user = User.find(user_id)
    UserMailer.welcome_email(user).deliver_now
  end
end
```

### Sidekiq Optimization

```ruby
# config/sidekiq.yml
:concurrency: 10
:queues:
  - [critical, 5]
  - [mailers, 3]
  - [default, 2]
  - [low, 1]
:max_retries: 3
:timeout: 30

# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
    network_timeout: 5,
    pool_size: (ENV.fetch("SIDEKIQ_CONCURRENCY", 10).to_i + 5)
  }

  config.server_middleware do |chain|
    chain.add Sidekiq::Middleware::Server::RetryJobs, max_retries: 3
  end

  # Scheduled jobs
  config.average_scheduled_poll_interval = 5
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
    network_timeout: 5,
    pool_size: 5
  }
end

# app/jobs/batch_process_job.rb
class BatchProcessJob < ApplicationJob
  queue_as :default

  def perform(start_id, end_id)
    User.where(id: start_id..end_id).find_each do |user|
      ProcessUserJob.perform_later(user.id)
    end
  end
end

# Job batching
class OrderExportJob < ApplicationJob
  def perform(order_ids)
    orders = Order.where(id: order_ids)

    csv = CSV.generate do |csv|
      csv << ["ID", "Total", "Status", "Created"]
      orders.find_each do |order|
        csv << [order.id, order.total, order.status, order.created_at]
      end
    end

    # Upload to S3 or send via email
  end
end
```

### GoodJob

Postgres-backed job queue (no Redis needed).

```ruby
# Gemfile
gem "good_job"

# config/initializers/good_job.rb
Rails.application.configure do
  config.active_job.queue_adapter = :good_job

  # Start a scheduler in the same process for development
  config.good_job.enable_cron = true

  # Configure queues
  config.good_job.queues = "critical:4;mailers:2;default:1;low:0.5"

  # Clean up finished jobs after 7 days
  config.good_job.cleanup_preserved_jobs_before_seconds_ago = 7.days
end

# Cron jobs with GoodJob
# config/initializers/scheduled_jobs.rb
Rails.application.configure do
  config.good_job.cron = {
    daily_cleanup: {
      cron: "0 3 * * *",
      class: "CleanupExpiredSessionsJob",
      description: "Run daily cleanup of expired sessions"
    },
    hourly_stats: {
      cron: "0 * * * *",
      class: "AggregateDailyStatsJob",
      description: "Aggregate hourly statistics"
    }
  }
end
```

---

## Webhooks

### Outgoing Webhooks

```ruby
# db/migrate/xxxx_create_webhooks.rb
class CreateWebhooks < ActiveRecord::Migration[7.1]
  def change
    create_table :webhooks do |t|
      t.references :user, null: false, foreign_key: true
      t.string :url, null: false
      t.string :secret, null: false
      t.string :events, array: true, default: []
      t.boolean :active, default: true
      t.timestamps
    end
  end
end

# app/models/webhook.rb
class Webhook < ApplicationRecord
  belongs_to :user

  validates :url, presence: true, url: true
  validates :secret, presence: true

  scope :active, -> { where(active: true) }
  scope :for_event, ->(event) { where("? = ANY(events)", event) }
end

# app/services/webhook_delivery_service.rb
class WebhookDeliveryService
  RETRYABLE_ERRORS = [Net::ReadTimeout, Net::OpenTimeout, Errno::ECONNREFUSED,
                      Errno::ECONNRESET, OpenSSL::SSL::SSLError].freeze

  def initialize(event:, payload:)
    @event = event
    @payload = payload
  end

  def call
    Webhook.active.for_event(@event).find_each do |webhook|
      deliver_webhook(webhook)
    end
  end

  private

  def deliver_webhook(webhook)
    body = {
      event: @event,
      timestamp: Time.current.iso8601,
      data: @payload
    }

    signature = generate_signature(webhook.secret, body)

    HTTParty.post(
      webhook.url,
      body: body.to_json,
      headers: {
        "Content-Type" => "application/json",
        "X-Webhook-Signature" => signature,
        "X-Webhook-Event" => @event,
        "X-Webhook-Timestamp" => Time.current.to_i.to_s,
        "User-Agent" => "MyApp-Webhook/1.0"
      },
      timeout: 10
    )
  rescue *RETRYABLE_ERRORS => e
    WebhookDeliveryJob.set(wait: 5.minutes).perform_later(webhook.id, @event, @payload)
  rescue => e
    Rails.logger.error("Webhook delivery failed: #{webhook.id} - #{e.message}")
  end

  def generate_signature(secret, payload)
    payload_json = payload.to_json
    OpenSSL::HMAC.hexdigest("SHA256", secret, payload_json)
  end
end

# app/jobs/webhook_delivery_job.rb
class WebhookDeliveryJob < ApplicationJob
  MAX_RETRIES = 5
  RETRY_DELAYS = [1.minute, 5.minutes, 15.minutes, 1.hour, 6.hours].freeze

  queue_as :webhooks

  retry_on StandardError, wait: :exponentially_longer, attempts: MAX_RETRIES do |job, error|
    webhook = Webhook.find(job.arguments.first)
    webhook.update!(last_failure_at: Time.current, failure_count: webhook.failure_count.to_i + 1)
    Rails.logger.error("Webhook #{webhook.id} permanently failed: #{error.message}")
  end

  def perform(webhook_id, event, payload, attempt = 1)
    webhook = Webhook.find(webhook_id)
    WebhookDeliveryService.new(event: event, payload: payload).call
  end
end
```

### Idempotency Keys

```ruby
# app/controllers/concerns/idempotent.rb
module Idempotent
  extend ActiveSupport::Concern

  included do
    before_action :check_idempotency_key, only: [:create]
  end

  private

  def check_idempotency_key
    idempotency_key = request.headers["Idempotency-Key"]
    return unless idempotency_key

    existing = IdempotencyRecord.find_by(key: idempotency_key)
    if existing
      render json: JSON.parse(existing.response_body),
             status: existing.response_status
    end
  end

  def store_idempotent_response(status, body)
    idempotency_key = request.headers["Idempotency-Key"]
    return unless idempotency_key

    IdempotencyRecord.create!(
      key: idempotency_key,
      response_status: status,
      response_body: body.to_json,
      expires_at: 24.hours.from_now
    )
  end
end

# db/migrate/xxxx_create_idempotency_records.rb
class CreateIdempotencyRecords < ActiveRecord::Migration[7.1]
  def change
    create_table :idempotency_records do |t|
      t.string :key, null: false
      t.integer :response_status, null: false
      t.text :response_body, null: false
      t.datetime :expires_at, null: false
      t.timestamps
    end
    add_index :idempotency_records, :key, unique: true
    add_index :idempotency_records, :expires_at
  end
end
```

### Retry Logic

```ruby
# app/services/retryable.rb
module Retryable
  MAX_RETRIES = 3
  RETRY_DELAYS = [1.second, 5.seconds, 30.seconds].freeze

  def with_retries(service_name: "service", exceptions: [StandardError])
    attempts = 0
    begin
      attempts += 1
      yield
    rescue *exceptions => e
      if attempts <= MAX_RETRIES
        delay = RETRY_DELAYS[attempts - 1]
        Rails.logger.warn("#{service_name} attempt #{attempts} failed: #{e.message}. Retrying in #{delay}s...")
        sleep(delay)
        retry
      else
        Rails.logger.error("#{service_name} failed after #{MAX_RETRIES} attempts: #{e.message}")
        raise
      end
    end
  end
end
```

---

## File Uploads

### Active Storage

```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_one_attached :avatar
  has_many_attached :documents
end

# app/controllers/api/v1/users_controller.rb
class Api::V1::UsersController < ApplicationController
  def create
    user = User.new(user_params)
    if user.save
      render json: UserSerializer.new(user).serialize, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :avatar, documents: [])
  end
end

# config/storage.yml
local:
  service: Disk
  root: <%= Rails.root.join("storage") %>

amazon:
  service: S3
  access_key_id: <%= Rails.application.credentials.dig(:aws, :access_key_id) %>
  secret_access_key: <%= Rails.application.credentials.dig(:aws, :secret_access_key) %>
  region: us-east-1
  bucket: myapp-uploads
  public: false
  upload:
    acl: "private"
    cache_control: "public, max-age=31536000"

# config/environments/production.rb
config.active_storage.service = :amazon
```

### Direct-to-S3 Uploads

```ruby
# app/controllers/api/v1/uploads_controller.rb
class Api::V1::UploadsController < ApplicationController
  include Authenticatable

  def presigned_url
    filename = params[:filename]
    content_type = params[:content_type]
    key = "uploads/#{current_user.id}/#{SecureRandom.uuid}/#{filename}"

    signer = Aws::S3::Presigner.new
    url = signer.presigned_url(
      :put_object,
      bucket: ENV.fetch("AWS_BUCKET"),
      key: key,
      content_type: content_type,
      expires_in: 3600
    )

    render json: {
      url: url,
      key: key,
      public_url: "https://#{ENV.fetch("AWS_BUCKET")}.s3.amazonaws.com/#{key}"
    }
  end

  def callback
    # Called after successful S3 upload
    blob = ActiveStorage::Blob.create_and_upload!(
      key: params[:key],
      filename: params[:filename],
      content_type: params[:content_type],
      byte_size: params[:size].to_i,
      checksum: params[:checksum]
    )
    render json: { id: blob.signed_id }
  end
end
```

### Shrine

```ruby
# Gemfile
gem "shrine", "~> 3.0"
gem "shrine-url"

# config/initializers/shrine.rb
require "shrine"
require "shrine/storage/s3"
require "shrine/storage/file_system"

s3_options = {
  access_key_id: Rails.application.credentials.dig(:aws, :access_key_id),
  secret_access_key: Rails.application.credentials.dig(:aws, :secret_access_key),
  region: "us-east-1",
  bucket: "myapp-uploads"
}

Shrine.storages = {
  cache: Shrine::Storage::FileSystem.new("tmp", prefix: "uploads/cache"),
  store: Shrine::Storage::S3.new(**s3_options)
}

Shrine.plugin :activerecord
Shrine.plugin :cached_attachment_data
Shrine.plugin :restore_cached_data
Shrine.plugin :validation
Shrine.plugin :validation_helpers
Shrine.plugin :determine_mime_type
Shrine.plugin :infer_extension

# app/uploaders/image_uploader.rb
class ImageUploader < Shrine
  plugin :processing
  plugin :versions
  plugin :delete_raw

  Attacher.validate do
    validate_mime_type %w[image/jpeg image/png image/webp image/gif]
    validate_max_size 10 * 1024 * 1024  # 10 MB
    validate_extension %w[jpg jpeg png webp gif]
  end

  process(:store) do |io, context|
    original = io.download
    thumb = ImageProcessing::MiniMagick
      .source(original)
      .resize_to_limit!(300, 300)

    { original: io, thumb: thumb }
  end
end

# app/models/user.rb
class User < ApplicationRecord
  include ImageUploader::Attachment(:avatar)
end
```

---

## CORS

```ruby
# Gemfile
gem "rack-cors"

# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins do |source, _env|
      allowed_domains = ENV.fetch("ALLOWED_ORIGINS", "").split(",")
      allowed_domains.any? { |d| source&.match?(/\Ahttps?:\/\/#{Regexp.escape(d)}\z/) }
    end

    resource "/api/*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ["Authorization", "X-Request-Id", "API-Version"],
      max_age: 600,
      credentials: true

    # Allow public endpoints without credentials
    resource "/health",
      headers: :any,
      methods: [:get]
  end

  # Development: allow all origins
  if Rails.env.development?
    allow do
      origins "*"
      resource "/api/*",
        headers: :any,
        methods: [:get, :post, :put, :patch, :delete, :options]
    end
  end
end
```

---

## Monitoring and Observability

### Request Logging

```ruby
# config/initializers/lograge.rb
Rails.application.configure do
  config.lograge.enabled = true
  config.lograge.formatter = Lograge::Formatters::Json.new
  config.lograge.custom_options = lambda do |event|
    {
      request_id: event.payload[:request_id],
      user_id: event.payload[:user_id],
      params: event.payload[:params].except("controller", "action", "format"),
      time: {
        total: event.duration,
        db: event.payload[:db_runtime],
        view: event.payload[:view_runtime]
      }
    }
  end
end

# config/initializers/log_subscriber.rb
ActiveSupport::Notifications.subscribe "process_action.action_controller" do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  Rails.logger.info({
    type: "api_request",
    method: payload[:method],
    path: payload[:path],
    format: payload[:format],
    controller: payload[:controller],
    action: payload[:action],
    status: payload[:status],
    duration: event.duration,
    db_runtime: payload[:db_runtime],
    view_runtime: payload[:view_runtime]
  })
end
```

### Performance Monitoring

```ruby
# config/initializers/active_support_notifications.rb
ActiveSupport::Notifications.subscribe "sql.active_record" do |*args|
  event = ActiveSupport::Notifications::Event.new(*args)
  payload = event.payload

  if event.duration > 100  # log slow queries (>100ms)
    Rails.logger.warn({
      type: "slow_sql",
      duration: event.duration,
      sql: payload[:sql],
      name: payload[:name],
      cached: payload[:cached] || false
    })
  end
end

# config/initializers/performance_middleware.rb
class PerformanceMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    status, headers, body = @app.call(env)
    duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start

    headers["X-Request-Duration-Ms"] = (duration * 1000).round(2)
    headers["X-Db-Runtime-Ms"] = env["db_runtime"].to_s if env["db_runtime"]

    [status, headers, body]
  end
end
```

### Health Check Endpoints

```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  def show
    checks = {
      database: database_healthy?,
      redis: redis_healthy?,
      sidekiq: sidekiq_healthy?
    }

    status = checks.values.all? ? :ok : :service_unavailable

    render json: {
      status: status == :ok ? "healthy" : "unhealthy",
      checks: checks,
      version: Rails.application.config.version,
      uptime: (Process.clock_gettime(Process::CLOCK_MONOTONIC) - $START_TIME).round(2),
      timestamp: Time.current.iso8601
    }, status: status
  end

  private

  def database_healthy?
    ActiveRecord::Base.connection.execute("SELECT 1")
    true
  rescue
    false
  end

  def redis_healthy?
    Sidekiq.redis(&:ping)
    true
  rescue
    false
  end
end
```

---

## Best Practices

### Do

- Use consistent error response format across all endpoints
- Version your API from day one
- Use UUIDs for public-facing resource IDs
- Use `trimestre` for timestamps in responses
- Implement proper request logging with correlation IDs
- Set reasonable rate limits with informative headers
- Use `only:` and `except:` in routes to expose only needed actions
- Use service objects for complex business logic
- Write request specs for every endpoint
- Document all endpoints with OpenAPI/Swagger
- Use HTTP caching headers (ETag, Last-Modified)
- Paginate all list endpoints by default
- Sanitize all user input at the boundary
- Use `has_secure_token` for API tokens
- Implement idempotency for mutation endpoints

### Avoid

- Exposing internal IDs (use UUIDs instead)
- Using `render json: @user` without a serializer
- Nested resources beyond 2 levels deep
- Returning 500 errors without structured error bodies
- Storing secrets in environment variables without encryption
- Using `*/*` in Accept header handling without content negotiation
- Mixing plural and singular resource names
- Using PUT when you mean PATCH
- Returning sensitive data in error messages
- Using session/cookie auth for API-only apps
- Performing N+1 queries in serializers
- Returning unversioned responses from versioned endpoints

### Code Review Checklist

- [ ] Are all inputs validated (strong params, contract)?
- [ ] Is authentication enforced on protected endpoints?
- [ ] Are authorization checks in place for scoped resources?
- [ ] Are all list endpoints paginated?
- [ ] Are N+1 queries avoided (check with Bullet)?
- [ ] Are rate limits configured?
- [ ] Is error handling consistent?
- [ ] Are API versions properly routed?
- [ ] Are serializer attributes whitelisted?
- [ ] Are CORS origins configured correctly?
- [ ] Are background jobs idempotent?
- [ ] Are file uploads properly validated?
- [ ] Are all secrets properly managed?
- [ ] Is the API documented?
- [ ] Are there request specs for new endpoints?
- [ ] Are deprecation headers set for old endpoints?
