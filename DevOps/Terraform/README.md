# Terraform Complete Guide 🏗️

## Table of Contents
1. [Introduction](#introduction)
2. [Installation and Setup](#installation-and-setup)
3. [Basic Concepts](#basic-concepts)
4. [Configuration Language](#configuration-language)
5. [Providers and Resources](#providers-and-resources)
6. [State Management](#state-management)
7. [Modules](#modules)
8. [Variables and Outputs](#variables-and-outputs)
9. [Remote Backends](#remote-backends)
10. [Best Practices](#best-practices)
11. [Advanced Features](#advanced-features)
12. [Multi-Cloud Examples](#multi-cloud-examples)
13. [Testing and Validation](#testing-and-validation)
14. [Troubleshooting](#troubleshooting)

## Introduction

Terraform is an open-source Infrastructure as Code (IaC) tool created by HashiCorp. It allows you to define, provision, and manage infrastructure using a declarative configuration language called HashiCorp Configuration Language (HCL).

### Why Terraform?
- **Infrastructure as Code**: Version control your infrastructure
- **Multi-Cloud Support**: Works with AWS, Azure, GCP, and 3000+ providers
- **Declarative Syntax**: Describe what you want, not how to get there
- **Plan and Apply**: Preview changes before applying them
- **State Management**: Tracks resource relationships and dependencies
- **Extensible**: Custom providers and modules

### Key Benefits
- **Reproducible Infrastructure**: Consistent environments across stages
- **Collaboration**: Team-friendly with remote state and locking
- **Change Management**: Track infrastructure changes over time
- **Cost Optimization**: Manage resources efficiently
- **Compliance**: Enforce policies and standards

## Installation and Setup

### Windows Installation
```powershell
# Using Chocolatey
choco install terraform

# Using Scoop
scoop install terraform

# Manual installation
# 1. Download from https://www.terraform.io/downloads.html
# 2. Extract to a directory in your PATH
# 3. Verify installation
terraform version
```

### Linux Installation
```bash
# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# CentOS/RHEL
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo yum -y install terraform

# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify installation
terraform version
```

### IDE Setup
```bash
# VS Code Extensions
code --install-extension hashicorp.terraform
code --install-extension ms-vscode.vscode-json

# Vim/Neovim
git clone https://github.com/hashivim/vim-terraform.git ~/.vim/pack/plugins/start/vim-terraform
```

## Basic Concepts

### Core Workflow
```bash
# 1. Write configuration
terraform init    # Initialize working directory
terraform plan     # Preview changes
terraform apply    # Apply changes
terraform destroy  # Destroy resources
```

### Configuration Structure
```
project/
├── main.tf              # Primary configuration
├── variables.tf         # Input variables
├── outputs.tf          # Output values
├── terraform.tfvars    # Variable values
├── versions.tf         # Provider requirements
├── locals.tf           # Local values
└── modules/            # Custom modules
    └── vpc/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### Basic Example
```hcl
# main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  
  tags = {
    Name        = "WebServer"
    Environment = var.environment
  }
}
```

## Configuration Language

### Resources
```hcl
# Basic resource syntax
resource "resource_type" "resource_name" {
  argument1 = "value1"
  argument2 = "value2"
  
  nested_block {
    nested_argument = "nested_value"
  }
}

# Example: AWS S3 Bucket
resource "aws_s3_bucket" "website" {
  bucket = "my-website-bucket-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}
```

### Data Sources
```hcl
# Fetch existing resources
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Use in resource
resource "aws_instance" "web" {
  ami               = data.aws_ami.ubuntu.id
  availability_zone = data.aws_availability_zones.available.names[0]
  instance_type     = "t3.micro"
}
```

### Variables
```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Instance type must be t3.micro, t3.small, or t3.medium."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "vpc_config" {
  description = "VPC configuration"
  type = object({
    cidr_block           = string
    enable_dns_hostnames = bool
    enable_dns_support   = bool
  })
  default = {
    cidr_block           = "10.0.0.0/16"
    enable_dns_hostnames = true
    enable_dns_support   = true
  }
}

variable "subnet_configs" {
  description = "List of subnet configurations"
  type = list(object({
    name              = string
    cidr_block        = string
    availability_zone = string
    public            = bool
  }))
  default = [
    {
      name              = "public-1"
      cidr_block        = "10.0.1.0/24"
      availability_zone = "us-west-2a"
      public            = true
    },
    {
      name              = "private-1"
      cidr_block        = "10.0.2.0/24"
      availability_zone = "us-west-2a"
      public            = false
    }
  ]
}
```

### Outputs
```hcl
# outputs.tf
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.web.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.web.public_ip
  sensitive   = false
}

output "instance_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = aws_instance.web.private_ip
}

output "vpc_info" {
  description = "VPC information"
  value = {
    vpc_id             = aws_vpc.main.id
    vpc_cidr_block     = aws_vpc.main.cidr_block
    subnet_ids         = [for subnet in aws_subnet.main : subnet.id]
    availability_zones = [for subnet in aws_subnet.main : subnet.availability_zone]
  }
}
```

### Locals
```hcl
# locals.tf
locals {
  common_tags = {
    Environment = var.environment
    Project     = "my-project"
    ManagedBy   = "terraform"
    CreatedAt   = timestamp()
  }
  
  vpc_name = "${var.environment}-vpc"
  
  subnet_configs = {
    for subnet in var.subnet_configs : subnet.name => subnet
  }
  
  # Conditional logic
  instance_count = var.environment == "prod" ? 3 : 1
  
  # String interpolation
  bucket_name = "my-app-${var.environment}-${random_id.bucket_suffix.hex}"
}

# Using locals
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_config.cidr_block
  enable_dns_hostnames = var.vpc_config.enable_dns_hostnames
  enable_dns_support   = var.vpc_config.enable_dns_support
  
  tags = merge(local.common_tags, {
    Name = local.vpc_name
  })
}
```

## Providers and Resources

### Provider Configuration
```hcl
# versions.tf
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Multiple provider configurations
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      ManagedBy = "terraform"
      Project   = "my-project"
    }
  }
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

provider "aws" {
  alias  = "east"
  region = "us-east-1"
}

# Using provider aliases
resource "aws_instance" "west" {
  provider      = aws.west
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}

resource "aws_instance" "east" {
  provider      = aws.east
  ami           = "ami-87654321"
  instance_type = "t3.micro"
}
```

### Resource Meta-Arguments
```hcl
# Count
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  tags = {
    Name = "web-${count.index + 1}"
  }
}

# For_each with map
resource "aws_subnet" "main" {
  for_each = local.subnet_configs
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone
  
  map_public_ip_on_launch = each.value.public
  
  tags = merge(local.common_tags, {
    Name = "${var.environment}-${each.key}"
    Type = each.value.public ? "public" : "private"
  })
}

# For_each with set
resource "aws_security_group_rule" "ingress" {
  for_each = toset(["80", "443", "22"])
  
  type              = "ingress"
  from_port         = each.value
  to_port           = each.value
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.web.id
}

# Depends_on
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  depends_on = [
    aws_internet_gateway.main,
    aws_security_group.web
  ]
}

# Lifecycle
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
    ignore_changes       = [ami, tags]
  }
}
```

## State Management

### Understanding State
```bash
# View state
terraform show
terraform state list
terraform state show aws_instance.web

# State manipulation (use with caution)
terraform state mv aws_instance.old aws_instance.new
terraform state rm aws_instance.unused
terraform import aws_instance.existing i-1234567890abcdef0

# State refresh
terraform refresh
```

### State Configuration
```hcl
# Local state (default)
# terraform.tfstate file in current directory

# Remote state configuration
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

### State Best Practices
```hcl
# Use remote backend
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "${var.environment}/${var.project}/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    
    # Additional security
    kms_key_id = "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"
  }
}

# State locking table
resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "terraform-state-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name = "Terraform State Lock Table"
  }
}
```

## Modules

### Module Structure
```
modules/
└── vpc/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── README.md
```

### Creating a VPC Module
```hcl
# modules/vpc/variables.tf
variable "name" {
  description = "Name prefix for VPC resources"
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway for all private subnets"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/vpc/main.tf
# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(var.tags, {
    Name = "${var.name}-vpc"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(var.tags, {
    Name = "${var.name}-igw"
  })
}

# Public Subnets
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)
  
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(var.tags, {
    Name = "${var.name}-public-${count.index + 1}"
    Type = "public"
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]
  
  tags = merge(var.tags, {
    Name = "${var.name}-private-${count.index + 1}"
    Type = "private"
  })
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.private_subnet_cidrs)) : 0
  
  domain = "vpc"
  
  depends_on = [aws_internet_gateway.main]
  
  tags = merge(var.tags, {
    Name = "${var.name}-nat-eip-${count.index + 1}"
  })
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.private_subnet_cidrs)) : 0
  
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(var.tags, {
    Name = "${var.name}-nat-${count.index + 1}"
  })
  
  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = merge(var.tags, {
    Name = "${var.name}-public-rt"
  })
}

resource "aws_route_table" "private" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.private_subnet_cidrs)) : 1
  
  vpc_id = aws_vpc.main.id
  
  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[var.single_nat_gateway ? 0 : count.index].id
    }
  }
  
  tags = merge(var.tags, {
    Name = "${var.name}-private-rt-${count.index + 1}"
  })
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)
  
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)
  
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.single_nat_gateway ? 0 : count.index].id
}

# VPC Endpoints (optional)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${data.aws_region.current.name}.s3"
  
  tags = merge(var.tags, {
    Name = "${var.name}-s3-endpoint"
  })
}

data "aws_region" "current" {}
```

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "IDs of the private route tables"
  value       = aws_route_table.private[*].id
}
```

### Using the Module
```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  
  name               = "my-project"
  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
  
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  
  enable_nat_gateway  = true
  single_nat_gateway  = false
  
  tags = {
    Environment = "production"
    Project     = "my-project"
  }
}

# Use module outputs
resource "aws_security_group" "web" {
  name_prefix = "web-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Remote Backends

### S3 Backend with State Locking
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "environments/production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
    
    # Optional: KMS encryption
    kms_key_id = "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"
  }
}

# Create S3 bucket for state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state-bucket"
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Azure Backend
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "terraformstatestg"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

### Google Cloud Backend
```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "terraform/state"
  }
}
```

## Best Practices

### Directory Structure
```
project/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── prod/
├── modules/
│   ├── vpc/
│   ├── compute/
│   └── database/
├── shared/
│   ├── data.tf
│   └── locals.tf
└── scripts/
    ├── deploy.sh
    └── validate.sh
```

### Environment Management
```hcl
# environments/dev/terraform.tfvars
environment     = "dev"
instance_type   = "t3.micro"
min_capacity    = 1
max_capacity    = 2
enable_logging  = false
backup_retention = 7

# environments/prod/terraform.tfvars
environment     = "prod"
instance_type   = "t3.large"
min_capacity    = 3
max_capacity    = 10
enable_logging  = true
backup_retention = 30
```

### Naming Conventions
```hcl
# Use consistent naming
locals {
  name_prefix = "${var.project}-${var.environment}"
  
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.owner
    CostCenter  = var.cost_center
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-server"
    Role = "web"
  })
}
```

### Resource Organization
```hcl
# Group related resources
# networking.tf
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public" { ... }
resource "aws_subnet" "private" { ... }
resource "aws_internet_gateway" "main" { ... }
resource "aws_nat_gateway" "main" { ... }

# compute.tf
resource "aws_launch_template" "web" { ... }
resource "aws_autoscaling_group" "web" { ... }
resource "aws_load_balancer" "web" { ... }

# database.tf
resource "aws_db_instance" "main" { ... }
resource "aws_db_subnet_group" "main" { ... }

# security.tf
resource "aws_security_group" "web" { ... }
resource "aws_security_group" "database" { ... }
resource "aws_iam_role" "ec2" { ... }
```

### Data Validation
```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  
  validation {
    condition = can(regex("^[tm][0-9][anx]?\\.(nano|micro|small|medium|large|xlarge|[0-9]+xlarge)$", var.instance_type))
    error_message = "Instance type must be a valid EC2 instance type."
  }
}

variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string
  
  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "CIDR block must be a valid IPv4 CIDR."
  }
}
```

## Advanced Features

### Dynamic Blocks
```hcl
resource "aws_security_group" "web" {
  name_prefix = "web-"
  vpc_id      = module.vpc.vpc_id
  
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }
  
  dynamic "egress" {
    for_each = var.egress_rules
    content {
      from_port   = egress.value.from_port
      to_port     = egress.value.to_port
      protocol    = egress.value.protocol
      cidr_blocks = egress.value.cidr_blocks
      description = egress.value.description
    }
  }
}

variable "ingress_rules" {
  description = "List of ingress rules"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    }
  ]
}
```

### Conditional Resources
```hcl
# Create resource only in production
resource "aws_cloudwatch_log_group" "app" {
  count             = var.environment == "prod" ? 1 : 0
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 30
}

# Use conditional expressions
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.environment == "prod" ? "t3.large" : "t3.micro"
  
  monitoring = var.environment == "prod" ? true : false
  
  root_block_device {
    volume_size = var.environment == "prod" ? 100 : 20
    volume_type = var.environment == "prod" ? "gp3" : "gp2"
  }
}
```

### Function Usage
```hcl
locals {
  # String functions
  vpc_name = upper("${var.project}-${var.environment}-vpc")
  
  # Collection functions
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Encoding functions
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    app_name = var.app_name
    region   = var.aws_region
  }))
  
  # Date and time functions
  timestamp = formatdate("YYYY-MM-DD-hhmm", timestamp())
  
  # Hash and crypto functions
  bucket_suffix = substr(sha256("${var.project}-${var.environment}"), 0, 8)
  
  # IP network functions
  subnet_cidrs = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i)]
  
  # Type conversion functions
  port_list = [for port in split(",", var.allowed_ports) : tonumber(port)]
}

# Template file usage
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  user_data     = local.user_data
}
```

### Workspaces
```bash
# Create and use workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch workspaces
terraform workspace select dev
terraform workspace list
terraform workspace show

# Use workspace in configuration
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t3.micro"
  
  tags = {
    Name        = "web-${terraform.workspace}"
    Environment = terraform.workspace
  }
}
```

## Testing and Validation

### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.81.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
      - id: terraform_tflint
      - id: terragrunt_fmt
      - id: terraform_tfsec
```

### Validation Scripts
```bash
#!/bin/bash
# scripts/validate.sh

set -e

echo "🔍 Validating Terraform configuration..."

# Format check
echo "📝 Checking format..."
terraform fmt -check -recursive

# Validation
echo "✅ Validating configuration..."
terraform validate

# Security scan
echo "🔒 Running security scan..."
tfsec .

# Lint check
echo "🧹 Running lint check..."
tflint

# Plan check
echo "📋 Creating plan..."
terraform plan -detailed-exitcode

echo "✅ All validation checks passed!"
```

### Testing with Terratest
```go
// test/vpc_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPCCreation(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/vpc",
        Vars: map[string]interface{}{
            "name":        "test",
            "cidr_block":  "10.0.0.0/16",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcId := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcId)
}
```

## Troubleshooting

### Common Issues and Solutions

1. **State Lock Issues**
```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>

