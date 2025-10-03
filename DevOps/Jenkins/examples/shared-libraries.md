# Jenkins Shared Libraries and Advanced Configurations

This example demonstrates how to create and use Jenkins shared libraries for reusable pipeline components and advanced configurations.

## Project Structure
```
jenkins-shared-library/
├── vars/
│   ├── buildDockerImage.groovy
│   ├── deployToKubernetes.groovy
│   ├── notifySlack.groovy
│   ├── runSecurityScan.groovy
│   └── standardPipeline.groovy
├── src/
│   └── com/
│       └── company/
│           └── jenkins/
│               ├── Docker.groovy
│               ├── Kubernetes.groovy
│               └── Utils.groovy
└── resources/
    ├── pipeline-templates/
    └── scripts/
```

## Shared Library Variables

### Docker Build Function
```groovy
// vars/buildDockerImage.groovy
def call(Map config) {
    def imageName = config.imageName ?: error("imageName is required")
    def imageTag = config.imageTag ?: env.BUILD_NUMBER
    def dockerFile = config.dockerFile ?: "Dockerfile"
    def buildContext = config.buildContext ?: "."
    def registry = config.registry ?: ""
    def pushImage = config.push ?: true
    
    script {
        def fullImageName = registry ? "${registry}/${imageName}:${imageTag}" : "${imageName}:${imageTag}"
        
        echo "Building Docker image: ${fullImageName}"
        
        def image = docker.build(fullImageName, "-f ${dockerFile} ${buildContext}")
        
        if (pushImage && registry) {
            docker.withRegistry("https://${registry}", config.credentialsId) {
                image.push()
                if (config.pushLatest) {
                    image.push("latest")
                }
            }
        }
        
        // Security scan
        if (config.securityScan) {
            sh "trivy image --exit-code 1 --severity HIGH,CRITICAL ${fullImageName}"
        }
        
        return [
            imageName: fullImageName,
            imageId: image.id
        ]
    }
}

// Usage example:
// buildDockerImage([
//     imageName: 'myapp',
//     imageTag: env.BUILD_NUMBER,
//     registry: 'registry.example.com',
//     credentialsId: 'docker-registry',
//     securityScan: true,
//     pushLatest: true
// ])
```

### Kubernetes Deployment Function
```groovy
// vars/deployToKubernetes.groovy
def call(Map config) {
    def namespace = config.namespace ?: error("namespace is required")
    def manifests = config.manifests ?: error("manifests path is required")
    def kubeconfig = config.kubeconfig ?: 'kubeconfig'
    def timeout = config.timeout ?: '300s'
    def deploymentName = config.deploymentName
    def waitForRollout = config.waitForRollout ?: true
    
    withKubeConfig([credentialsId: kubeconfig]) {
        try {
            echo "Deploying to Kubernetes namespace: ${namespace}"
            
            // Apply manifests
            sh "kubectl apply -f ${manifests} --namespace=${namespace}"
            
            // Wait for rollout if specified
            if (waitForRollout && deploymentName) {
                sh "kubectl rollout status deployment/${deploymentName} --namespace=${namespace} --timeout=${timeout}"
            }
            
            // Verify deployment health
            if (config.healthCheck) {
                verifyDeploymentHealth(namespace, deploymentName, config.healthCheck)
            }
            
            echo "✅ Deployment successful"
            
        } catch (Exception e) {
            echo "❌ Deployment failed: ${e.message}"
            
            // Rollback on failure
            if (config.rollbackOnFailure && deploymentName) {
                echo "🔄 Rolling back deployment..."
                sh "kubectl rollout undo deployment/${deploymentName} --namespace=${namespace}"
            }
            
            throw e
        }
    }
}

def verifyDeploymentHealth(namespace, deploymentName, healthCheck) {
    script {
        def maxRetries = 30
        def retryCount = 0
        
        while (retryCount < maxRetries) {
            try {
                def result = sh(
                    script: "kubectl exec deployment/${deploymentName} --namespace=${namespace} -- ${healthCheck.command}",
                    returnStatus: true
                )
                
                if (result == 0) {
                    echo "✅ Health check passed"
                    return
                }
            } catch (Exception e) {
                echo "Health check attempt ${retryCount + 1} failed: ${e.message}"
            }
            
            retryCount++
            sleep 10
        }
        
        error("Health check failed after ${maxRetries} attempts")
    }
}

// Usage example:
// deployToKubernetes([
//     namespace: 'production',
//     manifests: 'k8s/production/',
//     deploymentName: 'myapp',
//     kubeconfig: 'prod-kubeconfig',
//     waitForRollout: true,
//     healthCheck: [
//         command: 'curl -f http://localhost:8080/health'
//     ],
//     rollbackOnFailure: true
// ])
```

