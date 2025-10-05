# Microservices on Kubernetes

This example demonstrates deploying a microservices architecture on Kubernetes with service mesh, monitoring, and CI/CD.

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Ingress       │
                    │   Gateway       │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │   API Gateway   │
                    │   (Kong/Envoy)  │
                    └─────────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐    ┌────────▼────────┐    ┌──────▼──────┐
│   User        │    │   Product       │    │   Order     │
│   Service     │    │   Service       │    │   Service   │
└───────┬───────┘    └────────┬────────┘    └──────┬──────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼───────┐
                    │   Shared        │
                    │   Database      │
                    └─────────────────┘
```

## Project Structure
```
microservices-k8s/
├── infrastructure/
│   ├── namespace.yaml
│   ├── istio/
│   ├── monitoring/
│   └── logging/
├── services/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   └── api-gateway/
├── shared/
│   ├── database/
│   ├── redis/
│   └── message-queue/
└── ci-cd/
    ├── tekton/
    └── argo-cd/
```

## Infrastructure Setup

### Namespace
```yaml
# infrastructure/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: microservices
  labels:
    istio-injection: enabled
    name: microservices
```

### Service Mesh (Istio)
```yaml
# infrastructure/istio/gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: microservices-gateway
  namespace: microservices
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "microservices.example.com"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: microservices-tls
    hosts:
    - "microservices.example.com"

---
# Virtual Service
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: microservices-vs
  namespace: microservices
spec:
  hosts:
  - "microservices.example.com"
  gateways:
  - microservices-gateway
  http:
  - match:
    - uri:
        prefix: /api/users
    route:
    - destination:
        host: user-service
        port:
          number: 80
  - match:
    - uri:
        prefix: /api/products
    route:
    - destination:
        host: product-service
        port:
          number: 80
  - match:
    - uri:
        prefix: /api/orders
    route:
    - destination:
        host: order-service
        port:
          number: 80
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: api-gateway
        port:
          number: 80
```

### Destination Rules for Traffic Management
```yaml
# infrastructure/istio/destination-rules.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service-dr
  namespace: microservices
spec:
  host: user-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_CONN
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        maxRequestsPerConnection: 2
    circuitBreaker:
      consecutiveErrors: 3
      interval: 30s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service-dr
  namespace: microservices
spec:
  host: product-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
  - name: v1
    labels:
      version: v1

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service-dr
  namespace: microservices
spec:
  host: order-service
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
  subsets:
  - name: v1
    labels:
      version: v1
```

## User Service

### Deployment
```yaml
# services/user-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: microservices
  labels:
    app: user-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
      version: v1
  template:
    metadata:
      labels:
        app: user-service
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: user-service
        image: microservices/user-service:v1.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: shared-config
              key: redis.url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secret
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

### Service
```yaml
# services/user-service/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: microservices
  labels:
    app: user-service
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  type: ClusterIP
```

### Horizontal Pod Autoscaler
```yaml
# services/user-service/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: microservices
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Product Service

### Deployment with Canary Configuration
```yaml
# services/product-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service-v1
  namespace: microservices
  labels:
    app: product-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-service
      version: v1
  template:
    metadata:
      labels:
        app: product-service
        version: v1
    spec:
      containers:
      - name: product-service
        image: microservices/product-service:v1.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: ELASTICSEARCH_URL
          valueFrom:
            configMapKeyRef:
              name: shared-config
              key: elasticsearch.url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
# Canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service-v2
  namespace: microservices
  labels:
    app: product-service
    version: v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: product-service
      version: v2
  template:
    metadata:
      labels:
        app: product-service
        version: v2
    spec:
      containers:
      - name: product-service
        image: microservices/product-service:v2.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: ELASTICSEARCH_URL
          valueFrom:
            configMapKeyRef:
              name: shared-config
              key: elasticsearch.url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Canary Traffic Split
```yaml
# services/product-service/virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service-canary
  namespace: microservices
spec:
  hosts:
  - product-service
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: product-service
        subset: v2
  - route:
    - destination:
        host: product-service
        subset: v1
      weight: 90
    - destination:
        host: product-service
        subset: v2
      weight: 10
```

## Order Service with StatefulSet

```yaml
# services/order-service/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: order-service
  namespace: microservices
spec:
  serviceName: order-service-headless
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v1
    spec:
      containers:
      - name: order-service
        image: microservices/order-service:v1.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: RABBITMQ_URL
          valueFrom:
            configMapKeyRef:
              name: shared-config
              key: rabbitmq.url
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: order-data
          mountPath: /app/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: order-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
```

## Shared Resources

### Database
```yaml
# shared/database/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: microservices
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: microservices
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

## Monitoring Setup

### Prometheus Configuration
```yaml
# infrastructure/monitoring/prometheus.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-data
          mountPath: /prometheus
        command:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--web.console.libraries=/etc/prometheus/console_libraries'
        - '--web.console.templates=/etc/prometheus/consoles'
        - '--web.enable-lifecycle'
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-data
        persistentVolumeClaim:
          claimName: prometheus-pvc

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: microservices
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - microservices
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

## CI/CD Pipeline with Tekton

### Pipeline Definition
```yaml
# ci-cd/tekton/pipeline.yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: microservice-pipeline
  namespace: microservices
spec:
  params:
  - name: service-name
    type: string
    description: Name of the microservice
  - name: git-url
    type: string
    description: Git repository URL
  - name: image-registry
    type: string
    default: "registry.example.com"
  
  workspaces:
  - name: shared-data
    description: Shared workspace for pipeline tasks
  
  tasks:
  - name: fetch-source
    taskRef:
      name: git-clone
    workspaces:
    - name: output
      workspace: shared-data
    params:
    - name: url
      value: $(params.git-url)
  
  - name: run-tests
    taskRef:
      name: npm-test
    runAfter:
    - fetch-source
    workspaces:
    - name: source
      workspace: shared-data
  
  - name: build-image
    taskRef:
      name: buildah
    runAfter:
    - run-tests
    workspaces:
    - name: source
      workspace: shared-data
    params:
    - name: IMAGE
      value: "$(params.image-registry)/$(params.service-name):$(tasks.fetch-source.results.commit)"
  
  - name: deploy-to-k8s
    taskRef:
      name: kubernetes-actions
    runAfter:
    - build-image
    params:
    - name: script
      value: |
        kubectl set image deployment/$(params.service-name) \
          $(params.service-name)=$(params.image-registry)/$(params.service-name):$(tasks.fetch-source.results.commit) \
          -n microservices
```

## Deployment Commands

### Deploy infrastructure
```bash
# Create namespace
kubectl apply -f infrastructure/namespace.yaml

# Deploy Istio components
kubectl apply -f infrastructure/istio/

# Deploy monitoring
kubectl apply -f infrastructure/monitoring/

# Deploy shared resources
kubectl apply -f shared/
```

### Deploy services
```bash
# Deploy all services
kubectl apply -f services/

# Verify deployments
kubectl get all -n microservices
kubectl get vs,dr,gw -n microservices

# Check Istio proxy status
istioctl proxy-status -n microservices
```

### Monitor and troubleshoot
```bash
# Check service mesh traffic
istioctl analyze -n microservices

# View Kiali dashboard
istioctl dashboard kiali

# Check distributed tracing
istioctl dashboard jaeger

# Monitor with Grafana
kubectl port-forward svc/grafana 3000:3000 -n microservices
```

This example demonstrates a production-ready microservices deployment with service mesh, monitoring, and CI/CD integration.