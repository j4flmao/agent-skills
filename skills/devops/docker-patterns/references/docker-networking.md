# Docker Networking

Docker networking enables container communication across hosts, network isolation, and service discovery.

## Network Drivers

| Driver | Scope | Use Case | Isolation |
|--------|-------|----------|-----------|
| bridge | Single host | Default, container-to-container | Namespace isolation |
| host | Single host | Performance-critical apps | No isolation |
| overlay | Multi-host | Swarm services, multi-node | Encrypted by default |
| macvlan | Single/multi | Legacy apps needing MAC addresses | MAC-level |
| ipvlan | Single/multi | High-performance, IP-based | IP-level |
| none | Single host | Isolated containers | Full isolation |

## Bridge Network

Default network for standalone containers:

```bash
# Create custom bridge (better than default)
docker network create --driver bridge \
  --subnet 172.20.0.0/16 \
  --ip-range 172.20.5.0/24 \
  --gateway 172.20.0.1 \
  --label env=prod \
  mynetwork

# Run container on custom bridge
docker run -d --name app --network mynetwork myapp:latest

# Container DNS resolution on user-defined bridge
docker run --rm --network mynetwork alpine ping app
```

### Compose Example

```yaml
networks:
  frontend:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: front-bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
          gateway: 172.20.0.1
  backend:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.20.1.0/24

services:
  nginx:
    networks:
      - frontend
  api:
    networks:
      - frontend
      - backend
  db:
    networks:
      - backend
```

## Host Network

Shares the host's network namespace:

```bash
docker run --network host nginx
# Container uses host's IP and ports directly
```

Use cases: performance-sensitive apps, port-intensive services, legacy apps.

## Overlay Network

Encrypted multi-host networking for Swarm:

```bash
# Create overlay network
docker network create --driver overlay \
  --attachable \
  --opt encrypted \
  --subnet 10.0.0.0/24 \
  prod-overlay

# Deploy service on overlay
docker service create --name api \
  --network prod-overlay \
  --replicas 3 \
  myapp:latest
```

### Swarm Mode with Overlay

```yaml
version: "3.8"
services:
  app:
    image: myapp:latest
    networks:
      - traefik-net
      - internal
    deploy:
      replicas: 3
      endpoints_mode: vip

  db:
    image: postgres:16
    networks:
      - internal
    deploy:
      placement:
        constraints: [node.role == worker]

networks:
  traefik-net:
    driver: overlay
    external: true
  internal:
    driver: overlay
    internal: true
    driver_opts:
      encrypted: "true"
```

## Macvlan

Assigns MAC addresses to containers, making them appear as physical devices:

```bash
docker network create --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --opt parent=eth0 \
  macvlan-net

docker run --network macvlan-net --ip 192.168.1.100 nginx
```

## Ipvlan

Similar to macvlan but shares MAC addresses, using IP-based differentiation:

```bash
docker network create --driver ipvlan \
  --subnet 10.0.0.0/24 \
  --gateway 10.0.0.1 \
  --opt parent=eth0.100 \
  --opt ipvlan_mode=l2 \
  ipvlan-net

docker run --network ipvlan-net --ip 10.0.0.50 nginx
```

## Network Plugins

```bash
# Weave Net
docker plugin install weaveworks/net-plugin:latest

# Calico
docker network create --driver calico --ipam-driver calico-ipam calico-net

# Cilium
docker network create --driver cilium --ipam-driver cilium cilium-net
```

## Multi-Host Networking (without Swarm)

```bash
# Node 1: Create etcd-backed network
docker network create --driver overlay \
  --attachable \
  --subnet 10.0.0.0/24 \
  --opt encrypted \
  mynet

# Requires a key-value store (etcd/consul) for multi-host
```

## DNS and Service Discovery

```yaml
services:
  app:
    dns:
      - 8.8.8.8
      - 1.1.1.1
    dns_search:
      - example.com
      - internal.example.com
    # Custom DNS
    dns_opt:
      - ndots:2
      - attempts:3
```

## Network Security

```yaml
services:
  public:
    image: nginx
    networks:
      - public
  api:
    image: myapi
    networks:
      - public
      - private
  db:
    image: postgres
    networks:
      - private
    # No public network access

networks:
  public:
    driver: overlay
  private:
    driver: overlay
    internal: true  # No external access
    attachable: false  # No manual container attach
    driver_opts:
      encrypted: "true"
```

## Network Troubleshooting

```bash
# List networks
docker network ls

# Inspect
docker network inspect mynetwork

# Container network info
docker inspect -f '{{json .NetworkSettings.Networks}}' container_name

# Test connectivity
docker run --rm --network mynetwork alpine ping service_name

# Capture traffic
docker run --rm --net container:target_container nicolaka/netshoot tcpdump

# Check DNS resolution
docker run --rm --network mynetwork alpine nslookup service_name
```

Choose the right network driver based on your isolation, performance, and multi-host requirements.
