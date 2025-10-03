# Application Monitoring Examples

This directory contains examples of how to instrument your applications for monitoring with Prometheus.

## Python Example

### Flask Application with Prometheus Metrics

```python
# app.py
from flask import Flask, request, jsonify
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import time
import random

app = Flask(__name__)

# Define metrics
REQUEST_COUNT = Counter('flask_requests_total', 'Total Flask requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('flask_request_duration_seconds', 'Flask request latency')
ACTIVE_USERS = Gauge('flask_active_users', 'Number of active users')

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    latency = time.time() - request.start_time
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown',
        status=response.status_code
    ).inc()
    REQUEST_LATENCY.observe(latency)
    return response

@app.route('/')
def hello():
    # Simulate some work
    time.sleep(random.uniform(0.1, 0.5))
    return jsonify({"message": "Hello, World!"})

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/metrics')
def metrics():
    return generate_latest()

@app.route('/users/<int:user_id>')
def get_user(user_id):
    # Simulate user activity
    ACTIVE_USERS.set(random.randint(10, 100))
    time.sleep(random.uniform(0.05, 0.2))
    return jsonify({"user_id": user_id, "name": f"User {user_id}"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
```

### Running the Flask Example

1. Install dependencies:
   ```bash
   pip install flask prometheus_client
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Test the metrics endpoint:
   ```bash
   curl http://localhost:8000/metrics
   ```

4. Add to Prometheus configuration:
   ```yaml
   scrape_configs:
     - job_name: 'flask-app'
       static_configs:
         - targets: ['host.docker.internal:8000']
   ```

## Node.js Example

### Express Application with Prometheus Metrics

```javascript
// app.js
const express = require('express');
const client = require('prom-client');

const app = express();
const port = 8001;

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Register metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeConnections);

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.labels(req.method, req.route?.path || req.path, res.statusCode).inc();
    httpRequestDuration.labels(req.method, req.route?.path || req.path).observe(duration);
  });
  
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Node.js!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/api/users/:id', (req, res) => {
  // Simulate some work
  setTimeout(() => {
    activeConnections.set(Math.floor(Math.random() * 50) + 10);
    res.json({ id: req.params.id, name: `User ${req.params.id}` });
  }, Math.random() * 200);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

### Running the Node.js Example

1. Install dependencies:
   ```bash
   npm init -y
   npm install express prom-client
   ```

2. Run the application:
   ```bash
   node app.js
   ```

## Java Spring Boot Example

### Spring Boot Application with Micrometer

```java
// Application.java
@RestController
@SpringBootApplication
public class MonitoringExampleApplication {

    private final MeterRegistry meterRegistry;
    private final Counter requestCounter;
    private final Timer requestTimer;
    private final Gauge activeUsers;

    public MonitoringExampleApplication(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.requestCounter = Counter.builder("http_requests_total")
                .description("Total HTTP requests")
                .register(meterRegistry);
        this.requestTimer = Timer.builder("http_request_duration")
                .description("HTTP request duration")
                .register(meterRegistry);
        this.activeUsers = Gauge.builder("active_users")
                .description("Number of active users")
                .register(meterRegistry, this, MonitoringExampleApplication::getActiveUserCount);
    }

    @GetMapping("/")
    public Map<String, String> home() {
        return requestTimer.recordCallable(() -> {
            requestCounter.increment();
            // Simulate some work
            Thread.sleep((long) (Math.random() * 200));
            return Map.of("message", "Hello from Spring Boot!");
        });
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "healthy");
    }

    @GetMapping("/api/users/{id}")
    public Map<String, Object> getUser(@PathVariable String id) {
        requestCounter.increment();
        return requestTimer.recordCallable(() -> {
            Thread.sleep((long) (Math.random() * 100));
            return Map.of("id", id, "name", "User " + id);
        });
    }

    private double getActiveUserCount() {
        return Math.random() * 100 + 10;
    }

    public static void main(String[] args) {
        SpringApplication.run(MonitoringExampleApplication.class, args);
    }
}
```

### application.yml for Spring Boot

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    metrics:
      enabled: true
    prometheus:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
```

## Go Example

### Simple HTTP Server with Prometheus Metrics

```go
// main.go
package main

import (
    "fmt"
    "log"
    "math/rand"
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests",
        },
        []string{"method", "endpoint"},
    )

    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(activeConnections)
}

func instrumentHandler(handler http.HandlerFunc, endpoint string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        handler(w, r)
        
        duration := time.Since(start).Seconds()
        httpRequestsTotal.WithLabelValues(r.Method, endpoint, "200").Inc()
        httpRequestDuration.WithLabelValues(r.Method, endpoint).Observe(duration)
    }
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    // Simulate some work
    time.Sleep(time.Duration(rand.Intn(200)) * time.Millisecond)
    fmt.Fprintf(w, `{"message": "Hello from Go!"}`)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, `{"status": "healthy"}`)
}

func userHandler(w http.ResponseWriter, r *http.Request) {
    activeConnections.Set(float64(rand.Intn(50) + 10))
    time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
    fmt.Fprintf(w, `{"id": "123", "name": "User 123"}`)
}

func main() {
    http.HandleFunc("/", instrumentHandler(homeHandler, "/"))
    http.HandleFunc("/health", instrumentHandler(healthHandler, "/health"))
    http.HandleFunc("/api/users/123", instrumentHandler(userHandler, "/api/users/123"))
    http.Handle("/metrics", promhttp.Handler())

    log.Println("Server starting on :8002")
    log.Fatal(http.ListenAndServe(":8002", nil))
}
```

### Running the Go Example

1. Initialize Go module and install dependencies:
   ```bash
   go mod init monitoring-example
   go get github.com/prometheus/client_golang/prometheus
   go get github.com/prometheus/client_golang/prometheus/promhttp
   ```

2. Run the application:
   ```bash
   go run main.go
   ```

## Adding to Prometheus Configuration

Add these applications to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'flask-app'
    static_configs:
      - targets: ['host.docker.internal:8000']
    
  - job_name: 'nodejs-app'
    static_configs:
      - targets: ['host.docker.internal:8001']
    
  - job_name: 'spring-boot-app'
    static_configs:
      - targets: ['host.docker.internal:8080']
    metrics_path: '/actuator/prometheus'
    
  - job_name: 'go-app'
    static_configs:
      - targets: ['host.docker.internal:8002']
```

## Testing Your Applications

Generate some traffic to see metrics:

```bash
# Test endpoints
curl http://localhost:8000/
curl http://localhost:8000/users/123
curl http://localhost:8001/
curl http://localhost:8001/api/users/456
curl http://localhost:8002/
curl http://localhost:8002/api/users/123

# Check metrics
curl http://localhost:8000/metrics
curl http://localhost:8001/metrics
curl http://localhost:8002/metrics
```