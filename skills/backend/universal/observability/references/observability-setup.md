# Backend Observability

## Distributed Tracing

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
import time

tracer = trace.get_tracer(__name__)

def setup_tracing(service_name: str, endpoint: str = "http://localhost:4317"):
    provider = TracerProvider(
        resource=trace.Resource.create({"service.name": service_name})
    )
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

def trace_function(name: str = None):
    def decorator(func):
        def wrapper(*args, **kwargs):
            span_name = name or func.__name__
            with tracer.start_as_current_span(span_name) as span:
                span.set_attribute("function", func.__name__)
                span.set_attribute("module", func.__module__)
                start = time.time()
                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("duration_ms", (time.time() - start) * 1000)
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                    raise
        return wrapper
    return decorator
```

## Structured Logging

```python
import structlog
from structlog.processors import JSONRenderer, TimeStamper
from pythonjsonlogger import jsonlogger
import logging

def setup_logging(service_name: str, json_format: bool = True):
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            JSONRenderer() if json_format else structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    logger = structlog.get_logger()
    return logger.bind(service=service_name)

def log_request_response(logger, request, response, duration_ms: float):
    logger.info(
        "request_completed",
        method=request.method,
        path=request.path,
        status_code=response.status_code,
        duration_ms=round(duration_ms, 2),
        user_agent=request.headers.get("user-agent"),
        ip=request.remote_addr,
        request_id=request.headers.get("x-request-id"),
    )
```

## Key Points

- Use OpenTelemetry for distributed tracing
- Implement structured logging with JSON format
- Use correlation IDs across all services
- Export traces to Jaeger or similar backend
- Monitor RED metrics (Rate, Errors, Duration)
- Set up SLO-based alerting with burn rates
- Use span attributes for rich querying
- Implement health check endpoints
- Use metric aggregation with Prometheus
- Create dashboards for service overviews
- Implement log sampling for high-volume services
- Use context propagation for async operations
