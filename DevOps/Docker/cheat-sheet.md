# Docker Commands Cheat Sheet

Quick reference for the most commonly used Docker commands.

## Container Management

### Running Containers
```bash
# Run container interactively
docker run -it ubuntu bash

# Run container in background
docker run -d nginx

# Run with port mapping
docker run -p 8080:80 nginx

# Run with volume mount
docker run -v /host/path:/container/path nginx

# Run with environment variables
docker run -e NODE_ENV=production node-app

# Run with custom name
docker run --name my-container nginx

# Run with resource limits
docker run --memory="256m" --cpus="0.5" nginx
```

### Container Operations
```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop container
docker stop <container_id>

# Start stopped container
docker start <container_id>

# Restart container
docker restart <container_id>

# Remove container
docker rm <container_id>

# Remove running container (force)
docker rm -f <container_id>

# Remove all stopped containers
docker container prune
```

### Container Information
```bash
# View container logs
docker logs <container_id>

# Follow logs in real-time
docker logs -f <container_id>

# Execute command in running container
docker exec -it <container_id> bash

# Inspect container
docker inspect <container_id>

# View container stats
docker stats

# View container processes
docker top <container_id>
```

## Image Management

### Building Images
```bash
# Build image from Dockerfile
docker build -t myapp:latest .

# Build with custom Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# Build with build arguments
docker build --build-arg NODE_ENV=production -t myapp .

# Build without cache
docker build --no-cache -t myapp .
```

### Image Operations
```bash
# List images
docker images

# Pull image from registry
docker pull ubuntu:20.04

# Push image to registry
docker push myregistry/myapp:latest

# Remove image
docker rmi <image_id>

# Remove unused images
docker image prune

# Remove all unused images
docker image prune -a

# Tag image
docker tag <image_id> myapp:v1.0
```

### Image Information
```bash
# Inspect image
docker inspect <image_id>

# View image history
docker history <image_id>

# View image layers
docker image ls --tree
```

## Volume Management

```bash
# Create volume
docker volume create myvolume

# List volumes
docker volume ls

# Inspect volume
docker volume inspect myvolume

# Remove volume
docker volume rm myvolume

# Remove unused volumes
docker volume prune

# Use volume in container
docker run -v myvolume:/data nginx
```

## Network Management

```bash
# List networks
docker network ls

# Create network
docker network create mynetwork

# Create network with subnet
docker network create --subnet=172.20.0.0/16 mynetwork

# Remove network
docker network rm mynetwork

# Connect container to network
docker network connect mynetwork <container_id>

# Disconnect container from network
docker network disconnect mynetwork <container_id>

# Inspect network
docker network inspect mynetwork
```

## Docker Compose

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Build and start
docker-compose up --build

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs

# Follow logs
docker-compose logs -f

# Scale service
docker-compose up --scale web=3

# Execute command in service
docker-compose exec web bash

# Restart services
docker-compose restart
```

## System Commands

```bash
# System information
docker info

# Docker version
docker version

# System events
docker events

# System usage
docker system df

# Clean up everything
docker system prune

# Clean up everything including volumes
docker system prune -a --volumes
```

## Registry Operations

```bash
# Login to registry
docker login

# Login to custom registry
docker login myregistry.com

# Logout from registry
docker logout

# Search for images
docker search nginx

# Pull specific tag
docker pull nginx:1.20-alpine

# Push to registry
docker push myregistry/myapp:latest
```

## Debugging Commands

```bash
# Copy files from container
docker cp <container_id>:/path/to/file /host/path

# Copy files to container
docker cp /host/path <container_id>:/path/to/file

# Create image from container
docker commit <container_id> myapp:snapshot

# Export container as tar
docker export <container_id> > container.tar

# Import container from tar
docker import container.tar myapp:imported

# Save image as tar
docker save myapp:latest > image.tar

# Load image from tar
docker load < image.tar
```

## Security Commands

```bash
# Run container with read-only filesystem
docker run --read-only nginx

# Run with security options
docker run --security-opt no-new-privileges nginx

# Run with user
docker run -u 1001:1001 nginx

# Scan image for vulnerabilities (with external tools)
trivy image nginx:latest
```

## Advanced Options

```bash
# Run with custom DNS
docker run --dns=8.8.8.8 nginx

# Run with host network
docker run --network=host nginx

# Run with restart policy
docker run --restart=unless-stopped nginx

# Run with health check
docker run --health-cmd="curl -f http://localhost/" nginx

# Run with labels
docker run --label environment=production nginx

# Run with device mapping
docker run --device=/dev/sda:/dev/xvda nginx
```

## Useful Aliases

Add these to your `.bashrc` or `.zshrc`:

```bash
# Docker aliases
alias d='docker'
alias dc='docker-compose'
alias dps='docker ps'
alias dim='docker images'
alias drm='docker rm'
alias drmi='docker rmi'
alias dlog='docker logs'
alias dexec='docker exec -it'

# Docker cleanup aliases
alias dclean='docker system prune -f'
alias dcleanall='docker system prune -a -f --volumes'
alias drmall='docker rm $(docker ps -aq)'
alias drmiall='docker rmi $(docker images -q)'
```

## Tips and Tricks

1. **Use .dockerignore** to reduce build context
2. **Multi-stage builds** for smaller images
3. **Use specific tags** instead of 'latest'
4. **Run as non-root user** for security
5. **Use health checks** for monitoring
6. **Leverage build cache** for faster builds
7. **Use volumes** for persistent data
8. **Monitor resource usage** with `docker stats`