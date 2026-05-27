# Azure Resource Management

## Resource Group Management

```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.environment}-${var.location}"
  location = var.location
  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
  }
}

resource "azurerm_resource_group_policy_assignment" "tagging" {
  name                 = "enforce-tags"
  resource_group_id    = azurerm_resource_group.main.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/..."
  parameters = jsonencode({
    tagName = { value = "Environment" }
  })
}

output "resource_group_id" {
  value = azurerm_resource_group.main.id
}
```

## Azure Kubernetes Service

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.environment}-${var.location}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aks-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name       = "default"
    node_count = var.node_count
    vm_size    = var.node_size
    min_count  = var.autoscaling_min
    max_count  = var.autoscaling_max
    enable_auto_scaling = var.enable_autoscaling
    availability_zones  = ["1", "2", "3"]
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  tags = var.tags
}
```

## Azure Container Registry

```hcl
resource "azurerm_container_registry" "main" {
  name                = "acr${var.environment}${var.location}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Premium"
  admin_enabled       = false

  georeplications {
    location                = var.secondary_location
    regional_endpoint_enabled = true
  }

  network_rule_set {
    default_action = "Deny"
    ip_rule {
      action   = "Allow"
      ip_range = var.allowed_ip_ranges
    }
  }

  retention_policy {
    days    = 30
    enabled = true
  }

  trust_policy {
    enabled = true
  }
}
```

## Key Points

- Use consistent naming conventions with environment prefixes
- Tag resources for cost tracking and management
- Enable AKS auto-scaling with node pool limits
- Use availability zones for high availability
- Enable monitoring with Log Analytics workspace
- Use Premium ACR with geo-replication for performance
- Restrict ACR access with network rules
- Enable content trust for image security
- Configure retention policies for cost management
- Use managed identity for Azure resource access
- Implement policy assignments for governance
- Use Private Link for secure resource access
