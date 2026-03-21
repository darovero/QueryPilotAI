# Claves y Credenciales Maestras

> [!WARNING]
> Este archivo contiene claves API reales y configuraciones de conexión. **NO debe ser distribuido fuera del equipo**.

---

## 1. Cuenta Principal de Azure 

Esta cuenta de Microsoft Entra ID (Azure AD) es una **cuenta de prueba** creada **exclusivamente para este Hackathon**.

> [!IMPORTANT]
> **Doble Autenticación Activa:** Recuerda que la cuenta tiene activa la autenticación de dos factores (2FA), por lo que para iniciar sesión se te podría pedir confirmar en el autenticador.

- **Usuario:** `MarianaGonzalez@MarianarySa.onmicrosoft.com`
- **Contraseña:** `3102469381Qt..`
- **Directorio (Tenant) ID:** `c30fc412-a18e-449c-b571-d18c6d5aeb05`

---

## 2. Variables del Backend (`backend/src/Functions.Api/local.settings.json`)

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net;AccountName=insightforge86253st;AccountKey=366/8yDmZ8guF1grgblIv0dkY1WGYVQPA5y8hRWW4tN9Bdy1q8bAsap2FLVKUfdKnvyOExPaIgYr+AStQ6XaJQ==;BlobEndpoint=https://insightforge86253st.blob.core.windows.net/;FileEndpoint=https://insightforge86253st.file.core.windows.net/;QueueEndpoint=https://insightforge86253st.queue.core.windows.net/;TableEndpoint=https://insightforge86253st.table.core.windows.net/",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "SqlConnectionString": "Server=tcp:insightforge-sql3-86253.database.windows.net,1433;Initial Catalog=insightforge-sqldb;Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;",
    "AppDbConnectionString": "Server=tcp:insightforge-sql3-86253.database.windows.net,1433;Initial Catalog=insightforge-appdb;Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;",
    "AzureOpenAI__Endpoint": "https://marianagonzalez-6489-resource.openai.azure.com/openai/v1",
    "AzureOpenAI__Deployment": "gpt-4o-mini",
    "AzureOpenAI__ApiKey": "1flrAyIIaBxztuaCvRbpPkc8jIJE6pAdLS4tmBMAgNcW67pDZFddJQQJ99CCACHYHv6XJ3w3AAAAACOGyKFo",
    "ContentSafety__Endpoint": "https://eastus.api.cognitive.microsoft.com/",
    "FoundryAgent__ProjectEndpoint": "https://marianagonzalez-6489-resource.services.ai.azure.com/api/projects/marianagonzalez-6489",
    "FoundryAgent__SqlPlannerAgentId": "asst_sVfTKQcbeUeRanGQkNDviYFZ",
    "FoundryAgent__ResultInterpreterAgentId": "asst_SEjRH87jIXeHlMvqawfXj4LB",
    "FoundryAgent__ConciergeAgentId": "asst_vkMN5rnF0gM2EBBMz4W0Wr5h9"
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
