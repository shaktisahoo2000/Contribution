# Infrastructure as Code (IaC) on AWS

## Overview
Infrastructure as Code (IaC) enables you to provision and manage AWS resources using code instead of manual processes. This approach provides consistency, repeatability, and version control for your infrastructure.

## AWS IaC Services

### 1. AWS CloudFormation
- Native AWS service for IaC
- JSON/YAML templates
- Stack-based resource management
- Built-in rollback capabilities

### 2. AWS CDK (Cloud Development Kit)
- High-level programming languages (TypeScript, Python, Java, C#)
- Object-oriented abstractions
- Synthesizes to CloudFormation
- Rich ecosystem of constructs

### 3. Terraform (Third-party)
- Provider for AWS resources
- HCL (HashiCorp Configuration Language)
- State management
- Multi-cloud support

## CloudFormation Examples

### 1. Basic VPC Template
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Basic VPC with public and private subnets'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

  VpcCidr:
    Type: String
    Default: 10.0.0.0/16
    Description: CIDR block for VPC

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-vpc'

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-igw'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-subnet-1'

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-private-subnet-1'

  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-rt'

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnetRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

Outputs:
  VpcId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${Environment}-vpc-id'

  PublicSubnetId:
    Description: Public Subnet ID
    Value: !Ref PublicSubnet1
    Export:
      Name: !Sub '${Environment}-public-subnet-id'

  PrivateSubnetId:
    Description: Private Subnet ID
    Value: !Ref PrivateSubnet1
    Export:
      Name: !Sub '${Environment}-private-subnet-id'
```

### 2. EC2 Instance with Security Group
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'EC2 instance with security group'

Parameters:
  InstanceType:
    Type: String
    Default: t3.micro
    AllowedValues: [t3.micro, t3.small, t3.medium]

  KeyPairName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair for SSH access

  Environment:
    Type: String
    Default: dev

Resources:
  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for web server
      VpcId: !ImportValue
        Fn::Sub: '${Environment}-vpc-id'
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 10.0.0.0/16
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web-sg'

  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0abcdef1234567890  # Amazon Linux 2
      InstanceType: !Ref InstanceType
      KeyName: !Ref KeyPairName
      SecurityGroupIds:
        - !Ref SecurityGroup
      SubnetId: !ImportValue
        Fn::Sub: '${Environment}-public-subnet-id'
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          yum update -y
          yum install -y httpd
          systemctl start httpd
          systemctl enable httpd
          echo "<h1>Hello from ${Environment} environment</h1>" > /var/www/html/index.html
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web-server'

Outputs:
  InstanceId:
    Description: EC2 Instance ID
    Value: !Ref EC2Instance

  PublicIP:
    Description: Public IP address
    Value: !GetAtt EC2Instance.PublicIp

  PublicDNS:
    Description: Public DNS name
    Value: !GetAtt EC2Instance.PublicDnsName
```

## AWS CDK Examples

### 1. CDK Stack in TypeScript
```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class WebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'WebAppVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'WebAppCluster', {
      vpc: vpc,
      clusterName: 'web-app-cluster',
    });

    // Create Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'WebAppALB', {
      vpc: vpc,
      internetFacing: true,
    });

    // Create Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'WebAppTask', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    taskDefinition.addContainer('web-container', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),
      portMappings: [
        {
          containerPort: 80,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'web-app',
      }),
    });

    // Create ECS Service
    const service = new ecs.FargateService(this, 'WebAppService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 2,
      assignPublicIp: false,
    });

    // Create Target Group and Listener
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'WebAppTargetGroup', {
      port: 80,
      vpc: vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/',
      },
    });

    const listener = alb.addListener('WebAppListener', {
      port: 80,
      defaultTargetGroups: [targetGroup],
    });

    // Attach the service to the target group
    service.attachToApplicationTargetGroup(targetGroup);

    // Output the load balancer URL
    new cdk.CfnOutput(this, 'LoadBalancerURL', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'URL of the load balancer',
    });
  }
}
```

### 2. CDK App Entry Point
```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebAppStack } from '../lib/webapp-stack';

const app = new cdk.App();

new WebAppStack(app, 'WebAppStack-Dev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  tags: {
    Environment: 'development',
    Project: 'webapp',
  },
});

new WebAppStack(app, 'WebAppStack-Prod', {
  env: {
    account: '123456789012',
    region: 'us-east-1',
  },
  tags: {
    Environment: 'production',
    Project: 'webapp',
  },
});
```

## Terraform Examples

### 1. Basic AWS Provider Configuration
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "my-terraform-state-bucket"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}
```

### 2. VPC Module
```hcl
# variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}
```

## Best Practices

### 1. Template Organization
```
infrastructure/
├── cloudformation/
│   ├── templates/
│   │   ├── vpc.yaml
│   │   ├── security-groups.yaml
│   │   └── applications/
│   │       ├── web-app.yaml
│   │       └── database.yaml
│   └── parameters/
│       ├── dev.json
│       ├── staging.json
│       └── prod.json
├── cdk/
│   ├── lib/
│   │   ├── vpc-stack.ts
│   │   ├── security-stack.ts
│   │   └── app-stack.ts
│   ├── bin/
│   │   └── app.ts
│   └── test/
└── terraform/
    ├── modules/
    │   ├── vpc/
    │   ├── security-groups/
    │   └── applications/
    ├── environments/
    │   ├── dev/
    │   ├── staging/
    │   └── prod/
    └── shared/
