param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot 'Deploy.Configuration.psd1'),
    [ValidateSet('Preflight', 'Provision', 'Foundry', 'Configure', 'Database', 'DeployApi', 'DeployWeb', 'Verify')]
    [string]$ResumeFrom = 'Preflight'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$stateDir = Join-Path $PSScriptRoot '.state'
$artifactsDir = Join-Path $PSScriptRoot 'artifacts'
$statePath = Join-Path $stateDir 'deployment-state.json'
$outputsPath = Join-Path $stateDir 'infra-outputs.json'
$foundryOutputsPath = Join-Path $stateDir 'foundry-outputs.json'
$phaseOrder = @('Preflight', 'Provision', 'Foundry', 'Configure', 'Database', 'DeployApi', 'DeployWeb', 'Verify')

if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir | Out-Null
}

if (-not (Test-Path $artifactsDir)) {
    New-Item -ItemType Directory -Path $artifactsDir | Out-Null
}

function Write-Phase {
    param([string]$Name, [string]$Message)
    Write-Host "[$Name] $Message" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "[deploy] $Message"
}

function Write-WarnLine {
    param([string]$Message)
    Write-Host "[warn] $Message" -ForegroundColor Yellow
}

function Save-State {
    param(
        [string]$CurrentPhase,
        [string[]]$CompletedPhases,
        [string]$Status,
        [string]$Message
    )

    @{
        currentPhase = $CurrentPhase
        completedPhases = $CompletedPhases
        status = $Status
        message = $Message
        updatedAtUtc = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json -Depth 5 | Set-Content -Path $statePath
}

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not available in PATH."
    }
}

function Resolve-RequiredValue {
    param(
        [string]$Value,
        [string]$Prompt,
        [string]$PropertyName,
        [switch]$Secret
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        return $Value
    }

    if ($Secret) {
        $secure = Read-Host -Prompt $Prompt -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            $resolved = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
    else {
        $resolved = Read-Host -Prompt $Prompt
    }

    if ([string]::IsNullOrWhiteSpace($resolved)) {
        throw "Value for '$PropertyName' is required."
    }

    return $resolved
}

function Resolve-ConfigValue {
    param(
        [string]$Value,
        [string]$Prompt,
        [string]$PropertyName,
        [string]$DefaultValue,
        [switch]$Secret
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        return $Value
    }

    $promptSuffix = if ([string]::IsNullOrWhiteSpace($DefaultValue)) { '' } else { " [$DefaultValue]" }

    if ($Secret) {
        $secure = Read-Host -Prompt "$Prompt$promptSuffix" -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            $resolved = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
    else {
        $resolved = Read-Host -Prompt "$Prompt$promptSuffix"
    }

    if ([string]::IsNullOrWhiteSpace($resolved)) {
        $resolved = $DefaultValue
    }

    if ([string]::IsNullOrWhiteSpace($resolved)) {
        throw "Value for '$PropertyName' is required."
    }

    return $resolved
}

function New-DeploymentConfigDefaults {
    return @{
        Location = 'eastus2'
        Prefix = 'ifdev2'
        ResourceGroupName = 'rg-insightforge-dev'
        SqlAdminLogin = 'sqladminif'
        SqlAdminPassword = 'IfDev_2026!Deploy#01'
    }
}

function New-DeploymentConfigSkeleton {
    return @{
        SubscriptionId = ''
        ResourceGroupName = ''
        Location = ''
        CreateResourceGroupIfMissing = $true
        Prefix = ''
        Sql = @{
            AdminLogin = ''
            AdminPassword = ''
            SkuName = 'Basic'
        }
        Frontend = @{
            AppServiceSkuName = 'B1'
            AppServiceSkuTier = 'Basic'
            Authority = ''
            RedirectUri = ''
            PostLogoutRedirectUri = ''
        }
        Auth = @{
            ClientId = ''
            TenantId = ''
            AllowedAudiences = @()
            AuthorityHost = 'https://login.microsoftonline.com'
        }
        Foundry = @{
            EnvironmentName = 'dev'
            ManageProject = $true
            ManageAgents = $true
            CreateResourceIfMissing = $true
            CreateProjectIfMissing = $true
            ResourceName = ''
            ProjectName = ''
            ResourceSkuName = 'S0'
            ModelDeploymentName = 'gpt-4o-mini'
            ModelName = 'gpt-4o-mini'
            ModelVersion = '2024-07-18'
            ModelFormat = 'OpenAI'
            ModelSkuName = 'Standard'
            ModelSkuCapacity = 10
            ProjectEndpoint = ''
            TenantId = ''
            SqlPlannerAgentId = ''
            ResultInterpreterAgentId = ''
            ConciergeAgentId = ''
            ProjectResourceId = ''
            RoleDefinitionName = ''
        }
        AzureOpenAI = @{
            DeploymentName = 'gpt-4o-mini'
        }
    }
}

function Build-AuthorityUrl {
    param(
        [string]$AuthorityHost,
        [string]$TenantId
    )

    $normalizedHost = $AuthorityHost.Trim().TrimEnd('/')
    $normalizedTenantId = $TenantId.Trim().Trim('/').Trim()

    if ([string]::IsNullOrWhiteSpace($normalizedHost) -or [string]::IsNullOrWhiteSpace($normalizedTenantId)) {
        throw 'Both authority host and tenant id are required to build the frontend authority URL.'
    }

    return "$normalizedHost/$normalizedTenantId"
}

function Get-DeletedCognitiveAccountResourceId {
    param(
        [string]$SubscriptionId,
        [string]$Location,
        [string]$ResourceGroupName,
        [string]$AccountName
    )

    return "/subscriptions/$SubscriptionId/providers/Microsoft.CognitiveServices/locations/$Location/resourceGroups/$ResourceGroupName/deletedAccounts/$AccountName"
}

function Test-SoftDeletedCognitiveAccount {
    param(
        [string]$SubscriptionId,
        [string]$ResourceGroupName,
        [string]$Location,
        [string]$AccountName
    )

    $deletedResourceId = Get-DeletedCognitiveAccountResourceId -SubscriptionId $SubscriptionId -Location $Location -ResourceGroupName $ResourceGroupName -AccountName $AccountName
    $deletedAccount = Try-Invoke-AzCli -ExpectJson -Arguments @('resource', 'show', '--ids', $deletedResourceId, '--api-version', '2021-04-30', '-o', 'json')

    if ($null -eq $deletedAccount) {
        return $false
    }

    return $true
}

function Invoke-AzCli {
    param(
        [string[]]$Arguments,
        [switch]$ExpectJson
    )

    $output = & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed: az $($Arguments -join ' ')"
    }

    if ($ExpectJson) {
        return ($output | Out-String | ConvertFrom-Json)
    }

    return ($output | Out-String).Trim()
}

function Try-Invoke-AzCli {
    param(
        [string[]]$Arguments,
        [switch]$ExpectJson
    )

    $output = & az @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return $null
    }

    if ($ExpectJson) {
        return ($output | Out-String | ConvertFrom-Json)
    }

    return ($output | Out-String).Trim()
}

