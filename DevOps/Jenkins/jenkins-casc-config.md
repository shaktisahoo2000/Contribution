# Jenkins Configuration as Code (JCasC)

Complete Jenkins setup using Configuration as Code plugin for automated Jenkins configuration.

## jenkins.yaml - Master Configuration

```yaml
# jenkins.yaml
jenkins:
  systemMessage: "Jenkins configured automatically by Configuration as Code plugin"
  
  numExecutors: 2
  mode: NORMAL
  
  labelString: "master"
  
  quietPeriod: 5
  scmCheckoutRetryCount: 0
  
  disableRememberMe: false
  
  agentProtocols:
    - "JNLP4-connect"
    - "Ping"
  
  authorizationStrategy:
    roleBased:
      roles:
        global:
          - name: "admin"
            description: "Jenkins administrators"
            permissions:
              - "Overall/Administer"
            assignments:
              - "admin"
          - name: "developer"
            description: "Developers"
            permissions:
              - "Overall/Read"
              - "Job/Build"
              - "Job/Cancel"
              - "Job/Read"
              - "Job/Workspace"
              - "View/Read"
            assignments:
              - "developers"
          - name: "viewer"
            description: "Read-only users"
            permissions:
              - "Overall/Read"
              - "Job/Read"
              - "View/Read"
            assignments:
              - "viewers"

  securityRealm:
    ldap:
      configurations:
        - server: "ldap://ldap.example.com:389"
          rootDN: "dc=example,dc=com"
          inhibitInferRootDN: false
          userSearchBase: "ou=users"
          userSearch: "uid={0}"
          groupSearchBase: "ou=groups"
          groupSearchFilter: "(&(cn={0})(objectclass=groupOfNames))"
          managerDN: "cn=admin,dc=example,dc=com"
          managerPasswordSecret: "ldap-password"
          displayNameAttributeName: "displayName"
          mailAddressAttributeName: "mail"

  globalNodeProperties:
    - envVars:
        env:
          - key: "DOCKER_REGISTRY"
            value: "registry.example.com"
          - key: "KUBERNETES_NAMESPACE_PROD"
            value: "production"
          - key: "KUBERNETES_NAMESPACE_STAGING"
            value: "staging"
          - key: "SONAR_SERVER_URL"
            value: "https://sonarqube.example.com"

  clouds:
    - kubernetes:
        name: "kubernetes"
        serverUrl: "https://kubernetes.default.svc.cluster.local"
        namespace: "jenkins"
        jenkinsUrl: "http://jenkins:8080"
        jenkinsTunnel: "jenkins:50000"
        containerCapStr: 100
        maxRequestsPerHostStr: 32
        retentionTimeout: 5
        connectTimeout: 10
        readTimeout: 20
        templates:
          - name: "default"
            namespace: "jenkins"
            label: "jenkins-agent"
            nodeUsageMode: NORMAL
            containers:
              - name: "jnlp"
                image: "jenkins/inbound-agent:latest"
                workingDir: "/home/jenkins/agent"
                command: ""
                args: ""
                resourceRequestMemory: "512Mi"
                resourceRequestCpu: "500m"
                resourceLimitMemory: "1Gi"
                resourceLimitCpu: "1000m"
                envVars:
                  - envVar:
                      key: "JENKINS_URL"
                      value: "http://jenkins:8080"
              - name: "docker"
                image: "docker:dind"
                privileged: true
                workingDir: "/home/jenkins/agent"
                command: ""
                args: ""
                resourceRequestMemory: "1Gi"
                resourceRequestCpu: "500m"
                resourceLimitMemory: "2Gi"
                resourceLimitCpu: "1000m"
                envVars:
                  - envVar:
                      key: "DOCKER_TLS_CERTDIR"
                      value: ""
            volumes:
              - hostPathVolume:
                  hostPath: "/var/run/docker.sock"
                  mountPath: "/var/run/docker.sock"
            yamlMergeStrategy: "override"
            yaml: |
              apiVersion: v1
              kind: Pod
              spec:
                securityContext:
                  runAsUser: 1000
                  runAsGroup: 1000
                  fsGroup: 1000

credentials:
  system:
    domainCredentials:
      - credentials:
          - usernamePassword:
              scope: GLOBAL
              id: "docker-registry"
              username: "jenkins"
              password: "{AQAAABAAAAAQxxxxxxxxxxxxxxxxxxxxx}"
              description: "Docker Registry Credentials"
          
          - string:
              scope: GLOBAL
              id: "github-token"
              secret: "{AQAAABAAAAAQxxxxxxxxxxxxxxxxxxxxx}"
              description: "GitHub Personal Access Token"
          
          - string:
              scope: GLOBAL
              id: "sonarqube-token"
              secret: "{AQAAABAAAAAQxxxxxxxxxxxxxxxxxxxxx}"
              description: "SonarQube Authentication Token"
          
          - string:
              scope: GLOBAL
              id: "slack-token"
              secret: "{AQAAABAAAAAQxxxxxxxxxxxxxxxxxxxxx}"
              description: "Slack Bot Token"
          
          - file:
              scope: GLOBAL
              id: "kubeconfig"
              fileName: "kubeconfig"
              secretBytes: "{AQAAABAAAAAQxxxxxxxxxxxxxxxxxxxxx}"
              description: "Kubernetes Config File"
          
          - aws:
              scope: GLOBAL
              id: "aws-credentials"
              accessKey: "AKIAIOSFODNN7EXAMPLE"
              secretKey: "{AQAAABAAAAAQxxxxxxxxxxxxxxxxxxxxx}"
              description: "AWS Credentials"

unclassified:
  gitHubPluginConfig:
    configs:
      - name: "GitHub"
        apiUrl: "https://api.github.com"
        credentialsId: "github-token"
        manageHooks: true
  
  sonarGlobalConfiguration:
    installations:
      - name: "SonarQube"
        serverUrl: "https://sonarqube.example.com"
        credentialsId: "sonarqube-token"
        triggers:
          skipScmCause: false
          skipUpstreamCause: false
  
  slackNotifier:
    teamDomain: "company"
    token: "slack-token"
    room: "#jenkins"
    sendAsText: false
  
  mailer:
    defaultSuffix: "@example.com"
    smtpHost: "smtp.example.com"
    smtpPort: "587"
    useSsl: false
    useTls: true
    charset: "UTF-8"
  
  globalLibraries:
    libraries:
      - name: "shared-library"
        defaultVersion: "main"
        retriever:
          modernSCM:
            scm:
              git:
                remote: "https://github.com/company/jenkins-shared-library.git"
                credentialsId: "github-token"
        implicit: false
        allowVersionOverride: true
        includeInChangesets: true
  
  timestamper:
    allPipelines: true
    
  buildDiscarders:
    configuredBuildDiscarders:
      - "jobBuildDiscarder"
      
  logRotator:
    daysToKeep: 30
    numToKeep: 100
    artifactDaysToKeep: 14
    artifactNumToKeep: 50

jobs:
  - script: |
      folder('Applications') {
        description('Application build jobs')
      }
      
      folder('Infrastructure') {
        description('Infrastructure and deployment jobs')
      }
      
      folder('Maintenance') {
        description('Maintenance and housekeeping jobs')
      }

tool:
  git:
    installations:
      - name: "Default"
        home: "git"
  
  nodejs:
    installations:
      - name: "NodeJS-16"
        home: ""
        properties:
          - installSource:
              installers:
                - nodeJSInstaller:
                    id: "16.20.0"
                    npmPackages: "@angular/cli typescript"
      - name: "NodeJS-18"
        home: ""
        properties:
          - installSource:
              installers:
                - nodeJSInstaller:
                    id: "18.16.0"
                    npmPackages: "@angular/cli typescript"
  
  maven:
    installations:
      - name: "Maven-3"
        home: ""
        properties:
          - installSource:
              installers:
                - maven:
                    id: "3.9.2"
  
  jdk:
    installations:
      - name: "OpenJDK-11"
        home: ""
        properties:
          - installSource:
              installers:
                - adoptOpenJdkInstaller:
                    id: "jdk-11.0.19+7"
      - name: "OpenJDK-17"
        home: ""
        properties:
          - installSource:
              installers:
                - adoptOpenJdkInstaller:
                    id: "jdk-17.0.7+7"

security:
  queueItemAuthenticator:
    authenticators:
      - global:
          strategy: triggeringUsersAuthorizationStrategy
  
  sSHD:
    port: -1
  
  remotingCLI:
    enabled: false
    
  scriptApproval:
    approvedSignatures:
      - "method groovy.json.JsonSlurperClassic parseText java.lang.String"
      - "new groovy.json.JsonSlurperClassic"
      - "staticMethod org.codehaus.groovy.runtime.DefaultGroovyMethods readLines java.io.File"
      - "method java.lang.String replaceAll java.lang.String java.lang.String"

appearance:
  themeManager:
    disableUserThemes: true
    theme: "darkSystem"
```

