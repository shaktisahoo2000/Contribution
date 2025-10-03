# Kubernetes Commands Cheat Sheet

Comprehensive reference for kubectl commands organized by category.

## Cluster Information

```bash
# Cluster info
kubectl cluster-info
kubectl cluster-info dump

# Node information
kubectl get nodes
kubectl get nodes -o wide
kubectl describe node <node-name>
kubectl top nodes

# API versions
kubectl api-versions
kubectl api-resources
```

## Pod Operations

### Basic Pod Commands
```bash
# List pods
kubectl get pods
kubectl get pods -o wide
kubectl get pods -A  # All namespaces
kubectl get pods -n <namespace>

# Describe pods
kubectl describe pod <pod-name>
kubectl describe pod <pod-name> -n <namespace>

# Create pod
kubectl run nginx --image=nginx
kubectl run nginx --image=nginx --dry-run=client -o yaml

# Delete pods
kubectl delete pod <pod-name>
kubectl delete pods --all
kubectl delete pods -l app=nginx
```

### Pod Troubleshooting
```bash
# View logs
kubectl logs <pod-name>
kubectl logs <pod-name> -c <container-name>
kubectl logs <pod-name> --previous
kubectl logs -f <pod-name>  # Follow logs
kubectl logs -l app=nginx   # Logs from all pods with label

# Execute commands in pod
kubectl exec <pod-name> -- <command>
kubectl exec -it <pod-name> -- /bin/bash
kubectl exec -it <pod-name> -c <container-name> -- /bin/sh

# Port forwarding
kubectl port-forward <pod-name> 8080:80
kubectl port-forward pods/<pod-name> 8080:80

# Copy files
kubectl cp <pod-name>:/path/to/file /local/path
kubectl cp /local/path <pod-name>:/path/to/file
```

## Deployments

### Deployment Management
```bash
# Create deployment
kubectl create deployment nginx --image=nginx
kubectl create deployment nginx --image=nginx --replicas=3

# Get deployments
kubectl get deployments
kubectl get deployments -o wide
kubectl describe deployment <deployment-name>

# Scale deployment
kubectl scale deployment <deployment-name> --replicas=5

# Update deployment
kubectl set image deployment/<deployment-name> <container-name>=<new-image>
kubectl patch deployment <deployment-name> -p '{"spec":{"replicas":3}}'

# Rollout management
kubectl rollout status deployment/<deployment-name>
kubectl rollout history deployment/<deployment-name>
kubectl rollout undo deployment/<deployment-name>
kubectl rollout restart deployment/<deployment-name>

# Delete deployment
kubectl delete deployment <deployment-name>
```

### Replica Sets and ReplicationControllers
```bash
# ReplicaSets
kubectl get replicasets
kubectl get rs
kubectl describe rs <replicaset-name>
kubectl delete rs <replicaset-name>

# ReplicationControllers
kubectl get replicationcontrollers
kubectl get rc
kubectl describe rc <rc-name>
kubectl delete rc <rc-name>
```

## Services and Networking

### Service Operations
```bash
# Get services
kubectl get services
kubectl get svc
kubectl get svc -o wide

# Describe service
kubectl describe service <service-name>

# Create service
kubectl expose deployment <deployment-name> --port=80 --target-port=8080
kubectl expose pod <pod-name> --port=80 --target-port=8080 --type=NodePort

# Delete service
kubectl delete service <service-name>

# Test service connectivity
kubectl exec -it <pod-name> -- nslookup <service-name>
kubectl exec -it <pod-name> -- curl <service-name>:<port>
```

### Ingress
```bash
# Get ingress
kubectl get ingress
kubectl get ing
kubectl describe ingress <ingress-name>

# Delete ingress
kubectl delete ingress <ingress-name>
```

### Network Policies
```bash
# Get network policies
kubectl get networkpolicies
kubectl get netpol
kubectl describe netpol <policy-name>

# Delete network policy
kubectl delete netpol <policy-name>
```

## Storage

### Persistent Volumes and Claims
```bash
# Persistent Volumes
kubectl get persistentvolumes
kubectl get pv
kubectl describe pv <pv-name>

# Persistent Volume Claims
kubectl get persistentvolumeclaims
kubectl get pvc
kubectl describe pvc <pvc-name>

# Storage Classes
kubectl get storageclasses
kubectl get sc
kubectl describe sc <storage-class-name>
```

## Configuration and Secrets

### ConfigMaps
```bash
# Get ConfigMaps
kubectl get configmaps
kubectl get cm
kubectl describe cm <configmap-name>

# Create ConfigMap
kubectl create configmap <name> --from-literal=key=value
kubectl create configmap <name> --from-file=<file-path>
kubectl create configmap <name> --from-env-file=<env-file>

# Delete ConfigMap
kubectl delete configmap <configmap-name>
```

### Secrets
```bash
# Get secrets
kubectl get secrets
kubectl describe secret <secret-name>

# Create secret
kubectl create secret generic <name> --from-literal=key=value
kubectl create secret generic <name> --from-file=<file-path>
kubectl create secret docker-registry <name> \
  --docker-server=<server> \
  --docker-username=<username> \
  --docker-password=<password>

# Decode secret
kubectl get secret <secret-name> -o jsonpath='{.data.key}' | base64 -d

# Delete secret
kubectl delete secret <secret-name>
```

## Jobs and CronJobs

