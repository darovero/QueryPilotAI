<div align="center">

# 🚀 InsightForge AI
### Query‑to‑Insight Analytics Engineer

**From natural language questions to trusted SQL insights**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Azure Functions](https://img.shields.io/badge/Azure_Functions-.NET_8_Isolated-0062AD?logo=azure-functions)](https://azure.microsoft.com/)
[![Azure SQL](https://img.shields.io/badge/Azure_SQL-v12.0-0089D6?logo=microsoft-azure)](https://azure.microsoft.com/)
[![Azure OpenAI](https://img.shields.io/badge/Azure_OpenAI-GPT--4o--mini-0078D4?logo=openai)](https://azure.microsoft.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Microsoft Innovation Challenger: Innovation Challenge March 2026 🏆**

[Problem](#-the-bottleneck-in-analytics) • [Architecture](#-architecture--stack) • [Getting Started](#-getting-started) • [Operations](#-operational-guide-powershell)

</div>

---

## 🌟 The Bottleneck in Analytics
Business users want answers from their data instantly, but generating SQL safely, efficiently, and correctly remains a major bottleneck. 

**InsightForge AI** is an advanced analytical engineering agent that converts natural language questions into validated SQL queries, executes them securely against Azure SQL, and explains the results in clear, actionable business language. 

The system decomposes analytical intent, generates highly robust SQL, handles errors gracefully, and delivers insights via automated summaries. We emphasize **security, correctness, transparency, approval flows, and operational reliability**.

---

## ✨ Key Features

- **🧠 Decompose Intent & Generate Robust SQL**: Translates complex natural language questions into precise, optimized, and validated SQL queries using **Azure OpenAI (gpt-4o-mini)**.
- **🛡️ Enterprise-Grade Security & Validation**: Guards against prompt injection and abusive queries using **Azure AI Content Safety**.
- **✅ Human-in-the-Loop Approvals**: Built-in orchestration workflows for sensitive or high-impact queries, leveraging **Azure Durable Functions**.
- **📊 Business-Friendly Explanations**: Converts complex result sets into easy-to-understand executive insights, rendered beautifully with **React Markdown** and **Recharts**.
- **⚙️ Transparent & Secure Execution**: Complete observability via **Application Insights / Log Analytics** and secure secret management via **Azure Key Vault** and **Entra ID (MSAL)**.

---

## 🏗️ Architecture & Stack

InsightForge AI is built on a modern, robust, and fully serverless (Dynamic Y1 Plan) architecture powered by the Microsoft Azure cloud.

* **Frontend**: Next.js 15 App Router / React 18 / TypeScript / Tailwind CSS 
    * Fully integrated with `@azure/msal-react` for enterprise authentication.
    * Stunning UI using `Recharts` for data visualization and `Sonner` for toast notifications.
* **Backend**: **Clean Architecture** in Azure Functions Isolated Worker (.NET 8).
    * `Core.Domain` & `Core.Application` for strict business logic handling.
    * `Infrastructure.Sql`, `Infrastructure.AzureOpenAI`, `Infrastructure.Security`, and `Infrastructure.Observability` for seamless cloud service integration.
    * Multi-step workflows powered by `Microsoft.Azure.Functions.Worker.Extensions.DurableTask`.
* **AI Engine**: Azure OpenAI (GPT-4o-mini) — *Intent parsing, SQL generation, and insight synthesis.*
* **Security & Trust**: Azure AI Content Safety, Microsoft Entra ID.
* **Data Layer**: Azure SQL Database (v12.0) — *Secure query execution with dedicated Service Principals.*

### 📂 Repository Structure

- `docs/` — Architecture decisions, roadmap, and hackathon keys.
- `frontend/` — Next.js 15 UI with Tailwind and MSAL Auth.
- `backend/` — .NET 8 Isolated Azure Functions (Clean Architecture).
- `database/` — SQL schemas, security configurations, and seed scripts.
- `infra/bicep/` — Infrastructure as Code containing `main.bicep` for 1-click Azure deployments.
- `test-assets/` — Datasets, sample prompts, and validation tools.

---

## 🚀 Getting Started

### 1. Provision Infrastructure
Deploy the required Azure resources (Functions, SQL Server, Storage, OpenAI, Content Safety, App Insights) using our automated Bicep templates:
```bash
cd infra
./deploy.sh  # or ./deploy.ps1
```

### 2. Configure Environment
Set up your local environment variables based on the provisioned resources. *(Note: Reference `docs/CLAVES_Y_CREDENCIALES.md` for team hackathon keys).*

**Backend (`backend/src/Functions.Api/local.settings.json`):**
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "<STORAGE_CONN_STRING>",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=tcp:<YOUR_SERVER>.database.windows.net,1433;Initial Catalog=<DB>;Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;",
    "AzureOpenAI__Endpoint": "https://<YOUR_OPENAI>.openai.azure.com/openai/v1",
    "AzureOpenAI__Deployment": "gpt-4o-mini",
    "ContentSafety__Endpoint": "https://<YOUR_CONTENT_SAFETY>.api.cognitive.microsoft.com/"
  }
}
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=<YOUR_CLIENT_ID>
NEXT_PUBLIC_AZURE_AD_TENANT_ID=common
NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/common
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/
```

### 3. Run Locally
**Terminal 1 (Backend):**
```powershell
cd backend/src/Functions.Api
func start
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev --turbo
```

---

## 🛠️ Operational Guide (PowerShell)

### Test the Connection
Verify that your backend can correctly reach the Azure SQL Database.
```powershell
$body = @{
    type     = "Azure SQL"
    host     = "tcp:<YOUR_SERVER>.database.windows.net"
    database = "<YOUR_DB>"
    username = "<USER>"
    password = "<PASSWORD>"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/test-connection" -Body $body -ContentType "application/json"
```

### Submit a Query
Test the end-to-end NLP to SQL pipeline orchestration.
```powershell
$query = @{
    question      = "Show me the top 10 most recent transactions"
    userId        = "user@agent.com"
    role          = "FraudAnalyst"
    correlationId = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    sessionId     = "console-test"
    connection    = @{
        type     = "Azure SQL"
        host     = "tcp:<SERVER>.database.windows.net"
        database = "<DB>"
        username = "<USER>"
        password = "<PASSWORD>"
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/query" -Body $query -ContentType "application/json"
```

### Manage Approvals (Durable Functions)
Check the status of an orchestration or approve/reject pending queries directly via the Durable Functions API.
```powershell
# Get Status
Invoke-RestMethod -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>"

# Approve
$approval = @{ decision = "Approved"; approverUserId = "admin@agent.com"; comments = "Looks good" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>/approve" -Body $approval -ContentType "application/json"
```

---

<div align="center">
  <b>Built with ❤️ for the Microsoft Innovation Challenger</b><br>
  <i>March 2026</i>
</div>
