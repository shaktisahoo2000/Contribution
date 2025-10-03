# Three-Tier Web Application Example

## Overview
This example demonstrates a complete three-tier web application deployment on AWS with high availability, auto scaling, and security best practices.

## Architecture

```
Internet
    |
[CloudFront CDN]
    |
[Application Load Balancer]
    |
[Auto Scaling Group]
    |    |    |
[EC2] [EC2] [EC2] (Web/App Tier)
    |    |    |
[RDS Multi-AZ] (Database Tier)
```

## Components

### 1. Presentation Tier
- **CloudFront**: Content delivery network for static assets
- **S3 Bucket**: Static website hosting for frontend assets
- **Route 53**: DNS management

### 2. Application Tier
- **Application Load Balancer**: Distributes traffic across instances
- **Auto Scaling Group**: Automatically scales based on demand
- **EC2 Instances**: Application servers in private subnets
- **Security Groups**: Network-level security

### 3. Data Tier
- **RDS MySQL**: Multi-AZ database for high availability
- **ElastiCache**: Redis cluster for session storage and caching
- **S3**: File storage for uploads and backups

## Prerequisites

- AWS CLI configured with appropriate permissions
- Valid domain name (optional, for custom domain)
- SSL certificate (optional, can be created via ACM)

## Quick Deploy

```bash
# Clone and navigate to the example
cd web-application

# Deploy the infrastructure
./deploy.sh dev

# Wait for deployment to complete (15-20 minutes)
# Access the application via the ALB DNS name provided in outputs
```

## Deployment Options

### Option 1: CloudFormation
```bash
aws cloudformation create-stack \
  --stack-name webapp-dev \
  --template-body file://cloudformation/main.yaml \
  --parameters file://parameters/dev.json \
  --capabilities CAPABILITY_IAM
```

### Option 2: Terraform
```bash
cd terraform/
terraform init
terraform plan -var-file="../parameters/dev.tfvars"
terraform apply -var-file="../parameters/dev.tfvars"
```

### Option 3: CDK
```bash
cd cdk/
npm install
npm run build
cdk deploy --parameters-file ../parameters/dev.json
```

## Configuration

### Environment Parameters (dev.json)
```json
{
  "Environment": "dev",
  "VpcCidr": "10.0.0.0/16",
  "InstanceType": "t3.micro",
  "MinSize": 2,
  "MaxSize": 6,
  "DesiredCapacity": 2,
  "DatabaseInstanceClass": "db.t3.micro",
  "DatabaseEngine": "mysql",
  "DatabaseName": "webapp",
  "DatabaseUsername": "admin",
  "DomainName": "",
  "CertificateArn": ""
}
```

### Application Configuration
```bash
# User data script for EC2 instances
#!/bin/bash
yum update -y
yum install -y httpd php php-mysql

# Install application dependencies
yum install -y git

# Download application code
cd /var/www/html
git clone https://github.com/your-repo/webapp.git .

# Configure database connection
cat > config.php << EOF
<?php
define('DB_HOST', '${DatabaseEndpoint}');
define('DB_NAME', '${DatabaseName}');
define('DB_USER', '${DatabaseUsername}');
define('DB_PASS', '${DatabasePassword}');
define('REDIS_HOST', '${RedisEndpoint}');
?>
EOF

# Start services
systemctl start httpd
systemctl enable httpd
```

## Security Features

### 1. Network Security
- Private subnets for application and database tiers
- Security groups with minimal required access
- NACLs for additional layer of security
- No direct internet access to application servers

### 2. Data Protection
- RDS encryption at rest
- SSL/TLS encryption in transit
- S3 bucket encryption
- Secrets Manager for database credentials

### 3. Access Control
- IAM roles for EC2 instances
- Least privilege access policies
- MFA requirement for administrative access

## Monitoring and Logging

### CloudWatch Metrics
- EC2 instance metrics (CPU, memory, disk)
- Application Load Balancer metrics
- RDS performance metrics
- Custom application metrics

### CloudWatch Alarms
```yaml
HighCPUAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${Environment}-high-cpu'
    AlarmDescription: 'High CPU utilization'
    MetricName: CPUUtilization
    Namespace: AWS/EC2
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 80
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref SNSTopic
```

### Application Logs
- CloudWatch Logs for application logs
- X-Ray for distributed tracing
- VPC Flow Logs for network monitoring

## Auto Scaling Configuration

### Scaling Policies
```yaml
ScaleUpPolicy:
  Type: AWS::AutoScaling::ScalingPolicy
  Properties:
    AdjustmentType: ChangeInCapacity
    AutoScalingGroupName: !Ref AutoScalingGroup
    Cooldown: 300
    ScalingAdjustment: 1

ScaleDownPolicy:
  Type: AWS::AutoScaling::ScalingPolicy
  Properties:
    AdjustmentType: ChangeInCapacity
    AutoScalingGroupName: !Ref AutoScalingGroup
    Cooldown: 300
    ScalingAdjustment: -1
```

### Scaling Triggers
- CPU utilization > 70% (scale up)
- CPU utilization < 30% (scale down)
- Request count per target
- Response time thresholds

## Database Configuration

### RDS Setup
```yaml
Database:
  Type: AWS::RDS::DBInstance
  Properties:
    DBInstanceIdentifier: !Sub '${Environment}-webapp-db'
    DBInstanceClass: !Ref DatabaseInstanceClass
    Engine: mysql
    EngineVersion: '8.0'
    AllocatedStorage: 20
    StorageType: gp3
    StorageEncrypted: true
    MultiAZ: true
    VPCSecurityGroups:
      - !Ref DatabaseSecurityGroup
    DBSubnetGroupName: !Ref DatabaseSubnetGroup
    BackupRetentionPeriod: 7
    PreferredBackupWindow: '03:00-04:00'
    PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'
    DeletionProtection: true
```

