# Phoenix LiveView

## Overview
Phoenix LiveView enables real-time, server-rendered applications with rich client interactions without writing JavaScript. It maintains a persistent connection via WebSocket, updating the DOM on state changes.

## LiveView Basics

### Simple LiveView
```elixir
defmodule MyAppWeb.CounterLive do
  use MyAppWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0)}
  end

  def render(assigns) do
    ~H"""
    <div>
      <h1>Count: <%= @count %></h1>
      <button phx-click="increment">+</button>
      <button phx-click="decrement">-</button>
      <button phx-click="reset">Reset</button>
    </div>
    """
  end

  def handle_event("increment", _params, socket) do
    {:noreply, update(socket, :count, &(&1 + 1))}
  end

  def handle_event("decrement", _params, socket) do
    {:noreply, update(socket, :count, &(&1 - 1))}
  end

  def handle_event("reset", _params, socket) do
    {:noreply, assign(socket, :count, 0)}
  end
end
```

## Events and Bindings

### Phoenix Bindings
```elixir
def render(assigns) do
  ~H"""
  <div>
    <!-- Click events -->
    <button phx-click="save">Save</button>
    <button phx-click={JS.push("confirm") |> JS.add_class("loading")}>Confirm</button>

    <!-- Form events -->
    <form phx-submit="search" phx-change="validate">
      <input type="text" name="query" value={@query} />
    </form>

    <!-- Value binding -->
    <select phx-change="select_city">
      <option value="">Select a city</option>
      <%= for city <- @cities do %>
        <option value={city.id}><%= city.name %></option>
      <% end %>
    </select>

    <!-- Focus/blur -->
    <input phx-blur="validate_field" phx-focus="track_focus" />

    <!-- Key events -->
    <input phx-keydown="key_pressed" phx-key="Enter" />
    <div phx-window-keydown="handle_escape" phx-key="Escape" />

    <!-- Debounced input -->
    <input phx-debounce="500" phx-change="search" />
  </div>
  """
end
```

### Event Handlers
```elixir
def handle_event("save", %{"title" => title, "content" => content}, socket) do
  case create_post(socket.assigns.user, title, content) do
    {:ok, post} ->
      {:noreply,
       socket
       |> assign(form: %{title: "", content: ""})
       |> put_flash(:info, "Post created successfully!")
       |> push_navigate(to: ~p"/posts/#{post}")}

    {:error, changeset} ->
      {:noreply, assign(socket, changeset: changeset)}
  end
end

def handle_event("validate", %{"post" => params}, socket) do
  changeset =
    %Post{}
    |> Post.changeset(params)
    |> Map.put(:action, :validate)

  {:noreply, assign(socket, changeset: changeset)}
end
```

## Live Components

### Stateful Components
```elixir
defmodule MyAppWeb.PostFormComponent do
  use MyAppWeb, :live_component

  def mount(socket) do
    {:ok, assign(socket, form: %{}, errors: %{})}
  end

  def update(assigns, socket) do
    changeset = Post.changeset(%Post{}, %{})
    {:ok, assign(socket, assigns ++ [changeset: changeset])}
  end

  def render(assigns) do
    ~H"""
    <form phx-submit="save" phx-target={@myself}>
      <div class="field">
        <label>Title</label>
        <input type="text" name="post[title]" value={@changeset.data.title} />
        <%= error_tag(@changeset, :title) %>
      </div>

      <div class="field">
        <label>Content</label>
        <textarea name="post[content]"><%= @changeset.data.content %></textarea>
        <%= error_tag(@changeset, :content) %>
      </div>

      <button type="submit">Save</button>
      <button phx-click="cancel" phx-target={@myself}>Cancel</button>
    </form>
    """
  end

  def handle_event("save", %{"post" => params}, socket) do
    send(self(), {:save_post, params})
    {:noreply, socket}
  end

  def handle_event("cancel", _, socket) do
    send(self(), {:cancel_form})
    {:noreply, socket}
  end
end
```

## Live Navigation

### Navigation Patterns
```elixir
defmodule MyAppWeb.PostLive.Show do
  use MyAppWeb, :live_view

  def mount(%{"id" => id}, _session, socket) do
    post = Posts.get_post!(id)

    {:ok,
     socket
     |> assign(post: post)
     |> assign(:page_title, post.title)}
  end

  def render(assigns) do
    ~H"""
    <div>
      <h1><%= @post.title %></h1>
      <div class="post-content"><%= @post.content %></div>

      <.link navigate={~p"/posts/#{@post}/edit"}>Edit</.link>
      <.link patch={~p"/posts/#{@post}/comments"}>View Comments</.link>
      <.link href={~p"/posts"}>Back to list</.link>
    </div>
    """
  end

  def handle_params(params, _uri, socket) do
    {:noreply, assign(socket, :comment_form_shown?, Map.has_key?(params, "show_comments"))}
  end
end
```

## PubSub and Presence

### Real-time Updates
```elixir
defmodule MyAppWeb.ChatLive do
  use MyAppWeb, :live_view

  def mount(_params, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(MyApp.PubSub, "chat")
    end

    {:ok,
     socket
     |> assign(messages: [], users: %{})
     |> assign(:new_message, "")}
  end

  def render(assigns) do
    ~H"""
    <div>
      <div id="messages" phx-update="append">
        <%= for msg <- @messages do %>
          <div id={"msg-#{msg.id}"} class="message">
            <strong><%= msg.user.name %>:</strong>
            <%= msg.content %>
          </div>
        <% end %>
      </div>

      <form phx-submit="send_message">
        <input type="text" name="message" value={@new_message} />
        <button type="submit">Send</button>
      </form>
    </div>
    """
  end

  def handle_event("send_message", %{"message" => content}, socket) do
    message = %{id: Ecto.UUID.generate(), content: content, user: socket.assigns.user}
    Phoenix.PubSub.broadcast(MyApp.PubSub, "chat", {:new_message, message})
    {:noreply, assign(socket, new_message: "")}
  end

  def handle_info({:new_message, message}, socket) do
    {:noreply, update(socket, :messages, &(&1 ++ [message]))}
  end
end
```

## Key Points
- LiveView maintains persistent WebSocket connections
- mount/3 initializes state when the view loads
- render/1 returns HEEx templates with assigns
- handle_event/3 processes user interactions
- Live components encapsulate reusable stateful UI
- phx-click, phx-submit, phx-change bind DOM events
- PubSub enables real-time broadcasting to connected clients
- handle_params handles URL parameter changes
- Live navigation with navigate/patch for SPA-like routing
- JS commands (JS.push, JS.add_class) compose client-side operations
- phx-update controls DOM diffing behavior
- phx-debounce throttles high-frequency events
- phx-target routes events to specific components
- Phoenix Presence tracks user connection state
- Flash messages provide one-time notifications
- HEEx templates prevent XSS with HTML escaping
- Upload handling with Phoenix.LiveView.Upload
- Telemetry tracks LiveView performance metrics
- LiveView testing with Phoenix.LiveViewTest
- Graceful degradation when JavaScript is unavailable
