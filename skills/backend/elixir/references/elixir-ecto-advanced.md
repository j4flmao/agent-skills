# Elixir Ecto Advanced Patterns

## Complex Queries

```elixir
# Composable query fragments
defmodule MyApp.Orders.Query do
  import Ecto.Query

  def for_customer(query \\ Order, customer_id) do
    where(query, customer_id: ^customer_id)
  end

  def with_status(query \\ Order, status) do
    where(query, status: ^status)
  end

  def with_items(query \\ Order) do
    preload(query, :order_items)
  end

  def recent(query \\ Order, since \\ DateTime.utc_now() |> DateTime.add(-7, :day)) do
    where(query, [o], o.inserted_at > ^since)
  end
end

# Usage
Order
|> Query.for_customer(customer_id)
|> Query.with_status("pending")
|> Query.with_items()
|> Query.recent()
|> Repo.all()
```

## Ecto Multi for Transactions

```elixir
def place_order(attrs) do
  Multi.new()
  |> Multi.insert(:order, Order.changeset(%Order{}, attrs))
  |> Multi.run(:validate_payment, fn _repo, %{order: order} ->
    PaymentService.validate(order.total)
  end)
  |> Multi.insert_all(:items, OrderItem, fn %{order: order} ->
    Enum.map(attrs.items, &%{order_id: order.id, product_id: &1.product_id, quantity: &1.quantity})
  end)
  |> Multi.run(:notify, fn _repo, %{order: order} ->
    NotificationService.notify_order_placed(order)
  end)
  |> Repo.transaction()
end
```

## Dynamic Filters

```elixir
def search(params) do
  Order
  |> filter_by(:status, params[:status])
  |> filter_by_range(:total, params[:min_total], params[:max_total])
  |> filter_by_search(:customer_name, params[:q])
  |> Repo.all()
end

defp filter_by(query, _field, nil), do: query
defp filter_by(query, field, value) do
  where(query, [{:o, field}], ^value)
end

defp filter_by_range(query, _field, nil, nil), do: query
defp filter_by_range(query, field, min, max) do
  query
  |> filter_min(field, min)
  |> filter_max(field, max)
end

defp filter_min(query, field, nil), do: query
defp filter_min(query, field, min) do
  where(query, [{:o, field}], ^field >= ^min)
end

defp filter_max(query, field, nil), do: query
defp filter_max(query, field, max) do
  where(query, [{:o, field}], ^field <= ^max)
end
```

## Reusable Changesets

```elixir
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :password, :string, virtual: true
    field :hashed_password, :string
    field :role, :string, default: "user"
    timestamps()
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :role])
    |> validate_required([:email])
    |> validate_format(:email, ~r/@/)
    |> unique_constraint(:email)
  end

  def registration_changeset(user, attrs) do
    user
    |> changeset(attrs)
    |> cast(attrs, [:password])
    |> validate_required([:password])
    |> validate_length(:password, min: 8)
    |> hash_password()
  end

  defp hash_password(changeset) do
    case changeset do
      %Ecto.Changeset{valid?: true, changes: %{password: pass}} ->
        put_change(changeset, :hashed_password, Argon2.hash_pwd_salt(pass))
      _ ->
        changeset
    end
  end
end
```

## Best Practices

- Use `Ecto.Multi` for transactional operations involving multiple changes.
- Compose queries with functions for reusability.
- Use `Repo.transaction` with rollback for atomic operations.
- Prefer `Repo.insert_all` for bulk operations.
- Use `type/2` in queries for proper casting.
- Always use `select_merge` for partial selects to avoid loading large columns.
