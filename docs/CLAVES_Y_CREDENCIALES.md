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
    "Auth__AuthorityHost": "https://login.microsoftonline.com",
    "Auth__TenantId": "<tenant-id>",
    "Auth__ClientId": "<api-app-client-id>",
    "Auth__AllowedAudiences": "<api-app-client-id>,api://<api-app-client-id>",
    "SqlConnectionString": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<analytics-db>;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Default;",
    "AppDbConnectionString": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<app-db>;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Default;",
    "AzureOpenAI__Endpoint": "https://<resource>.openai.azure.com/openai/v1",
    "AzureOpenAI__Deployment": "<deployment-name>",
    "AzureOpenAI__ApiKey": "<api-key>",
    "ContentSafety__Endpoint": "https://<resource>.cognitiveservices.azure.com/",
    "FoundryAgent__ProjectEndpoint": "https://<resource>.services.ai.azure.com/api/projects/<project-name>",
    "FoundryAgent__TenantId": "<tenant-id>",
    "FoundryAgent__SqlPlannerAgentRef": "<sql-planner-agent-ref>",
    "FoundryAgent__ResultInterpreterAgentRef": "<result-interpreter-agent-ref>",
    "FoundryAgent__ConciergeAgentRef": "<concierge-agent-ref>"
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
NEXT_PUBLIC_API_SCOPE=api://<api-app-client-id>/access_as_user
```

---

## 4. Variables para Entornos de Despliegue (No local)

Configurar en App Service / Function App / Pipeline, nunca en archivos versionados:

- `Auth__AuthorityHost`
- `Auth__TenantId`
- `Auth__ClientId`
- `Auth__AllowedAudiences`
- `SqlConnectionString`
- `AppDbConnectionString`
- `AzureOpenAI__Endpoint`
- `AzureOpenAI__Deployment`
- `AzureOpenAI__ApiKey`
- `ContentSafety__Endpoint`
- `FoundryAgent__ProjectEndpoint`
- `FoundryAgent__TenantId`
- `FoundryAgent__SqlPlannerAgentRef`
- `FoundryAgent__ResultInterpreterAgentRef`
- `FoundryAgent__ConciergeAgentRef`

---

## 5. Rotacion y Seguridad Operativa

- Si una clave estuvo en Git, se considera comprometida.
- Rotar inmediatamente secretos de SQL, OpenAI y cualquier token/API key.
- Migrar secretos a Azure Key Vault y/o variables seguras del pipeline.
- Verificar que `local.settings.json` y `.env.local` no se incluyan en commits.
