# Fix: su-exec not found Error

## Problem
n8n Docker image doesn't include `su-exec` utility.

## ✅ Fixed Solution

Replace your n8n-import service with this corrected version:

```yaml
n8n-import:
  <<: *service-n8n
  hostname: n8n-import
  container_name: n8n-import
  user: root
  entrypoint: /bin/sh
  command:
    - "-c"
    - |
      echo 'Installing FHIR custom nodes...' &&
      npm install -g https://github.com/mudux/ruphasoft_n8n.git &&
      echo 'Fixing ownership...' &&
      chown -R node:node /home/node/.n8n &&
      echo 'Importing credentials...' &&
      runuser -u node -- n8n import:credentials --separate --input=/demo-data/credentials &&
      echo 'Importing workflows...' &&
      runuser -u node -- n8n import:workflow --separate --input=/demo-data/workflows &&
      echo 'Import completed successfully!'
  volumes:
    - n8n_storage:/home/node/.n8n
    - ./n8n/demo-data:/demo-data
  depends_on:
    postgres:
      condition: service_healthy
```

## Alternative Solutions

### Option 1: Use `runuser` (Recommended)
```bash
runuser -u node -- n8n import:credentials --separate --input=/demo-data/credentials
runuser -u node -- n8n import:workflow --separate --input=/demo-data/workflows
```

### Option 2: Use `gosu` (if available)
```bash
gosu node n8n import:credentials --separate --input=/demo-data/credentials
gosu node n8n import:workflow --separate --input=/demo-data/workflows
```

### Option 3: Install su-exec first
```bash
apk add --no-cache su-exec &&
su-exec node n8n import:credentials --separate --input=/demo-data/credentials
```

### Option 4: Simplest - Skip user switching for import only
```yaml
# Run everything as root (less secure but works)
command:
  - "-c"
  - |
    npm install -g https://github.com/mudux/ruphasoft_n8n.git &&
    chown -R node:node /home/node/.n8n &&
    n8n import:credentials --separate --input=/demo-data/credentials &&
    n8n import:workflow --separate --input=/demo-data/workflows
```

## 🚀 Recommended Fix (Complete Service)

```yaml
n8n-import:
  <<: *service-n8n
  hostname: n8n-import
  container_name: n8n-import
  user: root
  entrypoint: /bin/sh
  command: >
    -c "
      echo 'Installing FHIR nodes...' &&
      npm install -g https://github.com/mudux/ruphasoft_n8n.git &&
      echo 'Package installed successfully!' &&
      chown -R node:node /home/node/.n8n &&
      echo 'Starting import as node user...' &&
      runuser -u node -- n8n import:credentials --separate --input=/demo-data/credentials &&
      runuser -u node -- n8n import:workflow --separate --input=/demo-data/workflows &&
      echo 'All operations completed!'
    "
  volumes:
    - n8n_storage:/home/node/.n8n
    - ./n8n/demo-data:/demo-data
  depends_on:
    postgres:
      condition: service_healthy
```

The `runuser` command is available in most Linux containers and is the correct replacement for `su-exec` in this context.