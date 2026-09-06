# Kubernetes Custom Operators

## 1. Skill Context
**Focus**: Extending Kubernetes from a container orchestrator into an autonomous operating system using the Control Loop pattern.
**Triggers**: kubernetes-operators, crd, custom-resource-definition, kubebuilder, reconciliation-loop.

## 2. CRDs (Custom Resource Definitions)
By default, Kubernetes understands `Pods`, `Deployments`, and `Services`.
A CRD allows you to teach Kubernetes a new vocabulary. You can create a YAML file defining `kind: PostgreSQLDatabase`. 
However, Kubernetes doesn't know what to do when someone applies this YAML. It just saves the JSON to its `etcd` database.

## 3. The Custom Controller (The Operator)
To make the CRD active, you write a Custom Controller (usually in Golang using `kubebuilder` or `Operator SDK`).
- **The Reconciliation Loop**: The operator runs an infinite loop. It compares the **Desired State** (what the user wrote in the YAML) with the **Actual State** (what is currently running in the cluster).
- **Level-Triggered vs Edge-Triggered**: Operators are *Level-Triggered*. If the operator crashes and misses the "Creation" event, it doesn't matter. When it restarts, it checks the database, sees a discrepancy between Desired and Actual, and immediately executes code (e.g., calling the AWS API to provision a database).
