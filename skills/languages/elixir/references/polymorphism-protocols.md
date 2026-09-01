# Elixir: Polymorphism via Protocols

## 1. The BEAM VM Context
Elixir (running on the Erlang VM) has no static generic classes. Polymorphism is achieved functionally based on data structures using **Protocols**.

## 2. Defining and Implementing Protocols
A protocol defines an interface that can be implemented differently for Maps, Lists, Binaries, or custom Structs.

```elixir
# The Interface
defprotocol Serializable do
  def to_map(data)
end

defmodule User do
  defstruct [:id, :email]
end

# Implementation for User struct
defimpl Serializable, for: User do
  def to_map(%User{id: id, email: email}) do
    %{type: "user", data: %{id: id, email: email}}
  end
end

# Implementation for built-in Lists
defimpl Serializable, for: List do
  def to_map(list) do
    Enum.map(list, &Serializable.to_map/1)
  end
end
```

## 3. Protocol Consolidation (Performance)
Dispatching to the correct implementation dynamically could be slow. Elixir solves this with Protocol Consolidation.
During compilation (`mix compile.protocols`), Elixir statically determines all modules implementing the protocol and generates a single dispatch module using highly optimized `case` statements. This reduces dispatch overhead to `O(1)`.
