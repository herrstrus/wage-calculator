# Wage Calculator - Azure Deployment Guide (No Git Required)

Your web app is created! Now let's deploy it to Azure Static Web Apps using Azure CLI.

## Prerequisites
You need:
- Azure account with an active subscription
- Azure CLI installed (`az` command)

## Quick Deployment Steps

## Test the App Locally
Before deploying, you can test it locally:
```bash
cd wage-calculator
# Open in your browser or use a simple server:
python3 -m http.server 8000
# Then open: http://localhost:8000
```


### Option A: Using Azure CLI (Recommended - 2 minutes)

1. **Install Azure CLI** (if not already installed):
   ```bash
   # On macOS:
   brew install azure-cli
   
   # Then login to Azure:
   az login
   ```

2. **Create a resource group** (replace values with your preference):
   ```bash
   az group create \
     --name wage-calculator-rg \
     --location eastus2
   ```

3. **Deploy to Static Web Apps**:
   ```bash
   cd /Users/ireneusz.przeplata/Documents/git/azure/eq4-w365-us/wage-calculator
   
   az staticwebapp create \
     --name wage-calculator-app \
     --resource-group wage-calculator-rg \
     --source . \
     --location eastus2 \
     --sku Free
   ```

4. **Get your live URL**:
   ```bash
   az staticwebapp show \
     --name wage-calculator-app \
     --resource-group wage-calculator-rg \
     --query "defaultHostname" \
     --output tsv
   ```

Your app will be live in minutes! You'll get a URL like: `https://wage-calculator-app.azurestaticapps.net`

---

### Option B: Using Azure Portal (No CLI)

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Static Web Apps"
3. Click "+ Create Static Web App"
4. Fill in:
   - **Name**: wage-calculator-app
   - **Region**: East US 2 (or your preference)
   - **Source**: Choose "Other" (upload files)
5. After creation, upload the `index.html` file from the `wage-calculator` folder

---

## File Structure
```
wage-calculator/
└── index.html (your complete app - just 1 file!)
```

## Features Included
✅ Professional UI with gradient background
✅ Real-time calculation as you type
✅ Polish & English labels
✅ Responsive design (works on mobile)
✅ Formula display
✅ Input validation
✅ Currency formatting

## How It Works
1. User enters: Monthly Rate (e.g., 25,000 PLN) + Hours Worked (e.g., 160)
2. App calculates:
   - Hourly Rate: (Monthly Rate × 12) ÷ 231 ÷ 8
   - Monthly Salary: (Hourly Rate × Hours Worked) + 300 PLN bonus
   - Annual Salary: Monthly Salary × 12


---

## Costs
- **Azure Static Web Apps Free Tier**: 100% FREE for small apps
- No credit card needed
- Great for calculators, portfolios, documentation

## Next Steps
Once deployed, you can:
- Share the URL with anyone
- Add your custom domain later
- Modify the app and re-deploy

Need help? Let me know!
