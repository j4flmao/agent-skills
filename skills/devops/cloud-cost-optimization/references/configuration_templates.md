# Cost Governance Configuration Templates (Terraform)

Copy-ready Terraform for the baseline cost controls: budgets with alerts, anomaly detection, billing exports, tag enforcement, and non-prod schedules. Pin provider versions in your own `required_providers` block and run `terraform plan` before applying; argument names below follow the current AWS, AzureRM and Google providers.

## AWS Budget with Forecast and Actual Alerts

```hcl
resource "aws_budgets_budget" "team_monthly" {
  name         = "team-payments-monthly"
  budget_type  = "COST"
  limit_amount = "12000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:team$payments"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_sns_topic_arns  = [aws_sns_topic.finops_alerts.arn]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["payments-leads@example.com"]
  }
}
```

The tag filter format is `user:<tag-key>$<value>`, and the tag must be an activated cost allocation tag. Budgets evaluate on billing data that lags by hours, so they are not a real-time kill switch.

## AWS Cost Anomaly Detection

```hcl
resource "aws_ce_anomaly_monitor" "services" {
  name              = "all-services"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "daily" {
  name             = "finops-daily"
  frequency        = "DAILY"
  monitor_arn_list = [aws_ce_anomaly_monitor.services.arn]

  subscriber {
    type    = "EMAIL"
    address = "finops@example.com"
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      match_options = ["GREATER_THAN_OR_EQUAL"]
      values        = ["200"]
    }
  }
}
```

Use `frequency = "IMMEDIATE"` with an SNS subscriber for chat routing; email subscribers require DAILY or WEEKLY.

## AWS Tag Policy (Organizations)

```hcl
resource "aws_organizations_policy" "cost_tags" {
  name = "cost-tags"
  type = "TAG_POLICY"
  content = jsonencode({
    tags = {
      "cost-center" = {
        tag_key = { "@@assign" = "cost-center" }
        enforced_for = { "@@assign" = ["ec2:instance", "ec2:volume", "rds:db"] }
      }
      environment = {
        tag_key   = { "@@assign" = "environment" }
        tag_value = { "@@assign" = ["prod", "staging", "dev", "sandbox"] }
      }
    }
  })
}

resource "aws_organizations_policy_attachment" "cost_tags_root" {
  policy_id = aws_organizations_policy.cost_tags.id
  target_id = var.org_root_id
}
```

Tag policies standardize key casing and allowed values; `enforced_for` blocks non-compliant tagging operations on listed types but does not force a tag to exist. Pair with an SCP `Null` condition (see `compliance_matrix.md`) to require presence.

## Azure Budget on a Subscription

```hcl
resource "azurerm_consumption_budget_subscription" "dev" {
  name            = "dev-monthly"
  subscription_id = data.azurerm_subscription.dev.id
  amount          = 5000
  time_grain      = "Monthly"

  time_period {
    start_date = "2026-11-01T00:00:00Z"
  }

  notification {
    enabled        = true
    operator       = "GreaterThan"
    threshold      = 90
    threshold_type = "Forecasted"
    contact_groups = [azurerm_monitor_action_group.finops.id]
  }

  notification {
    enabled        = true
    operator       = "GreaterThanOrEqualTo"
    threshold      = 100
    contact_emails = ["dev-leads@example.com"]
  }
}
```

The budget start date must be the first day of a month.

## Azure Policy: Require a Tag (Deny)

```hcl
data "azurerm_policy_definition" "require_tag" {
  display_name = "Require a tag on resources"
}

resource "azurerm_subscription_policy_assignment" "require_cost_center" {
  name                 = "require-cost-center"
  subscription_id      = data.azurerm_subscription.dev.id
  policy_definition_id = data.azurerm_policy_definition.require_tag.id
  parameters = jsonencode({
    tagName = { value = "cost-center" }
  })
}
```

Add the "Inherit a tag from the resource group if missing" (Modify effect) policy so resources pick up tags set once on the resource group; Modify assignments need a managed identity.

## GCP Budget with Pub/Sub for Automation

```hcl
resource "google_billing_budget" "project_budget" {
  billing_account = var.billing_account_id
  display_name    = "analytics-monthly"

  budget_filter {
    projects               = ["projects/${var.project_number}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "8000"
    }
  }

  threshold_rules { threshold_percent = 0.8 }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    pubsub_topic                     = google_pubsub_topic.budget_alerts.id
    monitoring_notification_channels = [google_monitoring_notification_channel.finops.id]
  }
}
```

A Cloud Run function subscribed to the topic can post to chat or, for sandbox projects only, disable billing. Disabling billing stops and can delete resources; never automate it for production.

## GCP Billing Export Dataset

```hcl
resource "google_bigquery_dataset" "billing" {
  dataset_id = "billing"
  location   = "EU"
}
```

The export itself is enabled in the Cloud Billing console (Billing export > BigQuery export); there is no Terraform resource for it, so document the manual step.

## Non-Prod Schedule (AWS EventBridge Scheduler)

```hcl
resource "aws_scheduler_schedule" "stop_dev" {
  name                         = "stop-dev-instances"
  schedule_expression          = "cron(0 20 ? * MON-FRI *)"
  schedule_expression_timezone = "Europe/Berlin"
  flexible_time_window { mode = "OFF" }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode({ InstanceIds = var.dev_instance_ids })
  }
}
```

For tag-driven schedules across many resources, use the AWS "Instance Scheduler on AWS" solution instead of hardcoded IDs.

## Infracost in Pull Requests

```yaml
# .github/workflows/infracost.yml
name: infracost
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  cost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}
      - run: infracost breakdown --path=. --format=json --out-file=/tmp/infracost.json
      - run: |
          infracost comment github --path=/tmp/infracost.json \
            --repo=$GITHUB_REPOSITORY --pull-request=${{ github.event.pull_request.number }} \
            --github-token=${{ github.token }} --behavior=update
```

For a true diff, run `infracost breakdown` on the base branch and pass it as `--compare-to` to `infracost diff`.

## Checklist

- [ ] Budgets for every account/subscription/project, owners subscribed
- [ ] Anomaly monitors with thresholds that match spend size
- [ ] Tag policy + presence enforcement + inheritance
- [ ] Billing export enabled (manual step documented for GCP)
- [ ] Schedules for non-prod; destructive automation limited to sandboxes
- [ ] Cost estimate shown on every infrastructure PR
