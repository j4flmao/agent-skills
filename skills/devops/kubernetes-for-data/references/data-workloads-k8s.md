# Data Workloads on Kubernetes

## Spark Operator

### Installation

```bash
helm repo add spark-operator https://kubeflow.github.io/spark-operator
helm install spark-operator spark-operator/spark-operator \
  --namespace spark-operator \
  --create-namespace \
  --set serviceAccounts.spark.name=spark
```

### SparkApplication CRD

```yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: etl-job
  namespace: data
spec:
  type: Scala
  mode: cluster
  image: myregistry/spark:3.5.0
  mainClass: com.example.ETLJob
  sparkVersion: "3.5.0"
  driver:
    cores: 1
    coreLimit: "1000m"
    memory: "4g"
    serviceAccount: spark
  executor:
    instances: 10
    cores: 2
    coreLimit: "2000m"
    memory: "8g"
    memoryOverhead: "2g"
  dynamicAllocation:
    enabled: true
    initialExecutors: 5
    minExecutors: 1
    maxExecutors: 20
  nodeSelector:
    node-type: compute-spot
```

### Resource Sizing Guidelines
- Driver: 1 CPU, 4GB memory, 512MB overhead
- Executor: 2-4 CPU, 8-16GB memory per executor
- Shuffle partitions: 2-3x total executor cores
- Dynamic allocation for variable workloads

## Airflow on Kubernetes

### KubernetesExecutor
Each task runs as a separate pod. Best for isolation and resource management.

```yaml
# helm values
executor: KubernetesExecutor
config:
  kubernetes:
    pod_template_file: /opt/airflow/pod_templates/spark_pod.yaml
    worker_container_repository: myregistry/airflow-worker
    worker_container_tag: "2.8.0"
    namespace: airflow
    delete_worker_pods: true
    in_cluster: true
resources:
  - requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2
      memory: 4Gi
```

### KubernetesPodOperator
Run arbitrary Kubernetes pods as Airflow tasks. Best for heterogeneous workloads.

```python
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator

task = KubernetesPodOperator(
    task_id="spark_etl",
    name="spark-etl-task",
    namespace="data",
    image="myregistry/spark:3.5.0",
    cmds=["spark-submit"],
    arguments=["--class", "com.example.ETLJob", "local:///app/etl.jar"],
    resources={"request_cpu": "2", "request_memory": "8G"},
    node_selector={"node-type": "compute-spot"},
    in_cluster=True,
    is_delete_operator_pod=True,
)
```

## Kafka on Kubernetes with Strimzi

### Installation

```bash
helm repo add strimzi https://strimzi.io/charts
helm install strimzi strimzi/strimzi-kafka-operator \
  --namespace kafka --create-namespace
```

### Kafka CR

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: data-cluster
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    storage:
      type: persistent-claim
      size: 1Ti
      class: premium-ssd
      deleteClaim: false
    resources:
      requests:
        memory: 8Gi
        cpu: "2"
      limits:
        memory: 16Gi
        cpu: "4"
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 100Gi
      class: premium-ssd
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

### Resource Sizing
- Each Kafka broker: 8-16GB RAM, 2-4 CPUs, 500GB-2TB storage
- Replication factor: 3 minimum
- Use dedicated nodes for Kafka brokers (no colocation with Spark executors)

## Node Pool Configuration

```yaml
# EKS node groups
nodeGroups:
  - name: compute-spot
    instanceType: c5.4xlarge
    desiredCapacity: 10
    spot: true
    labels:
      node-type: compute-spot
    taints: []

  - name: compute-gpu
    instanceType: p3.8xlarge
    desiredCapacity: 2
    spot: false
    labels:
      node-type: compute-gpu
      nvidia.com/gpu: "true"
    taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule

  - name: storage-optimized
    instanceType: i3.2xlarge  # With local NVMe SSD
    desiredCapacity: 3
    spot: false
    labels:
      node-type: storage-optimized
```

## Scheduler Configuration

Use Volcano or coscheduling for gang scheduling (all Spark executors start simultaneously):

```yaml
volcano:
  enabled: true
  queues:
    - name: data
      weight: 10
    - name: ml
      weight: 5
```
