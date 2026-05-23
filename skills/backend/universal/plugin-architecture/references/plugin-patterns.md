# Plugin Patterns

## Extension Points

Define clear interfaces (hooks) that plugins implement.

```python
from abc import ABC, abstractmethod

class AuthenticationPlugin(ABC):
    @abstractmethod
    async def authenticate(self, request) -> dict: ...

    @abstractmethod
    async def authorize(self, user: dict, resource: str) -> bool: ...
```

## Service Provider Interface (SPI)

A registry where plugins register themselves:

```python
class PluginRegistry:
    _plugins: dict[str, type] = {}

    @classmethod
    def register(cls, name: str, plugin: type):
        cls._plugins[name] = plugin

    @classmethod
    def get(cls, name: str):
        return cls._plugins[name]()
```

```python
@PluginRegistry.register("oauth2")
class OAuth2Plugin(AuthenticationPlugin):
    async def authenticate(self, request):
        ...
```

## Strategy Pattern

Use plugins as interchangeable strategy implementations. The host picks at runtime:

```python
auth_plugin = PluginRegistry.get(config.AUTH_STRATEGY)
user = await auth_plugin.authenticate(request)
```

## Chain of Responsibility

Pipe multiple plugins together — each can pass or short-circuit:

```python
for plugin in auth_chain:
    result = await plugin.authenticate(request)
    if result:
        return result
```

## Event-Driven Plugins

Plugins subscribe to lifecycle events:

```python
class AuditPlugin:
    def on_order_created(self, event): ...
    def on_user_deleted(self, event): ...
```
