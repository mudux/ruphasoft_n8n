# Fix: npm error code 236 - git dep preparation failed

## Problem
```
npm error code 236
npm error git dep preparation failed
npm error ENOTDIR: not a directory, rename '/usr/local/lib/node_modules/fhir-n8n-custom-nodes'
```

This indicates npm cannot properly install the package from GitHub.

## ✅ Solution Options

### Option 1: Git Clone + Local Install (Most Reliable)

```yaml
n8n-import:
  <<: *service-n8n
  hostname: n8n-import
  container_name: n8n-import
  user: root
  entrypoint: /bin/sh
  command: >
    -c "
      echo 'Installing git and dependencies...' &&
      apk add --no-cache git &&
      echo 'Cloning repository...' &&
      cd /tmp &&
      git clone https://github.com/mudux/ruphasoft_n8n.git ruphasoft-pkg &&
      cd ruphasoft-pkg &&
      echo 'Installing dependencies locally...' &&
      npm install --production &&
      echo 'Creating package and installing globally...' &&
      npm pack &&
      npm install -g *.tgz &&
      echo 'Package installed successfully!' &&
      chown -R node:node /home/node/.n8n &&
      echo 'Importing credentials...' &&
      runuser -u node -- n8n import:credentials --separate --input=/demo-data/credentials &&
      echo 'Importing workflows...' &&
      runuser -u node -- n8n import:workflow --separate --input=/demo-data/workflows &&
      echo 'Import completed successfully!'
    "
  volumes:
    - n8n_storage:/home/node/.n8n
    - ./n8n/demo-data:/demo-data
  depends_on:
    postgres:
      condition: service_healthy
```

### Option 2: Clean Directory + Force Install

```yaml
command: >
  -c "
    echo 'Cleaning previous installation attempts...' &&
    rm -rf /usr/local/lib/node_modules/fhir-n8n-custom-nodes* &&
    rm -rf /usr/local/lib/node_modules/.fhir-n8n-custom-nodes* &&
    npm cache clean --force &&
    echo 'Installing with force flags...' &&
    npm install -g --force --no-package-lock git+https://github.com/mudux/ruphasoft_n8n.git &&
    echo 'Installation completed!' &&
    chown -R node:node /home/node/.n8n &&
    runuser -u node -- n8n import:credentials --separate --input=/demo-data/credentials &&
    runuser -u node -- n8n import:workflow --separate --input=/demo-data/workflows
  "
```

### Option 3: Alternative GitHub URL Formats

```yaml
# Try different GitHub URL formats:
# Format 1: git+https://
npm install -g git+https://github.com/mudux/ruphasoft_n8n.git

# Format 2: Direct tarball
npm install -g https://github.com/mudux/ruphasoft_n8n/tarball/main

# Format 3: Specific branch/tag
npm install -g git+https://github.com/mudux/ruphasoft_n8n.git#main
```

### Option 4: Skip Custom Nodes (Temporary)

```yaml
# Just import data without custom nodes to test the rest
n8n-import:
  <<: *service-n8n
  hostname: n8n-import
  container_name: n8n-import
  entrypoint: /bin/sh
  command: >
    -c "
      echo 'Skipping custom nodes, importing data only...' &&
      n8n import:credentials --separate --input=/demo-data/credentials &&
      n8n import:workflow --separate --input=/demo-data/workflows &&
      echo 'Import completed without custom nodes!'
    "
  volumes:
    - n8n_storage:/home/node/.n8n
    - ./n8n/demo-data:/demo-data
  depends_on:
    postgres:
      condition: service_healthy
```

## 🔍 Repository Structure Check

The error might be because the repository doesn't have the right structure for npm installation. Check if your repository has:

```
repository/
├── package.json    # Required with proper n8n config
├── nodes/          # Directory with your node files
└── README.md
```

## ✅ Recommended Fix (Complete Solution)

Replace your n8n-import service with this robust version:

```yaml
n8n-import:
  <<: *service-n8n
  hostname: n8n-import
  container_name: n8n-import
  user: root
  entrypoint: /bin/sh
  command: >
    -c "
      echo 'Setting up environment...' &&
      apk add --no-cache git curl &&

      echo 'Cleaning any previous installation...' &&
      rm -rf /usr/local/lib/node_modules/*fhir* ||true &&
      npm cache clean --force ||true &&

      echo 'Attempting installation method 1: Direct GitHub...' &&
      (npm install -g --force git+https://github.com/mudux/ruphasoft_n8n.git && echo 'Method 1 succeeded') ||

      echo 'Method 1 failed, trying method 2: Clone and local install...' &&
      (cd /tmp &&
       git clone https://github.com/mudux/ruphasoft_n8n.git custom-nodes &&
       cd custom-nodes &&
       npm install --production &&
       npm pack &&
       npm install -g *.tgz &&
       echo 'Method 2 succeeded') ||

      echo 'Both methods failed, continuing without custom nodes...' &&

      echo 'Fixing ownership...' &&
      chown -R node:node /home/node/.n8n &&

      echo 'Importing n8n data...' &&
      runuser -u node -- n8n import:credentials --separate --input=/demo-data/credentials &&
      runuser -u node -- n8n import:workflow --separate --input=/demo-data/workflows &&
      echo 'Import completed!'
    "
  volumes:
    - n8n_storage:/home/node/.n8n
    - ./n8n/demo-data:/demo-data
  depends_on:
    postgres:
      condition: service_healthy
```

## 🚨 If Nothing Works

The issue might be with the repository structure. Check:

1. **Is the repository actually an n8n package?**
   - Look for `package.json` with n8n configuration
   - Check if it has proper node files

2. **Try a different installation approach:**
   - Download as ZIP and install locally
   - Use a different custom nodes repository
   - Install nodes manually after n8n starts

This comprehensive solution tries multiple installation methods and falls back gracefully if the custom nodes can't be installed.