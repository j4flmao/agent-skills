# Contract Integration Patterns

## Integration with Data Platforms

Data contracts integrate with catalogs, quality frameworks, and observability systems.

### Contract Registry

```python
class ContractRegistry:
    def __init__(self, storage: StorageBackend):
        self.storage = storage
        self.contracts: dict[str, DataContract] = {}

    def register(self, contract: DataContract):
        self.contracts[contract.id] = contract
        self.storage.put(f"contracts/{contract.id}.yaml", contract.to_yaml())

    def get_by_owner(self, owner: str) -> list[DataContract]:
        return [c for c in self.contracts.values()
                if c.owner == owner or owner in c.consumers]

    def get_downstream(self, contract_id: str) -> list[str]:
        contract = self.contracts[contract_id]
        return list(contract.consumers)
```

### Quality Integration

```python
class ContractQualityBridge:
    def __init__(self, registry: ContractRegistry, quality: QualityFramework):
        self.registry = registry
        self.quality = quality

    def enforce_contracts(self, dataset: str) -> list[ValidationResult]:
        contracts = self.registry.get_by_dataset(dataset)
        results = []

        for contract in contracts:
            for constraint in contract.constraints:
                check = self.quality.create_check(
                    name=f"contract_{contract.id}_{constraint.field}",
                    dataset=dataset,
                    constraint=constraint,
                    severity=contract.severity,
                )
                result = self.quality.run_check(check)
                results.append(result)

                if not result.passed and contract.severity == "blocking":
                    self._block_promotion(dataset, contract, result)

        return results

    def _block_promotion(self, dataset: str, contract: DataContract, result: any):
        self.quality.register_failure(
            dataset=dataset,
            contract_id=contract.id,
            failure=result,
            action="block_promotion",
        )
```

## CI/CD Integration

```python
class ContractCIPipeline:
    def __init__(self, registry: ContractRegistry):
        self.registry = registry

    def validate_before_deploy(self, changed_datasets: list[str]) -> CIPipelineResult:
        failures = []
        for dataset in changed_datasets:
            contracts = self.registry.get_by_dataset(dataset)
            for contract in contracts:
                if not self._check_compatibility(contract, dataset):
                    failures.append(ContractFailure(
                        contract_id=contract.id,
                        dataset=dataset,
                        reason="Breaking change detected",
                    ))

        if failures:
            return CIPipelineResult(
                passed=False,
                failures=failures,
                message=f"Blocked: {len(failures)} contract violations",
            )

        return CIPipelineResult(passed=True)

    def get_impact_analysis(self, dataset: str) -> ImpactReport:
        contracts = self.registry.get_by_dataset(dataset)
        downstream = set()
        for contract in contracts:
            downstream.update(contract.consumers)

        return ImpactReport(
            dataset=dataset,
            contract_count=len(contracts),
            downstream_consumers=list(downstream),
            impacted_pipelines=self._find_downstream_pipelines(downstream),
        )
```

## Monitoring Integration

```python
class ContractMonitoringIntegration:
    def __init__(self, registry: ContractRegistry, monitor: DataObservability):
        self.registry = registry
        self.monitor = monitor

    def setup_sla_monitors(self):
        for contract in self.registry.list():
            if contract.sla:
                self.monitor.create_monitor(
                    name=f"sla_{contract.id}",
                    dataset=contract.dataset,
                    metric="freshness",
                    threshold=contract.sla.max_staleness,
                    severity="critical",
                    notification_channels=contract.notification_channels,
                )
                self.monitor.create_monitor(
                    name=f"volume_{contract.id}",
                    dataset=contract.dataset,
                    metric="row_count",
                    anomaly_detection=True,
                    sensitivity="medium",
                )
```

## Key Points

- Contract registry provides central discovery and governance
- Quality bridge creates automated checks per contract constraint
- CI/CD integration blocks deployments with breaking changes
- Impact analysis shows downstream consumers affected by changes
- SLA monitors track freshness and volume per contract
- Notification channels route alerts to producer and consumers
- Blocking severity prevents pipeline promotion on violation
- Warning severity allows promotion with alert
- Downstream pipeline discovery helps coordinate changes
- Automated contract validation in CI reduces manual review overhead
