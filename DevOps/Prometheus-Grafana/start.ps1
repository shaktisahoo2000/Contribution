# Prometheus and Grafana Quick Start Script for Windows

Write-Host "🚀 Starting Prometheus and Grafana Monitoring Stack..." -ForegroundColor Green

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "config\grafana\provisioning\datasources" | Out-Null
New-Item -ItemType Directory -Force -Path "config\grafana\provisioning\dashboards" | Out-Null
New-Item -ItemType Directory -Force -Path "dashboards" | Out-Null

# Start the monitoring stack
Write-Host "🐳 Starting containers with Docker Compose..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check if services are running
Write-Host "🔍 Checking service status..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Prometheus is running at http://localhost:9090" -ForegroundColor Green
} catch {
    Write-Host "❌ Prometheus is not responding" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Grafana is running at http://localhost:3000" -ForegroundColor Green
    Write-Host "   Default credentials: admin/admin" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Grafana is not responding" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:9100/metrics" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Node Exporter is running at http://localhost:9100" -ForegroundColor Green
} catch {
    Write-Host "❌ Node Exporter is not responding" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/metrics" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ cAdvisor is running at http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "❌ cAdvisor is not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Monitoring stack is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access your monitoring tools:" -ForegroundColor Cyan
Write-Host "   • Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "   • Grafana: http://localhost:3000 (admin/admin)" -ForegroundColor White
Write-Host "   • Node Exporter: http://localhost:9100" -ForegroundColor White
Write-Host "   • cAdvisor: http://localhost:8080" -ForegroundColor White
Write-Host "   • Alertmanager: http://localhost:9093" -ForegroundColor White
Write-Host ""
Write-Host "📖 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open Grafana and change the default password" -ForegroundColor White
Write-Host "   2. Import the sample dashboards from the dashboards/ directory" -ForegroundColor White
Write-Host "   3. Configure alerting in Alertmanager" -ForegroundColor White
Write-Host "   4. Add your applications to prometheus.yml for monitoring" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop the stack: docker-compose down" -ForegroundColor Yellow
Write-Host "🗑️  To remove all data: docker-compose down -v" -ForegroundColor Yellow