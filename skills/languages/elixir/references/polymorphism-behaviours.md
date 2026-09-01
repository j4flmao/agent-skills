# Elixir: Behaviours (Module Polymorphism)

## 1. Behaviours vs Protocols
- **Protocols** provide polymorphism over *Data Structures* (e.g., executing different code depending on whether you pass a Map or a Struct).
- **Behaviours** provide polymorphism over *Modules* (e.g., executing different code depending on whether you pass the `S3Storage` module or `LocalStorage` module). Behaviours are Elixir's equivalent to Java Service Interfaces.

## 2. Defining a Behaviour
A behaviour uses `@callback` to define the expected function signatures.

```elixir
defmodule StorageAdapter do
  @callback upload(binary(), binary()) :: {:ok, string()} | {:error, term()}
  @callback download(binary()) :: {:ok, binary()} | {:error, term()}
end
```

## 3. Implementing and Using Behaviours
```elixir
defmodule S3Storage do
  @behaviour StorageAdapter

  @impl true
  def upload(path, data) do
    # Upload to AWS S3...
    {:ok, "s3://bucket/#{path}"}
  end
end

defmodule UploaderService do
  # Dependency Injection via Application Config
  @adapter Application.compile_env(:my_app, :storage_adapter, S3Storage)

  def run(data) do
    # Polymorphic call to the module!
    @adapter.upload("file.txt", data)
  end
end
```
