# Complete CI/CD Pipeline for Full-Stack Application

This example demonstrates a comprehensive Jenkins pipeline for a full-stack application with frontend, backend, database migrations, and deployment to multiple environments.

## Project Structure
```
fullstack-app/
├── frontend/
│   ├── package.json
│   ├── src/
│   └── Dockerfile
├── backend/
│   ├── package.json
│   ├── src/
│   └── Dockerfile
├── database/
│   └── migrations/
├── k8s/
│   ├── staging/
│   └── production/
├── Jenkinsfile
└── docker-compose.yml
```

## Complete Jenkinsfile

```groovy
pipeline {
    agent none
    
    environment {
        DOCKER_REGISTRY = 'registry.example.com'
        DOCKER_REPO = 'fullstack-app'
        STAGING_NAMESPACE = 'staging'
        PRODUCTION_NAMESPACE = 'production'
        SONAR_PROJECT_KEY = 'fullstack-app'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        parallelsAlwaysFailFast()
    }
    
    triggers {
        // Build on push to any branch
        githubPush()
        
        // Periodic build for main branch (nightly)
        cron(env.BRANCH_NAME == 'main' ? 'H 2 * * *' : '')
    }
    
    stages {
        stage('Checkout & Setup') {
            agent any
            steps {
                checkout scm
                
                script {
                    // Set dynamic environment variables
                    env.BUILD_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT[0..7]}"
                    env.IMAGE_TAG = env.BRANCH_NAME == 'main' ? env.BUILD_VERSION : "${env.BRANCH_NAME}-${env.BUILD_VERSION}"
                    
                    // Determine changed services
                    def changes = sh(
                        script: 'git diff --name-only HEAD^ HEAD || echo "all"',
                        returnStdout: true
                    ).trim()
                    
                    env.BUILD_FRONTEND = changes.contains('frontend/') || changes.contains('all') ? 'true' : 'false'
                    env.BUILD_BACKEND = changes.contains('backend/') || changes.contains('all') ? 'true' : 'false'
                    env.RUN_MIGRATIONS = changes.contains('database/') || changes.contains('all') ? 'true' : 'false'
                }
                
                // Install global dependencies
                sh '''
                    npm install -g @angular/cli
                    pip install --user awscli
                '''
            }
        }
        
        stage('Dependencies & Linting') {
            parallel {
                stage('Frontend Dependencies') {
                    agent any
                    when {
                        environment name: 'BUILD_FRONTEND', value: 'true'
                    }
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm run lint'
                            sh 'npm run audit-fix'
                        }
                    }
                    post {
                        always {
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'frontend/lint-results',
                                reportFiles: 'index.html',
                                reportName: 'Frontend Lint Report'
                            ])
                        }
                    }
                }
                
                stage('Backend Dependencies') {
                    agent any
                    when {
                        environment name: 'BUILD_BACKEND', value: 'true'
                    }
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            sh 'npm run lint'
                            sh 'npm audit --audit-level high'
                        }
                    }
                }
            }
        }
        
        stage('Unit Tests') {
            parallel {
                stage('Frontend Tests') {
                    agent any
                    when {
                        environment name: 'BUILD_FRONTEND', value: 'true'
                    }
                    steps {
                        dir('frontend') {
                            sh 'npm run test:coverage'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'frontend/test-results.xml'
                            publishCoverage adapters: [
                                istanbulCoberturaAdapter('frontend/coverage/cobertura-coverage.xml')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                }
                
                stage('Backend Tests') {
                    agent any
                    when {
                        environment name: 'BUILD_BACKEND', value: 'true'
                    }
                    steps {
                        dir('backend') {
                            sh 'npm run test:coverage'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'backend/test-results.xml'
                            publishCoverage adapters: [
                                istanbulCoberturaAdapter('backend/coverage/cobertura-coverage.xml')
                            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                        }
                    }
                }
            }
        }
        
        stage('Build Applications') {
            parallel {
                stage('Build Frontend') {
                    agent any
                    when {
                        environment name: 'BUILD_FRONTEND', value: 'true'
                    }
                    environment {
                        NODE_ENV = 'production'
                    }
                    steps {
                        dir('frontend') {
                            sh 'npm run build:prod'
                            archiveArtifacts artifacts: 'dist/**/*', allowEmptyArchive: false
                        }
                    }
                }
                
                stage('Build Backend') {
                    agent any
                    when {
                        environment name: 'BUILD_BACKEND', value: 'true'
                    }
                    steps {
                        dir('backend') {
                            sh 'npm run build'
                            archiveArtifacts artifacts: 'dist/**/*', allowEmptyArchive: false
                        }
                    }
                }
            }
        }
        
        stage('Security Scanning') {
            parallel {
                stage('SAST Scan') {
                    agent any
                    environment {
                        SONAR_TOKEN = credentials('sonarqube-token')
                    }
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            sh '''
                                sonar-scanner \\
                                  -Dsonar.projectKey=${SONAR_PROJECT_KEY} \\
                                  -Dsonar.sources=. \\
                                  -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/** \\
                                  -Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,backend/coverage/lcov.info
                            '''
                        }
                        
                        timeout(time: 10, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
                        }
                    }
                }
                
                stage('Dependency Check') {
                    agent any
                    steps {
                        sh '''
                            # OWASP Dependency Check
                            dependency-check --project "FullStack App" --scan . --format XML --out dependency-check-report.xml
                            
                            # Snyk security scan
                            snyk test --json > snyk-report.json || true
                        '''
                    }
                    post {
                        always {
                            publishHTML([
                                allowMissing: true,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: '.',
                                reportFiles: 'dependency-check-report.xml',
                                reportName: 'OWASP Dependency Check'
                            ])
                        }
                    }
                }
            }
        }
        
        stage('Docker Build & Push') {
            agent any
            when {
                anyOf {
                    environment name: 'BUILD_FRONTEND', value: 'true'
                    environment name: 'BUILD_BACKEND', value: 'true'
                }
            }
            environment {
                DOCKER_BUILDKIT = '1'
            }
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry-credentials') {
                        def images = [:]
                        
                        if (env.BUILD_FRONTEND == 'true') {
                            images['frontend'] = docker.build(
                                "${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${IMAGE_TAG}",
                                "--target production ./frontend"
                            )
                        }
                        
                        if (env.BUILD_BACKEND == 'true') {
                            images['backend'] = docker.build(
                                "${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${IMAGE_TAG}",
                                "--target production ./backend"
                            )
                        }
                        
                        // Push all images in parallel
                        def pushSteps = [:]
                        images.each { name, image ->
                            pushSteps["Push ${name}"] = {
                                image.push()
                                if (env.BRANCH_NAME == 'main') {
                                    image.push('latest')
                                }
                            }
                        }
                        
                        parallel pushSteps
                    }
                }
            }
        }
        
        stage('Container Security Scan') {
            agent any
            when {
                anyOf {
                    environment name: 'BUILD_FRONTEND', value: 'true'
                    environment name: 'BUILD_BACKEND', value: 'true'
                }
            }
            steps {
                script {
                    def scanSteps = [:]
                    
                    if (env.BUILD_FRONTEND == 'true') {
                        scanSteps['Scan Frontend'] = {
                            sh "trivy image --format json --output frontend-scan.json ${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${IMAGE_TAG}"
                        }
                    }
                    
                    if (env.BUILD_BACKEND == 'true') {
                        scanSteps['Scan Backend'] = {
                            sh "trivy image --format json --output backend-scan.json ${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${IMAGE_TAG}"
                        }
                    }
                    
                    parallel scanSteps
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: '*-scan.json', allowEmptyArchive: true
                }
            }
        }
        
        stage('Integration Tests') {
            agent any
            environment {
                COMPOSE_PROJECT_NAME = "test-${BUILD_NUMBER}"
            }
            steps {
                script {
                    try {
                        // Start test environment
                        sh '''
                            export FRONTEND_IMAGE=${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${IMAGE_TAG}
                            export BACKEND_IMAGE=${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${IMAGE_TAG}
                            docker-compose -f docker-compose.test.yml up -d
                            
                            # Wait for services to be ready
                            timeout 300 bash -c 'until curl -f http://localhost:3000/health; do sleep 5; done'
                        '''
                        
                        // Run integration tests
                        sh '''
                            cd tests/integration
                            npm ci
                            npm run test:integration
                        '''
                        
                        // Run E2E tests
                        sh '''
                            cd tests/e2e
                            npm ci
                            npm run test:e2e
                        '''
                        
                    } finally {
                        // Cleanup test environment
                        sh 'docker-compose -f docker-compose.test.yml down -v || true'
                    }
                }
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'tests/**/test-results.xml'
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'tests/e2e/screenshots',
                        reportFiles: '*.html',
                        reportName: 'E2E Test Results'
                    ])
                }
            }
        }
        
        stage('Database Migrations') {
            agent any
            when {
                allOf {
                    environment name: 'RUN_MIGRATIONS', value: 'true'
                    anyOf {
                        branch 'main'
                        branch 'develop'
                    }
                }
            }
            steps {
                script {
                    def namespace = env.BRANCH_NAME == 'main' ? env.PRODUCTION_NAMESPACE : env.STAGING_NAMESPACE
                    
                    withKubeConfig([credentialsId: 'kubeconfig', serverUrl: 'https://kubernetes.example.com']) {
                        sh """
                            kubectl create job migration-${BUILD_NUMBER} \\
                              --from=cronjob/database-migration \\
                              --namespace=${namespace}
                            
                            kubectl wait --for=condition=complete job/migration-${BUILD_NUMBER} \\
                              --timeout=600s --namespace=${namespace}
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            agent any
            when {
                branch 'develop'
            }
            environment {
                KUBE_NAMESPACE = "${STAGING_NAMESPACE}"
            }
            steps {
                withKubeConfig([credentialsId: 'kubeconfig', serverUrl: 'https://kubernetes.example.com']) {
                    sh '''
                        # Update deployment manifests with new image tags
                        sed -i "s|{{FRONTEND_IMAGE}}|${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${IMAGE_TAG}|g" k8s/staging/frontend-deployment.yaml
                        sed -i "s|{{BACKEND_IMAGE}}|${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${IMAGE_TAG}|g" k8s/staging/backend-deployment.yaml
                        
                        # Apply manifests
                        kubectl apply -f k8s/staging/ --namespace=${KUBE_NAMESPACE}
                        
                        # Wait for rollout to complete
                        kubectl rollout status deployment/frontend --namespace=${KUBE_NAMESPACE} --timeout=600s
                        kubectl rollout status deployment/backend --namespace=${KUBE_NAMESPACE} --timeout=600s
                        
                        # Run smoke tests
                        kubectl run smoke-test-${BUILD_NUMBER} \\
                          --image=curlimages/curl \\
                          --restart=Never \\
                          --namespace=${KUBE_NAMESPACE} \\
                          --command -- sh -c "curl -f http://frontend-service/health && curl -f http://backend-service/health"
                        
                        kubectl wait --for=condition=complete pod/smoke-test-${BUILD_NUMBER} \\
                          --timeout=300s --namespace=${KUBE_NAMESPACE}
                    '''
                }
            }
            post {
                always {
                    script {
                        // Cleanup smoke test pod
                        sh "kubectl delete pod smoke-test-${BUILD_NUMBER} --namespace=${STAGING_NAMESPACE} || true"
                    }
                }
            }
        }
        
        stage('Deploy to Production') {
            agent any
            when {
                branch 'main'
            }
            environment {
                KUBE_NAMESPACE = "${PRODUCTION_NAMESPACE}"
            }
            steps {
                script {
                    // Manual approval for production deployment
                    def userInput = input(
                        message: 'Deploy to production?',
                        parameters: [
                            choice(
                                name: 'DEPLOYMENT_STRATEGY',
                                choices: ['rolling', 'blue-green', 'canary'],
                                description: 'Choose deployment strategy'
                            ),
                            booleanParam(
                                name: 'SKIP_SMOKE_TESTS',
                                defaultValue: false,
                                description: 'Skip smoke tests'
                            )
                        ]
                    )
                    
                    env.DEPLOYMENT_STRATEGY = userInput.DEPLOYMENT_STRATEGY
                    env.SKIP_SMOKE_TESTS = userInput.SKIP_SMOKE_TESTS
                }
                
                withKubeConfig([credentialsId: 'kubeconfig', serverUrl: 'https://kubernetes.example.com']) {
                    script {
                        if (env.DEPLOYMENT_STRATEGY == 'canary') {
                            // Canary deployment
                            sh '''
                                # Deploy canary version (10% traffic)
                                sed -i "s|{{FRONTEND_IMAGE}}|${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${IMAGE_TAG}|g" k8s/production/canary/frontend-deployment.yaml
                                sed -i "s|{{BACKEND_IMAGE}}|${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${IMAGE_TAG}|g" k8s/production/canary/backend-deployment.yaml
                                
                                kubectl apply -f k8s/production/canary/ --namespace=${KUBE_NAMESPACE}
                                kubectl rollout status deployment/frontend-canary --namespace=${KUBE_NAMESPACE}
                                kubectl rollout status deployment/backend-canary --namespace=${KUBE_NAMESPACE}
                            '''
                            
                            // Monitor canary for 10 minutes
                            sleep time: 10, unit: 'MINUTES'
                            
                            // Check metrics and decide
                            def continueDeployment = input(
                                message: 'Canary metrics look good. Continue with full deployment?',
                                ok: 'Continue'
                            )
                            
                            if (continueDeployment) {
                                sh '''
                                    # Full deployment
                                    kubectl patch deployment frontend -p '{"spec":{"template":{"spec":{"containers":[{"name":"frontend","image":"'${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${IMAGE_TAG}'"}]}}}}' --namespace=${KUBE_NAMESPACE}
                                    kubectl patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","image":"'${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${IMAGE_TAG}'"}]}}}}' --namespace=${KUBE_NAMESPACE}
                                    
                                    kubectl rollout status deployment/frontend --namespace=${KUBE_NAMESPACE}
                                    kubectl rollout status deployment/backend --namespace=${KUBE_NAMESPACE}
                                    
                                    # Remove canary
                                    kubectl delete -f k8s/production/canary/ --namespace=${KUBE_NAMESPACE}
                                '''
                            }
                        } else {
                            // Rolling deployment
                            sh '''
                                sed -i "s|{{FRONTEND_IMAGE}}|${DOCKER_REGISTRY}/${DOCKER_REPO}-frontend:${IMAGE_TAG}|g" k8s/production/frontend-deployment.yaml
                                sed -i "s|{{BACKEND_IMAGE}}|${DOCKER_REGISTRY}/${DOCKER_REPO}-backend:${IMAGE_TAG}|g" k8s/production/backend-deployment.yaml
                                
                                kubectl apply -f k8s/production/ --namespace=${KUBE_NAMESPACE}
                                kubectl rollout status deployment/frontend --namespace=${KUBE_NAMESPACE}
                                kubectl rollout status deployment/backend --namespace=${KUBE_NAMESPACE}
                            '''
                        }
                        
                        if (env.SKIP_SMOKE_TESTS != 'true') {
                            sh '''
                                # Production smoke tests
                                kubectl run prod-smoke-test-${BUILD_NUMBER} \\
                                  --image=curlimages/curl \\
                                  --restart=Never \\
                                  --namespace=${KUBE_NAMESPACE} \\
                                  --command -- sh -c "curl -f https://app.example.com/health && curl -f https://api.example.com/health"
                                
                                kubectl wait --for=condition=complete pod/prod-smoke-test-${BUILD_NUMBER} \\
                                  --timeout=300s --namespace=${KUBE_NAMESPACE}
                            '''
                        }
                    }
                }
            }
            post {
                always {
                    script {
                        sh "kubectl delete pod prod-smoke-test-${BUILD_NUMBER} --namespace=${PRODUCTION_NAMESPACE} || true"
                    }
                }
            }
        }
        
        stage('Post-Deployment Tests') {
            agent any
            when {
                branch 'main'
            }
            steps {
                // Run comprehensive post-deployment tests
                build job: 'post-deployment-tests', parameters: [
                    string(name: 'ENVIRONMENT', value: 'production'),
                    string(name: 'VERSION', value: env.BUILD_VERSION)
                ]
            }
        }
    }
    
    post {
        always {
            node('any') {
                // Cleanup
                sh 'docker system prune -f || true'
                
                // Archive build artifacts
                archiveArtifacts artifacts: '*.json,*.xml', allowEmptyArchive: true
                
                // Clean workspace
                cleanWs()
            }
        }
        
        success {
            script {
                if (env.BRANCH_NAME == 'main') {
                    // Notify successful production deployment
                    slackSend(
                        channel: '#deployments',
                        color: 'good',
                        message: """
                            ✅ *Production Deployment Successful*
                            
                            *Project*: ${env.JOB_NAME}
                            *Version*: ${env.BUILD_VERSION}
                            *Build*: ${env.BUILD_NUMBER}
                            *Commit*: ${env.GIT_COMMIT[0..7]}
                            *Author*: ${env.CHANGE_AUTHOR ?: 'Unknown'}
                            
                            <${env.BUILD_URL}|View Build> | <https://app.example.com|View App>
                        """.stripIndent()
                    )
                    
                    // Send email to stakeholders
                    emailext(
                        subject: "✅ Production Deployment Successful - ${env.JOB_NAME} v${env.BUILD_VERSION}",
                        body: """
                            The production deployment has completed successfully.
                            
                            Version: ${env.BUILD_VERSION}
                            Build: ${env.BUILD_NUMBER}
                            Application: https://app.example.com
                            
                            Best regards,
                            Jenkins CI/CD
                        """,
                        to: 'stakeholders@example.com'
                    )
                }
            }
        }
        
        failure {
            slackSend(
                channel: '#alerts',
                color: 'danger',
                message: """
                    ❌ *Pipeline Failed*
                    
                    *Project*: ${env.JOB_NAME}
                    *Branch*: ${env.BRANCH_NAME}
                    *Build*: ${env.BUILD_NUMBER}
                    *Stage*: ${env.STAGE_NAME}
                    
                    <${env.BUILD_URL}|View Build> | <${env.BUILD_URL}console|View Logs>
                """.stripIndent()
            )
        }
        
        unstable {
            slackSend(
                channel: '#warnings',
                color: 'warning',
                message: """
                    ⚠️ *Pipeline Unstable*
                    
                    *Project*: ${env.JOB_NAME}
                    *Branch*: ${env.BRANCH_NAME}
                    *Build*: ${env.BUILD_NUMBER}
                    
                    <${env.BUILD_URL}|View Build>
                """.stripIndent()
            )
        }
    }
}
```

