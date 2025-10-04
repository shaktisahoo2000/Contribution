# Python Flask API with Docker

This example shows how to containerize a Python Flask API application.

## Project Structure
```
python-flask-api/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── app.py
├── config.py
├── .dockerignore
└── tests/
    └── test_app.py
```

## Files

### requirements.txt
```
Flask==2.3.2
Flask-CORS==4.0.0
gunicorn==20.1.0
redis==4.5.4
psycopg2-binary==2.9.6
python-dotenv==1.0.0
pytest==7.3.1
requests==2.31.0
```

### app.py
```python
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import redis
import psycopg2
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# Redis connection
try:
    r = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        decode_responses=True
    )
except Exception as e:
    print(f"Redis connection failed: {e}")
    r = None

@app.route('/')
def home():
    return jsonify({
        "message": "Flask API with Docker",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/health')
def health():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "redis": "unknown",
            "database": "unknown"
        }
    }
    
    # Check Redis
    if r:
        try:
            r.ping()
            health_status["services"]["redis"] = "healthy"
        except:
            health_status["services"]["redis"] = "unhealthy"
    
    return jsonify(health_status)

@app.route('/api/users', methods=['GET'])
def get_users():
    # Mock data
    users = [
        {"id": 1, "name": "John Doe", "email": "john@example.com"},
        {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
    ]
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    
    if not data or 'name' not in data or 'email' not in data:
        return jsonify({"error": "Name and email are required"}), 400
    
    # Mock creation
    new_user = {
        "id": 3,
        "name": data['name'],
        "email": data['email'],
        "created_at": datetime.now().isoformat()
    }
    
    # Cache in Redis if available
    if r:
        try:
            r.setex(f"user:{new_user['id']}", 3600, json.dumps(new_user))
        except Exception as e:
            print(f"Redis error: {e}")
    
    return jsonify(new_user), 201

@app.route('/api/cache/<key>')
def get_cache(key):
    if not r:
        return jsonify({"error": "Redis not available"}), 503
    
    try:
        value = r.get(key)
        if value:
            return jsonify({"key": key, "value": value})
        else:
            return jsonify({"error": "Key not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
```

### Dockerfile
```dockerfile
# Use Python slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - DATABASE_URL=postgresql://user:password@db:5432/flaskapi
    depends_on:
      - redis
      - db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flaskapi
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
```

### Development Dockerfile
```dockerfile
# Dockerfile.dev
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=development

WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

EXPOSE 5000

# Run with Flask development server
CMD ["python", "app.py"]
```

### .dockerignore
```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
.DS_Store
```

## How to Run

### Development Environment
```bash
# Build development image
docker build -f Dockerfile.dev -t flask-api:dev .

# Run development container
docker run -p 5000:5000 -v $(pwd):/app flask-api:dev
```

### Production Environment
```bash
# Using Docker Compose
docker-compose up --build

# Using Docker only
docker build -t flask-api .
docker run -p 5000:5000 flask-api
```

### Testing the API
```bash
# Health check
curl http://localhost:5000/health

# Get users
curl http://localhost:5000/api/users

# Create user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Wilson", "email": "bob@example.com"}'

# Test caching
curl http://localhost:5000/api/cache/user:3
```

## Multi-stage Production Build

### Dockerfile.multistage
```dockerfile
# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Copy Python dependencies from builder stage
COPY --from=builder /root/.local /root/.local

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

WORKDIR /app

# Copy application
COPY . .

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]
```

## Best Practices Applied

1. **Multi-stage builds** for smaller production images
2. **Non-root user** for security
3. **Health checks** for monitoring
4. **Environment variables** for configuration
5. **Proper .dockerignore** to reduce build context
6. **Gunicorn** for production WSGI server
7. **Security scanning** with minimal base images