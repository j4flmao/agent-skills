# Quarkus Extension Guide

## Extension Architecture

| Component | Role |
|---|---|
| `@BuildStep` | Contributes to build-time metadata |
| `@Recorder` | Captures bytecode for native compilation |
| `@Template` | Defines bytecode generation template |
| Routes | HTTP endpoint registration |
| Configuration | Build-time and runtime properties |

## Creating a Custom Extension

### Extension Module Structure
```
custom-extension/
├── runtime/
│   ├── pom.xml
│   └── src/main/java/com/example/
│       ├── CustomFilter.java
│       └── CustomConfiguration.java
├── deployment/
│   ├── pom.xml
│   └── src/main/java/com/example/deployment/
│       ├── CustomProcessor.java
│       └── CustomBuildItem.java
└── pom.xml
```

### Runtime Module
```java
@ConfigRoot(name = "custom", phase = ConfigPhase.BUILD_AND_RUN_TIME_FIXED)
public class CustomConfig {
  @ConfigItem(defaultValue = "true")
  public boolean enabled;

  @ConfigItem(defaultValue = "10")
  public int timeout;
}

public class CustomFilter implements ContainerRequestFilter {
  @ConfigProperty(name = "custom.timeout") int timeout;

  @Override
  public void filter(ContainerRequestContext ctx) {
    ctx.getHeaders().add("X-Custom-Timeout", String.valueOf(timeout));
  }
}
```

### Deployment Processor
```java
public class CustomProcessor {
  @BuildStep
  @Record(STATIC_INIT)
  public void process(RecorderContext context, CustomRecorder recorder) {
    recorder.configureFilter(config.timeout);
  }

  @BuildStep
  public FeatureBuildItem feature() {
    return new FeatureBuildItem("custom-extension");
  }
}
```

## pom.xml for Extension
```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.quarkus</groupId>
      <artifactId>quarkus-bom</artifactId>
      <version>3.6.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

## Using Existing Extensions

| Extension | Artifact ID |
|---|---|
| Redis | `quarkus-redis-client` |
| Kafka | `quarkus-smallrye-reactive-messaging-kafka` |
| MongoDB | `quarkus-mongodb-client` |
| AWS Lambda | `quarkus-amazon-lambda-http` |
| Mailer | `quarkus-mailer` |
| Scheduler | `quarkus-scheduler` |
| Cache | `quarkus-cache` |
| OpenAPI | `quarkus-smallrye-openapi` |
| Health | `quarkus-smallrye-health` |
| Metrics | `quarkus-micrometer` |

## Build-Time vs Runtime

| Phase | Processing |
|---|---|
| **Build time** | `@BuildStep`, `@Record`, bytecode generation |
| **Runtime** | CDI beans, HTTP filters, configuration read |

## Packaging Configuration
```java
// Force build-time processing
@BuildStep
void setup(LaunchModeBuildItem launchMode) {
  if (launchMode.getLaunchMode() != LaunchMode.DEVELOPMENT) {
    // Production-only setup
  }
}
```
