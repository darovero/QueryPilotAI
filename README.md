<div align="center">
  <img src="frontend/assets/PITCH/01_primary_lockup_dark.png" alt="QueryPilotAI Banner" />

  <br />
  <br />

  <h3>Fraud-Oriented Analytical Engineering Agent</h3>

  <p>
    <a href="#quick-start"><b>Quick Start</b></a> •
    <a href="#configuration"><b>Configuration</b></a> •
    <a href="#operations-guide"><b>Operations Guide</b></a>
  </p>

  <p>
    <a href="https://github.com/darovero/QueryPilotAI/issues"><img src="https://img.shields.io/github/issues/darovero/QueryPilotAI?color=yellow&style=flat-square" alt="Issues" /></a>
    <a href="https://github.com/darovero/QueryPilotAI/pulls"><img src="https://img.shields.io/github/issues-pr/darovero/QueryPilotAI?color=orange&style=flat-square" alt="Pull Requests" /></a>
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" />
  </p>

  <p>
    ⭐ <b>Like what we're doing? Give us a star!</b> ⭐
  </p>
</div>

---

**QueryPilotAI (InsightForge AI)** is an end-to-end analytical engineering platform focused on fraud detection. It transforms natural language questions into structured analytical plans, generates validated and governed SQL, executes secure queries over Azure SQL, and delivers executive explanations with full traceability, human approval workflows, and deep observability.

## 🎯 Objectives
- **Translate** business questions into structured analytical intent.
- **Generate** governed and secure SQL queries.
- **Enforce** validation rules, transparency, and human-in-the-loop approvals.
- **Explain** results in clear, enterprise-ready language.
- **Demonstrate** responsible AI, broad integration of Azure services, and reproducibility.

## 🛠 Tech Stack
- **Frontend:** Next.js / React / TypeScript
- **Backend:** Azure Functions Isolated Worker (.NET 8)
- **Orchestration:** Durable Functions
- **AI Engine:** Azure OpenAI
- **Security:** Azure AI Content Safety
- **Data Layer:** Azure SQL Database
- **Observability:** Application Insights + Azure Monitor
- **Secrets:** Azure Key Vault
- **Identity:** Microsoft Entra ID

## 📂 Project Structure
- `docs/`: Architecture, technical decisions, roadmap, and demo context.
- `frontend/`: Modern UI, chat interface, and transparency dashboards.
- `backend/`: Azure Functions, workflow orchestration, domain logic, and rules.
- `database/`: SQL schema, security, views, and seed data.
- `infra/`: IaC (Bicep) and deployment scripts.
- `test-assets/`: Testing prompts and validation datasets.

## 💡 Suggested Demo Flows
1. **Secure Query & Auto-Execution:** Normal analytical queries that run safely.
2. **Sensitive Query:** Triggers a manual human approval flow before execution.
3. **Abusive Prompt or Unsafe Query:** Immediately blocked by safety classifiers.

<br />

## 🚀 Quick Start <a id="quick-start"></a>

1. **Provision Azure Resources** by running `infra/deploy.ps1` or `infra/deploy.sh`.
2. **Initialize Database** by executing the SQL scripts within the `database/` directory.
3. **Configure Environment Variables** for your Backend and Frontend (see details below).
4. **Start Services** locally.
5. **Run Tests** using the sample queries in `test-assets/`.

<br />

## ⚙️ Configuration & Environment Variables <a id="configuration"></a>

*For this project, actual credentials can be found in `docs/CLAVES_Y_CREDENCIALES.md` (internal hackathon use only).* 
> ⚠️ **IMPORTANT:** Never upload real API keys or embedded secrets to the source code repository.

### Backend (`backend/src/Functions.Api/local.settings.json`)

Create or update your `local.settings.json` in the API folder with the following structure, replacing `<VALUES>` with actual credentials from the secure document:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "<YOUR_STORAGE_ACCOUNT_CONNECTION_STRING>",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=tcp:<YOUR_SERVER>.database.windows.net,1433;Initial Catalog=<USER_DB>;Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;",
    "AppDbConnectionString": "Server=tcp:<YOUR_SERVER>.database.windows.net,1433;Initial Catalog=<APP_DB>;Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;",
    "AzureOpenAI__Endpoint": "https://<YOUR_OPENAI_RESOURCE>.openai.azure.com/openai/v1",
    "AzureOpenAI__Deployment": "gpt-4o-mini",
    "AzureOpenAI__ApiKey": "<YOUR_OPENAI_API_KEY>",
    "ContentSafety__Endpoint": "https://<YOUR_SAFETY_RESOURCE>.api.cognitive.microsoft.com/",
    "FoundryAgent__ProjectEndpoint": "https://<YOUR_FOUNDRY_RESOURCE>.services.ai.azure.com/api/projects/<YOUR_PROJECT>",
    "FoundryAgent__SqlPlannerAgentId": "<SQL_PLANNER_ASST_ID>",
    "FoundryAgent__ResultInterpreterAgentId": "<RESULT_INTERPRETER_ASST_ID>",
    "FoundryAgent__ConciergeAgentId": "<CONCIERGE_ASST_ID>"
  }
}
```

### Frontend (`frontend/.env.local`)

Create a `.env.local` file in the `frontend/` directory with your Entra ID details:

```env
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=<YOUR_AZURE_AD_CLIENT_ID>
NEXT_PUBLIC_AZURE_AD_TENANT_ID=common
NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/common
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
```

### Entra ID App Registration Requirements

Before authenticating, configure your App Registration in Microsoft Entra ID. Set the platform type to `Single-page application` or `Web` based on your identity strategy, and ensure you add the exact Redirect URIs used by the frontend:

- **Local:** `http://localhost:3000/`
- **Azure App Service:** `https://ifdev2-web.azurewebsites.net`

