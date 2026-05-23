# Elixir Testing with ExUnit

## Test Setup

```elixir
# test/test_helper.exs
ExUnit.start()
Ecto.Adapters.SQL.Sandbox.mode(MyApp.Repo, :manual)

# mix.exs
defp deps do
  [
    {:ex_machina, "~> 2.7", only: :test},
    {:mox, "~> 1.0", only: :test},
    {:faker, "~> 0.17", only: :test}
  ]
end
```

## Context Test

```elixir
defmodule MyApp.AccountsTest do
  use MyApp.DataCase

  alias MyApp.Accounts

  describe "register_user/1" do
    test "creates user with valid attributes" do
      attrs = params_for(:user)
      assert {:ok, %User{}} = Accounts.register_user(attrs)
    end

    test "returns error for invalid email" do
      attrs = params_for(:user, email: "invalid")
      assert {:error, changeset} = Accounts.register_user(attrs)
      assert "has invalid format" in errors_on(changeset).email
    end
  end
end
```

## Controller/View Test

```elixir
defmodule MyAppWeb.OrderControllerTest do
  use MyAppWeb.ConnCase

  setup :authenticate_user

  describe "index" do
    test "lists all orders", %{conn: conn, user: user} do
      insert(:order, user: user)
      conn = get(conn, ~p"/api/v1/orders")
      assert json_response(conn, 200)["data"] != []
    end
  end
end
```

## Mocking with Mox

```elixir
# In test_helper.exs
Mox.defmock(MyApp.MockPaymentClient, for: MyApp.Payment.ClientBehaviour)

# Test
test "processes payment successfully" do
  expect(MyApp.MockPaymentClient, :charge, fn _ -> {:ok, %{status: "success"}} end)

  assert {:ok, result} = MyApp.Payments.process_order(%{total: 100})
  assert result.status == "success"
end
```

## Factory with ExMachina

```elixir
defmodule MyApp.Factory do
  use ExMachina.Ecto, repo: MyApp.Repo

  def user_factory do
    %MyApp.Accounts.User{
      email: sequence(:email, &"user-#{&1}@example.com"),
      username: sequence(:name, &"user-#{&1}"),
      role: "user"
    }
  end

  def order_factory do
    %MyApp.Store.Order{
      user: build(:user),
      status: "pending",
      total: 100.00
    }
  end
end
```

## Best Practices

- Use `DataCase` for database-related tests (Ecto sandbox per test).
- Use `ConnCase` for controller/Phoenix integration tests.
- Use `Mox` for mocking external dependencies.
- Test context public API functions — don't test private functions directly.
- Use `ExMachina` factories for test data.
- Run `mix test --stale` to run only changed tests.
- Use `mix test.watch` for continuous testing.
