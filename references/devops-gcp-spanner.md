# GCP Spanner Topology Reference
## Spanner Architecture
Defines the multi-region topology for Google Cloud Spanner instances.
```hcl
resource "google_spanner_instance" "main" {
  config       = "nam-eur-asia1"
  display_name = "Multi-region Spanner Instance"
  num_nodes    = 3
}
```
