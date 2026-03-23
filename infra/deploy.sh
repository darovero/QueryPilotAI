#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP_NAME="${1:-rg-insightforge-dev}"
LOCATION="${2:-eastus}"
PARAMETERS_FILE="${3:-./parameters/dev.bicepparam}"

if [[ "$(az group exists --name "$RESOURCE_GROUP_NAME")" != "true" ]]; then
	az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION"
fi

az deployment group create   --resource-group "$RESOURCE_GROUP_NAME"   --template-file ./bicep/main.bicep   --parameters "$PARAMETERS_FILE"
