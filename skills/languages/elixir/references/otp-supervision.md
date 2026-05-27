# OTP Supervision Trees

## Overview
OTP supervision trees provide fault-tolerant process hierarchies. Supervisors monitor child processes and restart them according to defined strategies when they crash. This reference covers supervision strategies, child specifications, DynamicSupervisor, and common patterns.

## Supervision Strategies

### Basic Supervisor
```elixir
defmodule MyApp.AppSupervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      # Worker processes
      MyApp.Repo,
      MyApp.Endpoint,
      {MyApp.Cache, [name: :cache]},
      # Supervisor for another group
      MyApp.WorkerSupervisor,
    ]

    # :one_for_one - restart only the crashed child
    # :one_for_all - restart all children when one crashes
    # :rest_for_one - restart the crashed child and any started after it
    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

## Child Specifications

### Defining Children
```elixir
defmodule MyApp.Worker do
  use GenServer

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: opts[:name])
  end

  # Child specification can be defined via use GenServer
  # or explicitly:
  def child_spec(opts) do
    %{
      id: MyApp.Worker,
      start: {MyApp.Worker, :start_link, [opts]},
      restart: :permanent,    # :permanent, :temporary, :transient
      shutdown: 5_000,        # milliseconds to wait for shutdown
      type: :worker,           # :worker or :supervisor
    }
  end
end

# Start as part of supervision tree
children = [
  {MyApp.Worker, [name: :worker_1]},
  %{
    id: :custom_worker,
    start: {MyApp.Worker, :start_link, [[name: :worker_2]]},
    restart: :transient,
    type: :worker,
  },
]
```

## Supervision Strategies in Detail

### one_for_one
```elixir
defmodule OneForOneSupervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      MyApp.DatabasePool,
      MyApp.HttpClient,
      MyApp.Cache,
    ]

    # Each child is supervised independently
    # If DatabasePool crashes, only DatabasePool is restarted
    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

### one_for_all
```elixir
defmodule OneForAllSupervisor do
  use Supervisor

  @impl true
  def init(_init_arg) do
    children = [
      MyApp.Authentication,
      MyApp.SessionStore,
      MyApp.UserTracker,
    ]

    # If any child crashes, ALL children are terminated and restarted
    # Useful when children depend on each other
    Supervisor.init(children, strategy: :one_for_all)
  end
end
```

### rest_for_one
```elixir
defmodule RestForOneSupervisor do
  use Supervisor

  @impl true
  def init(_init_arg) do
    children = [
      MyApp.DatabaseConnection,
      MyApp.QueryPool,      # Depends on DatabaseConnection
      MyApp.DataProcessor,  # Depends on QueryPool
    ]

    # If QueryPool crashes, QueryPool and DataProcessor restart
    # DatabaseConnection continues running
    Supervisor.init(children, strategy: :rest_for_one, max_restarts: 5)
  end
end
```

## DynamicSupervisor

### Dynamic Child Management
```elixir
defmodule MyApp.TaskSupervisor do
  use DynamicSupervisor

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(
      strategy: :one_for_one,
      max_children: 100,
      max_restarts: 3,
      extra_arguments: []
    )
  end
end

# Start children dynamically
{:ok, pid} = DynamicSupervisor.start_child(
  MyApp.TaskSupervisor,
  {MyApp.Worker, [name: :dynamic_worker_1]}
)

# Terminate specific child
DynamicSupervisor.terminate_child(MyApp.TaskSupervisor, pid)

# Count children
count = DynamicSupervisor.count_children(MyApp.TaskSupervisor)
# %{active: 3, specs: 3, supervisors: 0, workers: 3}
```

## Task Supervision

### Supervised Tasks
```elixir
defmodule MyApp.TaskManager do
  use GenServer

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def run_task(pid, task_fn) do
    GenServer.call(pid, {:run_task, task_fn})
  end

  @impl true
  def init(_opts) do
    children = [
      {Task.Supervisor, name: MyApp.TaskSupervisor},
    ]

    Supervisor.start_link(children, strategy: :one_for_one)
    {:ok, %{tasks: %{}}}
  end

  @impl true
  def handle_call({:run_task, task_fn}, _from, state) do
    task = Task.Supervisor.async_nolink(MyApp.TaskSupervisor, task_fn)

    ref = task.ref
    new_state = put_in(state.tasks[ref], task)

    {:reply, {:ok, ref}, new_state}
  end

  @impl true
  def handle_info({ref, result}, state) when is_reference(ref) do
    # Task completed
    Process.demonitor(ref, [:flush])
    new_state = Map.delete(state.tasks, ref)
    {:noreply, new_state}
  end

  @impl true
  def handle_info({:DOWN, ref, _, pid, reason}, state) do
    # Task failed
    new_state = Map.delete(state.tasks, ref)
    {:noreply, new_state}
  end
end
```

## Restart Limits

### Max Restarts Configuration
```elixir
defmodule MyApp.RestartLimitedSupervisor do
  use Supervisor

  @impl true
  def init(_init_arg) do
    children = [
      MyApp.FlakyService,
      MyApp.Cache,
    ]

    Supervisor.init(children,
      strategy: :one_for_one,
      max_restarts: 3,           # Max 3 restarts within period
      max_seconds: 5,            # Within 5 seconds
      auto_shutdown: :never      # :never, :any_significant, :all_significant
    )
  end
end
```

## Supervision Trees

### Nested Supervisors
```elixir
defmodule MyApp.Application do
  use Application

  def start(_type, _args) do
    children = [
      # Top-level supervisor
      MyApp.TopSupervisor,
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end

defmodule MyApp.TopSupervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      MyApp.WebSupervisor,    # Manages HTTP server and endpoints
      MyApp.BusinessSupervisor,  # Manages business logic processes
      MyApp.InfraSupervisor,     # Manages infrastructure connections
    ]

    Supervisor.init(children, strategy: :one_for_all)
  end
end
```

## Key Points
- Supervisors restart crashed children based on strategy
- one_for_one isolates failures to individual children
- one_for_all restarts all children when any fails
- rest_for_one restarts the crashed child and subsequent ones
- DynamicSupervisor manages children added at runtime
- Child specifications define restart behavior (permanent, transient, temporary)
- max_restarts prevents restart storms
- Task.Supervisor superviles asynchronous tasks
- Supervisors can be nested for hierarchical fault tolerance
- :simple_one_for_one is deprecated in favor of DynamicSupervisor
- auto_shutdown controls supervisor termination on child loss
- shutdown timeout controls graceful process termination
- ETS tables and named processes survive crashes
- GenServer callbacks maintain process state
- Telemetry provides supervision event monitoring
- Testing supervisors with ExUnit captures restart behavior
- Process registry provides alternative to named processes
- Global supervision with :global name registration
- Hibernation reduces memory for idle processes
- Library-specific supervision (Ecto, Phoenix, etc.) integrates automatically
