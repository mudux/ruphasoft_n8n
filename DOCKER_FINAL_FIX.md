# Docker Permission Fix - Final Solution

## ✅ Updated for Your Repository

Repository: **https://github.com/mudux/ruphasoft_n8n.git**

## 🚀 Quick Fix for Your Current docker-compose.yml

Just replace your `n8n-import` service with this:

```yaml
n8n-import:
  <<: *service-n8n
  hostname: n8n-import
  container_name: n8n-import
  user: root  # ADD THIS LINE - fixes npm permission issue
  entrypoint: /bin/sh
  command:
    - "-c"
    - |
      echo 'Installing FHIR custom nodes...' &&
      npm install -g https://github.com/mudux/ruphasoft_n8n.git &&
      echo 'Fixing ownership...' &&
      chown -R node:node /home/node/.n8n &&
      echo 'Importing credentials...' &&
      su-exec node n8n import:credentials --separate --input=/demo-data/credentials &&
      echo 'Importing workflows...' &&
      su-exec node n8n import:workflow --separate --input=/demo-data/workflows &&
      echo 'Import completed successfully!'
  volumes:
    - n8n_storage:/home/node/.n8n  # ADD THIS LINE - shares with main n8n
    - ./n8n/demo-data:/demo-data
  depends_on:
    postgres:
      condition: service_healthy
```

And update your main `n8n` service to add this line:

```yaml
n8n:
  <<: *service-n8n
  # ... your existing config ...
  command: ["n8n", "start"]  # ADD THIS LINE
  volumes:
    - n8n_storage:/home/node/.n8n  # Make sure this line exists
    - ./n8n/demo-data:/demo-data
    - ./shared:/data/shared
  depends_on:
    postgres:
      condition: service_healthy
    n8n-import:
      condition: service_completed_successfully
```

## 🔧 What This Fix Does

1. **`user: root`** - Runs npm install with proper permissions
2. **Installs from your repo** - `https://github.com/mudux/ruphasoft_n8n.git`
3. **`chown -R node:node`** - Fixes ownership after installation
4. **`su-exec node`** - Switches back to node user for n8n operations
5. **Shared volume** - Both services use same `n8n_storage` volume

## 🧪 Test the Fix

```bash
# Test the installation
docker-compose up n8n-import

# You should see:
# Installing FHIR custom nodes...
# Fixing ownership...
# Importing credentials...
# Importing workflows...
# Import completed successfully!

# Then start the main service
docker-compose up n8n

# n8n should start normally with your custom nodes available
```

## ✅ No More Permission Errors

The **EACCES: permission denied, mkdir** error should be completely resolved because:

- ✅ **Root permissions** for npm global install
- ✅ **Proper ownership** restoration for n8n user
- ✅ **Correct user context** switching for n8n operations
- ✅ **Shared storage** between installation and runtime

## 🎯 Expected Results

After applying this fix:

1. **n8n-import** completes successfully without permission errors
2. **Your FHIR custom nodes** are installed and available
3. **Main n8n service** starts with all custom nodes loaded
4. **Credentials and workflows** import correctly

Your repository at `https://github.com/mudux/ruphasoft_n8n.git` will be installed successfully! 🚀