function Resolve-PythonCommand {
    param([string]$Root)

    $venvPython = Join-Path $Root '.venv\Scripts\python.exe'
    if (Test-Path $venvPython) {
        return $venvPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        return $pythonCommand.Source
    }

    throw 'Python is required for Foundry agent deployment. Install Python 3.10+ or create a .venv in the repository root.'
}

function Ensure-FoundryPythonDependencies {
    param(
        [string]$PythonCommand,
        [string]$Root
    )

    & $PythonCommand '-c' 'import yaml, azure.ai.projects' | Out-Null
    if ($LASTEXITCODE -eq 0) {
        return
    }

    Write-Info 'Installing Python dependencies required for Foundry agent deployment'
    & $PythonCommand '-m' 'pip' 'install' '-r' (Join-Path $Root 'tools/foundry/requirements.txt') | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to install Python dependencies for Foundry deployment.'
    }
}

function Get-FoundryEndpoint {
    param(
        [string]$CustomSubDomain,
        [string]$ProjectName
    )

    return "https://$CustomSubDomain.services.ai.azure.com/api/projects/$ProjectName"
}

function Get-PublicIpAddress {
    $candidates = @(
        'https://api.ipify.org',
        'https://ifconfig.me/ip'
    )

    foreach ($candidate in $candidates) {
        try {
            $ipAddress = (Invoke-RestMethod -Uri $candidate -TimeoutSec 15).ToString().Trim()
            if ($ipAddress -match '^(?:\d{1,3}\.){3}\d{1,3}$') {
                return $ipAddress
            }
        }
        catch {
        }
    }

    return $null
}

function Invoke-SqlFile {
    param(
        [string]$Server,
        [string]$Database,
        [string]$User,
        [string]$Password,
        [string]$FilePath
    )

    if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
        & sqlcmd -S "tcp:$Server,1433" -d $Database -U $User -P $Password -N -C -b -i $FilePath
        if ($LASTEXITCODE -ne 0) {
            throw "sqlcmd failed for $FilePath"
        }
        return
    }

    if (Get-Command Invoke-Sqlcmd -ErrorAction SilentlyContinue) {
        Invoke-Sqlcmd -ServerInstance "tcp:$Server,1433" -Database $Database -Username $User -Password $Password -InputFile $FilePath -Encrypt Optional -TrustServerCertificate
        return
    }

    throw "Neither sqlcmd nor Invoke-Sqlcmd is available. Install sqlcmd or the SqlServer PowerShell module."
}

function New-ZipFromDirectory {
    param(
        [string]$SourceDirectory,
        [string]$ZipPath
    )

    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }

    Compress-Archive -Path (Join-Path $SourceDirectory '*') -DestinationPath $ZipPath -Force
}

function Build-FrontendPackage {
    param(
        [string]$SourceRoot,
        [string]$DestinationRoot,
        [hashtable]$BuildEnvironment = @{}
    )

    if (Test-Path $DestinationRoot) {
        Remove-Item $DestinationRoot -Recurse -Force
    }

    $previousEnvironment = @{}
    Push-Location $SourceRoot
    try {
        foreach ($entry in $BuildEnvironment.GetEnumerator()) {
            $previousEnvironment[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
            [Environment]::SetEnvironmentVariable($entry.Key, [string]$entry.Value, 'Process')
        }

        npm ci | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw 'npm ci failed for the frontend package.'
        }

        npm run build | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw 'npm run build failed for the frontend package.'
        }

    }
    finally {
        foreach ($entry in $previousEnvironment.GetEnumerator()) {
            [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
        }
        Pop-Location
    }

    $standaloneRoot = Join-Path $SourceRoot '.next/standalone'
    $staticRoot = Join-Path $SourceRoot '.next/static'
    $serverEntry = Get-ChildItem -Path $standaloneRoot -Filter 'server.js' -File -Recurse | Select-Object -First 1
    if ($null -eq $serverEntry) {
        throw 'Next.js standalone output was not generated. Ensure next.config.ts sets output to standalone.'
    }

    $standaloneAppRoot = $serverEntry.Directory.FullName

    New-Item -ItemType Directory -Path $DestinationRoot | Out-Null

    Copy-Item -Path (Join-Path $standaloneAppRoot '*') -Destination $DestinationRoot -Recurse -Force

    $staticTarget = Join-Path $DestinationRoot '.next/static'
    New-Item -ItemType Directory -Path $staticTarget -Force | Out-Null
    Copy-Item -Path (Join-Path $staticRoot '*') -Destination $staticTarget -Recurse -Force

    $publicRoot = Join-Path $SourceRoot 'public'
    if (Test-Path $publicRoot) {
        Copy-Item -Path $publicRoot -Destination (Join-Path $DestinationRoot 'public') -Recurse -Force
    }
}

