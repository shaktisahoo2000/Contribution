# AWS Fundamentals

## Overview
This section covers the fundamental concepts and services that form the foundation of AWS.

## Core Concepts

### 1. AWS Global Infrastructure
- **Regions**: Geographic areas with multiple Availability Zones
- **Availability Zones (AZs)**: Isolated data centers within a region
- **Edge Locations**: Points of presence for CloudFront CDN

### 2. AWS Service Categories
- **Compute**: EC2, Lambda, ECS, EKS
- **Storage**: S3, EBS, EFS
- **Database**: RDS, DynamoDB, Redshift
- **Networking**: VPC, CloudFront, Route 53
- **Security**: IAM, KMS, WAF

### 3. AWS Pricing Model
- **Pay-as-you-go**: Only pay for what you use
- **Reserved Instances**: Commit to usage for discounts
- **Spot Instances**: Bid for unused capacity

## Getting Started Checklist

### 1. Account Setup
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
```

### 2. Essential First Steps
- [ ] Set up MFA on root account
- [ ] Create IAM users instead of using root
- [ ] Set up billing alerts
- [ ] Enable CloudTrail for audit logging
- [ ] Configure VPC with proper subnets

### 3. Security Best Practices
- Use IAM roles instead of access keys when possible
- Enable MFA for all users
- Follow principle of least privilege
- Regularly rotate access keys
- Use AWS Secrets Manager for sensitive data

## Common AWS CLI Commands

```bash
# List all S3 buckets
aws s3 ls

# List EC2 instances
aws ec2 describe-instances

# Check your identity
aws sts get-caller-identity

# List all regions
aws ec2 describe-regions --output table

# Create a new S3 bucket
aws s3 mb s3://your-bucket-name

# Upload file to S3
aws s3 cp file.txt s3://your-bucket-name/
```

## Well-Architected Framework Pillars

### 1. Operational Excellence
- Perform operations as code
- Make frequent, small, reversible changes
- Refine operations procedures frequently

### 2. Security
- Implement strong identity foundation
- Apply security at all layers
- Enable traceability

### 3. Reliability
- Automatically recover from failure
- Test recovery procedures
- Scale horizontally to increase aggregate workload availability

### 4. Performance Efficiency
- Democratize advanced technologies
- Go global in minutes
- Use serverless architectures

### 5. Cost Optimization
- Implement cloud financial management
- Adopt a consumption model
- Measure and monitor efficiency

### 6. Sustainability
- Understand your impact
- Establish sustainability goals
- Maximize utilization

## Learning Resources

- [AWS Training and Certification](https://aws.amazon.com/training/)
- [AWS Workshops](https://workshops.aws/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [AWS Samples GitHub](https://github.com/aws-samples)