<div align="center">

  <img src="frontend/assets/PITCH/01_primary_lockup_dark.png" alt="QueryPilotAI Hero" width="100%" />

  <br/><br/>

  <h2><b>Deploy fully autonomous, governed AI analytics in minutes.</b></h2>
  <p><b>QueryPilot AI</b> bridges the gap between natural language, complex data schemas, and <b>fraud-prevention</b> teams.</p>

  <br/>

  <a href="#-quick-start"><img src="https://img.shields.io/badge/-GET_STARTED-2B2B2B?style=for-the-badge&logo=rocket&logoColor=D4AF37" alt="Get Started"></a>
  <a href="#-the-platform"><img src="https://img.shields.io/badge/-PLATFORM_OVERVIEW-2B2B2B?style=for-the-badge&logo=microsoft-azure&logoColor=D4AF37" alt="Platform"></a>
  <a href="#-architecture"><img src="https://img.shields.io/badge/-ARCHITECTURE-2B2B2B?style=for-the-badge&logo=azure-functions&logoColor=D4AF37" alt="Architecture"></a>

  <br/><br/>

  <img src="https://img.shields.io/badge/Powered_by-Azure_OpenAI-0078D4?style=flat-square&logo=microsoft-azure&logoColor=white">
  <img src="https://img.shields.io/badge/Engine-.NET_8_Isolated-512BD4?style=flat-square&logo=.net&logoColor=white">
  <img src="https://img.shields.io/badge/Interface-Next.js_14-000000?style=flat-square&logo=next.js&logoColor=white">
  <img src="https://img.shields.io/badge/Status-Hackathon_Ready-D4AF37?style=flat-square">

</div>

<br/>

---

## ⚡ The Ultimate AI Analytical Engine
Standard "Chat-to-SQL" tools are black boxes. They hallucinate table names, ignore business rules, and recklessly execute queries against sensitive data—creating massive security risks in regulated industries like finance and fraud detection.

**QueryPilot AI is different. It is an enterprise-grade orchestration platform.**

<br/>

<table align="center" width="100%">
  <tr>
    <td align="center" width="33%">
      <img src="frontend/assets/PITCH/04_favicon_grid.png" width="120" style="border-radius: 8px;" />
      <br/><br/>
      <h3>💬 Zero-Code Analytics</h3>
      <p align="left">Ask business questions in plain English or Spanish. QueryPilot's Foundry Agents instantly map your intent, explore schemas, and generate highly optimized, deterministic SQL.</p>
    </td>
    <td align="center" width="34%">
      <img src="frontend/assets/PITCH/02_compact_dark.png" width="120" style="border-radius: 8px;" />
      <br/><br/>
      <h3>🛡️ Human-in-the-Loop</h3>
      <p align="left">When a query touches high-risk or classified constraints (like VIP lists or confidential risk scores), execution halts. The query is quarantined for explicit <b>manual human approval</b>.</p>
    </td>
    <td align="center" width="33%">
      <img src="frontend/assets/PITCH/05_color_type_system.png" width="120" style="border-radius: 8px;" />
      <br/><br/>
      <h3>📊 Executive Insights</h3>
      <p align="left">Don't just look at raw data rows. A specialized secondary agent interprets the SQL results and drafts a clear, executive-level summary tailored to fraud risk analysts.</p>
    </td>
  </tr>
</table>

<br/>

---

## 🔒 Ironclad Security & Governance

> *"AI should accelerate your analysts, not bypass your security protocols."*

#### 1. Instant Threat Neutralization
Integrated strictly with **Azure AI Content Safety**, any prompt injection attempt, jailbreak, or unauthorized data exfiltration command is blocked synchronously before reaching the SQL planner.

#### 2. Deterministic Stateful Orchestration
Using **Azure Durable Functions**, every step of the analytical plan is logged, stateful, and reproducible. We guarantee that the AI only reads the defined schema and never executes unverified, destructive DML operations.

#### 3. Deep Observability
Every user intent, generated SQL, manual approval trace, and latency metric is pumped directly into **Azure Application Insights** for compliance auditing.

<br/>

---

<div align="center">
  <img src="frontend/assets/PITCH/03_logo_light_bg.png" width="300" alt="QueryPilot Logo" />
</div>

<br/>

## 🚀 Quick Start (Judge's Technical Setup)

<details>
<summary><b>🛠️ Click to expand instructions for local execution</b></summary>
<br />

*Note: For the hacking period, actual backend configuration variables are located in `docs/CLAVES_Y_CREDENCIALES.md`. DO NOT commit these to public version control.*

### System Requirements
* Node.js 20+
* .NET 8 SDK
* Azure Functions Core Tools
* PowerShell 7+

### Backend (Azure Functions API)
Open your PowerShell and boot the orchestration engine:
```powershell
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\backend\src\Functions.Api
func start
```

### Frontend (Next.js Platform)
Open a new terminal and boot the Tech-Brutalist UI:
```powershell
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\frontend
npm run dev
```

### Validating Database Connectivity
Ensure the API can communicate with the managed Azure SQL instance securely:
```powershell
# In PowerShell:
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/test-connection" -Body (@{ type="Azure SQL"; host="tcp:<YOUR_DB_HOST>"; database="<YOUR_DB>"; username="<USER>"; password="<PWD>" } | ConvertTo-Json) -ContentType "application/json"
```

</details>

<br/>

<div align="center">
  <b>Built with ❤️ by Team Darovero for the Hackathon</b>
  <br/><br/>
  <a href="https://github.com/darovero/QueryPilotAI">Return to top</a>
</div>
