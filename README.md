# InsightForge AI

Agente de ingeniería analítica orientado a fraude que transforma preguntas en lenguaje natural en planes analíticos estructurados, genera SQL validado, ejecuta consultas seguras sobre Azure SQL y entrega explicaciones ejecutivas con trazabilidad, aprobación humana y observabilidad.

## Objetivos
- Traducir preguntas de negocio a intención analítica estructurada.
- Generar SQL gobernado y seguro.
- Aplicar reglas de validación, transparencia y aprobación.
- Explicar resultados en lenguaje empresarial.
- Demostrar IA responsable, amplitud de servicios Azure y reproducibilidad end-to-end.

## Stack objetivo
- Frontend: Next.js / React / TypeScript
- Backend: Azure Functions Isolated Worker (.NET 8)
- Orquestación: Durable Functions
- IA: Azure OpenAI
- Seguridad: Azure AI Content Safety
- Datos: Azure SQL Database
- Observabilidad: Application Insights + Azure Monitor
- Secretos: Azure Key Vault
- Identidad: Microsoft Entra ID

## Estructura
- `docs/`: arquitectura, decisiones, roadmap y demo.
- `frontend/`: UI moderna y paneles de transparencia.
- `backend/`: Functions, orquestación, dominio y reglas.
- `database/`: esquema SQL, seguridad, vistas y semillas.
- `infra/`: Bicep y scripts de despliegue.
- `test-assets/`: prompts de prueba y datasets para validación.

## Flujos demo sugeridos
1. Consulta segura y autoejecución.
2. Consulta sensible que requiere aprobación.
3. Prompt abusivo o consulta insegura bloqueada.

## Puesta en marcha rápida
1. Provisionar Azure con `infra/deploy.ps1` o `infra/deploy.sh`.
2. Ejecutar scripts SQL en `database/`.
3. Configurar las variables de entorno para cada entorno (Backend y Frontend) basándose en las plantillas a continuación.
4. Levantar backend y frontend en local.
5. Probar prompts desde `test-assets/`.

## Configuración y Variables de Entorno

Para ejecutar este proyecto, las credenciales reales se encuentran en el archivo `docs/CLAVES_Y_CREDENCIALES.md` (Solo para uso interno del equipo durante el hackathon). **IMPORTANTE: Nunca subas claves API reales o secretos al repositorio.**

### Backend (`backend/src/Functions.Api/local.settings.json`)

Crea o actualiza el archivo `local.settings.json` en la carpeta de la API con la siguiente estructura y reemplaza los valores por los que se indican en el documento de credenciales:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "<TU_CADENA_DE_CONEXION_STORAGE_ACCOUNT>",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=tcp:<TU_SERVIDOR>.database.windows.net,1433;Initial Catalog=<TU_DB_DE_USUARIO>;Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;",
    "AppDbConnectionString": "Server=tcp:<TU_SERVIDOR>.database.windows.net,1433;Initial Catalog=<TU_DB_APP>;Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;",
    "AzureOpenAI__Endpoint": "https://<TU_RECURSO_OPENAI>.openai.azure.com/openai/v1",
    "AzureOpenAI__Deployment": "gpt-4o-mini",
    "AzureOpenAI__ApiKey": "<TU_API_KEY_OPENAI>",
    "ContentSafety__Endpoint": "https://<TU_RECURSO_SAFETY>.api.cognitive.microsoft.com/",
    "FoundryAgent__ProjectEndpoint": "https://<TU_RECURSO_FOUNDRY>.services.ai.azure.com/api/projects/<TU_PROYECTO>",
    "FoundryAgent__SqlPlannerAgentId": "<ID_AGENTE_SQL_PLANNER_ASST_...>",
    "FoundryAgent__ResultInterpreterAgentId": "<ID_AGENTE_RESULT_INTERPRETER_ASST_...>",
    "FoundryAgent__ConciergeAgentId": "<ID_AGENTE_CONCIERGE_ASST_...>"
  }
}
```

### Frontend (`frontend/.env.local`)

Crea un archivo `.env.local` en la carpeta `frontend/` usando las credenciales maestras:

```env
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=<TU_CLIENT_ID_DE_AZURE_AD>
NEXT_PUBLIC_AZURE_AD_TENANT_ID=common
NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/common
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
```

### Requisito de App Registration

Antes de intentar iniciar sesion, configura en el App Registration de Microsoft Entra ID el tipo de plataforma `Single-page application` o `Web` segun tu estrategia de autenticacion y agrega las URIs de redireccion que realmente va a usar el frontend.

Valores minimos recomendados para este proyecto:

- Local: `http://localhost:3000/`
- Azure App Service: `https://ifdev2-web.azurewebsites.net`

Si despliegas con otro hostname, agrega tambien esa URL exacta como Redirect URI y, si aplica, como Post Logout Redirect URI. Si la URI enviada por el frontend no coincide exactamente con la registrada en Entra ID, aparecera el error `AADSTS50011`.

