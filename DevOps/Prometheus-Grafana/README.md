# Prometheus and Grafana Monitoring Setup Guide

This guide provides comprehensive instructions for setting up Prometheus and Grafana for monitoring and observability in your infrastructure.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start with Docker Compose](#quick-start-with-docker-compose)
- [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Sample Dashboards](#sample-dashboards)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

### Prometheus
Prometheus is an open-source monitoring system and time series database. It collects metrics from configured targets at given intervals, evaluates rule expressions, displays results, and triggers alerts when specified conditions are met.

**Key Features:**
- Multi-dimensional data model with time series data
- PromQL query language
- Pull-based metric collection
- Service discovery
- Alerting capabilities

### Grafana
Grafana is an open-source analytics and interactive visualization web application. It provides charts, graphs, and alerts when connected to supported data sources.

**Key Features:**
- Rich visualization capabilities
- Multiple data source support
- Dashboard templating
- Alert notifications
- User management and permissions

## Prerequisites

- Docker and Docker Compose (for containerized setup)
- Basic understanding of monitoring concepts
- Access to systems you want to monitor

## Quick Start with Docker Compose

1. **Clone this repository and navigate to the Prometheus-Grafana directory:**
   ```bash
   cd DevOps/Prometheus-Grafana
   ```

2. **Start the monitoring stack:**
   ```bash
   docker-compose up -d
   ```

3. **Access the applications:**
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000 (admin/admin)

4. **Configure Grafana:**
   - Add Prometheus as a data source: http://prometheus:9090
   - Import sample dashboards from the `dashboards/` directory

## Manual Installation

### Installing Prometheus

#### Linux/Ubuntu
```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz

# Extract and install
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64
sudo cp prometheus /usr/local/bin/
sudo cp promtool /usr/local/bin/

# Create configuration directory
sudo mkdir /etc/prometheus
sudo cp prometheus.yml /etc/prometheus/

# Create user and set permissions
sudo useradd --no-create-home --shell /bin/false prometheus
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool
sudo chown -R prometheus:prometheus /etc/prometheus
```

#### Windows
1. Download the Windows binary from [Prometheus releases](https://github.com/prometheus/prometheus/releases)
2. Extract to `C:\prometheus`
3. Run `prometheus.exe --config.file=prometheus.yml`

### Installing Grafana

#### Linux/Ubuntu
```bash
# Add Grafana GPG key
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -

# Add repository
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list

# Install Grafana
sudo apt-get update
sudo apt-get install grafana

# Start and enable Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

#### Windows
1. Download Grafana from [official website](https://grafana.com/grafana/download)
2. Extract and run `grafana-server.exe`

## Configuration

### Prometheus Configuration

Basic `prometheus.yml` configuration:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['localhost:8080']
```

### Grafana Configuration

1. **Add Prometheus Data Source:**
   - URL: `http://localhost:9090` (or your Prometheus server)
   - Access: Server (default)

2. **Configure SMTP for Alerts (optional):**
   ```ini
   [smtp]
   enabled = true
   host = smtp.gmail.com:587
   user = your-email@gmail.com
   password = your-app-password
   from_address = your-email@gmail.com
   ```

## Sample Dashboards

### System Monitoring Dashboard
- CPU, Memory, Disk usage
- Network I/O
- System load

### Application Monitoring Dashboard
- HTTP request rates
- Response times
- Error rates
- Database connections

### Kubernetes Monitoring Dashboard
- Cluster resource usage
- Pod status
- Service health
- Ingress metrics

## Best Practices

### Prometheus Best Practices

1. **Metric Naming:**
   - Use descriptive names: `http_requests_total` instead of `requests`
   - Follow naming conventions: `<namespace>_<name>_<unit>`

2. **Labels:**
   - Keep cardinality low
   - Use labels for dimensions you want to aggregate by
   - Avoid high-cardinality labels (user IDs, timestamps)

3. **Recording Rules:**
   - Pre-calculate expensive queries
   - Use for frequently accessed metrics

4. **Retention:**
   - Configure appropriate retention periods
   - Use remote storage for long-term data

### Grafana Best Practices

1. **Dashboard Design:**
   - Keep dashboards focused and simple
   - Use consistent time ranges
   - Group related metrics together

2. **Alerting:**
   - Set meaningful thresholds
   - Avoid alert fatigue
   - Use notification channels effectively

3. **Variables:**
   - Use template variables for flexibility
   - Create reusable dashboards

## Monitoring Examples

### Node Exporter Setup
```bash
# Download and run Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.0/node_exporter-1.6.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.0.linux-amd64.tar.gz
cd node_exporter-1.6.0.linux-amd64
./node_exporter
```

### Custom Application Metrics
```python
# Python example with prometheus_client
from prometheus_client import Counter, Histogram, start_http_server
import time

REQUEST_COUNT = Counter('app_requests_total', 'Total app requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('app_request_duration_seconds', 'Request latency')

@REQUEST_LATENCY.time()
def process_request():
    REQUEST_COUNT.labels(method='GET', endpoint='/api').inc()
    time.sleep(0.1)

if __name__ == '__main__':
    start_http_server(8000)
    while True:
        process_request()
        time.sleep(1)
```

## Troubleshooting

### Common Issues

1. **Prometheus not scraping targets:**
   - Check network connectivity
   - Verify target endpoints are accessible
   - Review Prometheus logs

2. **Grafana not showing data:**
   - Verify data source configuration
   - Check time range settings
   - Validate PromQL queries

3. **High memory usage:**
   - Reduce retention period
   - Optimize queries
   - Check for high-cardinality metrics

### Useful Commands

```bash
# Check Prometheus configuration
promtool check config prometheus.yml

# Query Prometheus API
curl 'http://localhost:9090/api/v1/query?query=up'

# Check Grafana logs
sudo journalctl -u grafana-server -f

# Test alerting rules
promtool check rules alert_rules.yml
```

## Useful Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Examples](https://grafana.com/grafana/dashboards/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Make sure to:

1. Follow the existing code style
2. Add documentation for new features
3. Test your changes thoroughly
4. Update this README if necessary

## License

This project is licensed under the MIT License - see the LICENSE file for details.