# Check lock status
aws dynamodb get-item --table-name terraform-state-lock --key '{"LockID":{"S":"bucket/path/terraform.tfstate"}}'
```

2. **Resource Import**
```bash
# Import existing resource
terraform import aws_instance.web i-1234567890abcdef0

# Generate configuration for imported resources
terraform show -no-color > imported.tf
```

3. **State Drift Detection**
```bash
# Detect configuration drift
terraform plan -detailed-exitcode

# Refresh state
terraform refresh

# Show current state
terraform show
```

4. **Debugging**
```bash
# Enable debug logging
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log

# Trace mode
export TF_LOG=TRACE

# Provider debugging
export TF_LOG_PROVIDER=DEBUG
```

### Error Handling
```hcl
# Use try() function for error handling
locals {
  instance_type = try(var.instance_types[var.environment], "t3.micro")
  
  # Handle missing values
  vpc_id = try(data.aws_vpc.existing.id, aws_vpc.new[0].id)
}

# Conditional resource creation
resource "aws_vpc" "new" {
  count      = var.create_vpc ? 1 : 0
  cidr_block = var.vpc_cidr
}

data "aws_vpc" "existing" {
  count = var.create_vpc ? 0 : 1
  id    = var.existing_vpc_id
}
```

### Performance Optimization
```bash
# Parallel resource creation
terraform apply -parallelism=20

# Target specific resources
terraform apply -target=aws_instance.web

# Refresh only specific resources
terraform refresh -target=aws_instance.web

# Use selective planning
terraform plan -target=module.vpc
```

## Resources and Tools

### Essential Tools
- **TFLint**: Terraform linter
- **TFSec**: Security scanner
- **Terraform Docs**: Documentation generator
- **Terragrunt**: Terraform wrapper
- **Atlantis**: Pull request automation
- **Infracost**: Cost estimation

### Useful Commands
```bash
# Show providers and versions
terraform providers

# Show terraform and provider versions
terraform version

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Show plan in JSON format
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan

# Graph visualization
terraform graph | dot -Tpng > graph.png
```

## Resources

- [Official Terraform Documentation](https://www.terraform.io/docs/)
- [Terraform Registry](https://registry.terraform.io/)
- [Best Practices Guide](https://cloud.google.com/docs/terraform/best-practices)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Module Structure](https://www.terraform.io/docs/modules/structure.html)

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.