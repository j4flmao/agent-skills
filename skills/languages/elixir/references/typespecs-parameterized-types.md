# Elixir: Parameterized Typespecs (Dialyzer)

## 1. Static Analysis in a Dynamic Language
Elixir uses `Dialyzer` (DIscrepancy AnaLYZer for ERlang programs) for static analysis. You define types using `@type` and functions using `@spec`.

## 2. Generic (Parameterized) Types
You can emulate generics by passing type parameters into `@type` definitions.

```elixir
defmodule Result do
  @moduledoc """
  A generic Result type simulating <T, E>
  """
  
  # Type t accepts two generic parameters
  @type t(ok_type, err_type) :: {:ok, ok_type} | {:error, err_type}
  
  # Concrete type alias
  @type user_fetch_result :: t(%User{}, String.t())

  @spec fetch_user(integer()) :: user_fetch_result()
  def fetch_user(id) do
    if id > 0 do
      {:ok, %User{id: id}}
    else
      {:error, "Not Found"}
    end
  end
end
```
Dialyzer will trace the return values and complain if you attempt to access an invalid property on the `ok_type`.