### Cache Configuration
```yaml
ElastiCacheSubnetGroup:
  Type: AWS::ElastiCache::SubnetGroup
  Properties:
    Description: 'Subnet group for ElastiCache'
    SubnetIds:
      - !Ref PrivateSubnet1
      - !Ref PrivateSubnet2

ElastiCacheCluster:
  Type: AWS::ElastiCache::ReplicationGroup
  Properties:
    ReplicationGroupId: !Sub '${Environment}-webapp-redis'
    Description: 'Redis cluster for session storage'
    NumCacheClusters: 2
    Engine: redis
    CacheNodeType: cache.t3.micro
    Port: 6379
    CacheSubnetGroupName: !Ref ElastiCacheSubnetGroup
    SecurityGroupIds:
      - !Ref CacheSecurityGroup
```

## Load Balancer Configuration

### Application Load Balancer
```yaml
LoadBalancer:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: !Sub '${Environment}-webapp-alb'
    Type: application
    Scheme: internet-facing
    SecurityGroups:
      - !Ref LoadBalancerSecurityGroup
    Subnets:
      - !Ref PublicSubnet1
      - !Ref PublicSubnet2

TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Name: !Sub '${Environment}-webapp-tg'
    Port: 80
    Protocol: HTTP
    VpcId: !Ref VPC
    HealthCheckPath: '/health'
    HealthCheckProtocol: HTTP
    HealthCheckIntervalSeconds: 30
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3
```

## Content Delivery

### CloudFront Distribution
```yaml
CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
        - Id: ALBOrigin
          DomainName: !GetAtt LoadBalancer.DNSName
          CustomOriginConfig:
            HTTPPort: 80
            HTTPSPort: 443
            OriginProtocolPolicy: https-only
        - Id: S3Origin
          DomainName: !GetAtt S3Bucket.DomainName
          S3OriginConfig:
            OriginAccessIdentity: !Sub 'origin-access-identity/cloudfront/${CloudFrontOAI}'
      DefaultCacheBehavior:
        TargetOriginId: ALBOrigin
        ViewerProtocolPolicy: redirect-to-https
        AllowedMethods: [GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE]
        CachedMethods: [GET, HEAD]
        Compress: true
      CacheBehaviors:
        - PathPattern: '/static/*'
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          Compress: true
      Enabled: true
      Comment: !Sub '${Environment} Web Application CDN'
```

## Backup and Recovery

### Database Backups
- Automated daily backups with 7-day retention
- Point-in-time recovery enabled
- Cross-region backup replication for production

### Application Backups
- AMI snapshots of configured instances
- S3 backup for user uploads
- Configuration management in version control

## Cost Optimization

### Instance Right-Sizing
- Use appropriate instance types for workload
- Implement scheduled scaling for predictable patterns
- Use spot instances for development environments

### Storage Optimization
- S3 lifecycle policies for log retention
- Intelligent tiering for user uploads
- Regular cleanup of unused snapshots

## Testing

### Load Testing
```bash
# Install Apache Bench
sudo yum install httpd-tools

# Basic load test
ab -n 1000 -c 50 http://your-alb-dns-name/

# Advanced load testing with wrk
wrk -t12 -c400 -d30s --timeout 30s http://your-alb-dns-name/
```

### Health Checks
```bash
# Application health endpoint
curl http://your-alb-dns-name/health

# Database connectivity test
curl http://your-alb-dns-name/db-test

# Cache connectivity test
curl http://your-alb-dns-name/cache-test
```

## Troubleshooting

### Common Issues

1. **503 Service Unavailable**
   - Check target group health
   - Verify security group rules
   - Check application logs

2. **Database Connection Failed**
   - Verify security group allows traffic from app servers
   - Check database credentials in Secrets Manager
   - Ensure database is in available state

3. **High Response Times**
   - Check CloudWatch metrics for bottlenecks
   - Verify cache is functioning
   - Consider scaling up instances

### Useful Commands

```bash
# Check Auto Scaling Group status
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names webapp-dev-asg

# Check Load Balancer targets
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...

# View CloudWatch logs
aws logs tail webapp-dev-application-logs --follow

# Connect to RDS instance
mysql -h your-rds-endpoint -u admin -p webapp
```

## Cleanup

```bash
# Delete the stack
./cleanup.sh dev

# Or manually delete CloudFormation stack
aws cloudformation delete-stack --stack-name webapp-dev

# For Terraform
cd terraform/
terraform destroy -var-file="../parameters/dev.tfvars"
```

## Production Considerations

### Security Enhancements
- WAF for application layer protection
- Shield Advanced for DDoS protection
- GuardDuty for threat detection
- Config for compliance monitoring

### Performance Optimizations
- Use larger instance types
- Implement read replicas for database
- Add ElastiCache for improved performance
- Optimize CloudFront caching

### Operational Excellence
- Implement blue-green deployments
- Add comprehensive monitoring
- Set up automated backups
- Create runbooks for common operations

## Estimated Costs

### Development Environment (monthly)
- EC2 instances (2x t3.micro): ~$15
- RDS (db.t3.micro): ~$15
- Load Balancer: ~$20
- CloudFront: ~$5
- S3 and other services: ~$10
- **Total: ~$65/month**

### Production Environment (monthly)
- EC2 instances (3x t3.medium): ~$90
- RDS (db.t3.medium Multi-AZ): ~$60
- ElastiCache: ~$15
- Load Balancer: ~$20
- CloudFront: ~$20
- S3 and other services: ~$25
- **Total: ~$230/month**

*Note: Costs may vary based on usage patterns and AWS pricing changes.*