### Slack Notification Function
```groovy
// vars/notifySlack.groovy
def call(Map config) {
    def channel = config.channel ?: '#general'
    def message = config.message ?: "Build ${env.BUILD_NUMBER} completed"
    def color = config.color ?: 'good'
    def title = config.title ?: "${env.JOB_NAME} - Build ${env.BUILD_NUMBER}"
    def includeChanges = config.includeChanges ?: true
    def mentionOnFailure = config.mentionOnFailure ?: true
    
    script {
        def blocks = []
        
        // Header block
        blocks.add([
            "type": "header",
            "text": [
                "type": "plain_text",
                "text": title
            ]
        ])
        
        // Main message block
        def fields = [
            [
                "type": "mrkdwn",
                "text": "*Status:* ${currentBuild.currentResult}"
            ],
            [
                "type": "mrkdwn",
                "text": "*Branch:* ${env.BRANCH_NAME}"
            ],
            [
                "type": "mrkdwn",
                "text": "*Duration:* ${currentBuild.durationString}"
            ],
            [
                "type": "mrkdwn",
                "text": "*Commit:* ${env.GIT_COMMIT[0..7]}"
            ]
        ]
        
        if (env.CHANGE_AUTHOR) {
            fields.add([
                "type": "mrkdwn",
                "text": "*Author:* ${env.CHANGE_AUTHOR}"
            ])
        }
        
        blocks.add([
            "type": "section",
            "fields": fields
        ])
        
        // Include changes if requested
        if (includeChanges && env.CHANGE_LOG) {
            blocks.add([
                "type": "section",
                "text": [
                    "type": "mrkdwn",
                    "text": "*Changes:*\\n${env.CHANGE_LOG}"
                ]
            ])
        }
        
        // Actions block
        blocks.add([
            "type": "actions",
            "elements": [
                [
                    "type": "button",
                    "text": [
                        "type": "plain_text",
                        "text": "View Build"
                    ],
                    "url": env.BUILD_URL
                ]
            ]
        ])
        
        // Mention team on failure
        def finalMessage = message
        if (currentBuild.currentResult == 'FAILURE' && mentionOnFailure) {
            finalMessage = "<!channel> ${message}"
        }
        
        slackSend(
            channel: channel,
            color: color,
            message: finalMessage,
            blocks: blocks
        )
    }
}

// Usage example:
// notifySlack([
//     channel: '#deployments',
//     message: 'Production deployment completed successfully',
//     color: 'good',
//     includeChanges: true,
//     mentionOnFailure: true
// ])
```

### Security Scanning Function
```groovy
// vars/runSecurityScan.groovy
def call(Map config) {
    def scanType = config.scanType ?: 'all'
    def projectDir = config.projectDir ?: '.'
    def failOnHigh = config.failOnHigh ?: true
    def reports = [:]
    
    dir(projectDir) {
        script {
            if (scanType in ['all', 'sast']) {
                stage('SAST Scan') {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            sonar-scanner \\
                              -Dsonar.projectKey=${JOB_NAME} \\
                              -Dsonar.sources=. \\
                              -Dsonar.exclusions=**/node_modules/**,**/vendor/**
                        '''
                    }
                    
                    timeout(time: 10, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK' && failOnHigh) {
                            error "Quality gate failed: ${qg.status}"
                        }
                        reports.sast = qg
                    }
                }
            }
            
            if (scanType in ['all', 'dependency']) {
                stage('Dependency Scan') {
                    // OWASP Dependency Check
                    sh """
                        dependency-check \\
                          --project "${env.JOB_NAME}" \\
                          --scan . \\
                          --format JSON \\
                          --format HTML \\
                          --out dependency-check-report
                    """
                    
                    // Snyk scan
                    sh 'snyk test --json > snyk-report.json || true'
                    
                    // npm audit for Node.js projects
                    if (fileExists('package.json')) {
                        sh 'npm audit --json > npm-audit.json || true'
                    }
                    
                    reports.dependencies = 'dependency-check-report'
                }
            }
            
            if (scanType in ['all', 'secrets']) {
                stage('Secret Scan') {
                    sh '''
                        # TruffleHog for secret detection
                        trufflehog --json . > trufflehog-report.json || true
                        
                        # GitLeaks for additional secret detection
                        gitleaks detect --source . --report-format json --report-path gitleaks-report.json || true
                    '''
                    
                    reports.secrets = 'secret-scan-reports'
                }
            }
            
            if (scanType in ['all', 'container'] && config.imageName) {
                stage('Container Scan') {
                    sh """
                        # Trivy container scan
                        trivy image --format json --output trivy-report.json ${config.imageName}
                        
                        # Grype scan
                        grype ${config.imageName} -o json > grype-report.json || true
                    """
                    
                    reports.container = 'container-scan-reports'
                }
            }
        }
    }
    
    // Archive all reports
    archiveArtifacts artifacts: '**/*-report.*', allowEmptyArchive: true
    
    // Publish HTML reports
    publishHTML([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'dependency-check-report',
        reportFiles: 'dependency-check-report.html',
        reportName: 'Security Scan Report'
    ])
    
    return reports
}

// Usage example:
// runSecurityScan([
//     scanType: 'all',
//     projectDir: '.',
//     failOnHigh: true,
//     imageName: 'myapp:latest'
// ])
```

