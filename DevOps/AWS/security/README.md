# AWS Security Guidelines

## Overview
Security is a shared responsibility between AWS and customers. This guide covers security best practices and services for AWS DevOps environments.

## AWS Security Services

### 1. Identity and Access Management (IAM)
- Centralized access control
- Fine-grained permissions
- Multi-factor authentication (MFA)
- Role-based access control

### 2. AWS Key Management Service (KMS)
- Centralized key management
- Encryption key lifecycle management
- Integration with AWS services
- Hardware security modules (HSMs)

### 3. AWS Secrets Manager
- Centralized secrets storage
- Automatic rotation
- Fine-grained access control
- Integration with applications

### 4. AWS Certificate Manager (ACM)
- SSL/TLS certificate provisioning
- Automatic renewal
- Integration with load balancers
- Domain validation

### 5. AWS Web Application Firewall (WAF)
- Web application protection
- DDoS protection
- SQL injection prevention
- Cross-site scripting protection

## IAM Best Practices

### 1. Principle of Least Privilege
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

### 2. Use IAM Roles Instead of Access Keys
```yaml
# CloudFormation template for EC2 instance with IAM role
Resources:
  EC2Role:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: S3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                Resource: 'arn:aws:s3:::my-bucket/*'

  EC2InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles:
        - !Ref EC2Role

  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0abcdef1234567890
      InstanceType: t3.micro
      IamInstanceProfile: !Ref EC2InstanceProfile
```

### 3. Enable MFA for Root and IAM Users
```bash
# Enable MFA for IAM user
aws iam enable-mfa-device \
    --user-name username \
    --serial-number arn:aws:iam::123456789012:mfa/username \
    --authentication-code1 123456 \
    --authentication-code2 654321
```

### 4. Regular Access Key Rotation
```bash
# Create new access key
aws iam create-access-key --user-name username

# Delete old access key
aws iam delete-access-key --user-name username --access-key-id AKIAIOSFODNN7EXAMPLE
```

## Network Security

### 1. VPC Configuration
```yaml
# Secure VPC setup
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true

  PrivateSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true

  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Secure security group
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 10.0.0.0/16  # Only from VPC
```

### 2. Security Groups Best Practices
- Use descriptive names and descriptions
- Follow least privilege principle
- Avoid 0.0.0.0/0 for SSH access
- Use security group references instead of IP ranges
- Regular audit and cleanup

### 3. Network ACLs
```yaml
NetworkAcl:
  Type: AWS::EC2::NetworkAcl
  Properties:
    VpcId: !Ref VPC

NetworkAclEntryInbound:
  Type: AWS::EC2::NetworkAclEntry
  Properties:
    NetworkAclId: !Ref NetworkAcl
    RuleNumber: 100
    Protocol: 6
    RuleAction: allow
    PortRange:
      From: 443
      To: 443
    CidrBlock: 0.0.0.0/0
```

## Data Encryption

### 1. Encryption at Rest
```yaml
# S3 bucket with encryption
S3Bucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: aws:kms
            KMSMasterKeyID: !Ref KMSKey
          BucketKeyEnabled: true

# RDS with encryption
RDSInstance:
  Type: AWS::RDS::DBInstance
  Properties:
    StorageEncrypted: true
    KmsKeyId: !Ref KMSKey
```

### 2. Encryption in Transit
```yaml
# Application Load Balancer with SSL
LoadBalancer:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Type: application
    Scheme: internet-facing
    Subnets:
      - !Ref PublicSubnet1
      - !Ref PublicSubnet2

Listener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    LoadBalancerArn: !Ref LoadBalancer
    Port: 443
    Protocol: HTTPS
    Certificates:
      - CertificateArn: !Ref SSLCertificate
    DefaultActions:
      - Type: forward
        TargetGroupArn: !Ref TargetGroup
```

## Secrets Management

### 1. AWS Secrets Manager
```python
import boto3
import json

def get_secret():
    secret_name = "prod/myapp/db"
    region_name = "us-east-1"
    
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    
    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        raise e
    
    secret = get_secret_value_response['SecretString']
    return json.loads(secret)

# Usage
db_credentials = get_secret()
database_url = f"postgresql://{db_credentials['username']}:{db_credentials['password']}@{db_credentials['host']}:{db_credentials['port']}/{db_credentials['dbname']}"
```

### 2. Parameter Store
```bash
# Store parameter
aws ssm put-parameter \
    --name "/myapp/database/password" \
    --value "MySecretPassword" \
    --type "SecureString" \
    --key-id "alias/aws/ssm"

# Retrieve parameter
aws ssm get-parameter \
    --name "/myapp/database/password" \
    --with-decryption
```

## Monitoring and Compliance