## Supporting Configuration Files

### Docker Compose for Testing
```yaml
# docker-compose.test.yml
version: '3.8'

services:
  frontend:
    image: ${FRONTEND_IMAGE}
    ports:
      - "3000:80"
    environment:
      - API_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    image: ${BACKEND_IMAGE}
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://postgres:password@db:5432/testdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=testdb
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - ./database/test-data.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
```

### Quality Gates Configuration
```groovy
// sonar-project.properties
sonar.projectKey=fullstack-app
sonar.projectName=FullStack Application
sonar.projectVersion=1.0

sonar.sources=frontend/src,backend/src
sonar.tests=frontend/src,backend/src
sonar.test.inclusions=**/*.spec.ts,**/*.test.ts

sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,backend/coverage/lcov.info
sonar.coverage.exclusions=**/*.spec.ts,**/*.test.ts,**/node_modules/**

sonar.qualitygate.wait=true
```

This example demonstrates a production-ready CI/CD pipeline that includes:

1. **Intelligent Build Logic**: Only builds changed components
2. **Comprehensive Testing**: Unit, integration, and E2E tests
3. **Security Scanning**: SAST, dependency checks, and container scanning
4. **Multiple Deployment Strategies**: Rolling, blue-green, and canary deployments
5. **Manual Approval Gates**: For production deployments
6. **Comprehensive Monitoring**: Notifications and post-deployment testing
7. **Cleanup and Optimization**: Resource cleanup and artifact management