### Standard Pipeline Template
```groovy
// vars/standardPipeline.groovy
def call(Map config) {
    pipeline {
        agent any
        
        environment {
            BUILD_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT[0..7]}"
        }
        
        options {
            buildDiscarder(logRotator(numToKeepStr: '10'))
            timeout(time: 1, unit: 'HOURS')
            skipDefaultCheckout()
        }
        
        stages {
            stage('Checkout') {
                steps {
                    checkout scm
                    script {
                        env.COMMIT_MESSAGE = sh(
                            script: 'git log -1 --pretty=%B',
                            returnStdout: true
                        ).trim()
                    }
                }
            }
            
            stage('Setup') {
                steps {
                    script {
                        // Load configuration
                        def pipelineConfig = readYaml file: config.configFile ?: '.jenkins/pipeline.yml'
                        env.PIPELINE_CONFIG = writeJSON returnText: true, json: pipelineConfig
                        
                        // Setup environment based on branch
                        switch(env.BRANCH_NAME) {
                            case 'main':
                                env.ENVIRONMENT = 'production'
                                env.DEPLOY_ENABLED = 'true'
                                break
                            case 'develop':
                                env.ENVIRONMENT = 'staging'
                                env.DEPLOY_ENABLED = 'true'
                                break
                            default:
                                env.ENVIRONMENT = 'development'
                                env.DEPLOY_ENABLED = 'false'
                        }
                    }
                }
            }
            
            stage('Build & Test') {
                parallel {
                    stage('Build') {
                        steps {
                            script {
                                def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                                
                                if (pipelineConfig.build?.enabled) {
                                    sh pipelineConfig.build.script
                                    
                                    if (pipelineConfig.build.artifacts) {
                                        archiveArtifacts artifacts: pipelineConfig.build.artifacts
                                    }
                                }
                            }
                        }
                    }
                    
                    stage('Test') {
                        steps {
                            script {
                                def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                                
                                if (pipelineConfig.test?.enabled) {
                                    sh pipelineConfig.test.script
                                    
                                    if (pipelineConfig.test.results) {
                                        publishTestResults testResultsPattern: pipelineConfig.test.results
                                    }
                                    
                                    if (pipelineConfig.test.coverage) {
                                        publishCoverage adapters: [
                                            istanbulCoberturaAdapter(pipelineConfig.test.coverage)
                                        ]
                                    }
                                }
                            }
                        }
                    }
                    
                    stage('Security Scan') {
                        when {
                            expression { 
                                def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                                return pipelineConfig.security?.enabled 
                            }
                        }
                        steps {
                            script {
                                def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                                runSecurityScan(pipelineConfig.security)
                            }
                        }
                    }
                }
            }
            
            stage('Docker Build') {
                when {
                    expression { 
                        def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                        return pipelineConfig.docker?.enabled 
                    }
                }
                steps {
                    script {
                        def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                        def dockerConfig = pipelineConfig.docker
                        dockerConfig.imageTag = env.BUILD_VERSION
                        
                        buildDockerImage(dockerConfig)
                    }
                }
            }
            
            stage('Deploy') {
                when {
                    environment name: 'DEPLOY_ENABLED', value: 'true'
                }
                steps {
                    script {
                        def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                        def deployConfig = pipelineConfig.deployment[env.ENVIRONMENT]
                        
                        if (deployConfig) {
                            deployToKubernetes(deployConfig)
                        }
                    }
                }
            }
        }
        
        post {
            always {
                script {
                    def pipelineConfig = readJSON text: env.PIPELINE_CONFIG
                    
                    if (pipelineConfig.notifications?.slack?.enabled) {
                        notifySlack(pipelineConfig.notifications.slack)
                    }
                    
                    if (pipelineConfig.notifications?.email?.enabled) {
                        emailext(
                            subject: "${env.JOB_NAME} - Build ${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
                            body: "Build ${currentBuild.currentResult}: ${env.BUILD_URL}",
                            to: pipelineConfig.notifications.email.recipients
                        )
                    }
                }
                
                cleanWs()
            }
        }
    }
}

// Usage in Jenkinsfile:
// @Library('my-shared-library') _
// standardPipeline([
//     configFile: '.jenkins/pipeline.yml'
// ])
```

