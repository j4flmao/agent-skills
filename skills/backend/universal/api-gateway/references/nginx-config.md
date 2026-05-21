# Nginx / OpenResty Gateway Configuration

## Core Reverse Proxy

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    multi_accept on;
    worker_connections 16384;
    use epoll;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    keepalive_requests 1000;
    reset_timedout_connection on;
    client_body_timeout 10;
    send_timeout 10;

    # Rate limiting zones
    limit_req_zone     $binary_remote_addr  zone=per_ip:10m  rate=30r/s;
    limit_req_zone     $http_x_api_key      zone=per_key:10m rate=100r/s;
    limit_conn_zone    $binary_remote_addr  zone=addr:10m;
    limit_req_status   429;
    limit_conn_status  429;

    # Cache zone
    proxy_cache_path   /var/cache/nginx keys_zone=api_cache:10m
                       levels=1:2 inactive=60m max_size=1g;

    # Upstreams
    upstream user-api {
        least_conn;
        server user-1.internal:8080 max_fails=3 fail_timeout=30s weight=10;
        server user-2.internal:8080 max_fails=3 fail_timeout=30s weight=10;
        keepalive 64;
    }

    upstream order-api {
        random two least_conn;
        server order-1.internal:8080 max_fails=3 fail_timeout=30s;
        server order-2.internal:8080 max_fails=3 fail_timeout=30s;
        server order-3.internal:8080 max_fails=3 fail_timeout=30s backup;
    }

    # Log format
    log_format json_combined escape=json
      '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status":$status,'
        '"body_bytes_sent":$body_bytes_sent,'
        '"request_time":$request_time,'
        '"upstream_response_time":"$upstream_response_time",'
        '"http_referer":"$http_referer",'
        '"http_user_agent":"$http_user_agent",'
        '"http_x_forwarded_for":"$http_x_forwarded_for",'
        '"upstream_addr":"$upstream_addr",'
        '"upstream_status":"$upstream_status",'
        '"request_id":"$request_id"'
      '}';

    access_log  /var/log/nginx/access.log  json_combined buffer=32k flush=5s;
    error_log   /var/log/nginx/error.log   warn;

    include /etc/nginx/conf.d/*.conf;
}
```

## Virtual Host Configuration

```nginx
# /etc/nginx/conf.d/api-gateway.conf
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling        on;
    ssl_stapling_verify on;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "0" always;
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Request limits
    client_max_body_size 10m;
    client_body_buffer_size 128k;
    large_client_header_buffers 4 8k;

    # Health check
    location = /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
        add_header Cache-Control no-store;
    }

    # Metrics endpoint (internal)
    location = /metrics {
        access_log off;
        stub_status;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        deny all;
    }

    # Auth subrequest endpoint (internal)
    location = /_auth {
        internal;
        proxy_method POST;
        proxy_pass http://auth.internal:8081/verify;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_ignore_client_abort on;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Original-URI $request_uri;
        proxy_set_header X-Original-Method $request_method;
        proxy_set_header X-Request-ID $request_id;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-API-Key $http_x_api_key;
        proxy_set_header Cookie $http_cookie;

        proxy_connect_timeout 2s;
        proxy_read_timeout 5s;
    }

    # User API
    location /api/users {
        limit_req zone=per_key burst=20 nodelay;
        limit_conn addr 10;

        auth_request /_auth;
        auth_request_set $user_id $upstream_http_x_user_id;
        auth_request_set $user_roles $upstream_http_x_user_roles;
        proxy_set_header X-User-ID $user_id;
        proxy_set_header X-User-Roles $user_roles;

        proxy_pass http://user-api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;

        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
        proxy_send_timeout 5s;

        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 10s;

        proxy_buffer_size 4k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;
    }

    # Order API (with caching)
    location /api/orders {
        limit_req zone=per_ip burst=10 nodelay;

        auth_request /_auth;

        proxy_pass http://order-api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Request-ID $request_id;

        proxy_connect_timeout 5s;
        proxy_read_timeout 15s;
        proxy_send_timeout 5s;

        # Cache GET responses
        proxy_cache api_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_valid 200 30s;
        proxy_cache_valid 404 5s;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        proxy_cache_lock_timeout 5s;
        proxy_no_cache $http_cache_control;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Public endpoints (no auth)
    location /api/public {
        limit_req zone=per_ip burst=5 nodelay;
        proxy_pass http://public-api.internal:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass http://ws.internal:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Error pages
    error_page 400 401 401 403 404 405 406 429 500 502 503 504 /error.json;
    location = /error.json {
        internal;
        default_type application/json;
        return 200 '{"error":{"code":$status,"message":"$upstream_status"}}';
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}
```

## Rate Limiting

```nginx
# Per IP: 30 req/s
limit_req_zone $binary_remote_addr zone=per_ip:10m rate=30r/s;

# Per API key: 100 req/s
limit_req_zone $http_x_api_key zone=per_key:10m rate=100r/s;

# Per URL: 10 req/s
limit_req_zone $binary_remote_addr$uri zone=per_url:10m rate=10r/s;

# Burst: allow excess requests with delay
limit_req zone=per_key burst=20 nodelay;

# No delay burst: queue excess requests
limit_req zone=per_key burst=20;

# Per IP connection limit
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 10;

# Response headers
limit_req_status 429;
limit_conn_status 429;

# Custom 429 error page
location @rate_limited {
    default_type application/json;
    return 429 '{"error":{"code":"RATE_LIMITED","message":"Too many requests"}}';
}
```

## Caching

```nginx
# Cache zone
proxy_cache_path /var/cache/nginx keys_zone=api_cache:10m
                 levels=1:2 inactive=60m max_size=1g
                 use_temp_path=off;

# Cache settings
proxy_cache api_cache;
proxy_cache_key "$scheme$request_method$host$request_uri";
proxy_cache_valid 200 302 30s;
proxy_cache_valid 404 5s;
proxy_cache_valid any 1s;
proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
proxy_cache_background_update on;
proxy_cache_lock on;
proxy_cache_lock_timeout 5s;
proxy_no_cache $http_pragma $http_authorization;
proxy_no_cache $cookie_session;

# Bypass cache
proxy_cache_bypass $http_cache_control;
add_header X-Cache-Status $upstream_cache_status;
```

## WebSocket Support

```nginx
location /ws/chat {
    proxy_pass http://chat-service:8080;
    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # WebSocket does not buffer
    proxy_buffering off;
}
```

## Canary Deployment

```nginx
# Split clients based on header
split_clients "${remote_addr}${http_x_canary}" $canary_upstream {
    10%   "order-api-v2";
    *     "order-api-v1";
}

location /api/orders {
    proxy_pass http://$canary_upstream;
}

# Or use map for more control
map $http_x_canary $upstream_choice {
    default     "order-api-v1";
    "canary"    "order-api-v2";
    1           "order-api-v2";
    true        "order-api-v2";
}

location /api/orders {
    proxy_pass http://$upstream_choice;
}
```

## IP Whitelisting (Internal APIs)

```nginx
location /api/admin {
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    deny all;

    proxy_pass http://admin-service:8080;
}
```

## Request Body Validation

```nginx
location /api/users {
    # Reject empty body for POST/PUT
    if ($request_method ~ ^(POST|PUT)$) {
        set $empty_body $http_content_length;
    }
    if ($empty_body = "") {
        return 400 '{"error":"Request body required"}';
    }

    # Reject oversized payload
    client_max_body_size 1m;

    proxy_pass http://user-api;
}
```

## OpenResty / Lua Extensions

```nginx
# /etc/nginx/conf.d/lua-gateway.conf

# JWT verification via Lua
server {
    location /api/secure {
        access_by_lua_block {
            local jwt = require("resty.jwt")
            local auth = ngx.req.get_headers()["Authorization"]

            if not auth then
                ngx.status = 401
                ngx.say('{"error":"Missing Authorization header"}')
                ngx.exit(401)
            end

            local _, _, token = string.find(auth, "Bearer%s+(.+)")
            local jwt_obj = jwt:verify("my-secret-key", token)

            if not jwt_obj.verified then
                ngx.status = 401
                ngx.say('{"error":"Invalid token"}')
                ngx.exit(401)
            end

            ngx.req.set_header("X-User-ID", jwt_obj.payload.sub)
            ngx.req.set_header("X-User-Roles", table.concat(jwt_obj.payload.roles, ","))
        }

        proxy_pass http://user-api;
    }
}

# Dynamic upstream selection via Lua
init_by_lua_block {
    upstreams = {
        v1 = "user-api-v1:8080",
        v2 = "user-api-v2:8080"
    }
}

server {
    location /api/users {
        set $api_version "v1";

        rewrite_by_lua_block {
            local accept = ngx.req.get_headers()["Accept"]
            if accept and string.find(accept, "version=2") then
                ngx.var.api_version = "v2"
            end
        }

        proxy_pass http://$api_version;
    }
}
```
