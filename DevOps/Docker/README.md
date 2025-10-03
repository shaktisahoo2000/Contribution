# Docker Complete Guide 🐳

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Basic Commands](#basic-commands)
4. [Dockerfile Best Practices](#dockerfile-best-practices)
5. [Docker Compose](#docker-compose)
6. [Real-World Examples](#real-world-examples)
7. [Advanced Topics](#advanced-topics)
8. [Troubleshooting](#troubleshooting)

## Introduction

Docker is a containerization platform that allows developers to package applications with all their dependencies into lightweight, portable containers. This guide provides comprehensive coverage of Docker concepts and practical implementations.

### Why Docker?
- **Consistency**: "It works on my machine" problem solved
- **Portability**: Run anywhere - development, testing, production
- **Efficiency**: Lightweight compared to virtual machines
- **Scalability**: Easy horizontal scaling
- **Isolation**: Applications run in isolated environments

## Installation

### Windows
```powershell
# Download Docker Desktop from official website
# https://www.docker.com/products/docker-desktop/

# Verify installation
docker --version
docker-compose --version
```

### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (optional)
sudo usermod -aG docker $USER
```

## Basic Commands

### Container Operations
```bash
# Run a container
docker run hello-world
docker run -it ubuntu bash
docker run -d -p 8080:80 nginx

# List containers
docker ps                    # Running containers
docker ps -a                # All containers

# Stop/Start containers
docker stop <container_id>
docker start <container_id>
docker restart <container_id>

# Remove containers
docker rm <container_id>
docker rm $(docker ps -aq)  # Remove all stopped containers
```

### Image Operations
```bash
# List images
docker images
docker image ls

# Pull images
docker pull ubuntu:20.04
docker pull nginx:latest

# Build images
docker build -t myapp:v1.0 .
docker build -f Dockerfile.prod -t myapp:prod .

# Remove images
docker rmi <image_id>
docker image prune           # Remove unused images
```

### System Operations
```bash
# System information
docker info
docker version

# Clean up
docker system prune          # Remove unused data
docker system prune -a       # Remove all unused data
docker volume prune          # Remove unused volumes
docker network prune         # Remove unused networks
```

## Dockerfile Best Practices

### Basic Dockerfile Structure
```dockerfile
# Use official base image
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Multi-stage Build Example
```dockerfile
# Build stage
FROM node:16-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:16-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Docker Compose

### Basic docker-compose.yml
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - app-network

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - app-network

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

### Docker Compose Commands
```bash
# Start services
docker-compose up
docker-compose up -d          # Detached mode

# Stop services
docker-compose down
docker-compose down -v        # Remove volumes

# Build and start
docker-compose up --build

# Scale services
docker-compose up --scale web=3

# View logs
docker-compose logs
docker-compose logs web

# Execute commands
docker-compose exec web bash
```

## Real-World Examples

See the `/examples` directory for complete implementations:
- Node.js Web Application
- Python Flask API
- NGINX Reverse Proxy
- Multi-service Application with Database

## Advanced Topics

### Docker Networks
```bash
# Create custom network
docker network create --driver bridge mynetwork

# Run container in custom network
docker run --network=mynetwork nginx

# Connect running container to network
docker network connect mynetwork <container_id>
```

### Docker Volumes
```bash
# Create named volume
docker volume create myvolume

# Use volume in container
docker run -v myvolume:/data nginx

# Bind mount
docker run -v /host/path:/container/path nginx
```

### Docker Security
```dockerfile
# Use non-root user
RUN groupadd -r myuser && useradd -r -g myuser myuser
USER myuser

# Use specific tags instead of 'latest'
FROM node:16.14.2-alpine

# Scan for vulnerabilities
RUN npm audit fix

# Use minimal base images
FROM alpine:3.15
```

## Troubleshooting

### Common Issues and Solutions

1. **Container exits immediately**
   ```bash
   # Check logs
   docker logs <container_id>
   
   # Run interactively
   docker run -it <image> /bin/sh
   ```

2. **Port already in use**
   ```bash
   # Find process using port
   netstat -tulpn | grep :8080
   
   # Use different port
   docker run -p 8081:80 nginx
   ```

3. **Permission denied**
   ```bash
   # Fix ownership
   sudo chown -R $USER:$USER /path/to/directory
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   ```

4. **Out of disk space**
   ```bash
   # Clean up
   docker system prune -a
   docker volume prune
   ```

## Resources

- [Official Docker Documentation](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Best Practices Guide](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.