## Docker Compose with JCasC

```yaml
# docker-compose.jenkins.yml
version: '3.8'

services:
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins-master
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "50000:50000"
    environment:
      - JAVA_OPTS=-Xmx2048m -Djava.awt.headless=true
      - JENKINS_OPTS=--httpPort=8080
      - CASC_JENKINS_CONFIG=/var/jenkins_home/casc_configs
    volumes:
      - jenkins_home:/var/jenkins_home
      - ./jenkins.yaml:/var/jenkins_home/casc_configs/jenkins.yaml:ro
      - ./plugins.txt:/usr/share/jenkins/ref/plugins.txt:ro
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - jenkins-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/login"]
      interval: 30s
      timeout: 10s
      retries: 3

  jenkins-agent:
    image: jenkins/ssh-agent:alpine
    container_name: jenkins-agent-1
    restart: unless-stopped
    environment:
      - JENKINS_AGENT_SSH_PUBKEY=ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC...
    networks:
      - jenkins-network
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  jenkins_home:
    driver: local

networks:
  jenkins-network:
    driver: bridge
```

## Plugin Configuration

```text
# plugins.txt
ant:1.13
build-timeout:1.27
credentials-binding:1.27
email-ext:2.93
git:4.11.3
github-branch-source:1677.v731f745ea_0cf
pipeline-github-lib:42.v0739460cda_c4
pipeline-stage-view:2.25
ssh-slaves:1.814.vc82d21b_23f0e
timestamper:1.17
workflow-aggregator:2.6
ws-cleanup:0.42
blueocean:1.25.2
configuration-as-code:1.62
role-strategy:3.2.0
kubernetes:3900.va_dce992317b_4
docker-plugin:1.2.9
docker-workflow:1.29
sonar:2.15
slack:2.48
pipeline-utility-steps:2.13.1
pipeline-aws:1.43
build-discarder:1.5
matrix-auth:3.1.5
ldap:2.12
github:1.34.3
nodejs:1.5.1
maven-plugin:3.19
junit:1.62
jacoco:3.3.2
htmlpublisher:1.30
```

