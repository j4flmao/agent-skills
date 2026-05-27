# ETL Pipeline Design

## ETL vs ELT
| Aspect | ETL | ELT |
|--------|-----|-----|
| Transform location | Staging server | Data warehouse |
| Load timing | After transform | Before transform |
| Scalability | Limited by staging | Leverages warehouse power |
| Data volume | Better for small-medium | Better for large volumes |
| Schema flexibility | Rigid, defined early | Flexible, schema-on-read |
| Tooling | Traditional (Informatica, SSIS) | Modern (dbt, Snowflake) |
| Cost | Higher staging infra cost | Lower overall cost |

## Pipeline Architecture

### Layered Architecture
```yaml
pipeline_layers:
  landing:
    purpose: Raw data ingestion, no transformations
    storage: Object storage (S3, GCS, ADLS)
    format: As-is source format
    retention: 7-30 days

  staging:
    purpose: Initial cleaning and standardization
    storage: Staging tables in warehouse
    format: Columnar (Parquet, ORC)
    retention: 30-90 days

  integration:
    purpose: Business logic, dedup, SCD handling
    storage: Integrated data model
    format: Columnar, optimized
    retention: Indefinite

  consumption:
    purpose: Business views, aggregated marts
    storage: Data marts, materialized views
    format: Denormalized for BI
    retention: As needed by business
```

### Configuration-Driven Pipelines
```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class PipelineConfig:
    name: str
    source_type: str
    source_path: str
    target_table: str
    schema_version: str
    watermark_column: Optional[str] = None
    transformations: List[str] = None
    quality_checks: List[str] = None
    retry_policy: dict = None

class ConfigurablePipeline:
    def __init__(self, config: PipelineConfig):
        self.config = config

    def extract(self):
        if self.config.source_type == "mysql":
            return self._extract_from_mysql()
        elif self.config.source_type == "s3":
            return self._extract_from_s3()
        elif self.config.source_type == "api":
            return self._extract_from_api()

    def transform(self, df):
        for transform_name in self.config.transformations:
            transform_fn = getattr(self, f"_transform_{transform_name}")
            df = transform_fn(df)
        return df

    def load(self, df):
        df.write \
            .mode("append") \
            .format("delta") \
            .saveAsTable(self.config.target_table)
```

## Data Extraction Patterns

### Full Extraction
```python
def full_extract(connection_string, query):
    """Complete table extraction. Use for small dimension tables."""
    engine = create_engine(connection_string)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)
    return df
```

### Incremental Extraction
```python
def incremental_extract(connection_string, table, watermark_column,
                        last_watermark):
    """Extract only new/changed records since last run."""
    query = f"""
        SELECT * FROM {table}
        WHERE {watermark_column} > :last_watermark
        ORDER BY {watermark_column} ASC
    """
    engine = create_engine(connection_string)
    with engine.connect() as conn:
        chunks = pd.read_sql(
            query, conn,
            params={"last_watermark": last_watermark},
            chunksize=10000
        )
        for chunk in chunks:
            yield chunk
```

### API Pagination
```python
def extract_from_api(base_url, api_key, endpoint, page_size=100):
    """Extract data from paginated REST API."""
    headers = {"Authorization": f"Bearer {api_key}"}
    page = 1
    total_pages = 1

    while page <= total_pages:
        params = {"page": page, "per_page": page_size}
        response = requests.get(
            f"{base_url}/{endpoint}",
            headers=headers,
            params=params
        )
        response.raise_for_status()
        data = response.json()

        if page == 1:
            total_pages = data.get("total_pages", 1)

        yield pd.DataFrame(data["results"])
        page += 1
```

## Transformation Patterns