### Jobs
```bash
# Get jobs
kubectl get jobs
kubectl describe job <job-name>

# Create job
kubectl create job hello --image=busybox -- echo "Hello World"

# Delete job
kubectl delete job <job-name>
```

### CronJobs
```bash
# Get cronjobs
kubectl get cronjobs
kubectl get cj
kubectl describe cronjob <cronjob-name>

# Create cronjob
kubectl create cronjob hello --image=busybox --schedule="*/1 * * * *" -- echo "Hello World"

# Delete cronjob
kubectl delete cronjob <cronjob-name>
```

## Namespaces

```bash
# Get namespaces
kubectl get namespaces
kubectl get ns

# Create namespace
kubectl create namespace <namespace-name>

# Set default namespace
kubectl config set-context --current --namespace=<namespace-name>

# Delete namespace
kubectl delete namespace <namespace-name>

# Get resources in all namespaces
kubectl get pods --all-namespaces
kubectl get all -A
```

## Resource Quotas and Limits

```bash
# Resource quotas
kubectl get resourcequotas
kubectl get quota
kubectl describe quota <quota-name>

# Limit ranges
kubectl get limitranges
kubectl get limits
kubectl describe limits <limit-name>
```

## RBAC (Role-Based Access Control)

```bash
# Roles and ClusterRoles
kubectl get roles
kubectl get clusterroles
kubectl describe role <role-name>
kubectl describe clusterrole <clusterrole-name>

# RoleBindings and ClusterRoleBindings
kubectl get rolebindings
kubectl get clusterrolebindings
kubectl describe rolebinding <rolebinding-name>

# Service Accounts
kubectl get serviceaccounts
kubectl get sa
kubectl describe sa <service-account-name>

# Check permissions
kubectl auth can-i create pods
kubectl auth can-i create pods --as=system:serviceaccount:default:default
```

## Labels and Annotations

```bash
# Add label
kubectl label pods <pod-name> environment=production
kubectl label nodes <node-name> disktype=ssd

# Remove label
kubectl label pods <pod-name> environment-

# Get resources by label
kubectl get pods -l environment=production
kubectl get pods -l 'environment in (production,staging)'
kubectl get pods -l environment!=production

# Add annotation
kubectl annotate pods <pod-name> description="My pod description"

# Remove annotation
kubectl annotate pods <pod-name> description-
```

## Patch and Update

```bash
# Strategic merge patch
kubectl patch deployment <deployment-name> -p '{"spec":{"replicas":3}}'

# JSON patch
kubectl patch pod <pod-name> --type='json' -p='[{"op": "replace", "path": "/spec/containers/0/image", "value":"nginx:1.20"}]'

# Apply from file
kubectl apply -f <file.yaml>
kubectl apply -f <directory>/
kubectl apply -k <kustomization-directory>

# Replace resource
kubectl replace -f <file.yaml>

# Edit resource
kubectl edit deployment <deployment-name>
```

## Monitoring and Debugging

```bash
# Resource usage
kubectl top nodes
kubectl top pods
kubectl top pods -A

# Events
kubectl get events
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl get events --field-selector involvedObject.name=<pod-name>

# Describe all resources of a type
kubectl describe pods

# Debugging failed pods
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
kubectl get events --field-selector involvedObject.name=<pod-name>
```

## Output Formatting

```bash
# Different output formats
kubectl get pods -o wide
kubectl get pods -o yaml
kubectl get pods -o json
kubectl get pods -o name

# JSONPath queries
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{.items[*].status.phase}'

# Custom columns
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu
```

## Advanced Commands

```bash
# Dry run
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml

# Explain resources
kubectl explain pods
kubectl explain pods.spec
kubectl explain pods.spec.containers

# API server proxy
kubectl proxy
kubectl proxy --port=8080

# Drain and cordon nodes
kubectl drain <node-name> --ignore-daemonsets
kubectl cordon <node-name>
kubectl uncordon <node-name>

# Taint nodes
kubectl taint nodes <node-name> key=value:NoSchedule
kubectl taint nodes <node-name> key-

# Annotations and finalizers
kubectl patch deployment <deployment-name> -p '{"metadata":{"finalizers":null}}'
```

## Context and Configuration

```bash
# Contexts
kubectl config get-contexts
kubectl config current-context
kubectl config use-context <context-name>
kubectl config set-context <context-name> --namespace=<namespace>

# Credentials
kubectl config view
kubectl config set-credentials <user> --token=<token>

# Clusters
kubectl config get-clusters
kubectl config set-cluster <cluster-name> --server=<server-url>
```

## Useful Aliases

Add these to your shell configuration (`.bashrc`, `.zshrc`):

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployment'
alias kdp='kubectl describe pod'
alias kds='kubectl describe svc'
alias kdd='kubectl describe deployment'
alias kl='kubectl logs'
alias kex='kubectl exec -it'
alias kpf='kubectl port-forward'
alias kaf='kubectl apply -f'
alias kdf='kubectl delete -f'
```

## Tips and Tricks

1. **Use `-o wide` for more information**
2. **Use `--dry-run=client -o yaml` to generate YAML**
3. **Use labels effectively for resource management**
4. **Use `kubectl explain` to understand resource specifications**
5. **Use `watch kubectl get pods` to monitor changes**
6. **Use `kubectl logs -f` to follow logs in real-time**
7. **Use `kubectl exec -it` for debugging**
8. **Use resource quotas and limits for resource management**