function Wait-ForHttp {
    param(
        [string]$Url,
        [int]$MaxAttempts = 20,
        [int]$DelaySeconds = 10,
        [int]$SuccessStatusFloor = 200,
        [int]$SuccessStatusCeiling = 499
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 20
            if ($response.StatusCode -ge $SuccessStatusFloor -and $response.StatusCode -le $SuccessStatusCeiling) {
                return $true
            }
        }
        catch {
            $statusCode = $null
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.value__
            }

            if ($null -ne $statusCode -and $statusCode -ge $SuccessStatusFloor -and $statusCode -le $SuccessStatusCeiling) {
                return $true
            }
        }

        Start-Sleep -Seconds $DelaySeconds
    }

    return $false
}

if (Test-Path $ConfigPath) {
    $config = Import-PowerShellDataFile -Path $ConfigPath
}
else {
    Write-WarnLine "Configuration file not found at '$ConfigPath'. The script will prompt for the required initial values."
    $config = New-DeploymentConfigSkeleton
}

$defaults = New-DeploymentConfigDefaults
$currentSubscription = Try-Invoke-AzCli -ExpectJson -Arguments @('account', 'show', '-o', 'json')
$subscriptionSuggestion = if ($null -ne $currentSubscription -and -not [string]::IsNullOrWhiteSpace($currentSubscription.id)) { $currentSubscription.id } else { '' }
$tenantSuggestion = if (-not [string]::IsNullOrWhiteSpace($config.Auth.TenantId)) { $config.Auth.TenantId } elseif (-not [string]::IsNullOrWhiteSpace($config.Foundry.TenantId)) { $config.Foundry.TenantId } elseif ($null -ne $currentSubscription -and -not [string]::IsNullOrWhiteSpace($currentSubscription.tenantId)) { $currentSubscription.tenantId } else { '' }

$subscriptionId = Resolve-ConfigValue -Value $config.SubscriptionId -Prompt 'Azure subscription id' -PropertyName 'SubscriptionId' -DefaultValue $subscriptionSuggestion
$resourceGroupName = Resolve-ConfigValue -Value $config.ResourceGroupName -Prompt 'Resource group name to use' -PropertyName 'ResourceGroupName' -DefaultValue $defaults.ResourceGroupName
$location = Resolve-ConfigValue -Value $config.Location -Prompt 'Azure location' -PropertyName 'Location' -DefaultValue $defaults.Location
$prefix = Resolve-ConfigValue -Value $config.Prefix -Prompt 'Deployment prefix' -PropertyName 'Prefix' -DefaultValue $defaults.Prefix
$sqlAdminLogin = Resolve-ConfigValue -Value $config.Sql.AdminLogin -Prompt 'SQL admin login' -PropertyName 'Sql.AdminLogin' -DefaultValue $defaults.SqlAdminLogin
$sqlAdminPassword = Resolve-ConfigValue -Value $config.Sql.AdminPassword -Prompt 'SQL admin password' -PropertyName 'Sql.AdminPassword' -DefaultValue $defaults.SqlAdminPassword -Secret
$authClientId = Resolve-ConfigValue -Value $config.Auth.ClientId -Prompt 'Existing app registration client id' -PropertyName 'Auth.ClientId' -DefaultValue ''
$authTenantId = Resolve-ConfigValue -Value $config.Auth.TenantId -Prompt 'Microsoft Entra tenant id' -PropertyName 'Auth.TenantId' -DefaultValue $tenantSuggestion
$authAuthorityHost = Resolve-ConfigValue -Value $config.Auth.AuthorityHost -Prompt 'Microsoft Entra authority host' -PropertyName 'Auth.AuthorityHost' -DefaultValue 'https://login.microsoftonline.com'
$frontendAuthorityDefault = Build-AuthorityUrl -AuthorityHost $authAuthorityHost -TenantId $authTenantId
$frontendAuthority = Resolve-ConfigValue -Value $config.Frontend.Authority -Prompt 'Frontend authority URL' -PropertyName 'Frontend.Authority' -DefaultValue $frontendAuthorityDefault

$config.SubscriptionId = $subscriptionId
$config.ResourceGroupName = $resourceGroupName
$config.Location = $location
$config.Prefix = $prefix
$config.Sql.AdminLogin = $sqlAdminLogin
$config.Sql.AdminPassword = $sqlAdminPassword
$config.Auth.ClientId = $authClientId
$config.Auth.TenantId = $authTenantId
$config.Auth.AuthorityHost = $authAuthorityHost
$config.Frontend.Authority = $frontendAuthority

$foundryManageProject = if ($null -eq $config.Foundry.ManageProject) { $false } else { [bool]$config.Foundry.ManageProject }
$foundryManageAgents = if ($null -eq $config.Foundry.ManageAgents) { $false } else { [bool]$config.Foundry.ManageAgents }
$foundryCreateResourceIfMissing = if ($null -eq $config.Foundry.CreateResourceIfMissing) { $true } else { [bool]$config.Foundry.CreateResourceIfMissing }
$foundryCreateProjectIfMissing = if ($null -eq $config.Foundry.CreateProjectIfMissing) { $true } else { [bool]$config.Foundry.CreateProjectIfMissing }
$foundryEnvironmentName = if ([string]::IsNullOrWhiteSpace($config.Foundry.EnvironmentName)) { 'dev' } else { $config.Foundry.EnvironmentName }
$foundryProjectEndpoint = $config.Foundry.ProjectEndpoint
$foundryProjectResourceId = $config.Foundry.ProjectResourceId
$foundryTenantId = $config.Foundry.TenantId
$foundrySqlPlannerAgentId = $config.Foundry.SqlPlannerAgentId
$foundryResultInterpreterAgentId = $config.Foundry.ResultInterpreterAgentId
$foundryConciergeAgentId = $config.Foundry.ConciergeAgentId