### Data Cleaning Pipeline
```python
def clean_data(df, rules):
    """Apply configurable cleaning rules."""
    for rule in rules:
        if rule["type"] == "remove_nulls":
            threshold = rule.get("threshold", 0.5)
            null_ratio = df.isnull().sum() / len(df)
            cols_to_drop = null_ratio[null_ratio > threshold].index
            df = df.drop(columns=cols_to_drop)

        elif rule["type"] == "fill_nulls":
            for col, strategy in rule["columns"].items():
                if strategy == "mean":
                    df[col] = df[col].fillna(df[col].mean())
                elif strategy == "median":
                    df[col] = df[col].fillna(df[col].median())
                elif strategy == "mode":
                    df[col] = df[col].fillna(df[col].mode()[0])
                elif strategy.startswith("default:"):
                    default = strategy.split(":")[1]
                    df[col] = df[col].fillna(default)

        elif rule["type"] == "deduplicate":
            subset = rule.get("subset", None)
            keep = rule.get("keep", "first")
            df = df.drop_duplicates(subset=subset, keep=keep)

    return df
```

### Data Type Harmonization
```python
def harmonize_schema(df, target_schema):
    """Convert DataFrame columns to target schema types."""
    for col, target_type in target_schema.items():
        if col in df.columns:
            try:
                if target_type == "datetime":
                    df[col] = pd.to_datetime(df[col])
                elif target_type == "int":
                    df[col] = pd.to_numeric(df[col], downcast="integer")
                elif target_type == "float":
                    df[col] = pd.to_numeric(df[col], downcast="float")
                elif target_type == "string":
                    df[col] = df[col].astype(str)
                elif target_type == "boolean":
                    df[col] = df[col].astype(bool)
            except Exception as e:
                print(f"Warning: Could not convert {col}: {e}")
    return df
```

## Error Handling Framework

### Pipeline Error Taxonomy
```python
class PipelineError(Exception):
    """Base pipeline exception."""
    pass

class ExtractionError(PipelineError):
    """Source system connection or query failure."""
    pass

class TransformationError(PipelineError):
    """Data transformation logic failure."""
    pass

class LoadError(PipelineError):
    """Target system write failure."""
    pass

class DataQualityError(PipelineError):
    """Quality check threshold exceeded."""
    pass
```

### Pipeline Execution with Error Handling
```python
def run_pipeline(config):
    pipeline_context = {
        "status": "started",
        "start_time": datetime.now(),
        "steps_completed": []
    }

    try:
        pipeline_context["status"] = "extracting"
        raw_data = extract(config.source)

        pipeline_context["status"] = "validating"
        validate_schema(raw_data, config.expected_schema)

        pipeline_context["status"] = "transforming"
        transformed = transform(raw_data, config.rules)

        pipeline_context["status"] = "loading"
        load(transformed, config.target)

        pipeline_context["status"] = "completed"
        return pipeline_context

    except DataQualityError as e:
        pipeline_context["status"] = "quality_failed"
        pipeline_context["error"] = str(e)
        notify_team(pipeline_context)
        raise

    except PipelineError as e:
        pipeline_context["status"] = "failed"
        pipeline_context["error"] = str(e)
        notify_team(pipeline_context)
        raise
```

## Performance Optimization

### Parallel Processing
```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def parallel_extract(tables, connection_string):
    """Extract multiple tables in parallel."""
    results = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(extract_table, table, connection_string): table
            for table in tables
        }
        for future in as_completed(futures):
            table = futures[future]
            try:
                results[table] = future.result()
            except Exception as e:
                print(f"Failed to extract {table}: {e}")
    return results
```

## Key Points
- Choose ETL vs ELT based on data volume, warehouse capability, and use case
- Design configuration-driven pipelines for maintainability and reusability
- Implement layered architecture (landing, staging, integration, consumption)
- Use incremental extraction with watermark tracking for large tables
- Implement comprehensive error handling with pipeline context tracking
- Use parallel processing for independent data sources
- Validate data quality at each pipeline stage
- Monitor pipeline performance and set up alerting for failures
- Design for idempotency and replay capability
- Document data lineage for audit and troubleshooting