## Job DSL Examples

```groovy
// jobs/seed-job.groovy
job('seed-job') {
    description('Seed job to create other jobs from SCM')
    
    scm {
        git {
            remote {
                url('https://github.com/company/jenkins-jobs.git')
                credentials('github-token')
            }
            branch('main')
        }
    }
    
    triggers {
        scm('H/5 * * * *')
    }
    
    steps {
        dsl {
            external('jobs/**/*.groovy')
            removeAction('DELETE')
            removeViewAction('DELETE')
        }
    }
}

// jobs/application-pipeline.groovy
pipelineJob('Applications/web-app-pipeline') {
    description('Web application CI/CD pipeline')
    
    parameters {
        stringParam('BRANCH', 'main', 'Git branch to build')
        choiceParam('ENVIRONMENT', ['staging', 'production'], 'Deployment environment')
    }
    
    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/company/web-app.git')
                        credentials('github-token')
                    }
                    branch('${BRANCH}')
                }
            }
            scriptPath('Jenkinsfile')
        }
    }
    
    triggers {
        githubPush()
    }
    
    properties {
        buildDiscarder {
            strategy {
                logRotator {
                    numToKeepStr('10')
                    daysToKeepStr('30')
                }
            }
        }
    }
}

// jobs/maintenance-jobs.groovy
job('Maintenance/cleanup-workspaces') {
    description('Clean up old workspaces')
    
    triggers {
        cron('H 2 * * 0')
    }
    
    steps {
        shell('''
            #!/bin/bash
            # Clean workspaces older than 7 days
            find $JENKINS_HOME/workspace -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
            
            # Clean up Docker images
            docker system prune -f
        ''')
    }
    
    publishers {
        mailer('admin@example.com', true, true)
    }
}

multibranchPipelineJob('Applications/microservice-pipeline') {
    description('Multi-branch pipeline for microservices')
    
    branchSources {
        github {
            id('microservice-repo')
            scanCredentialsId('github-token')
            repoOwner('company')
            repository('microservice')
            
            buildOriginBranch(true)
            buildOriginBranchWithPR(true)
            buildOriginPRMerge(false)
            buildOriginPRHead(true)
            buildForkPRMerge(true)
            buildForkPRHead(false)
        }
    }
    
    factory {
        workflowBranchProjectFactory {
            scriptPath('Jenkinsfile')
        }
    }
    
    triggers {
        periodicFolderTrigger {
            interval('5m')
        }
    }
    
    properties {
        buildDiscarder {
            strategy {
                logRotator {
                    numToKeepStr('5')
                    daysToKeepStr('14')
                }
            }
        }
    }
}
```

