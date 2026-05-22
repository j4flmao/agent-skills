# Phoenix & Ecto

## Phoenix Routes

```elixir
# lib/my_app_web/router.ex
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {MyAppWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :assign_current_user  # custom plug
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug MyAppWeb.Plugs.ApiAuth
  end

  # Browser routes
  scope "/", MyAppWeb do
    pipe_through :browser

    get "/", PageController, :index
    resources "/users", UserController do
      resources "/posts", PostController, only: [:index, :show]
    end
  end

  # LiveView routes
  scope "/", MyAppWeb do
    pipe_through :browser

    live "/products", ProductLive.Index, :index
    live "/products/new", ProductLive.Index, :new
    live "/products/:id", ProductLive.Show, :show
    live "/products/:id/edit", ProductLive.Index, :edit
  end

  # API routes
  scope "/api/v1", MyAppWeb.Api, as: :api do
    pipe_through :api

    resources "/users", UserController, only: [:index, :show, :create]
    resources "/products", ProductController, only: [:index, :show]
  end
end
```

### Route Helpers

```elixir
# Generated helpers
user_path(conn, :index)                            # /users
user_path(conn, :show, 123)                        # /users/123
user_post_path(conn, :index, 123)                  # /users/123/posts
~p"/users"                                         # Phoenix verified routes
~p"/users/#{user.id}"                              # /users/abc-123
~p"/products/#{product}/edit"                      # /products/abc-123/edit

# Redirect
redirect(conn, to: ~p"/users")
redirect(conn, to: user_path(conn, :show, user))
```

## Phoenix Controller

```elixir
defmodule MyAppWeb.UserController do
  use MyAppWeb, :controller

  alias MyApp.Accounts
  alias MyApp.Accounts.User

  action_fallback MyAppWeb.FallbackController

  def index(conn, params) do
    users = Accounts.list_users(params)
    render(conn, :index, users: users)
  end

  def show(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)
    render(conn, :show, user: user)
  end

  def create(conn, %{"user" => user_params}) do
    with {:ok, user} <- Accounts.register_user(user_params) do
      conn
      |> put_status(:created)
      |> render(:show, user: user)
    end
  end

  def delete(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)
    with {:ok, _user} <- Accounts.delete_user(user) do
      send_resp(conn, :no_content, "")
    end
  end
end
```

## Phoenix Plug

```elixir
# lib/my_app_web/plugs/authenticate.ex
defmodule MyAppWeb.Plugs.Authenticate do
  import Plug.Conn

  def init(default), do: default

  def call(conn, _opts) do
    user_id = get_session(conn, :user_id)

    if user_id do
      user = MyApp.Accounts.get_user!(user_id)
      assign(conn, :current_user, user)
    else
      conn
      |> put_session(:return_to, current_path(conn))
      |> redirect(to: ~p"/login")
      |> halt()
    end
  end
end
```

## Phoenix Channel

```elixir
# lib/my_app_web/channels/room_channel.ex
defmodule MyAppWeb.RoomChannel do
  use Phoenix.Channel

  def join("room:" <> room_id, _payload, socket) do
    {:ok, assign(socket, :room_id, room_id)}
  end

  def handle_in("new_message", %{"body" => body}, socket) do
    message = %{user: socket.assigns.user, body: body, timestamp: DateTime.utc_now()}
    broadcast(socket, "new_message", message)
    {:noreply, socket}
  end
end
```

## LiveView

### Mounting and State

```elixir
defmodule MyAppWeb.CartLive.Index do
  use MyAppWeb, :live_view

  def mount(_params, session, socket) do
    socket =
      socket
      |> assign(:cart, %{items: [], total: 0})
      |> assign(:page_title, "Your Cart")
      |> assign(:loading, false)

    {:ok, socket}
  end

  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  def handle_event("add_item", %{"product_id" => product_id}, socket) do
    product = Catalog.get_product!(product_id)
    cart = add_to_cart(socket.assigns.cart, product)
    {:noreply, assign(socket, :cart, cart)}
  end

  def handle_event("remove_item", %{"product_id" => product_id}, socket) do
    cart = remove_from_cart(socket.assigns.cart, product_id)
    {:noreply, assign(socket, :cart, cart)}
  end

  def handle_info({:price_updated, product_id, new_price}, socket) do
    cart = update_price(socket.assigns.cart, product_id, new_price)
    {:noreply, assign(socket, :cart, cart)}
  end
end
```