$allowedAudiences = @($config.Auth.AllowedAudiences | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$allowedAudiencesPromptValue = if ($allowedAudiences.Count -gt 0) { $allowedAudiences -join ',' } else { '' }
$allowedAudiencesInput = Resolve-ConfigValue -Value $allowedAudiencesPromptValue -Prompt 'Allowed audiences (comma-separated)' -PropertyName 'Auth.AllowedAudiences' -DefaultValue $authClientId
$allowedAudiences = @($allowedAudiencesInput.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$config.Auth.AllowedAudiences = $allowedAudiences

$openAiAccountName = "${prefix}-aoai"
$contentSafetyAccountName = "${prefix}-cs"

$completedPhases = [System.Collections.Generic.List[string]]::new()
$resumeIndex = $phaseOrder.IndexOf($ResumeFrom)
$currentPhase = $ResumeFrom

try {
    Write-Info 'Validating tools and Azure session'
    Require-Command 'az'
    Require-Command 'dotnet'
    Require-Command 'npm'

    $account = Invoke-AzCli -Arguments @('account', 'show') -ExpectJson
    Invoke-AzCli -Arguments @('account', 'set', '--subscription', $subscriptionId) | Out-Null

    if ([string]::IsNullOrWhiteSpace($foundryTenantId)) {
        $foundryTenantId = $account.tenantId
    }

    for ($phaseIndex = $resumeIndex; $phaseIndex -lt $phaseOrder.Count; $phaseIndex++) {
        $phase = $phaseOrder[$phaseIndex]
        $currentPhase = $phase
        Save-State -CurrentPhase $phase -CompletedPhases $completedPhases.ToArray() -Status 'running' -Message 'Phase started.'

        switch ($phase) {
            'Preflight' {
                Write-Phase $phase 'Resolving subscription, resource group, and required inputs'

                $resourceGroupExists = (Invoke-AzCli -Arguments @('group', 'exists', '--name', $resourceGroupName)).ToLowerInvariant() -eq 'true'
                if (-not $resourceGroupExists) {
                    $canCreate = [bool]$config.CreateResourceGroupIfMissing
                    if (-not $canCreate) {
                        $answer = Read-Host "Resource group '$resourceGroupName' does not exist. Create it? (y/n)"
                        if ($answer -notin @('y', 'Y', 'yes', 'YES')) {
                            throw "Resource group '$resourceGroupName' is required to continue."
                        }
                    }

                    Write-Info "Creating resource group '$resourceGroupName' in '$location'"
                    Invoke-AzCli -Arguments @('group', 'create', '--name', $resourceGroupName, '--location', $location, '-o', 'json') | Out-Null
                }

                if ($foundryManageProject) {
                    $config.Foundry.ResourceName = Resolve-RequiredValue -Value $config.Foundry.ResourceName -Prompt 'Foundry resource name' -PropertyName 'Foundry.ResourceName'
                    $config.Foundry.ProjectName = Resolve-RequiredValue -Value $config.Foundry.ProjectName -Prompt 'Foundry project name' -PropertyName 'Foundry.ProjectName'
                    $config.Foundry.ModelDeploymentName = Resolve-RequiredValue -Value $config.Foundry.ModelDeploymentName -Prompt 'Foundry model deployment name' -PropertyName 'Foundry.ModelDeploymentName'
                    $config.Foundry.ModelName = Resolve-RequiredValue -Value $config.Foundry.ModelName -Prompt 'Foundry model name' -PropertyName 'Foundry.ModelName'
                    $config.Foundry.ModelFormat = Resolve-RequiredValue -Value $config.Foundry.ModelFormat -Prompt 'Foundry model format' -PropertyName 'Foundry.ModelFormat'
                }
                else {
                    $foundryProjectEndpoint = Resolve-RequiredValue -Value $foundryProjectEndpoint -Prompt 'Foundry project endpoint' -PropertyName 'Foundry.ProjectEndpoint'
                }

                if (-not $foundryManageAgents) {
                    $foundrySqlPlannerAgentId = Resolve-RequiredValue -Value $foundrySqlPlannerAgentId -Prompt 'Foundry SQL Planner agent id' -PropertyName 'Foundry.SqlPlannerAgentId'
                    $foundryResultInterpreterAgentId = Resolve-RequiredValue -Value $foundryResultInterpreterAgentId -Prompt 'Foundry Result Interpreter agent id' -PropertyName 'Foundry.ResultInterpreterAgentId'
                    $foundryConciergeAgentId = Resolve-RequiredValue -Value $foundryConciergeAgentId -Prompt 'Foundry Concierge agent id' -PropertyName 'Foundry.ConciergeAgentId'
                }

                $completedPhases.Add($phase)
            }
            'Provision' {
                Write-Phase $phase 'Provisioning Azure infrastructure for backend, frontend, SQL, OpenAI, Content Safety and Key Vault'

                $restoreOpenAiAccount = Test-SoftDeletedCognitiveAccount -SubscriptionId $subscriptionId -ResourceGroupName $resourceGroupName -Location $location -AccountName $openAiAccountName
                $restoreContentSafetyAccount = Test-SoftDeletedCognitiveAccount -SubscriptionId $subscriptionId -ResourceGroupName $resourceGroupName -Location $location -AccountName $contentSafetyAccountName
                if ($restoreOpenAiAccount) {
                    Write-Info "Detected soft-deleted Cognitive Services account '$openAiAccountName'. The infrastructure deployment will restore it automatically."
                }
                if ($restoreContentSafetyAccount) {
                    Write-Info "Detected soft-deleted Cognitive Services account '$contentSafetyAccountName'. The infrastructure deployment will restore it automatically."
                }

                $deployment = Invoke-AzCli -ExpectJson -Arguments @(
                    'deployment', 'group', 'create',
                    '--resource-group', $resourceGroupName,
                    '--template-file', (Join-Path $repoRoot 'infra/bicep/main.bicep'),
                    '--parameters', "prefix=$prefix",
                    '--parameters', "location=$location",
                    '--parameters', "sqlAdminLogin=$sqlAdminLogin",
                    '--parameters', "sqlAdminPassword=$sqlAdminPassword",
                    '--parameters', "openAiDeploymentName=$($config.AzureOpenAI.DeploymentName)",
                    '--parameters', "restoreOpenAiAccount=$restoreOpenAiAccount",
                    '--parameters', "restoreContentSafetyAccount=$restoreContentSafetyAccount",
                    '--parameters', "sqlDbSkuName=$($config.Sql.SkuName)",
                    '--parameters', "webAppSkuName=$($config.Frontend.AppServiceSkuName)",
                    '--parameters', "webAppSkuTier=$($config.Frontend.AppServiceSkuTier)",
                    '-o', 'json'
                )

                $deployment.properties.outputs | ConvertTo-Json -Depth 10 | Set-Content -Path $outputsPath
                $completedPhases.Add($phase)
            }
            'Foundry' {
                Write-Phase $phase 'Provisioning or validating Foundry project and deploying managed agents'

                if ($foundryManageProject) {
                    $foundryResourceName = $config.Foundry.ResourceName
                    $foundryProjectName = $config.Foundry.ProjectName
                    $foundryResourceSkuName = if ([string]::IsNullOrWhiteSpace($config.Foundry.ResourceSkuName)) { 'S0' } else { $config.Foundry.ResourceSkuName }

                    $foundryResource = Try-Invoke-AzCli -ExpectJson -Arguments @('cognitiveservices', 'account', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '-o', 'json')
                    if ($null -eq $foundryResource) {
                        if (-not $foundryCreateResourceIfMissing) {
                            throw "Foundry resource '$foundryResourceName' does not exist and Foundry.CreateResourceIfMissing is false."
                        }

                        Write-Info "Creating Foundry resource '$foundryResourceName'"
                        $foundryResource = Invoke-AzCli -ExpectJson -Arguments @(
                            'cognitiveservices', 'account', 'create',
                            '--resource-group', $resourceGroupName,
                            '--name', $foundryResourceName,
                            '--kind', 'AIServices',
                            '--sku', $foundryResourceSkuName,
                            '--location', $location,
                            '--custom-domain', $foundryResourceName,
                            '--allow-project-management',
                            '--yes',
                            '-o', 'json'
                        )
                    }

                    $customSubDomain = Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--query', 'properties.customSubDomainName', '-o', 'tsv')
                    if ([string]::IsNullOrWhiteSpace($customSubDomain)) {
                        Write-Info "Configuring custom domain for Foundry resource '$foundryResourceName'"
                        Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'update', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--custom-domain', $foundryResourceName, '-o', 'none') | Out-Null
                        $customSubDomain = $foundryResourceName
                    }

                    $foundryProject = Try-Invoke-AzCli -ExpectJson -Arguments @('cognitiveservices', 'account', 'project', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--project-name', $foundryProjectName, '-o', 'json')
                    if ($null -eq $foundryProject) {
                        if (-not $foundryCreateProjectIfMissing) {
                            throw "Foundry project '$foundryProjectName' does not exist and Foundry.CreateProjectIfMissing is false."
                        }

                        Write-Info "Creating Foundry project '$foundryProjectName'"
                        $foundryProject = Invoke-AzCli -ExpectJson -Arguments @(
                            'cognitiveservices', 'account', 'project', 'create',
                            '--resource-group', $resourceGroupName,
                            '--name', $foundryResourceName,
                            '--project-name', $foundryProjectName,
                            '--location', $location,
                            '-o', 'json'
                        )
                    }

                    $foundryProjectResourceId = $foundryProject.id
                    $foundryProjectEndpoint = Get-FoundryEndpoint -CustomSubDomain $customSubDomain -ProjectName $foundryProjectName

                    $modelDeploymentName = $config.Foundry.ModelDeploymentName
                    $modelDeployment = Try-Invoke-AzCli -ExpectJson -Arguments @('cognitiveservices', 'account', 'deployment', 'show', '--resource-group', $resourceGroupName, '--name', $foundryResourceName, '--deployment-name', $modelDeploymentName, '-o', 'json')
                    if ($null -eq $modelDeployment) {
                        Write-Info "Deploying model '$($config.Foundry.ModelName)' to Foundry resource '$foundryResourceName'"
                        Invoke-AzCli -Arguments @(
                            'cognitiveservices', 'account', 'deployment', 'create',
                            '--resource-group', $resourceGroupName,
                            '--name', $foundryResourceName,
                            '--deployment-name', $modelDeploymentName,
                            '--model-name', $config.Foundry.ModelName,
                            '--model-version', $config.Foundry.ModelVersion,
                            '--model-format', $config.Foundry.ModelFormat,
                            '--sku-name', $config.Foundry.ModelSkuName,
                            '--sku-capacity', "$($config.Foundry.ModelSkuCapacity)",
                            '-o', 'none'
                        ) | Out-Null
                    }
                }

                if ($foundryManageAgents) {
                    $pythonCommand = Resolve-PythonCommand -Root $repoRoot
                    Ensure-FoundryPythonDependencies -PythonCommand $pythonCommand -Root $repoRoot

                    & $pythonCommand (Join-Path $repoRoot 'tools/foundry/deploy_agents.py') 'apply' '--env' $foundryEnvironmentName '--project-endpoint' $foundryProjectEndpoint '--model-deployment' $config.Foundry.ModelDeploymentName | Out-Host
                    if ($LASTEXITCODE -ne 0) {
                        throw 'Foundry agent deployment failed.'
                    }

                    $generatedFoundryOutput = Join-Path $repoRoot "tools/foundry/output/$foundryEnvironmentName/foundry-deployment.json"
                    if (-not (Test-Path $generatedFoundryOutput)) {
                        throw "Foundry deployment output was not generated: $generatedFoundryOutput"
                    }

                    $foundryOutput = Get-Content $generatedFoundryOutput | ConvertFrom-Json
                    $foundrySqlPlannerAgentId = $foundryOutput.settings.FoundryAgent__SqlPlannerAgentId
                    $foundryResultInterpreterAgentId = $foundryOutput.settings.FoundryAgent__ResultInterpreterAgentId
                    $foundryConciergeAgentId = $foundryOutput.settings.FoundryAgent__ConciergeAgentId

                    @{
                        projectEndpoint = $foundryProjectEndpoint
                        projectResourceId = $foundryProjectResourceId
                        tenantId = $foundryTenantId
                        settings = $foundryOutput.settings
                        generatedAtUtc = [DateTime]::UtcNow.ToString('o')
                    } | ConvertTo-Json -Depth 10 | Set-Content -Path $foundryOutputsPath
                }
                else {
                    @{
                        projectEndpoint = $foundryProjectEndpoint
                        projectResourceId = $foundryProjectResourceId
                        tenantId = $foundryTenantId
                        settings = @{
                            FoundryAgent__ProjectEndpoint = $foundryProjectEndpoint
                            FoundryAgent__SqlPlannerAgentId = $foundrySqlPlannerAgentId
                            FoundryAgent__ResultInterpreterAgentId = $foundryResultInterpreterAgentId
                            FoundryAgent__ConciergeAgentId = $foundryConciergeAgentId
                        }
                        generatedAtUtc = [DateTime]::UtcNow.ToString('o')
                    } | ConvertTo-Json -Depth 10 | Set-Content -Path $foundryOutputsPath
                }

                $completedPhases.Add($phase)
            }
            'Configure' {
                Write-Phase $phase 'Configuring app settings, connection strings and optional Foundry RBAC'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $functionAppName = $outputs.functionAppName.value
                $functionAppHostname = $outputs.functionAppHostname.value
                $functionAppPrincipalId = $outputs.functionAppPrincipalId.value
                $webAppName = $outputs.webAppName.value
                $webAppHostname = $outputs.webAppHostname.value
                $sqlServerFqdn = $outputs.sqlServerFullyQualifiedName.value -replace '\.\.', '.'
                $analyticsDbName = $outputs.analyticsDatabaseName.value
                $appDbName = $outputs.appDatabaseName.value
                $openAiName = $outputs.openAiName.value
                $openAiEndpoint = $outputs.openAiEndpoint.value
                $contentSafetyEndpoint = $outputs.contentSafetyEndpoint.value
                $appInsightsConnectionString = $outputs.appInsightsConnectionString.value

                $openAiApiKey = Invoke-AzCli -Arguments @('cognitiveservices', 'account', 'keys', 'list', '--resource-group', $resourceGroupName, '--name', $openAiName, '--query', 'key1', '-o', 'tsv')
                $analyticsConnectionString = "Server=tcp:$sqlServerFqdn,1433;Initial Catalog=$analyticsDbName;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;User ID=$sqlAdminLogin;Password=$sqlAdminPassword;"
                $appDbConnectionString = "Server=tcp:$sqlServerFqdn,1433;Initial Catalog=$appDbName;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;User ID=$sqlAdminLogin;Password=$sqlAdminPassword;"
                $redirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.RedirectUri)) { "https://$webAppHostname" } else { $config.Frontend.RedirectUri }
                $postLogoutRedirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.PostLogoutRedirectUri)) { $redirectUri } else { $config.Frontend.PostLogoutRedirectUri }

                if (Test-Path $foundryOutputsPath) {
                    $resolvedFoundry = Get-Content $foundryOutputsPath | ConvertFrom-Json
                    $foundryProjectEndpoint = $resolvedFoundry.projectEndpoint
                    $foundryProjectResourceId = $resolvedFoundry.projectResourceId
                    $foundryTenantId = if ([string]::IsNullOrWhiteSpace($resolvedFoundry.tenantId)) { $foundryTenantId } else { $resolvedFoundry.tenantId }
                    $foundrySqlPlannerAgentId = $resolvedFoundry.settings.FoundryAgent__SqlPlannerAgentId
                    $foundryResultInterpreterAgentId = $resolvedFoundry.settings.FoundryAgent__ResultInterpreterAgentId
                    $foundryConciergeAgentId = $resolvedFoundry.settings.FoundryAgent__ConciergeAgentId
                }

                if ([string]::IsNullOrWhiteSpace($foundryProjectEndpoint) -or
                    [string]::IsNullOrWhiteSpace($foundrySqlPlannerAgentId) -or
                    [string]::IsNullOrWhiteSpace($foundryResultInterpreterAgentId) -or
                    [string]::IsNullOrWhiteSpace($foundryConciergeAgentId)) {
                    throw 'Foundry configuration is incomplete. Ensure the Foundry phase succeeded or provide manual Foundry settings in Deploy.Configuration.psd1.'
                }

                $foundrySettings = @(
                    "FoundryAgent__ProjectEndpoint=$foundryProjectEndpoint",
                    "FoundryAgent__TenantId=$foundryTenantId",
                    "FoundryAgent__SqlPlannerAgentId=$foundrySqlPlannerAgentId",
                    "FoundryAgent__ResultInterpreterAgentId=$foundryResultInterpreterAgentId",
                    "FoundryAgent__ConciergeAgentId=$foundryConciergeAgentId"
                )

                if (Test-Path $foundryOutputsPath) {
                    $resolvedFoundry = Get-Content $foundryOutputsPath | ConvertFrom-Json
                    if ($resolvedFoundry.settings.PSObject.Properties.Name -contains 'FoundryAgent__VisualizationPlannerAgentId' -and -not [string]::IsNullOrWhiteSpace($resolvedFoundry.settings.FoundryAgent__VisualizationPlannerAgentId)) {
                        $foundrySettings += "FoundryAgent__VisualizationPlannerAgentId=$($resolvedFoundry.settings.FoundryAgent__VisualizationPlannerAgentId)"
                    }
                }

                $functionSettings = @(
                    "SqlConnectionString=$analyticsConnectionString",
                    "AppDbConnectionString=$appDbConnectionString",
                    "AzureOpenAI__Endpoint=$openAiEndpoint",
                    "AzureOpenAI__Deployment=$($config.AzureOpenAI.DeploymentName)",
                    "AzureOpenAI__ApiKey=$openAiApiKey",
                    "ContentSafety__Endpoint=$contentSafetyEndpoint",
                    "Auth__AuthorityHost=$($config.Auth.AuthorityHost)",
                    "Auth__ClientId=$authClientId",
                    "Auth__AllowedAudiences=$($allowedAudiences -join ',')",
                    "APPLICATIONINSIGHTS_CONNECTION_STRING=$appInsightsConnectionString",
                    'SemanticKernel__EnableDemoEndpoint=false'
                )

                $functionSettings += $foundrySettings

                Invoke-AzCli -Arguments (@('functionapp', 'config', 'appsettings', 'set', '--resource-group', $resourceGroupName, '--name', $functionAppName, '--settings') + $functionSettings + @('-o', 'none')) | Out-Null

                $webSettings = @(
                    "API_BASE_URL=https://$functionAppHostname",
                    "NEXT_PUBLIC_AZURE_AD_CLIENT_ID=$authClientId",
                    "NEXT_PUBLIC_AZURE_AD_AUTHORITY=$frontendAuthority",
                    "NEXT_PUBLIC_REDIRECT_URI=$redirectUri",
                    "NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=$postLogoutRedirectUri",
                    "APPLICATIONINSIGHTS_CONNECTION_STRING=$appInsightsConnectionString",
                    'SCM_DO_BUILD_DURING_DEPLOYMENT=false',
                    'ENABLE_ORYX_BUILD=false'
                )

                Invoke-AzCli -Arguments (@('webapp', 'config', 'appsettings', 'set', '--resource-group', $resourceGroupName, '--name', $webAppName, '--settings') + $webSettings + @('-o', 'none')) | Out-Null
                Invoke-AzCli -Arguments @('webapp', 'config', 'set', '--resource-group', $resourceGroupName, '--name', $webAppName, '--startup-file', 'node server.js', '-o', 'none') | Out-Null

                if (-not [string]::IsNullOrWhiteSpace($foundryProjectResourceId) -and -not [string]::IsNullOrWhiteSpace($config.Foundry.RoleDefinitionName)) {
                    Write-Info 'Assigning configured Foundry RBAC role to Function App managed identity'
                    try {
                        Invoke-AzCli -Arguments @(
                            'role', 'assignment', 'create',
                            '--assignee-object-id', $functionAppPrincipalId,
                            '--assignee-principal-type', 'ServicePrincipal',
                            '--role', $config.Foundry.RoleDefinitionName,
                            '--scope', $foundryProjectResourceId,
                            '-o', 'none'
                        ) | Out-Null
                    }
                    catch {
                        Write-WarnLine "Foundry RBAC assignment failed. Continue after validating permissions manually. Error: $($_.Exception.Message)"
                    }
                }
                else {
                    Write-WarnLine 'Foundry RBAC assignment skipped. If the Function App managed identity lacks access to the AI Project, the end-to-end test will fail until permissions are granted.'
                }

                $completedPhases.Add($phase)
            }
            'Database' {
                Write-Phase $phase 'Bootstrapping application and analytics databases'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $sqlServerFqdn = $outputs.sqlServerFullyQualifiedName.value -replace '\.\.', '.'
                $sqlServerName = $outputs.sqlServerName.value
                $analyticsDbName = $outputs.analyticsDatabaseName.value
                $appDbName = $outputs.appDatabaseName.value

                $clientIpAddress = Get-PublicIpAddress
                if (-not [string]::IsNullOrWhiteSpace($clientIpAddress)) {
                    $firewallRuleName = "Client-$($clientIpAddress.Replace('.', '-'))"
                    Write-Info "Ensuring SQL firewall rule '$firewallRuleName' for client IP $clientIpAddress"
                    Invoke-AzCli -Arguments @(
                        'sql', 'server', 'firewall-rule', 'create',
                        '--resource-group', $resourceGroupName,
                        '--server', $sqlServerName,
                        '--name', $firewallRuleName,
                        '--start-ip-address', $clientIpAddress,
                        '--end-ip-address', $clientIpAddress,
                        '-o', 'none'
                    ) | Out-Null
                }
                else {
                    Write-WarnLine 'Could not determine the current public IP address. Database bootstrap may fail if the SQL server does not already allow this client IP.'
                }

                Invoke-SqlFile -Server $sqlServerFqdn -Database $appDbName -User $sqlAdminLogin -Password $sqlAdminPassword -FilePath (Join-Path $repoRoot 'database/create_app_tables.sql')

                $analyticsScripts = @(
                    Get-ChildItem -Path (Join-Path $repoRoot 'database/schema') -File | Sort-Object Name
                    Get-ChildItem -Path (Join-Path $repoRoot 'database/seed') -File | Sort-Object Name
                )

                foreach ($script in $analyticsScripts) {
                    Invoke-SqlFile -Server $sqlServerFqdn -Database $analyticsDbName -User $sqlAdminLogin -Password $sqlAdminPassword -FilePath $script.FullName
                }

                $completedPhases.Add($phase)
            }
            'DeployApi' {
                Write-Phase $phase 'Publishing Azure Functions backend and deploying package'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $functionAppName = $outputs.functionAppName.value
                $publishDir = Join-Path $artifactsDir 'backend-publish'
                $zipPath = Join-Path $artifactsDir 'backend-package.zip'

                if (Test-Path $publishDir) {
                    Remove-Item $publishDir -Recurse -Force
                }

                dotnet publish (Join-Path $repoRoot 'backend/src/Functions.Api/Functions.Api.csproj') -c Release -o $publishDir | Out-Host
                New-ZipFromDirectory -SourceDirectory $publishDir -ZipPath $zipPath
                Invoke-AzCli -Arguments @('functionapp', 'deployment', 'source', 'config-zip', '--resource-group', $resourceGroupName, '--name', $functionAppName, '--src', $zipPath, '-o', 'none') | Out-Null

                $completedPhases.Add($phase)
            }
            'DeployWeb' {
                Write-Phase $phase 'Building Next.js standalone bundle and deploying it to Azure App Service'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $webAppName = $outputs.webAppName.value
                $webAppHostname = $outputs.webAppHostname.value
                $functionAppHostname = $outputs.functionAppHostname.value
                $frontendPackageDir = Join-Path $artifactsDir 'frontend-package'
                $zipPath = Join-Path $artifactsDir 'frontend-package.zip'
                $redirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.RedirectUri)) { "https://$webAppHostname" } else { $config.Frontend.RedirectUri }
                $postLogoutRedirectUri = if ([string]::IsNullOrWhiteSpace($config.Frontend.PostLogoutRedirectUri)) { $redirectUri } else { $config.Frontend.PostLogoutRedirectUri }
                $frontendBuildEnvironment = @{
                    API_BASE_URL = "https://$functionAppHostname"
                    NEXT_PUBLIC_AZURE_AD_CLIENT_ID = $authClientId
                    NEXT_PUBLIC_AZURE_AD_AUTHORITY = $frontendAuthority
                    NEXT_PUBLIC_REDIRECT_URI = $redirectUri
                    NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI = $postLogoutRedirectUri
                }

                Build-FrontendPackage -SourceRoot (Join-Path $repoRoot 'frontend') -DestinationRoot $frontendPackageDir -BuildEnvironment $frontendBuildEnvironment
                New-ZipFromDirectory -SourceDirectory $frontendPackageDir -ZipPath $zipPath
                Invoke-AzCli -Arguments @('webapp', 'deploy', '--resource-group', $resourceGroupName, '--name', $webAppName, '--src-path', $zipPath, '--type', 'zip', '--clean', 'true', '--restart', 'true', '-o', 'none') | Out-Null

                $completedPhases.Add($phase)
            }
            'Verify' {
                Write-Phase $phase 'Running smoke checks against frontend and backend endpoints'

                $outputs = Get-Content $outputsPath | ConvertFrom-Json
                $functionAppHostname = $outputs.functionAppHostname.value
                $webAppHostname = $outputs.webAppHostname.value
                $frontendUrl = "https://$webAppHostname"
                $backendUrl = "https://$functionAppHostname"

                $frontendOk = Wait-ForHttp -Url $frontendUrl
                $backendOk = Wait-ForHttp -Url $backendUrl -SuccessStatusFloor 200 -SuccessStatusCeiling 499

                if (-not $frontendOk) {
                    throw "Frontend smoke test failed. Re-run with -ResumeFrom Verify after checking the Web App logs."
                }

                if (-not $backendOk) {
                    throw "Backend smoke test failed. Re-run with -ResumeFrom Verify after checking the Function App logs."
                }

                Write-Info "Frontend URL: $frontendUrl"
                Write-Info "Backend URL: $backendUrl"
                Write-WarnLine 'If interactive login succeeds but query execution fails, validate the existing app registration redirect URIs and Foundry permissions for the Function App managed identity.'
                $completedPhases.Add($phase)
            }
        }

        Save-State -CurrentPhase $phase -CompletedPhases $completedPhases.ToArray() -Status 'completed' -Message 'Phase completed.'
    }
}
catch {
    $message = $_.Exception.Message
    Save-State -CurrentPhase $currentPhase -CompletedPhases $completedPhases.ToArray() -Status 'failed' -Message $message
    Write-Host "[error] $message" -ForegroundColor Red
    if ($completedPhases.Count -lt $phaseOrder.Count) {
        $nextPhase = $currentPhase
        Write-WarnLine "To continue after fixing the issue, re-run: .\deploy\Invoke-FullDeployment.ps1 -ConfigPath '$ConfigPath' -ResumeFrom $nextPhase"
    }
    throw
}