## Pipeline Configuration File

### Example Pipeline Configuration
```yaml
# .jenkins/pipeline.yml
build:
  enabled: true
  script: |
    npm ci
    npm run build
  artifacts: "dist/**/*"

test:
  enabled: true
  script: |
    npm run test:coverage
  results: "test-results.xml"
  coverage: "coverage/cobertura-coverage.xml"

security:
  enabled: true
  scanType: "all"
  failOnHigh: true

docker:
  enabled: true
  imageName: "myapp"
  registry: "registry.example.com"
  credentialsId: "docker-registry"
  securityScan: true
  pushLatest: true

deployment:
  staging:
    namespace: "staging"
    manifests: "k8s/staging/"
    deploymentName: "myapp"
    kubeconfig: "staging-kubeconfig"
    healthCheck:
      command: "curl -f http://localhost:8080/health"
    rollbackOnFailure: true
  
  production:
    namespace: "production"
    manifests: "k8s/production/"
    deploymentName: "myapp"
    kubeconfig: "prod-kubeconfig"
    healthCheck:
      command: "curl -f http://localhost:8080/health"
    rollbackOnFailure: true

notifications:
  slack:
    enabled: true
    channel: "#deployments"
    mentionOnFailure: true
  
  email:
    enabled: true
    recipients: "team@example.com"
```

## Java-based Shared Library Classes

### Docker Utility Class
```groovy
// src/com/company/jenkins/Docker.groovy
package com.company.jenkins

class Docker implements Serializable {
    def script
    
    Docker(script) {
        this.script = script
    }
    
    def buildAndPush(String imageName, String tag, String registry, String credentialsId) {
        def fullImageName = "${registry}/${imageName}:${tag}"
        
        script.echo "Building Docker image: ${fullImageName}"
        
        def image = script.docker.build(fullImageName)
        
        script.docker.withRegistry("https://${registry}", credentialsId) {
            image.push()
            image.push("latest")
        }
        
        return fullImageName
    }
    
    def scanImage(String imageName, String severity = "HIGH,CRITICAL") {
        script.sh "trivy image --exit-code 1 --severity ${severity} ${imageName}"
    }
    
    def getImageDigest(String imageName) {
        return script.sh(
            script: "docker inspect --format='{{index .RepoDigests 0}}' ${imageName}",
            returnStdout: true
        ).trim()
    }
}
```

### Kubernetes Utility Class
```groovy
// src/com/company/jenkins/Kubernetes.groovy
package com.company.jenkins

class Kubernetes implements Serializable {
    def script
    
    Kubernetes(script) {
        this.script = script
    }
    
    def deploy(String namespace, String manifests, String kubeconfig) {
        script.withKubeConfig([credentialsId: kubeconfig]) {
            script.sh "kubectl apply -f ${manifests} --namespace=${namespace}"
        }
    }
    
    def waitForRollout(String deployment, String namespace, String timeout = "300s") {
        script.sh "kubectl rollout status deployment/${deployment} --namespace=${namespace} --timeout=${timeout}"
    }
    
    def rollback(String deployment, String namespace) {
        script.sh "kubectl rollout undo deployment/${deployment} --namespace=${namespace}"
    }
    
    def getPodsStatus(String namespace, String selector = "") {
        def command = "kubectl get pods --namespace=${namespace}"
        if (selector) {
            command += " --selector=${selector}"
        }
        command += " -o json"
        
        def result = script.sh(script: command, returnStdout: true)
        return script.readJSON(text: result)
    }
    
    def scaleDeployment(String deployment, String namespace, int replicas) {
        script.sh "kubectl scale deployment/${deployment} --namespace=${namespace} --replicas=${replicas}"
    }
}
```

This shared library approach provides:

1. **Reusable Components**: Common pipeline functionality across projects
2. **Standardized Processes**: Consistent build, test, and deployment processes
3. **Configuration-driven**: Easy customization through YAML configuration
4. **Type Safety**: Java-based classes for complex operations
5. **Maintainability**: Centralized pipeline logic
6. **Version Control**: Shared library versioning and updates