Para despliegues en Azure, la authority del frontend debe componerse con:

- `Auth.AuthorityHost`
- `Auth.TenantId`

Ejemplo:

- `https://login.microsoftonline.com/<tenant-id>`

## Estado
Este repositorio contiene la arquitectura, seguridad, base de datos, infraestructura, agentes Foundry AI y lineamientos de desarrollo para comenzar en VS Code.

---

# QueryPilot AI — Guía de Operaciones (PowerShell)

Referencia rápida de comandos para copiar y pegar en **PowerShell**.

---

## 1. Matar Todos los Procesos

```powershell
# Matar Node (frontend), dotnet y func (backend) de un solo golpe
taskkill /F /IM node.exe /T 2>$null; taskkill /F /IM dotnet.exe /T 2>$null; taskkill /F /IM func.exe /T 2>$null
```

---

## 2. Iniciar el Proyecto

### Backend (Azure Functions — puerto 7071)

```powershell
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\backend\src\Functions.Api
func start
```

### Frontend (Next.js — puerto 3000)

Abrir **otra terminal** PowerShell:

```powershell
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\frontend
npm run dev
```

### Verificar que ambos estén corriendo

```powershell
# Debe mostrar el puerto 7071 (backend) y 3000 (frontend)
Get-NetTCPConnection -LocalPort 7071,3000 -ErrorAction SilentlyContinue | Select LocalPort, State
```

---

## 3. Probar Conexión a Azure SQL (API `test-connection`)

### Directo al Backend (puerto 7071)

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

### A través del Frontend (puerto 3000, como lo hace la UI)

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/test-connection" -Body $body -ContentType "application/json"
```

> Si el backend **no** está corriendo, la llamada al frontend dará **"fetch failed"**.

---

## 4. Probar Conexión Directa a la Base de Datos (sin APIs)

```powershell
$connString = "Server=tcp:insightforge-sql3-86253.database.windows.net,1433;Initial Catalog=insightforge-sqldb;Persist Security Info=False;User ID=sqladminif;Password=QueryPilot@2026!;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
try {
    $conn.Open()
    Write-Host "✅ Conexión directa exitosa"
    $conn.Close()
} catch {
    Write-Host "❌ Falló: $($_.Exception.Message)"
}
```

---

## 5. Enviar una Consulta NLP (API `query`)

```powershell
$query = @{
    question      = "Muéstrame las 10 transacciones más recientes"
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

> Guarda el `instanceId` que devuelve para consultar el estado.

---

## 6. Consultar Estado de una Orquestación

```powershell
# Reemplaza <INSTANCE_ID> con el valor real
Invoke-RestMethod -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>" | ConvertTo-Json -Depth 5
```

---

## 7. Aprobar / Rechazar una Consulta Pendiente

```powershell
# Aprobar
$approval = @{
    decision       = "Approved"
    approverUserId = "user@agent.com"
    comments       = ""
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>/approve" -Body $approval -ContentType "application/json"
```

```powershell
# Rechazar
$rejection = @{
    decision       = "Rejected"
    approverUserId = "user@agent.com"
    comments       = "Consulta no autorizada"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/orchestrations/<INSTANCE_ID>/approve" -Body $rejection -ContentType "application/json"
```

---

## 8. Ver Historial de Auditoría

```powershell
Invoke-RestMethod -Uri "http://localhost:7071/api/history" | ConvertTo-Json -Depth 5
```

---

## 9. Resumen de Endpoints

| Endpoint | Método | Puerto Backend | Puerto Frontend (proxy) |
|---|---|---|---|
| `/api/test-connection` | `POST` | `7071` | `3000` |
| `/api/query` | `POST` | `7071` | `3000` |
| `/api/orchestrations/{id}` | `GET` | `7071` | `3000` (como `/api/query/{id}`) |
| `/api/orchestrations/{id}/approve` | `POST` | `7071` | `3000` (como `/api/query/{id}/approve`) |
| `/api/history` | `GET` | `7071` | `3000` |

---

## 10. Workflow Rápido Completo

```powershell
# 1. Matar todo
taskkill /F /IM node.exe /T 2>$null; taskkill /F /IM dotnet.exe /T 2>$null; taskkill /F /IM func.exe /T 2>$null

# 2. Terminal 1 — Backend
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\backend\src\Functions.Api
func start

# 3. Terminal 2 — Frontend
cd C:\Users\Jessy\Documents\GitHub\QueryPilotAI\frontend
npm run dev

# 4. Terminal 3 — Probar conexión
$body = @{ type="Azure SQL"; host="tcp:insightforge-sql3-86253.database.windows.net"; database="insightforge-sqldb"; username="sqladminif"; password="QueryPilot@2026!" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:7071/api/test-connection" -Body $body -ContentType "application/json"
```
