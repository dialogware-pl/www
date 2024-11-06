```yaml
version: '3.8'

services:
  # Główna aplikacja dokumentacji
  docs:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: dialogware-docs
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=mongodb://mongo:27017/dialogware-docs
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - ANALYTICS_KEY=${ANALYTICS_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./docs:/app/docs
      - ./public:/app/public
      - node_modules:/app/node_modules
    depends_on:
      - redis
      - mongo
      - search
      - minio
    networks:
      - dialogware-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis dla cache i sesji
  redis:
    image: redis:alpine
    container_name: dialogware-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - dialogware-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MongoDB dla przechowywania danych
  mongo:
    image: mongo:5
    container_name: dialogware-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - dialogware-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongo localhost:27017/test --quiet
      interval: 30s
      timeout: 10s
      retries: 3

  # Elasticsearch dla wyszukiwania
  search:
    image: elasticsearch:8.7.0
    container_name: dialogware-search
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - dialogware-network
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -q 'status.*green'"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MinIO dla przechowywania plików
  minio:
    image: minio/minio
    container_name: dialogware-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    networks:
      - dialogware-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx jako reverse proxy
  nginx:
    image: nginx:alpine
    container_name: dialogware-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./public:/usr/share/nginx/html
    depends_on:
      - docs
    networks:
      - dialogware-network
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Prometheus dla monitoringu
  prometheus:
    image: prom/prometheus
    container_name: dialogware-prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - dialogware-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:9090/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Grafana dla wizualizacji metryk
  grafana:
    image: grafana/grafana
    container_name: dialogware-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - dialogware-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  dialogware-network:
    driver: bridge

volumes:
  node_modules:
  redis_data:
  mongodb_data:
  elasticsearch_data:
  minio_data:
  prometheus_data:
  grafana_data:

```

```bash
# .env
NODE_ENV=production
PORT=3000

# Secrets
WEBHOOK_SECRET=your-webhook-secret
GITHUB_TOKEN=your-github-token
ANALYTICS_KEY=your-analytics-key
SESSION_SECRET=your-session-secret

# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=secure_password
MONGODB_URI=mongodb://mongo:27017/dialogware-docs

# Redis
REDIS_URL=redis://redis:6379

# MinIO
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=secure_password
MINIO_ENDPOINT=minio:9000

# Grafana
GRAFANA_PASSWORD=secure_password

```

```nginx
# nginx/conf.d/default.conf
server {
    listen 80;
    server_name docs.dialogware.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name docs.dialogware.com;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Main application
    location / {
        proxy_pass http://docs:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://docs:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location /static/ {
        alias /usr/share/nginx/html/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Health check
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}

```

Aby uruchomić system:

1. Utwórz pliki konfiguracyjne:
```bash
# Stwórz strukturę katalogów
mkdir -p nginx/{conf.d,ssl} prometheus public docs

# Skopiuj pliki konfiguracyjne
cp nginx-config.conf nginx/conf.d/default.conf
```

2. Wygeneruj certyfikaty SSL (dla developmentu):
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem
```

3. Uruchom system:
```bash
# Pierwsze uruchomienie
docker-compose up -d

# Sprawdź status
docker-compose ps

# Sprawdź logi
docker-compose logs -f

# Zatrzymanie
docker-compose down
```

4. Dostępne usługi:
- Dokumentacja: https://docs.dialogware.com
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- MinIO Console: http://localhost:9001
- Elasticsearch: http://localhost:9200

5. Monitorowanie:
```bash
# Sprawdź zużycie zasobów
docker stats

# Sprawdź health checks
docker-compose ps

# Backup danych
docker-compose exec mongo mongodump --out /dump
docker-compose exec redis redis-cli save
```

Struktura jest gotowa do użycia. Czy chciałbyś, żebym rozwinął któryś z aspektów konfiguracji?
