# Jenkins Complete Guide 🔧

## Table of Contents
1. [Introduction](#introduction)
2. [Installation and Setup](#installation-and-setup)
3. [Basic Concepts](#basic-concepts)
4. [Pipeline Creation](#pipeline-creation)
5. [Advanced Pipelines](#advanced-pipelines)
6. [Plugin Management](#plugin-management)
7. [Security Configuration](#security-configuration)
8. [Distributed Builds](#distributed-builds)
9. [Integration Examples](#integration-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Introduction

Jenkins is an open-source automation server that enables developers to reliably build, test, and deploy their software. It supports continuous integration and continuous delivery (CI/CD) through an extensive plugin ecosystem.

### Why Jenkins?
- **Extensible**: 1800+ plugins in the Update Center
- **Easy Installation**: Available on all major platforms
- **Configuration as Code**: Pipeline as Code with Jenkinsfile
- **Distributed Builds**: Master-slave architecture
- **Community Support**: Large active community

## Installation and Setup

### Docker Installation (Recommended)
```bash
# Pull Jenkins LTS image
docker pull jenkins/jenkins:lts

# Run Jenkins container
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts

# Get initial admin password
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - JENKINS_OPTS="--httpPort=8080"
      - JAVA_OPTS="-Xmx2048m -Djava.awt.headless=true"

  jenkins-agent:
    image: jenkins/ssh-agent:alpine
    container_name: jenkins-agent
    restart: unless-stopped
    environment:
      - JENKINS_AGENT_SSH_PUBKEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."

volumes:
  jenkins_data:
    driver: local
```

### Kubernetes Installation
```yaml
# jenkins-k8s.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jenkins
  namespace: jenkins
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jenkins
  template:
    metadata:
      labels:
        app: jenkins
    spec:
      containers:
      - name: jenkins
        image: jenkins/jenkins:lts
        ports:
        - containerPort: 8080
        - containerPort: 50000
        volumeMounts:
        - name: jenkins-data
          mountPath: /var/jenkins_home
        env:
        - name: JAVA_OPTS
          value: "-Xmx2048m -Djava.awt.headless=true"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: jenkins-data
        persistentVolumeClaim:
          claimName: jenkins-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: jenkins-service
  namespace: jenkins
spec:
  selector:
    app: jenkins
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: agent
    port: 50000
    targetPort: 50000
  type: LoadBalancer
```

### Traditional Installation (Linux)
```bash
# Ubuntu/Debian
wget -q -O - https://pkg.jenkins.io/debian/jenkins.io.key | sudo apt-key add -
sudo sh -c 'echo deb http://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt update
sudo apt install jenkins

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# CentOS/RHEL
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
sudo yum install jenkins

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

## Basic Concepts

### Jenkins Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Developer     │───▶│   Jenkins       │───▶│   Deployment    │
│   Commits       │    │   Master        │    │   Server        │
└─────────────────┘    └─────────┬───────┘    └─────────────────┘
                                 │
                     ┌───────────┼───────────┐
                     │           │           │
              ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────┐
              │   Agent 1   │ │ Agent 2 │ │ Agent 3 │
              │   (Linux)   │ │ (Win)   │ │ (Mac)   │
              └─────────────┘ └─────────┘ └─────────┘
```

### Job Types
1. **Freestyle Project**: Basic job type with GUI configuration
2. **Pipeline**: Code-based job definition using Groovy DSL
3. **Multi-branch Pipeline**: Automatically creates pipelines for branches
4. **Multijob Project**: Orchestrates multiple jobs
5. **External Job**: Monitors external process execution

### Build Triggers
- **Build Periodically**: Cron-based scheduling
- **Poll SCM**: Check for source code changes
- **GitHub Hook**: Webhook-based triggers
- **Build after other projects**: Dependency-based builds
- **Trigger builds remotely**: API-based triggers

## Pipeline Creation

### Basic Declarative Pipeline
```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '16'
        DOCKER_REGISTRY = 'registry.example.com'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }
        
        stage('Run Tests') {
            steps {
                sh 'npm test'
                publishTestResults testResultsPattern: 'test-results.xml'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Docker Build') {
            steps {
                script {
                    def image = docker.build("${DOCKER_REGISTRY}/myapp:${BUILD_NUMBER}")
                    docker.withRegistry('https://registry.example.com', 'docker-registry-credentials') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh 'kubectl apply -f k8s/staging/ --namespace=staging'
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                sh 'kubectl apply -f k8s/production/ --namespace=production'
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "✅ Pipeline succeeded: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
            )
        }
        failure {
            slackSend(
                channel: '#alerts',
                color: 'danger',
                message: "❌ Pipeline failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
            )
        }
    }
}
```

### Scripted Pipeline Example
```groovy
// Jenkinsfile (Scripted)
node {
    def app
    
    stage('Clone repository') {
        checkout scm
    }
    
    stage('Build image') {
        app = docker.build("myapp:${env.BUILD_ID}")
    }
    
    stage('Test image') {
        app.inside {
            sh 'echo "Tests passed"'
        }
    }
    
    stage('Push image') {
        docker.withRegistry('https://registry.hub.docker.com', 'docker-hub-credentials') {
            app.push("${env.BUILD_NUMBER}")
            app.push("latest")
        }
    }
    
    stage('Deploy') {
        if (env.BRANCH_NAME == 'main') {
            sh 'kubectl set image deployment/myapp myapp=myapp:${BUILD_NUMBER}'
        }
    }
}
```

## Advanced Pipelines

### Multi-stage Pipeline with Parallel Execution
```groovy
pipeline {
    agent none
    
    stages {
        stage('Build') {
            parallel {
                stage('Build on Linux') {
                    agent { label 'linux' }
                    steps {
                        sh 'make build-linux'
                    }
                }
                stage('Build on Windows') {
                    agent { label 'windows' }
                    steps {
                        bat 'make build-windows'
                    }
                }
                stage('Build on macOS') {
                    agent { label 'macos' }
                    steps {
                        sh 'make build-macos'
                    }
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    agent any
                    steps {
                        sh 'npm run test:unit'
                        publishTestResults testResultsPattern: 'reports/unit-tests.xml'
                    }
                }
                stage('Integration Tests') {
                    agent any
                    steps {
                        sh 'npm run test:integration'
                        publishTestResults testResultsPattern: 'reports/integration-tests.xml'
                    }
                }
                stage('E2E Tests') {
                    agent any
                    steps {
                        sh 'npm run test:e2e'
                        publishTestResults testResultsPattern: 'reports/e2e-tests.xml'
                    }
                }
            }
        }
        
        stage('Security Scan') {
            parallel {
                stage('SAST') {
                    agent any
                    steps {
                        sh 'sonar-scanner'
                    }
                }
                stage('Dependency Check') {
                    agent any
                    steps {
                        sh 'npm audit'
                        sh 'safety check'
                    }
                }
                stage('Container Scan') {
                    agent any
                    steps {
                        sh 'trivy image myapp:latest'
                    }
                }
            }
        }
    }
}
```

### Pipeline with Matrix Builds
```groovy
pipeline {
    agent none
    
    stages {
        stage('Build') {
            matrix {
                axes {
                    axis {
                        name 'NODE_VERSION'
                        values '14', '16', '18'
                    }
                    axis {
                        name 'OS'
                        values 'linux', 'windows'
                    }
                }
                excludes {
                    exclude {
                        axis {
                            name 'NODE_VERSION'
                            values '14'
                        }
                        axis {
                            name 'OS'
                            values 'windows'
                        }
                    }
                }
                stages {
                    stage('Build') {
                        agent {
                            label "${OS}"
                        }
                        environment {
                            NODE_VERSION = "${NODE_VERSION}"
                        }
                        steps {
                            script {
                                if (OS == 'windows') {
                                    bat "nvm use ${NODE_VERSION} && npm install && npm run build"
                                } else {
                                    sh "nvm use ${NODE_VERSION} && npm install && npm run build"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
```

### Pipeline with Dynamic Stages
```groovy
pipeline {
    agent any
    
    stages {
        stage('Setup') {
            steps {
                script {
                    // Define services to deploy based on changes
                    def services = []
                    def changes = sh(
                        script: 'git diff --name-only HEAD^ HEAD',
                        returnStdout: true
                    ).trim().split('\n')
                    
                    changes.each { file ->
                        if (file.startsWith('frontend/')) {
                            services.add('frontend')
                        } else if (file.startsWith('backend/')) {
                            services.add('backend')
                        } else if (file.startsWith('api/')) {
                            services.add('api')
                        }
                    }
                    
                    env.SERVICES_TO_DEPLOY = services.unique().join(',')
                }
            }
        }
        
        stage('Dynamic Deployment') {
            steps {
                script {
                    def services = env.SERVICES_TO_DEPLOY.split(',')
                    def deployStages = [:]
                    
                    services.each { service ->
                        deployStages["Deploy ${service}"] = {
                            stage("Deploy ${service}") {
                                sh "kubectl apply -f k8s/${service}/"
                                sh "kubectl rollout status deployment/${service}"
                            }
                        }
                    }
                    
                    parallel deployStages
                }
            }
        }
    }
}
```

## Plugin Management

### Essential Plugins
```groovy
// plugins.txt for Jenkins Docker image
blueocean:1.25.2
pipeline-stage-view:2.25
docker-plugin:1.2.9
kubernetes:3900.va_dce992317b_4
git:4.11.3
github:1.34.3
slack:2.48
email-ext:2.93
build-timeout:1.27
timestamper:1.17
ws-cleanup:0.42
ant:1.13
gradle:1.39
nodejs:1.5.1
docker-build-step:2.8
pipeline-utility-steps:2.13.1
```

### Plugin Installation via CLI
```bash
# Install plugins via Jenkins CLI
java -jar jenkins-cli.jar -s http://localhost:8080/ install-plugin \
  blueocean \
  pipeline-stage-view \
  docker-plugin \
  -restart
```

### Plugin Configuration as Code (JCasC)
```yaml
# jenkins.yaml
jenkins:
  systemMessage: "Jenkins configured automatically by Jenkins Configuration as Code plugin"
  
  globalNodeProperties:
    - envVars:
        env:
          - key: "DOCKER_REGISTRY"
            value: "registry.example.com"
          - key: "KUBERNETES_NAMESPACE"
            value: "production"

  clouds:
    - kubernetes:
        name: "kubernetes"
        serverUrl: "https://kubernetes.default.svc.cluster.local"
        namespace: "jenkins"
        jenkinsUrl: "http://jenkins:8080"
        templates:
          - name: "default"
            namespace: "jenkins"
            label: "jenkins-agent"
            containers:
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"
                resourceRequestMemory: "512Mi"
                resourceRequestCpu: "500m"
                resourceLimitMemory: "1Gi"
                resourceLimitCpu: "1000m"

credentials:
  system:
    domainCredentials:
      - credentials:
          - usernamePassword:
              scope: GLOBAL
              id: "docker-registry"
              username: "admin"
              password: "password"
              description: "Docker Registry Credentials"
          - string:
              scope: GLOBAL
              id: "github-token"
              secret: "ghp_xxxxxxxxxxxxxxxxxxxx"
              description: "GitHub Personal Access Token"

unclassified:
  gitHubPluginConfig:
    configs:
      - name: "GitHub"
        apiUrl: "https://api.github.com"
        credentialsId: "github-token"
  
  slackNotifier:
    baseUrl: "https://hooks.slack.com/services/"
    teamDomain: "mycompany"
    token: "xoxb-xxxxxxxxxxxxx"
```

## Security Configuration

### Authentication Setup
```groovy
// Security realm configuration
import jenkins.model.*
import hudson.security.*
import org.jenkinsci.plugins.GithubSecurityRealm

def instance = Jenkins.getInstance()

// GitHub OAuth
def githubRealm = new GithubSecurityRealm(
    "https://github.com",
    "https://api.github.com",
    "client-id",
    "client-secret",
    "read:org,user:email"
)

instance.setSecurityRealm(githubRealm)

// Authorization strategy
def strategy = new GlobalMatrixAuthorizationStrategy()
strategy.add(Jenkins.ADMINISTER, "admin")
strategy.add(Jenkins.READ, "authenticated")

instance.setAuthorizationStrategy(strategy)
instance.save()
```

### Role-based Security
```groovy
// Role-based authorization
import com.michelin.cio.hudson.plugins.rolestrategy.*
import jenkins.model.*

def instance = Jenkins.getInstance()
def strategy = new RoleBasedAuthorizationStrategy()

// Global roles
def globalRoles = [
    "admin": [
        "hudson.model.Hudson.Administer",
        "hudson.model.Hudson.Read"
    ],
    "developer": [
        "hudson.model.Hudson.Read",
        "hudson.model.Item.Read",
        "hudson.model.Item.Build"
    ],
    "viewer": [
        "hudson.model.Hudson.Read",
        "hudson.model.Item.Read"
    ]
]

globalRoles.each { roleName, permissions ->
    def role = new Role(roleName, permissions as Set)
    strategy.addRole(RoleType.Global, role)
}

// Assign users to roles
strategy.assignRole(RoleType.Global, "admin", "admin-user")
strategy.assignRole(RoleType.Global, "developer", "dev-team")
strategy.assignRole(RoleType.Global, "viewer", "qa-team")

instance.setAuthorizationStrategy(strategy)
instance.save()
```

## Distributed Builds

### Agent Configuration
```groovy
// Add SSH agent
import hudson.slaves.*
import jenkins.model.*

def instance = Jenkins.getInstance()

def agentName = "linux-agent"
def agentDescription = "Linux build agent"
def agentRemoteFS = "/home/jenkins"
def agentNumExecutors = 2

def launcher = new hudson.plugins.sshslaves.SSHLauncher(
    "agent-host.example.com", // Host
    22,                       // Port
    "ssh-credentials-id",     // Credentials ID
    "",                       // JVM Options
    "",                       // Java Path
    "",                       // Prefix Start Slave Command
    "",                       // Suffix Start Slave Command
    60,                       // Launch Timeout
    3,                        // Max Num Retries
    15                        // Retry Wait Time
)

def agent = new DumbSlave(
    agentName,
    agentDescription,
    agentRemoteFS,
    agentNumExecutors.toString(),
    Node.Mode.NORMAL,
    "linux docker",
    launcher,
    RetentionStrategy.INSTANCE,
    []
)

instance.addNode(agent)
```

### Docker Agent Configuration
```groovy
pipeline {
    agent {
        docker {
            image 'node:16-alpine'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }
    
    stages {
        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }
    }
}
```

### Kubernetes Agent Template
```yaml
# kubernetes-agent-template.yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: agent
spec:
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"
        cpu: "1000m"
  - name: docker
    image: docker:dind
    securityContext:
      privileged: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: kubectl
    image: bitnami/kubectl:latest
    command:
    - sleep
    args:
    - 99d
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
```

## Integration Examples

### GitHub Integration
```groovy
pipeline {
    agent any
    
    triggers {
        githubPush()
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/user/repo.git',
                        credentialsId: 'github-credentials'
                    ]]
                ])
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm install && npm run build'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm test'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
    }
    
    post {
        success {
            updateGitlabCommitStatus name: 'build', state: 'success'
        }
        failure {
            updateGitlabCommitStatus name: 'build', state: 'failed'
        }
    }
}
```

### SonarQube Integration
```groovy
pipeline {
    agent any
    
    environment {
        SONAR_TOKEN = credentials('sonarqube-token')
    }
    
    stages {
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=myproject \
                          -Dsonar.sources=. \
                          -Dsonar.host.url=$SONAR_HOST_URL \
                          -Dsonar.login=$SONAR_TOKEN
                    '''
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }
}
```

## Best Practices

### Pipeline Best Practices
1. **Use declarative syntax** when possible
2. **Keep Jenkinsfile in repository** for version control
3. **Use parallel stages** to reduce build time
4. **Implement proper error handling**
5. **Use shared libraries** for common functionality
6. **Cache dependencies** to speed up builds
7. **Use appropriate agents** for different tasks

### Security Best Practices
1. **Enable CSRF protection**
2. **Use least privilege principle**
3. **Regularly update Jenkins and plugins**
4. **Use encrypted credentials**
5. **Enable audit logging**
6. **Restrict script console access**
7. **Use HTTPS for Jenkins access**

### Performance Optimization
```groovy
pipeline {
    agent any
    
    options {
        // Keep only last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout entire pipeline after 1 hour
        timeout(time: 1, unit: 'HOURS')
        
        // Don't checkout automatically
        skipDefaultCheckout()
        
        // Prevent concurrent builds
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Cache Dependencies') {
            steps {
                cache(maxCacheSize: 250, caches: [
                    arbitraryFileCache(
                        path: 'node_modules',
                        fingerprinting: true
                    )
                ]) {
                    sh 'npm ci'
                }
            }
        }
    }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Build Failures**
   ```bash
   # Check build logs
   tail -f /var/log/jenkins/jenkins.log
   
   # Check agent connectivity
   java -jar agent.jar -jnlpUrl http://jenkins:8080/computer/agent/slave-agent.jnlp
   ```

2. **Plugin Conflicts**
   ```bash
   # Safe restart
   curl -X POST http://jenkins:8080/safeRestart
   
   # Disable problematic plugin
   mv $JENKINS_HOME/plugins/problematic-plugin.hpi $JENKINS_HOME/plugins/problematic-plugin.hpi.disabled
   ```

3. **Performance Issues**
   ```bash
   # Increase JVM heap size
   export JENKINS_JAVA_OPTIONS="-Xmx4096m -XX:MaxPermSize=512m"
   
   # Clean workspace regularly
   find $JENKINS_HOME/workspace -mtime +7 -exec rm -rf {} \;
   ```

4. **Agent Connection Problems**
   ```bash
   # Test agent connectivity
   telnet jenkins-master 50000
   
   # Check firewall rules
   netstat -tlnp | grep :50000
   ```

### Monitoring and Logging
```groovy
// Add monitoring to pipeline
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                script {
                    def startTime = System.currentTimeMillis()
                    
                    try {
                        sh 'npm run build'
                    } finally {
                        def endTime = System.currentTimeMillis()
                        def duration = (endTime - startTime) / 1000
                        
                        // Send metrics to monitoring system
                        httpRequest(
                            httpMode: 'POST',
                            url: 'http://metrics-collector:8080/metrics',
                            requestBody: """
                                {
                                    "job": "${env.JOB_NAME}",
                                    "build": "${env.BUILD_NUMBER}",
                                    "stage": "build",
                                    "duration": ${duration},
                                    "timestamp": ${System.currentTimeMillis()}
                                }
                            """,
                            contentType: 'APPLICATION_JSON'
                        )
                    }
                }
            }
        }
    }
}
```

## Resources

- [Official Jenkins Documentation](https://www.jenkins.io/doc/)
- [Pipeline Syntax Reference](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Plugin Index](https://plugins.jenkins.io/)
- [Best Practices Guide](https://www.jenkins.io/doc/book/pipeline/best-practices/)
- [Security Guidelines](https://www.jenkins.io/doc/book/security/)

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.