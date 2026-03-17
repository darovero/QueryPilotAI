targetScope = 'resourceGroup'

@description('Prefijo corto del proyecto')
param prefix string = 'insightforge'

@description('Ubicación de los recursos')
param location string = resourceGroup().location

@description('Administrador de SQL')
param sqlAdminLogin string

@secure()
@description('Password de administrador de SQL')
param sqlAdminPassword string

@description('Nombre del deployment Azure OpenAI')
param openAiDeploymentName string = 'gpt-4o-mini'

@description('SKU de Azure SQL Database')
param sqlDbSkuName string = 'Basic'

var storageName = toLower(replace('${prefix}${uniqueString(resourceGroup().id)}', '-', ''))
var appInsightsName = '${prefix}-appi'
var logAnalyticsName = '${prefix}-log'
var functionPlanName = '${prefix}-plan'
var functionAppName = '${prefix}-func'
var sqlServerName = '${prefix}-sql-${uniqueString(resourceGroup().id)}'
var sqlDbName = '${prefix}-sqldb'
var keyVaultName = toLower('${prefix}-kv-${uniqueString(resourceGroup().id)}')
var openAiName = '${prefix}-aoai'
var contentSafetyName = '${prefix}-cs'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
  }
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: functionPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  kind: 'functionapp'
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'AzureWebJobsStorage'; value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value}' }
        { name: 'FUNCTIONS_WORKER_RUNTIME'; value: 'dotnet-isolated' }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY'; value: appInsights.properties.InstrumentationKey }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'; value: appInsights.properties.ConnectionString }
        { name: 'SqlConnectionString'; value: 'Server=tcp:${sqlServer.name}.database.windows.net,1433;Initial Catalog=${sqlDbName};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};' }
        { name: 'AzureOpenAI__Endpoint'; value: openAi.properties.endpoint }
        { name: 'AzureOpenAI__Deployment'; value: openAiDeployment.name }
        { name: 'ContentSafety__Endpoint'; value: contentSafety.properties.endpoint }
      ]
      minTlsVersion: '1.2'
    }
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    publicNetworkAccess: 'Enabled'
    version: '12.0'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  name: '${sqlServer.name}/${sqlDbName}'
  location: location
  sku: {
    name: sqlDbSkuName
    tier: 'Basic'
  }
  properties: {
    zoneRedundant: false
    readScale: 'Disabled'
  }
}

resource firewallRule 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  name: '${sqlServer.name}/AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
    enabledForDeployment: false
    enabledForTemplateDeployment: false
    enabledForDiskEncryption: false
  }
}

resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openAiName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: toLower(openAiName)
    publicNetworkAccess: 'Enabled'
  }
}

resource openAiDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: '${openAi.name}/${openAiDeploymentName}'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
    raiPolicyName: 'Microsoft.Default'
  }
  sku: {
    name: 'Standard'
    capacity: 10
  }
}

resource contentSafety 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: contentSafetyName
  location: location
  kind: 'ContentSafety'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: toLower(contentSafetyName)
    publicNetworkAccess: 'Enabled'
  }
}

output functionAppName string = functionApp.name
output sqlServerName string = sqlServer.name
output sqlDatabaseName string = sqlDb.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output openAiEndpoint string = openAi.properties.endpoint
output contentSafetyEndpoint string = contentSafety.properties.endpoint