```

### 2. Parameter Management
```yaml
# CloudFormation Parameters file
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "dev"
  },
  {
    "ParameterKey": "InstanceType",
    "ParameterValue": "t3.micro"
  },
  {
    "ParameterKey": "KeyPairName",
    "ParameterValue": "dev-keypair"
  }
]
```

### 3. Stack Deployment Scripts
```bash
#!/bin/bash
# deploy-stack.sh

ENVIRONMENT=$1
STACK_NAME="webapp-${ENVIRONMENT}"
TEMPLATE_FILE="templates/web-app.yaml"
PARAMETERS_FILE="parameters/${ENVIRONMENT}.json"

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment>"
    echo "Example: $0 dev"
    exit 1
fi

echo "Deploying ${STACK_NAME} stack..."

aws cloudformation deploy \
    --template-file ${TEMPLATE_FILE} \
    --stack-name ${STACK_NAME} \
    --parameter-overrides file://${PARAMETERS_FILE} \
    --capabilities CAPABILITY_IAM \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "Stack deployed successfully!"
else
    echo "Stack deployment failed!"
    exit 1
fi
```

### 4. Resource Tagging Strategy
```yaml
# Consistent tagging across all resources
Tags:
  - Key: Environment
    Value: !Ref Environment
  - Key: Project
    Value: !Ref ProjectName
  - Key: Owner
    Value: !Ref OwnerTeam
  - Key: CostCenter
    Value: !Ref CostCenter
  - Key: BackupRequired
    Value: !Ref BackupRequired
  - Key: ManagedBy
    Value: CloudFormation
```

## CI/CD Integration

### 1. GitHub Actions for CloudFormation
```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Deploy CloudFormation stack
        run: |
          aws cloudformation deploy \
            --template-file infrastructure/templates/web-app.yaml \
            --stack-name webapp-prod \
            --parameter-overrides file://infrastructure/parameters/prod.json \
            --capabilities CAPABILITY_IAM
```

### 2. CDK Pipeline
```typescript
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

export class CdkPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, 'CdkPipeline', {
      pipelineName: 'cdk-deployment-pipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: 'your-username',
              repo: 'your-repo',
              branch: 'main',
              oauthToken: cdk.SecretValue.secretsManager('github-token'),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Build',
              project: new codebuild.PipelineProject(this, 'CdkBuild', {
                buildSpec: codebuild.BuildSpec.fromObject({
                  version: '0.2',
                  phases: {
                    install: {
                      'runtime-versions': {
                        nodejs: '18',
                      },
                      commands: [
                        'npm install -g aws-cdk',
                        'npm install',
                      ],
                    },
                    build: {
                      commands: [
                        'npm run build',
                        'cdk deploy --require-approval never',
                      ],
                    },
                  },
                }),
              }),
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });
  }
}
```

## Testing and Validation

### 1. CloudFormation Template Validation
```bash
# Validate template syntax
aws cloudformation validate-template --template-body file://template.yaml

# Lint with cfn-lint
pip install cfn-lint
cfn-lint template.yaml

# Security scanning with cfn-nag
gem install cfn-nag
cfn_nag_scan --input-path template.yaml
```

### 2. CDK Unit Testing
```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { WebAppStack } from '../lib/webapp-stack';
import * as cdk from 'aws-cdk-lib';

test('VPC Created', () => {
  const app = new cdk.App();
  const stack = new WebAppStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '10.0.0.0/16',
  });
});

test('Load Balancer Created', () => {
  const app = new cdk.App();
  const stack = new WebAppStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
});
```

### 3. Terraform Testing
```hcl
# test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVpcCreation(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../",
        Vars: map[string]interface{}{
            "environment": "test",
            "vpc_cidr":    "10.0.0.0/16",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)
}
```

## Cost Optimization

### 1. Resource Lifecycle Management
```yaml
# Auto-scaling group with lifecycle hooks
AutoScalingGroup:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MinSize: 1
    MaxSize: 10
    DesiredCapacity: 2
    HealthCheckType: ELB
    HealthCheckGracePeriod: 300
    Tags:
      - Key: Name
        Value: !Sub '${Environment}-asg'
        PropagateAtLaunch: true
```

### 2. Cost Allocation Tags
```yaml
Tags:
  - Key: CostCenter
    Value: !Ref CostCenter
  - Key: Project
    Value: !Ref ProjectName
  - Key: Environment
    Value: !Ref Environment
  - Key: Owner
    Value: !Ref OwnerEmail
```

## Troubleshooting

### 1. Common CloudFormation Issues
- **Stack rollback**: Check CloudWatch Events and CloudTrail
- **Resource dependencies**: Use DependsOn or Ref functions
- **IAM permissions**: Ensure proper policies for CloudFormation service role

### 2. CDK Common Issues
- **Bootstrap issues**: Run `cdk bootstrap` for each account/region
- **Version mismatches**: Keep CDK CLI and library versions aligned
- **Asset bundling**: Check Docker availability for bundling

### 3. Terraform Common Issues
- **State file conflicts**: Use remote state with locking
- **Provider version issues**: Pin provider versions
- **Resource drift**: Use `terraform plan` to detect changes