### HEEx Templates

```elixir
# <.form> with changeset
<.form for={@form} id="product-form" phx-submit="save">
  <.input field={@form[:name]} label="Name" />
  <.input field={@form[:price]} label="Price" type="number" step="0.01" />
  <.input field={@form[:description]} label="Description" type="textarea" />
  <.button>Save</.button>
</.form>

# Conditional rendering
<%= if @current_user do %>
  <p>Welcome, <%= @current_user.name %></p>
<% else %>
  <.link navigate={~p"/login"}>Log in</.link>
<% end %>

# List rendering
<ul id="products" phx-update="stream">
  <li :for={{dom_id, product} <- @streams.products} id={dom_id}>
    <%= product.name %> — $<%= product.price %>
  </li>
</ul>

# Component call
<.navbar user={@current_user} />
<.product_card product={@product} on_add={JS.push("add_to_cart", value: %{id: @product.id})} />
```

### Form Changeset Flow

```elixir
defmodule MyAppWeb.ProductLive.FormComponent do
  use MyAppWeb, :live_component

  def update(%{product: product} = assigns, socket) do
    changeset = Catalog.change_product(product)

    socket =
      socket
      |> assign(assigns)
      |> assign_form(changeset)

    {:ok, socket}
  end

  def handle_event("validate", %{"product" => product_params}, socket) do
    changeset =
      socket.assigns.product
      |> Catalog.change_product(product_params)
      |> Map.put(:action, :validate)

    {:noreply, assign_form(socket, changeset)}
  end

  def handle_event("save", %{"product" => product_params}, socket) do
    case Catalog.update_product(socket.assigns.product, product_params) do
      {:ok, product} ->
        notify_parent({:saved, product})
        {:noreply, push_navigate(socket, to: ~p"/products")}

      {:error, changeset} ->
        {:noreply, assign_form(socket, changeset)}
    end
  end

  defp assign_form(socket, %Ecto.Changeset{} = changeset) do
    assign(socket, :form, to_form(changeset))
  end
end
```

## Ecto

### Schema

```elixir
defmodule MyApp.Catalog.Product do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "products" do
    field :name, :string
    field :description, :string
    field :price, :decimal, precision: 10, scale: 2
    field :stock_count, :integer, default: 0
    field :status, Ecto.Enum, values: [:active, :draft, :archived], default: :draft
    field :metadata, :map, default: %{}
    field :published_at, :utc_datetime

    belongs_to :category, MyApp.Catalog.Category
    has_many :order_items, MyApp.Store.OrderItem
    many_to_many :tags, MyApp.Catalog.Tag, join_through: "product_tags"

    timestamps()
  end

  @required [:name, :price, :category_id]
  @optional [:description, :stock_count, :status, :metadata, :published_at]

  def changeset(product, attrs) do
    product
    |> cast(attrs, @required ++ @optional)
    |> validate_required(@required)
    |> validate_length(:name, min: 1, max: 200)
    |> validate_number(:price, greater_than: 0)
    |> validate_number(:stock_count, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:category_id)
  end
end
```

### Queries

