# Migration Strategies Deep Dive

## Rehost (Lift-and-Shift)
| Tool | Source | Target |
|------|--------|--------|
| AWS SMS | On-prem VM | EC2 |
| Azure Migrate | On-prem VM | Azure VM |
| VM Import/Export | On-prem VM | GCE |

## Replatform (Lift, Tweak, Shift)
| Source | Target | Change |
|--------|--------|--------|
| Self-managed PostgreSQL | RDS/Aurora | Managed service |
| Self-managed Redis | ElastiCache/Memorystore | Managed service |
| Self-managed Kafka | MSK/Confluent Cloud | Managed service |
| Tomcat apps | Elastic Beanstalk | Managed runtime |

## Refactor (Re-architect)
| Pattern | From | To |
|---------|------|----|
| Monolith to microservices | Single WAR/JAR | Containerized services |
| Batch to streaming | Cron + batch jobs | Kafka + stream processors |
| File to object storage | NFS/SAN | S3/GCS/Blob |
| Database modernization | Oracle/SQL Server | Aurora/Cloud SQL/CosmosDB |

## Migration Tools
| Category | Tool |
|----------|------|
| Discovery | AWS Migration Evaluator, Azure Migrate, Google Stratozone |
| Database | AWS DMS, Azure DMS, Striim |
| Server | AWS SMS, Azure Migrate, CloudEndure |
| Storage | AWS DataSync, Azure AzCopy, gsutil, rclone |
| Network | AWS Transit Gateway, Azure Virtual WAN, Cloud VPN |
