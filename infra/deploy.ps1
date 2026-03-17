param(
  [string]$ResourceGroupName = "rg-insightforge-dev",
  [string]$Location = "eastus",
  [string]$ParametersFile = "./parameters/dev.bicepparam"
)

az group create --name $ResourceGroupName --location $Location
az deployment group create `
  --resource-group $ResourceGroupName `
  --template-file ./bicep/main.bicep `
  --parameters $ParametersFile