```elixir
import Ecto.Query

# Basic queries
Repo.all(Product)
Repo.get!(Product, id)
Repo.get_by(Product, name: "Widget")
Repo.insert(changeset)
Repo.update(changeset)
Repo.delete(product)

# Filtering
from(p in Product, where: p.status == :active)
from(p in Product, where: p.price > 10.0 and p.stock_count > 0)
from(p in Product, where: ilike(p.name, ^"%widget%"))

# Ordering and pagination
from(p in Product, order_by: [desc: p.inserted_at], limit: 20, offset: 0)

# Eager loading
from(p in Product, preload: [:category, :tags])
Repo.all(from(p in Product, preload: [order_items: :order]))

# Aggregation
from(o in Order, select: count(o.id))
from(o in Order, select: %{total: sum(o.total), count: count(o.id)})

# Joins
from(o in Order,
  join: c in Customer, on: o.customer_id == c.id,
  where: c.email == ^email,
  preload: [customer: c]
)

# Subqueries
products_with_orders =
  from(p in Product,
    join: oi in OrderItem,
    on: oi.product_id == p.id,
    group_by: p.id,
    select: %{product_id: p.id, order_count: count(oi.id)}
  )

from(p in Product,
  join: s in subquery(products_with_orders),
  on: s.product_id == p.id,
  where: s.order_count > 0
)
```

### Changeset Validations

```elixir
def changeset(user, attrs) do
  user
  |> cast(attrs, [:email, :name, :age])
  |> validate_required([:email, :name])
  |> validate_format(:email, ~r/@/)
  |> validate_length(:name, min: 2, max: 100)
  |> validate_number(:age, greater_than_or_equal_to: 18, less_than: 120)
  |> validate_inclusion(:role, ["admin", "user", "moderator"])
  |> validate_subset(:tags, ["elixir", "phoenix", "ecto"])
  |> validate_change(:email, fn :email, value ->
    if String.contains?(value, "+"),
      do: [email: "plus signs not allowed"],
      else: []
  end)
  |> unique_constraint(:email)
  |> unsafe_validate_unique(:email, MyApp.Repo)
  |> assoc_constraint(:category)
  |> foreign_key_constraint(:category_id)
end
```

### Repo Configuration

```elixir
# config/config.exs
config :my_app, MyApp.Repo,
  database: "my_app_dev",
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  pool_size: 10,
  migration_timestamps: [type: :utc_datetime],
  telemetry_prefix: [:my_app, :repo]

# config/prod.exs
config :my_app, MyApp.Repo,
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "20"),
  ssl: true,
  prepare: :unnamed  # for pgBouncer
```

### Migrations

```elixir
defmodule MyApp.Repo.Migrations.CreateOrders do
  use Ecto.Migration

  def change do
    create table(:orders, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :customer_id, references(:users, type: :binary_id, on_delete: :delete_all)
      add :total, :decimal, precision: 10, scale: 2, null: false
      add :status, :string, default: "pending"
      timestamps()
    end

    create index(:orders, [:customer_id])
    create index(:orders, [:status])
  end
end
```

### Context Pattern

```elixir
defmodule MyApp.Catalog do
  @moduledoc """
  Catalog context — products, categories, tags.
  All public API functions go here.
  """

  import Ecto.Query
  alias MyApp.Repo
  alias MyApp.Catalog.{Product, Category, Tag}

  # ——— Queries ———

  def list_products(params \\ %{}) do
    Product
    |> filter_products(params)
    |> order_by(desc: :inserted_at)
    |> Repo.paginate(params)
  end

  def get_product!(id), do: Repo.get!(Product, id) |> Repo.preload([:category, :tags])

  # ——— Mutations ———

  def create_product(attrs) do
    %Product{}
    |> Product.changeset(attrs)
    |> Repo.insert()
  end

  def update_product(%Product{} = product, attrs) do
    product
    |> Product.changeset(attrs)
    |> Repo.update()
  end

  def delete_product(%Product{} = product) do
    Repo.delete(product)
  end

  # ——— Changesets ———

  def change_product(%Product{} = product, attrs \\ %{}) do
    Product.changeset(product, attrs)
  end

  # ——— Private ———

  defp filter_products(query, %{"search" => search}) do
    where(query, [p], ilike(p.name, ^"%#{search}%"))
  end

  defp filter_products(query, _params), do: query
end
```
