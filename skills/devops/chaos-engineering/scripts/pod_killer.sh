#!/usr/bin/env bash
#
# pod_killer.sh - A Chaos Engineering script to randomly delete a pod in a given Kubernetes namespace.
#
# Usage: ./pod_killer.sh <namespace>
#
# Description:
#   This script is used for testing system resilience by simulating random pod failures.
#   It uses kubectl to fetch a list of running pods in the specified namespace, selects one at random,
#   and deletes it.
#

set -e

# Configuration
NAMESPACE="${1:-default}"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "$(date -Iseconds) [ERROR] kubectl could not be found. Please install it to run this script." >&2
    exit 1
fi

echo "$(date -Iseconds) [INFO] Starting chaos experiment in namespace: ${NAMESPACE}"

# Get list of running pods in the specified namespace
# Using jsonpath to ensure we only get names of pods
PODS=($(kubectl get pods -n "${NAMESPACE}" --field-selector=status.phase=Running -o jsonpath='{.items[*].metadata.name}'))

if [ ${#PODS[@]} -eq 0 ]; then
    echo "$(date -Iseconds) [INFO] No running pods found in namespace '${NAMESPACE}'. Nothing to do."
    exit 0
fi

# Select a random pod
RANDOM_INDEX=$((RANDOM % ${#PODS[@]}))
TARGET_POD="${PODS[$RANDOM_INDEX]}"

echo "$(date -Iseconds) [INFO] Selected pod '${TARGET_POD}' for termination."

# Delete the pod
if kubectl delete pod "${TARGET_POD}" -n "${NAMESPACE}"; then
    echo "$(date -Iseconds) [SUCCESS] Successfully deleted pod '${TARGET_POD}'."
else
    echo "$(date -Iseconds) [ERROR] Failed to delete pod '${TARGET_POD}'." >&2
    exit 1
fi

echo "$(date -Iseconds) [INFO] Chaos experiment completed successfully."
