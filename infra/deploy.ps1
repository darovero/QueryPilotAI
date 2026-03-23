param(
  [string]$ResourceGroupName = "rg-insightforge-dev",
  [string]$Location = "eastus",
  [string]$ParametersFile = "./parameters/dev.bicepparam",
  [switch]$CreateResourceGroupIfMissing = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resourceGroup = az group exists --name $ResourceGroupName | Out-String
$resourceGroupExists = $resourceGroup.Trim().ToLowerInvariant() -eq "true"

if (-not $resourceGroupExists) {
  if (-not $CreateResourceGroupIfMissing) {
    throw "Resource group '$ResourceGroupName' does not exist. Re-run with -CreateResourceGroupIfMissing or create it manually."
  }

  az group create --name $ResourceGroupName --location $Location | Out-Host
}

az deployment group create `
  --resource-group $ResourceGroupName `
  --template-file ./bicep/main.bicep `
  --parameters $ParametersFile | Out-Host
