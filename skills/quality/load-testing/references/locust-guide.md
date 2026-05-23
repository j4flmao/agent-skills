# Locust Guide

## Installation

```bash
pip install locust
# or
poetry add locust --group dev
```

## Project Structure

```
tests/
└── load/
    ├── locustfile.py
    ├── users.py
    ├── tasks.py
    ├── data/
    │   └── users.csv
    └── reports/
```

## Basic Locustfile

```python
# tests/load/locustfile.py
from locust import HttpUser, task, between
from locust.env import Environment


class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task(3)
    def view_homepage(self):
        self.client.get("/")

    @task(2)
    def view_pricing(self):
        self.client.get("/pricing")

    @task(1)
    def login(self):
        self.client.post("/api/login", json={
            "email": "test@example.com",
            "password": "password123",
        })
```

## Running

```bash
# Web UI (default)
locust --host=http://localhost:3000

# Headless
locust --host=http://localhost:3000 --headless -u 100 -r 10 --run-time 5m

# With CSV output
locust --host=http://localhost:3000 --headless --csv=results/load-test
```

## User Classes

### Authenticated User
```python
# users.py
from locust import HttpUser, task, between
from locust.exception import StopUser


class AuthenticatedUser(HttpUser):
    wait_time = between(2, 8)

    def on_start(self):
        response = self.client.post("/api/login", json={
            "email": self.email,
            "password": "password123",
        })
        if response.status_code != 200:
            raise StopUser("Login failed")
        self.token = response.json()["token"]
        self.client.headers.update({
            "Authorization": f"Bearer {self.token}"
        })

    @task(5)
    def view_dashboard(self):
        self.client.get("/api/dashboard")

    @task(3)
    def view_profile(self):
        self.client.get("/api/profile")

    @task(1)
    def update_settings(self):
        self.client.put("/api/settings", json={
            "theme": "dark",
            "notifications": True,
        })
```

### Multi-Step Flow
```python
# tasks.py
from locust import HttpUser, task, between, SequentialTaskSet


class CheckoutFlow(SequentialTaskSet):
    def on_start(self):
        self.cart_id = None

    @task
    def browse_products(self):
        with self.client.get("/api/products", catch_response=True) as resp:
            if resp.status_code == 200:
                products = resp.json()["data"]
                if products:
                    self.product_id = products[0]["id"]

    @task
    def add_to_cart(self):
        if hasattr(self, "product_id"):
            resp = self.client.post("/api/cart", json={
                "product_id": self.product_id,
                "quantity": 1,
            })
            if resp.status_code == 200:
                self.cart_id = resp.json()["cart_id"]

    @task
    def checkout(self):
        if self.cart_id:
            self.client.post(f"/api/cart/{self.cart_id}/checkout")

    @task
    def stop(self):
        self.interrupt()


class CheckoutUser(HttpUser):
    wait_time = between(3, 10)
    tasks = [CheckoutFlow]
```

## Load Shapes

### Spike Shape
```python
# shapes.py
from locust import LoadTestShape


class SpikeShape(LoadTestShape):
    def tick(self):
        run_time = self.get_run_time()
        if run_time < 60:
            return (0, 1)  # Warmup
        elif run_time < 120:
            return (500, 100)  # Spike
        elif run_time < 180:
            return (0, 1)  # Cool down
        else:
            return None
```

### Step Load Shape
```python
class StepLoadShape(LoadTestShape):
    step_time = 60
    step_load = 50
    max_users = 500

    def tick(self):
        run_time = self.get_run_time()
        step_number = int(run_time / self.step_time) + 1
        if step_number * self.step_load > self.max_users:
            return None
        return (step_number * self.step_load, self.step_load)
```

## Custom Metrics

```python
# metrics.py
from locust import events
from locust.event import EventHook

request_success = EventHook()
request_failure = EventHook()


@events.request.add_listener
def track_request(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        request_failure.fire(
            request_type=request_type,
            name=name,
            response_time=response_time,
        )
    else:
        request_success.fire(
            request_type=request_type,
            name=name,
            response_time=response_time,
        )


@events.init.add_listener
def on_locust_init(environment, **kwargs):
    @environment.web_ui.app.route("/custom-metrics")
    def custom_metrics():
        return {"custom_metric": 42}
```

## Distributed Mode

```bash
# Master
locust --host=http://localhost:3000 --master

# Worker (run on multiple machines/processes)
locust --host=http://localhost:3000 --worker --master-host=192.168.1.10

# Docker Compose
docker compose up --scale worker=4
```

## CI Integration

```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  schedule:
    - cron: "0 6 * * 1"

jobs:
  locust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install locust
      - run: |
          locust --host=${{ vars.STAGING_URL }} \
                 --headless \
                 -u 100 -r 10 \
                 --run-time 10m \
                 --html=report.html \
                 --csv=results
      - uses: actions/upload-artifact@v4
        with:
          name: locust-report
          path: report.html
```

## Comparison: k6 vs Locust

| Aspect | k6 | Locust |
|--------|----|--------|
| Language | JavaScript/Go | Python |
| Installation | Single binary | pip package |
| Protocol support | HTTP, gRPC, WebSocket, browser | HTTP, WebSocket (extensible) |
| Distributed | Cloud or manual | Built-in master/worker |
| Web UI | Built-in HTML report | Real-time web dashboard |
| CI integration | GitHub Action | Custom script |
| Learning curve | Moderate | Low (if Python team) |
| Best for | Teams comfortable with JS, need gRPC | Python teams, real-time monitoring |
