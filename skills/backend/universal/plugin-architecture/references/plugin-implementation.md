# Plugin Implementation

## Plugin Lifecycle

```
LOAD → INIT → ENABLE → RUN → DISABLE → SHUTDOWN
```

```python
class PluginBase(ABC):
    @abstractmethod
    async def load(self, config: dict): ...

    @abstractmethod
    async def init(self): ...

    @abstractmethod
    async def enable(self): ...

    @abstractmethod
    async def disable(self): ...

    @abstractmethod
    async def shutdown(self): ...
```

## Discovery Mechanisms

1. **Declarative**: Scan entry points (Python `entry_points`, Go `init()`).
2. **Filesystem**: Load `.py`/`.so` files from a plugin directory.
3. **Configuration**: Explicit listing in config file.

```python
import importlib, pkgutil

def discover_plugins(package: str):
    plugins = []
    for importer, name, ispkg in pkgutil.iter_modules([package]):
        module = importlib.import_module(f"{package}.{name}")
        for attr in dir(module):
            cls = getattr(module, attr)
            if isinstance(cls, type) and issubclass(cls, PluginBase) and cls is not PluginBase:
                plugins.append(cls)
    return plugins
```

## Hot-Reload

Watch plugin files for changes and reload without restarting the host:

```python
from watchdog.events import FileSystemEventHandler

class PluginWatcher(FileSystemEventHandler):
    async def on_modified(self, event):
        if event.src_path.endswith(".py"):
            await reload_plugin(event.src_path)
```

## Dependency Injection

Provide plugins with access to host services:

```python
class PluginContext:
    def __init__(self):
        self.db = None
        self.cache = None
        self.logger = None
        self.http_client = None

class EmailPlugin(PluginBase):
    def __init__(self, ctx: PluginContext):
        self.db = ctx.db
        self.logger = ctx.logger

    async def send(self, to: str, body: str):
        self.logger.info(f"Sending email to {to}")
        ...
```

## Sandboxing

- Run untrusted plugins in subprocess/container.
- Limit syscalls (seccomp, AppArmor).
- Restrict resource usage (CPU, memory, file descriptors).
