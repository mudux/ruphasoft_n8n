# Fix: Custom Nodes Not Visible in n8n

## Problem
Custom nodes installed via npm global installation may not appear in the n8n UI because they're not in the expected custom directory.

## ✅ Solution Implemented

Based on community feedback, I've updated the docker-compose files to use the correct approach:

### What Changed:

**OLD (npm global install - nodes not visible):**
```bash
npm install -g *.tgz  # Installs to /usr/local/lib/node_modules
```

**NEW (copy to custom directory - nodes visible):**
```bash
mkdir -p /home/node/.n8n/custom &&
cp -r * /home/node/.n8n/custom/ &&
chown -R node:node /home/node/.n8n
```

### How n8n Custom Nodes Work:

1. **n8n looks for custom nodes in**: `/home/node/.n8n/custom/`
2. **Environment variable**: `N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom` (already set)
3. **File structure expected**:
   ```
   /home/node/.n8n/custom/
   ├── package.json
   ├── nodes/
   │   ├── patient.js
   │   ├── appointment.js
   │   └── ...
   └── node_modules/
   ```

## 🔄 Steps to See Custom Nodes:

### 1. Run the Updated Docker Compose
```bash
docker-compose down
docker-compose up n8n-import  # Install custom nodes
docker-compose up n8n         # Start main n8n service
```

### 2. Clear Browser Cache
- **Chrome/Edge**: Ctrl+Shift+R (hard refresh)
- **Firefox**: Ctrl+F5
- **Or**: Open developer tools → right-click refresh → Empty Cache and Hard Reload

### 3. Check n8n UI
- Go to `http://localhost:5678`
- Look in the node panel for your FHIR nodes
- They should appear in the "Custom" category or under "Transform"

## 🔍 Verify Installation

### Check if files are in the right location:
```bash
# Verify custom nodes directory exists and has files
sudo docker exec n8n ls -la /home/node/.n8n/custom/

sudo docker exec n8n cat /home/node/.n8n/custom/package.json

sudo docker exec -it n8n sh

# Check if your nodes are there
sudo docker exec n8n find /home/node/.n8n/custom -name "*.js" -type f
```

### Check n8n logs for custom node loading:
```bash
sudo docker logs n8n | grep -i custom
sudo docker logs n8n | grep -i node
```

## 📁 Expected File Structure After Fix:

```
/home/node/.n8n/custom/
├── package.json                    # Your package metadata
├── nodes/                         # Node implementations
│   ├── index.js                   # Node registry
│   ├── patient.js                 # Patient FHIR node
│   ├── appointment.js             # Appointment FHIR node
│   ├── bundle.js                  # Bundle FHIR node
│   ├── claimResponse.js           # ClaimResponse FHIR node
│   └── eligibilityResponse.js     # EligibilityResponse FHIR node
├── src/                           # Source utilities
│   ├── mapping/
│   ├── validation/
│   └── utils/
└── node_modules/                  # Installed dependencies
```

## 🎯 Why This Works:

1. **Direct file access** - n8n can directly read the node files
2. **Proper location** - Files are where n8n expects them (`/custom/` directory)
3. **Correct permissions** - Files owned by `node:node` user
4. **Dependencies available** - `npm install` in the custom directory

## 🚨 If Nodes Still Don't Appear:

### 1. Check n8n Environment Variables:
```bash
sudo docker exec n8n env | grep N8N_CUSTOM
# Should show: N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
```

### 2. Restart n8n Service:
```bash
sudo docker restart n8n
```

### 3. Check Package.json Structure:
Make sure your repository has proper n8n configuration in package.json:
```json
{
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": [
      "nodes/patient.js",
      "nodes/appointment.js",
      "nodes/bundle.js",
      "nodes/claimResponse.js",
      "nodes/eligibilityResponse.js"
    ]
  }
}
```

## 🎉 Success Indicators:

- ✅ Custom nodes appear in n8n node panel
- ✅ You can drag FHIR nodes into workflows
- ✅ Nodes show proper names and descriptions
- ✅ No "node not found" errors in logs

**This approach directly places the custom node files where n8n expects to find them!** 🚀