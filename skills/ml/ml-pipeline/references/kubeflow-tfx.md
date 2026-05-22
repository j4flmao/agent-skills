# Kubeflow Pipelines & TFX

## Kubeflow Pipeline Components

```python
from kfp import dsl
from kfp.dsl import component, pipeline
from kfp import kubernetes

@component(base_image="python:3.10", packages_to_install=["pandas", "scikit-learn"])
def ingest_data(file_path: str) -> str:
    import pandas as pd
    df = pd.read_csv(file_path)
    output_path = "/data/ingested/data.parquet"
    df.to_parquet(output_path)
    return output_path

@component
def validate_data(data_path: str, schema_path: str) -> bool:
    import json
    import pandas as pd
    with open(schema_path) as f:
        schema = json.load(f)
    df = pd.read_parquet(data_path)
    for col, dtype in schema.items():
        assert df[col].dtype.name == dtype, f"{col} type mismatch"
    null_ratio = df.isnull().sum().max() / len(df)
    return null_ratio < 0.05

@component(packages_to_install=["scikit-learn"])
def train_model(data_path: str, params: dict) -> str:
    from sklearn.ensemble import GradientBoostingClassifier
    import pickle
    df = pd.read_parquet(data_path)
    X = df.drop("target", axis=1)
    y = df["target"]
    model = GradientBoostingClassifier(**params)
    model.fit(X, y)
    model_path = "/models/model.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    return model_path

@component
def evaluate_model(model_path: str, data_path: str) -> dict:
    import pickle
    import pandas as pd
    from sklearn.metrics import accuracy_score, precision_score, recall_score
    df = pd.read_parquet(data_path)
    X = df.drop("target", axis=1)
    y = df["target"]
    with open(model_path, "rb") as f:
        model = pickle.load(f)
    preds = model.predict(X)
    return {
        "accuracy": accuracy_score(y, preds),
        "precision": precision_score(y, preds, average="weighted"),
        "recall": recall_score(y, preds, average="weighted"),
    }

@pipeline(name="ml-training-pipeline")
def ml_pipeline(file_path: str = "/data/dataset.csv"):
    ingest = ingest_data(file_path=file_path)
    validate = validate_data(data_path=ingest.output, schema_path="/schemas/schema.json")
    with dsl.Condition(validate.output == True):
        train = train_model(data_path=ingest.output, params={"n_estimators": 100, "max_depth": 5})
        evaluate_model(model_path=train.output, data_path=ingest.output)
```

## TFX Pipeline

```python
import tfx
from tfx.components import (
    CsvExampleGen, StatisticsGen, SchemaGen, ExampleValidator,
    Transform, Trainer, Evaluator, Pusher
)
from tfx.orchestration import pipeline
from tfx.proto import trainer_pb2, pusher_pb2, evaluator_pb2

def create_tfx_pipeline():
    components = []

    # 1. ExampleGen: ingest data
    example_gen = CsvExampleGen(input_base="/data/raw")
    components.append(example_gen)

    # 2. StatisticsGen: compute data statistics
    statistics_gen = StatisticsGen(examples=example_gen.outputs['examples'])
    components.append(statistics_gen)

    # 3. SchemaGen: infer data schema
    schema_gen = SchemaGen(statistics=statistics_gen.outputs['statistics'])
    components.append(schema_gen)

    # 4. ExampleValidator: detect anomalies
    validator = ExampleValidator(
        statistics=statistics_gen.outputs['statistics'],
        schema=schema_gen.outputs['schema']
    )
    components.append(validator)

    # 5. Transform: feature engineering
    transform = Transform(
        examples=example_gen.outputs['examples'],
        schema=schema_gen.outputs['schema'],
        module_file="/modules/transform.py"
    )
    components.append(transform)

    # 6. Trainer: train model
    trainer = Trainer(
        module_file="/modules/trainer.py",
        examples=transform.outputs['transformed_examples'],
        schema=schema_gen.outputs['schema'],
        transform_graph=transform.outputs['transform_graph'],
        train_args=trainer_pb2.TrainArgs(num_steps=1000),
        eval_args=trainer_pb2.EvalArgs(num_steps=100),
    )
    components.append(trainer)

    # 7. Evaluator: validate model quality
    eval_config = evaluator_pb2.EvaluationConfig(
        slicing_specs=[evaluator_pb2.SlicingSpec()],
        metrics_specs=[
            evaluator_pb2.MetricsSpec(
                metrics=[
                    evaluator_pb2.MetricConfig(
                        class_name='Accuracy',
                        threshold=evaluator_pb2.MetricThreshold(
                            value_threshold=evaluator_pb2.GenericValueThreshold(
                                lower_bound={'value': 0.8}
                            )
                        )
                    )
                ]
            )
        ]
    )
    evaluator = Evaluator(
        examples=transform.outputs['transformed_examples'],
        model=trainer.outputs['model'],
        eval_config=eval_config,
    )
    components.append(evaluator)

    # 8. Pusher: deploy validated model
    pusher = Pusher(
        model=trainer.outputs['model'],
        model_blessing=evaluator.outputs['blessing'],
        push_destination=pusher_pb2.PushDestination(
            filesystem=pusher_pb2.Filesystem(base_directory="/serving/models/")
        ),
    )
    components.append(pusher)

    return pipeline.Pipeline(
        pipeline_name="tfx-pipeline",
        pipeline_root="/pipeline/tfx/",
        components=components,
        enable_cache=True,
        metadata_connection_config=...,
    )
```

## Component Patterns

| Component | Input | Output | Validation |
|---|---|---|---|
| ExampleGen | CSV, Parquet, BQ | TFRecord | Format check |
| StatisticsGen | TFRecord | DatasetStatistics | Distribution stats |
| SchemaGen | DatasetStatistics | Schema | Schema inference |
| ExampleValidator | TFRecord, Schema | Anomalies | Anomaly detection |
| Transform | TFRecord, Schema | Transformed TFRecord | Feature stats |
| Trainer | Transformed TFRecord | Model | Loss curves |
| Evaluator | Model, Eval data | Blessing | Metric thresholds |
| Pusher | Model, Blessing | Deployed artifact | Health check |

## Cache and Artifact Management

```python
# Enable cache per pipeline
pipeline.Pipeline(
    ...,
    enable_cache=True,
    pipeline_root="gs://ml-bucket/pipeline-root/",
)

# Artifact tracking with MLMD (ML Metadata)
from ml_metadata.metadata_store import metadata_store
from ml_metadata.proto import metadata_store_pb2

connection_config = metadata_store_pb2.ConnectionConfig()
connection_config.mysql.host = "localhost"
store = metadata_store.MetadataStore(connection_config)
```

## Vertex AI Pipelines

```python
from google.cloud import aiplatform
from kfp import compiler, dsl

compiler.Compiler().compile(
    pipeline_func=ml_pipeline,
    package_path="pipeline.json"
)

aiplatform.PipelineJob(
    display_name="ml-training",
    template_path="pipeline.json",
    pipeline_root="gs://bucket/pipeline-root/",
    enable_caching=True,
).submit()
```