> *Note: If deploying with a custom hostname, ensure it's registered exactly as an authorized Redirect URI to avoid the `AADSTS50011` error.*

For Azure deployments, the frontend authority URL is composed of: `https://login.microsoftonline.com/<tenant-id>`

<br />

## 💻 Operations Guide (PowerShell) <a id="operations-guide"></a>

Quick command reference optimized for **PowerShell** to help manage your local development lifecycle.

### 1. Kill All Running Processes
Kill Node.js (frontend) and .NET/func (backend) streams with a single command:
```powershell
taskkill /F /IM node.exe /T 2>$null; taskkill /F /IM dotnet.exe /T 2>$null; taskkill /F /IM func.exe /T 2>$null
```

### 2. Start Project Services

**Backend (Azure Functions - Port 7071):**
```powershell
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\backend\src\Functions.Api
func start
```

**Frontend (Next.js - Port 3000):** *(Run in a separate PowerShell window)*
```powershell
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\frontend
npm run dev
```

**Verify Processes Are Running:**
```powershell
Get-NetTCPConnection -LocalPort 7071,3000 -ErrorAction SilentlyContinue | Select LocalPort, State
```

### 3. Test Azure SQL Connection (API: `/api/test-connection`)

**Directly via Backend:**
```powershell
$body = @{
    type     = "Azure SQL"
    host     = "tcp:insightforge-sql3-86253.database.windows.net"
    database = "insightforge-sqldb"
    username = "sqladminif"
    password = "QueryPilot@2026!"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/test-connection" -Body $body -ContentType "application/json"
```

**Via Frontend (Proxy configuration):**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/test-connection" -Body $body -ContentType "application/json"
```

### 4. Direct Database Connection Test (No API)

```powershell
$connString = "Server=tcp:insightforge-sql3-86253.database.windows.net,1433;Initial Catalog=insightforge-sqldb;Persist Security Info=False;User ID=sqladminif;Password=QueryPilot@2026!;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    Write-Host "✅ Direct connection successful"
    $conn.Close()
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)"
}
```

### 5. Send an NLP Query (API: `/api/query`)

```powershell
$query = @{
    question      = "Show me the top 10 most recent transactions"
    userId        = "user@agent.com"
    role          = "FraudAnalyst"
    correlationId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    sessionId     = "console-test"
    connection    = @{
        type     = "Azure SQL"
        host     = "tcp:insightforge-sql3-86253.database.windows.net"
        database = "insightforge-sqldb"
        username = "sqladminif"
        password = "QueryPilot@2026!"
    }
} | ConvertTo-Json -Depth 3

$result = Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/query" -Body $query -ContentType "application/json"
$result | ConvertTo-Json -Depth 5
```
> Make a note of the returned `instanceId` to query the orchestration workflow status.

### 6. Query Orchestration Status

```powershell
# Replace <INSTANCE_ID> with the actual ID returned from your query
Invoke-RestMethod -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>" | ConvertTo-Json -Depth 5
```

### 7. Approve / Reject a Pending Query Workflow

**Approve:**
```powershell
$approval = @{ decision = "Approved"; approverUserId = "user@agent.com"; comments = "" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>/approve" -Body $approval -ContentType "application/json"
```

**Reject:**
```powershell
$rejection = @{ decision = "Rejected"; approverUserId = "user@agent.com"; comments = "Unauthorized access attempt" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>/approve" -Body $rejection -ContentType "application/json"
```

### 8. View Audit History

```powershell
Invoke-RestMethod -Uri "http://localhost:7071/api/history" | ConvertTo-Json -Depth 5
```

### 9. Endpoint Summary Maps

| Endpoint | Method | Backend Port | Frontend Proxy Port |
|---|---|---|---|
| `/api/test-connection` | `POST` | `7071` | `3000` |
| `/api/query` | `POST` | `7071` | `3000` |
| `/api/orchestrations/{id}` | `GET` | `7071` | `3000` *(as `/api/query/{id}`)* |
| `/api/orchestrations/{id}/approve` | `POST` | `7071` | `3000` *(as `/api/query/{id}/approve`)* |
| `/api/history` | `GET` | `7071` | `3000` |
