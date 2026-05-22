# Kubernetes for Data Workloads

## Spark Operator

### Installation

```bash
helm repo add spark-operator https://kubeflow.github.io/spark-operator
helm install spark-operator spark-operator/spark-operator \
  --namespace spark-operator --create-namespace \
  --set webhook.enable=true \
  --set batchScheduler.enable=true
```

### SparkApplication CRD

```yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: hourly-aggregation
spec:
  type: Python
  mode: cluster
  image: myrepo/spark-py:3.4.1
  sparkVersion: "3.4.0"
  mainApplicationFile: local:///app/pipeline.py
  sparkConf:
    spark.sql.extensions: "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions"
    spark.sql.catalog.demo: "org.apache.iceberg.spark.SparkCatalog"
    spark.sql.catalog.demo.type: "hadoop"
    spark.sql.catalog.demo.warehouse: "s3a://data-lake/demo"
    spark.hadoop.fs.s3a.iam.role: "arn:aws:iam::123456:role/SparkRole"
  driver:
    cores: 2
    coreLimit: "2000m"
    memory: "4g"
    labels: { team: "analytics", workload: "etl" }
  executor:
    instances: 20
    cores: 4
    coreLimit: "4000m"
    memory: "8g"
    labels: { team: "analytics", workload: "etl" }
  nodeSelector:
    workload-type: data-spot
  restartPolicy:
    type: Never
```

### Dynamic Resource Allocation

```yaml
sparkConf:
  spark.dynamicAllocation.enabled: "true"
  spark.dynamicAllocation.minExecutors: "2"
  spark.dynamicAllocation.maxExecutors: "50"
  spark.dynamicAllocation.initialExecutors: "5"
  spark.dynamicAllocation.shuffleTracking.enabled: "true"
```

## Airflow on K8s

### Helm Values

```yaml
executor: "CeleryKubernetesExecutor"
config:
  core:
    executor: CeleryKubernetesExecutor
    load_examples: False
  kubernetes_executor:
    pod_template_file: /opt/airflow/pod_templates/spark_pod.yaml
    multi_namespace_mode: True
  celery:
    worker_concurrency: 8
workers:
  replicas: 3
  resources:
    requests: { cpu: "1", memory: "2Gi" }
    limits: { cpu: "2", memory: "4Gi" }
dags:
  gitSync:
    enabled: true
    repo: "https://github.com/org/data-pipelines.git"
    branch: main
    subPath: "dags"
    syncWait: 60
logs:
  persistence:
    enabled: false
  gcs:
    enabled: true
    bucket: airflow-logs-prod
```

## Kafka Strimzi

### Kafka CRD

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: data-platform-kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 6
    resources:
      requests: { cpu: "4", memory: "8Gi" }
      limits: { cpu: "8", memory: "16Gi" }
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 2Ti
        deleteClaim: false
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      auto.create.topics.enable: false
    template:
      pod:
        labels: { team: "platform", workload: "kafka" }
  zookeeper:
    replicas: 3
    resources:
      requests: { cpu: "1", memory: "2Gi" }
      limits: { cpu: "2", memory: "4Gi" }
    storage:
      type: persistent-claim
      size: 100Gi
      deleteClaim: false
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

## GPU Scheduling

```yaml
apiVersion: v1
kind: NodePool
metadata:
  name: gpu-pool
spec:
  nodeClass: gpu
  labels:
    workload-type: data-gpu
  taints:
  - key: "nvidia.com/gpu"
    value: "true"
    effect: "NoSchedule"
---
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
spec:
  driver:
    cores: 4
    memory: "16g"
    tolerations:
    - key: "nvidia.com/gpu"
      operator: "Exists"
      effect: "NoSchedule"
  executor:
    instances: 4
    cores: 4
    memory: "16g"
    gpu:
      enabled: true
      count: 1
    tolerations:
    - key: "nvidia.com/gpu"
      operator: "Exists"
      effect: "NoSchedule"
```

## Cost Allocation with Kubecost

```bash
# Per namespace cost
kubecost query --window 7d --aggregation namespace

# Per label cost
kubecost query --window 30d --aggregation label:team

# Budget alert annotation
kubecost monitor --namespace analytics --budget 5000 --alert 80%
```
