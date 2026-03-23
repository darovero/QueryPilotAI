# Infraestructura

Provisiona:
- Resource Group
- Storage Account
- Application Insights
- Log Analytics
- Function App (consumption o flex)
- App Service Plan opcional si se desea
- Azure SQL Server + Database
- Azure OpenAI
- Azure AI Content Safety
- Key Vault

## Archivos
- `bicep/main.bicep`
- `parameters/dev.bicepparam`
- `deploy.ps1`
- `deploy.sh`

## Prerrequisito de identidad

Antes de probar el login del frontend desplegado, el App Registration configurado en `Auth.ClientId` debe tener registrada la URL real del sitio como Redirect URI.

Para el entorno dev actual, registra en Microsoft Entra ID:

- `https://ifdev2-web.azurewebsites.net`

Y para desarrollo local, registra tambien:

- `http://localhost:3000/`

Si cambias el nombre del Web App o defines valores explicitos en `Frontend.RedirectUri` y `Frontend.PostLogoutRedirectUri`, esas mismas URLs deben existir en el App Registration. De lo contrario, el login fallara con `AADSTS50011`.

Ademas, la authority del frontend debe apuntar al tenant correcto. En la configuracion de despliegue se construye a partir de `Auth.AuthorityHost` y `Auth.TenantId`, por ejemplo `https://login.microsoftonline.com/<tenant-id>`.