## Kubernetes Deployment

```yaml
# k8s/jenkins-deployment.yaml
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
      serviceAccountName: jenkins
      containers:
      - name: jenkins
        image: jenkins/jenkins:lts
        ports:
        - containerPort: 8080
        - containerPort: 50000
        env:
        - name: JAVA_OPTS
          value: "-Xmx2048m -Djava.awt.headless=true"
        - name: CASC_JENKINS_CONFIG
          value: "/var/jenkins_home/casc_configs"
        volumeMounts:
        - name: jenkins-home
          mountPath: /var/jenkins_home
        - name: jenkins-config
          mountPath: /var/jenkins_home/casc_configs
          readOnly: true
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /login
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /login
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: jenkins-home
        persistentVolumeClaim:
          claimName: jenkins-pvc
      - name: jenkins-config
        configMap:
          name: jenkins-config

---
apiVersion: v1
kind: Service
metadata:
  name: jenkins
  namespace: jenkins
spec:
  selector:
    app: jenkins
  ports:
  - name: web
    port: 8080
    targetPort: 8080
  - name: agent
    port: 50000
    targetPort: 50000
  type: LoadBalancer

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: jenkins-config
  namespace: jenkins
data:
  jenkins.yaml: |
    # Include the full jenkins.yaml content here
```

## Backup and Restore Scripts

```bash
#!/bin/bash
# backup-jenkins.sh

BACKUP_DIR="/backup/jenkins"
JENKINS_HOME="/var/jenkins_home"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting Jenkins backup at $(date)"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Stop Jenkins (if running as service)
# systemctl stop jenkins

# Create backup
tar -czf ${BACKUP_DIR}/jenkins_backup_${DATE}.tar.gz \
  --exclude='workspace' \
  --exclude='builds/*/workspace' \
  --exclude='**/.git' \
  ${JENKINS_HOME}

# Keep only last 7 backups
find ${BACKUP_DIR} -name "jenkins_backup_*.tar.gz" -mtime +7 -delete

# Start Jenkins
# systemctl start jenkins

echo "Jenkins backup completed at $(date)"
echo "Backup file: ${BACKUP_DIR}/jenkins_backup_${DATE}.tar.gz"
```

```bash
#!/bin/bash
# restore-jenkins.sh

BACKUP_FILE=$1
JENKINS_HOME="/var/jenkins_home"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Starting Jenkins restore from $BACKUP_FILE"

# Stop Jenkins
# systemctl stop jenkins

# Backup current installation
mv ${JENKINS_HOME} ${JENKINS_HOME}.old.$(date +%Y%m%d_%H%M%S)

# Create new Jenkins home
mkdir -p ${JENKINS_HOME}

# Extract backup
tar -xzf ${BACKUP_FILE} -C /

# Set permissions
chown -R jenkins:jenkins ${JENKINS_HOME}

# Start Jenkins
# systemctl start jenkins

echo "Jenkins restore completed"
```

This comprehensive configuration provides:

1. **Complete automation** of Jenkins setup
2. **Security configuration** with RBAC and LDAP
3. **Cloud integration** with Kubernetes
4. **Tool management** with automatic installations
5. **Plugin management** through code
6. **Job creation** through DSL
7. **Backup and restore** procedures
8. **Kubernetes deployment** manifests