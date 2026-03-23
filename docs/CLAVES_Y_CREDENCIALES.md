# Claves y Credenciales Maestras

> [!WARNING]
> Este archivo no debe contener secretos reales. Usa Azure Key Vault, secretos locales no versionados o variables del pipeline.

---

## 1. Cuenta Principal de Azure 

No documentar usuarios, contraseñas ni tokens reales en el repositorio.

> [!IMPORTANT]
> Toda credencial expuesta previamente debe considerarse comprometida y rotarse antes de cualquier despliegue o compartición del repositorio.

- **Usuario:** `<documentar fuera del repositorio>`
- **Contraseña:** `<nunca versionar>`
- **Directorio (Tenant) ID:** `<tenant-id>`

---

## 2. Variables del Backend (`backend/src/Functions.Api/local.settings.json`)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<analytics-db>;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Default;",
    "AppDbConnectionString": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<app-db>;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Default;",
    "AzureOpenAI__Endpoint": "https://<resource>.openai.azure.com/openai/v1",
    "AzureOpenAI__Deployment": "<deployment-name>",
    "AzureOpenAI__ApiKey": "<api-key>",
    "ContentSafety__Endpoint": "https://<resource>.cognitiveservices.azure.com/",
    "FoundryAgent__ProjectEndpoint": "https://<resource>.services.ai.azure.com/api/projects/<project-name>",
    "FoundryAgent__SqlPlannerAgentId": "<sql-planner-agent-id>",
    "FoundryAgent__ResultInterpreterAgentId": "<result-interpreter-agent-id>",
    "FoundryAgent__ConciergeAgentId": "<concierge-agent-id>"
  }
}
```

---

## 3. Variables del Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=b8ad5ba3-bb50-4829-9c08-9c1b10693cef
NEXT_PUBLIC_AZURE_AD_TENANT_ID=common
NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/common
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
```