### 1. AWS CloudTrail
```yaml
CloudTrail:
  Type: AWS::CloudTrail::Trail
  Properties:
    TrailName: security-audit-trail
    S3BucketName: !Ref LoggingBucket
    IncludeGlobalServiceEvents: true
    IsMultiRegionTrail: true
    EnableLogFileValidation: true
    EventSelectors:
      - ReadWriteType: All
        IncludeManagementEvents: true
        DataResources:
          - Type: "AWS::S3::Object"
            Values: 
              - "arn:aws:s3:::sensitive-bucket/*"
```

### 2. AWS Config
```yaml
ConfigurationRecorder:
  Type: AWS::Config::ConfigurationRecorder
  Properties:
    Name: security-config-recorder
    RoleARN: !GetAtt ConfigRole.Arn
    RecordingGroup:
      AllSupported: true
      IncludeGlobalResourceTypes: true

ConfigRule:
  Type: AWS::Config::ConfigRule
  Properties:
    ConfigRuleName: s3-bucket-public-access-prohibited
    Source:
      Owner: AWS
      SourceIdentifier: S3_BUCKET_PUBLIC_ACCESS_PROHIBITED
```

### 3. AWS Security Hub
```bash
# Enable Security Hub
aws securityhub enable-security-hub

# Enable standards
aws securityhub batch-enable-standards \
    --standards-subscription-requests StandardsArn=arn:aws:securityhub:::ruleset/finding-format/aws-foundational-security-standard/v/1.0.0
```

## Security Automation

### 1. Lambda Function for Security Response
```python
import boto3
import json

def lambda_handler(event, context):
    # Parse CloudWatch Event
    detail = event['detail']
    
    if detail['eventName'] == 'CreateUser':
        # Automatically attach MFA policy to new users
        iam = boto3.client('iam')
        username = detail['responseElements']['user']['userName']
        
        iam.attach_user_policy(
            UserName=username,
            PolicyArn='arn:aws:iam::aws:policy/IAMUserChangePassword'
        )
    
    return {
        'statusCode': 200,
        'body': json.dumps('Security automation executed')
    }
```

### 2. Security Group Auto-Remediation
```python
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    
    # Check for security groups with 0.0.0.0/0 SSH access
    security_groups = ec2.describe_security_groups()
    
    for sg in security_groups['SecurityGroups']:
        for rule in sg['IpPermissions']:
            if (rule.get('FromPort') == 22 and 
                any(ip_range['CidrIp'] == '0.0.0.0/0' for ip_range in rule.get('IpRanges', []))):
                
                # Remove the dangerous rule
                ec2.revoke_security_group_ingress(
                    GroupId=sg['GroupId'],
                    IpPermissions=[rule]
                )
                
                print(f"Removed SSH access from 0.0.0.0/0 in {sg['GroupId']}")
```

## Incident Response

### 1. Security Incident Response Plan
1. **Detection**: CloudWatch, GuardDuty, Security Hub
2. **Analysis**: CloudTrail logs, VPC Flow Logs
3. **Containment**: Security group updates, IAM policy changes
4. **Eradication**: Remove malicious resources
5. **Recovery**: Restore from backups, update configurations
6. **Lessons Learned**: Update security policies

### 2. AWS GuardDuty Integration
```yaml
GuardDutyDetector:
  Type: AWS::GuardDuty::Detector
  Properties:
    Enable: true
    FindingPublishingFrequency: FIFTEEN_MINUTES

GuardDutyThreatIntelSet:
  Type: AWS::GuardDuty::ThreatIntelSet
  Properties:
    Activate: true
    DetectorId: !Ref GuardDutyDetector
    Format: TXT
    Location: s3://my-threat-intel-bucket/threat-intel.txt
    Name: CustomThreatIntelSet
```

## Compliance and Auditing

### 1. CIS Benchmarks
- Implement CIS AWS Foundations Benchmark
- Regular compliance scanning
- Automated remediation where possible

### 2. SOC 2 Compliance
- Document security controls
- Regular penetration testing
- Access logging and monitoring
- Data encryption requirements

### 3. GDPR Compliance
- Data encryption
- Data retention policies
- Right to deletion implementation
- Data processing agreements

## Security Tools and Services

### 1. AWS Inspector
- Automated security assessments
- Vulnerability scanning
- Compliance checking

### 2. AWS Macie
- Data discovery and classification
- Sensitive data protection
- Privacy compliance

### 3. AWS Shield
- DDoS protection
- Advanced threat protection
- 24/7 support for enterprise

## Best Practices Checklist

- [ ] Enable MFA for all users
- [ ] Use IAM roles instead of access keys
- [ ] Implement least privilege access
- [ ] Enable CloudTrail logging
- [ ] Configure VPC with private subnets
- [ ] Use encryption at rest and in transit
- [ ] Implement security monitoring
- [ ] Regular security assessments
- [ ] Incident response plan in place
- [ ] Regular backup and recovery testing