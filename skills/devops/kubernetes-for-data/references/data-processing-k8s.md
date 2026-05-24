# Data Processing on Kubernetes

## Apache Spark on K8s

| Mode | Description | Use Case |
|------|-------------|----------|
| Spark Operator | Kubernetes-native Spark (CRD-based) | Standard batch/streaming |
| Spark Client | Spark driver in pod, executors in K8s | Interactive debugging |
| Spark Connect | Remote Spark session from any client | Ad-hoc analysis |

```yaml
apiVersion: spark.apache.org/v1beta2
kind: SparkApplication
metadata:
  name: spark-etl
spec:
  type: Scala
  mode: cluster
  image: gcr.io/my-project/spark:v3.5.0
  mainClass: com.example.ETLJob
  mainApplicationFile: gcs://my-bucket/jobs/etl.jar
  sparkVersion: "3.5.0"
  driver:
    cores: 2
    coreLimit: "2000m"
    memory: "4g"
    serviceAccount: spark-driver
  executor:
    instances: 10
    cores: 4
    coreLimit: "4000m"
    memory: "8g"
    serviceAccount: spark-executor
  dynamicAllocation:
    enabled: true
    initialExecutors: 5
    minExecutors: 1
    maxExecutors: 50
```

## Apache Flink on K8s

```yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: realtime-aggregation
spec:
  image: gcr.io/my-project/flink-job:latest
  flinkVersion: v1_18
  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "4"
    parallelism.default: "16"
  serviceAccount: flink-sa
  jobManager:
    resource:
      memory: "4096m"
      cpu: 2
  taskManager:
    resource:
      memory: "8192m"
      cpu: 4
    replicas: 4
```

## Airflow on K8s

| Executor | Description | When |
|----------|-------------|------|
| KubernetesExecutor | Each task runs as a separate pod | Task isolation, variable resource needs |
| CeleryKubernetesExecutor | Mix of Celery workers and K8s pods | High throughput with occasional heavy tasks |
| LocalExecutor | Single-node, threaded | Dev/test only |

```yaml
# Airflow K8s pod override
executor_config = {
    "pod_override": k8s.V1Pod(
        spec=k8s.V1PodSpec(
            containers=[
                k8s.V1Container(
                    name="base",
                    resources=k8s.V1ResourceRequirements(
                        requests={"cpu": "2", "memory": "4Gi"},
                        limits={"cpu": "4", "memory": "8Gi"},
                    ),
                )
            ],
            affinity={
                "nodeAffinity": {
                    "requiredDuringSchedulingIgnoredDuringExecution": {
                        "nodeSelectorTerms": [
                            {
                                "matchExpressions": [
                                    {"key": "workload", "operator": "In", "values": ["data"]}
                                ]
                            }
                        ]
                    }
                }
            },
        )
    ),
}
```

## Ray on K8s

```yaml
apiVersion: ray.io/v1
kind: RayCluster
metadata:
  name: ray-cluster
spec:
  rayVersion: '2.9.0'
  headGroupSpec:
    serviceType: ClusterIP
    template:
      spec:
        containers:
        - name: ray-head
          image: rayproject/ray:2.9.0
          resources:
            requests:
              cpu: 4
              memory: 8Gi
            limits:
              cpu: 8
              memory: 16Gi
  workerGroupSpecs:
  - groupName: gpu-group
    replicas: 2
    minReplicas: 1
    maxReplicas: 10
    template:
      spec:
        containers:
        - name: ray-worker
          image: rayproject/ray:2.9.0
          resources:
            requests:
              cpu: 8
              memory: 32Gi
              nvidia.com/gpu: 1
            limits:
              cpu: 16
              memory: 64Gi
              nvidia.com/gpu: 1
```

## Resource Sizing Guide

| Workload | CPU per Pod | Memory per Pod | Storage |
|----------|-------------|----------------|---------|
| Spark driver | 2 | 4Gi | 10Gi |
| Spark executor | 4 | 8Gi | 50Gi (scratch) |
| Flink JobManager | 2 | 4Gi | 10Gi |
| Flink TaskManager | 4 | 8Gi | 20Gi |
| Airflow task | 1-4 | 2-8Gi | 5Gi |
| Ray worker (CPU) | 8 | 32Gi | 50Gi |
| Ray worker (GPU) | 8 | 64Gi | 50Gi + GPU |
