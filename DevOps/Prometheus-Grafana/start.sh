#!/bin/bash

# Prometheus and Grafana Quick Start Script

echo "🚀 Starting Prometheus and Grafana Monitoring Stack..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p config/grafana/provisioning/{datasources,dashboards}
mkdir -p dashboards

# Start the monitoring stack
echo "🐳 Starting containers with Docker Compose..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."

if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus is running at http://localhost:9090"
else
    echo "❌ Prometheus is not responding"
fi

if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Grafana is running at http://localhost:3000"
    echo "   Default credentials: admin/admin"
else
    echo "❌ Grafana is not responding"
fi

if curl -s http://localhost:9100/metrics > /dev/null; then
    echo "✅ Node Exporter is running at http://localhost:9100"
else
    echo "❌ Node Exporter is not responding"
fi

if curl -s http://localhost:8080/metrics > /dev/null; then
    echo "✅ cAdvisor is running at http://localhost:8080"
else
    echo "❌ cAdvisor is not responding"
fi

echo ""
echo "🎉 Monitoring stack is ready!"
echo ""
echo "📊 Access your monitoring tools:"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3000 (admin/admin)"
echo "   • Node Exporter: http://localhost:9100"
echo "   • cAdvisor: http://localhost:8080"
echo "   • Alertmanager: http://localhost:9093"
echo ""
echo "📖 Next steps:"
echo "   1. Open Grafana and change the default password"
echo "   2. Import the sample dashboards from the dashboards/ directory"
echo "   3. Configure alerting in Alertmanager"
echo "   4. Add your applications to prometheus.yml for monitoring"
echo ""
echo "🛑 To stop the stack: docker-compose down"
echo "🗑️  To remove all data: docker-compose down -v"