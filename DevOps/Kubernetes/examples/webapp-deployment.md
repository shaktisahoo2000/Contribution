# Complete Web Application Deployment on Kubernetes

This example demonstrates deploying a full-stack web application with database, caching, and monitoring on Kubernetes.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ingress       │    │   Frontend      │    │   Backend API   │
│   (nginx)       │───▶│   (React)       │───▶│   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   Cache         │    │   Database      │
│   (Prometheus)  │    │   (Redis)       │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Project Structure
```
k8s-webapp/
├── namespace.yaml
├── database/
│   ├── postgres-secret.yaml
│   ├── postgres-pvc.yaml
│   ├── postgres-deployment.yaml
│   └── postgres-service.yaml
├── cache/
│   ├── redis-deployment.yaml
│   └── redis-service.yaml
├── backend/
│   ├── backend-configmap.yaml
│   ├── backend-deployment.yaml
│   └── backend-service.yaml
├── frontend/
│   ├── frontend-configmap.yaml
│   ├── frontend-deployment.yaml
│   └── frontend-service.yaml
├── networking/
│   ├── ingress.yaml
│   └── network-policy.yaml
└── monitoring/
    ├── prometheus-deployment.yaml
    └── grafana-deployment.yaml
```

## Deployment Files

### Namespace
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: webapp
  labels:
    name: webapp
    environment: production
```

### Database Layer

#### PostgreSQL Secret
```yaml
# database/postgres-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: webapp
type: Opaque
data:
  username: cG9zdGdyZXM=  # postgres (base64)
  password: c2VjdXJlcGFzcw==  # securepass (base64)
  database: d2ViYXBwZGI=  # webappdb (base64)
```

#### PostgreSQL Storage
```yaml
# database/postgres-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: webapp
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

#### PostgreSQL Deployment
```yaml
# database/postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: webapp
  labels:
    app: postgres
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
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: database
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

#### PostgreSQL Service
```yaml
# database/postgres-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: webapp
  labels:
    app: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
  type: ClusterIP
```

### Cache Layer

#### Redis Deployment
```yaml
# cache/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: webapp
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --appendonly
        - "yes"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        emptyDir: {}
```

#### Redis Service
```yaml
# cache/redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: webapp
  labels:
    app: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
    protocol: TCP
  type: ClusterIP
```

### Backend API

#### Backend ConfigMap
```yaml
# backend/backend-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: webapp
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://webapp.example.com"
  DATABASE_HOST: "postgres-service"
  DATABASE_PORT: "5432"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

#### Backend Deployment
```yaml
# backend/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: webapp
  labels:
    app: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        version: v1.0
    spec:
      containers:
      - name: backend
        image: myregistry/webapp-backend:v1.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          value: "postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(DATABASE_HOST):$(DATABASE_PORT)/$(POSTGRES_DB)"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: database
        envFrom:
        - configMapRef:
            name: backend-config
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
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /startup
            port: 3000
          failureThreshold: 30
          periodSeconds: 10
      imagePullSecrets:
      - name: registry-secret
```

#### Backend Service
```yaml
# backend/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: webapp
  labels:
    app: backend
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
```

### Frontend

#### Frontend ConfigMap
```yaml
# frontend/frontend-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: webapp
data:
  REACT_APP_API_URL: "https://api.webapp.example.com"
  REACT_APP_ENVIRONMENT: "production"
  REACT_APP_VERSION: "v1.0"
```

#### Frontend Deployment
```yaml
# frontend/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: webapp
  labels:
    app: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        version: v1.0
    spec:
      containers:
      - name: frontend
        image: myregistry/webapp-frontend:v1.0
        ports:
        - containerPort: 80
        envFrom:
        - configMapRef:
            name: frontend-config
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
      imagePullSecrets:
      - name: registry-secret
```

#### Frontend Service
```yaml
# frontend/frontend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: webapp
  labels:
    app: frontend
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  type: ClusterIP
```

### Networking

#### Ingress
```yaml
# networking/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webapp-ingress
  namespace: webapp
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - webapp.example.com
    - api.webapp.example.com
    secretName: webapp-tls
  rules:
  - host: webapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.webapp.example.com
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

#### Network Policy
```yaml
# networking/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: webapp-network-policy
  namespace: webapp
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: backend
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    - podSelector:
        matchLabels:
          app: redis
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 443
```

## Deployment Commands

### Create namespace and deploy in order
```bash
# Create namespace
kubectl apply -f namespace.yaml

# Deploy database
kubectl apply -f database/

# Deploy cache
kubectl apply -f cache/

# Deploy backend
kubectl apply -f backend/

# Deploy frontend
kubectl apply -f frontend/

# Configure networking
kubectl apply -f networking/

# Deploy monitoring (optional)
kubectl apply -f monitoring/
```

### Verify deployment
```bash
# Check all resources
kubectl get all -n webapp

# Check pods status
kubectl get pods -n webapp

# Check services
kubectl get services -n webapp

# Check ingress
kubectl get ingress -n webapp

# Check logs
kubectl logs -l app=backend -n webapp
kubectl logs -l app=frontend -n webapp
```

### Scaling and Updates
```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n webapp

# Rolling update
kubectl set image deployment/backend backend=myregistry/webapp-backend:v1.1 -n webapp

# Check rollout status
kubectl rollout status deployment/backend -n webapp

# Rollback if needed
kubectl rollout undo deployment/backend -n webapp
```

## Monitoring and Troubleshooting

### Health Checks
```bash
# Check endpoint health
kubectl exec -it deployment/backend -n webapp -- curl http://localhost:3000/health

# Port forward for local testing
kubectl port-forward service/backend-service 3000:80 -n webapp
kubectl port-forward service/frontend-service 8080:80 -n webapp
```

### Common Issues

1. **ImagePullBackOff**
   ```bash
   # Check image registry access
   kubectl describe pod <pod-name> -n webapp
   
   # Create registry secret if needed
   kubectl create secret docker-registry registry-secret \
     --docker-server=myregistry.com \
     --docker-username=user \
     --docker-password=pass \
     -n webapp
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   kubectl exec -it deployment/backend -n webapp -- nslookup postgres-service
   kubectl exec -it deployment/postgres -n webapp -- pg_isready
   ```

3. **Service Discovery Problems**
   ```bash
   # Check DNS resolution
   kubectl exec -it deployment/backend -n webapp -- nslookup redis-service
   
   # Check service endpoints
   kubectl get endpoints -n webapp
   ```

## Security Considerations

1. **Use secrets for sensitive data**
2. **Apply network policies to restrict traffic**
3. **Run containers as non-root users**
4. **Use RBAC for access control**
5. **Scan images for vulnerabilities**
6. **Keep Kubernetes and applications updated**

This example demonstrates a production-ready deployment with proper separation of concerns, security measures, and monitoring capabilities.