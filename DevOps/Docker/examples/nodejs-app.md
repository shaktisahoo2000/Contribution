# Node.js Express Application with Docker

This example demonstrates how to containerize a Node.js Express application using Docker.

## Project Structure
```
nodejs-app/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── package.json
├── server.js
└── public/
    └── index.html
```

## Files

### package.json
```json
{
  "name": "nodejs-docker-app",
  "version": "1.0.0",
  "description": "Sample Node.js app for Docker",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^2.0.15"
  }
}
```

### server.js
```javascript
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Docker Node.js App',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    nodejs: process.version
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

### Dockerfile
```dockerfile
# Use official Node.js runtime as base image
FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the working directory
RUN chown -R nextjs:nodejs /usr/src/app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
```

### .dockerignore
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.tmp
.DS_Store
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
    restart: unless-stopped
```

### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            proxy_pass http://app/api/health;
        }
    }
}
```

## How to Run

### Using Docker
```bash
# Build the image
docker build -t nodejs-app .

# Run the container
docker run -p 3000:3000 nodejs-app

# Access the application
curl http://localhost:3000
```

### Using Docker Compose
```bash
# Start all services
docker-compose up --build

# Run in background
docker-compose up -d

# Access via nginx proxy
curl http://localhost
```

## Multi-stage Build Example

### Dockerfile.multistage
```dockerfile
# Build stage
FROM node:16-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

# Production stage
FROM node:16-alpine AS production

WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application from builder stage
COPY --from=builder /usr/src/app/server.js ./
COPY --from=builder /usr/src/app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /usr/src/app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
```

## Commands

```bash
# Build multi-stage image
docker build -f Dockerfile.multistage -t nodejs-app:optimized .

# Compare image sizes
docker images nodejs-app

# Run with environment variables
docker run -e NODE_ENV=production -p 3000:3000 nodejs-app

# View logs
docker logs <container_id>

# Execute commands in running container
docker exec -it <container_id> sh
```