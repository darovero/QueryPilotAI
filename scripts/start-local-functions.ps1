param(
    [Parameter(Mandatory = $false)]
    [string]$SubscriptionId = "",

    [Parameter(Mandatory = $false)]
    [string]$ResourceGroup = "",

    [Parameter(Mandatory = $false)]
    [string]$StorageAccountName = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlConnectionString = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlServerName = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlDatabaseName = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlUser = "",

    [Parameter(Mandatory = $false)]
    [string]$SqlPassword = "",

    [Parameter(Mandatory = $false)]
    [string]$AzureOpenAiEndpoint = "",

    [Parameter(Mandatory = $false)]
    [string]$AzureOpenAiDeployment = "",

    [Parameter(Mandatory = $false)]
    [string]$ContentSafetyEndpoint = "",

    [Parameter(Mandatory = $false)]
    [string]$FunctionProjectPath = "backend/src/Functions.Api",

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$Foreground
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[start-local-functions] $Message"
}

function Require-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not available in PATH."
    }
}

function Set-EnvIfValue {
    param(
        [string]$Name,
        [string]$Value
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
        Write-Step "Set process env: $Name"
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$functionsPath = Resolve-Path (Join-Path $repoRoot $FunctionProjectPath)

Require-Command "func"
Require-Command "dotnet"

Write-Step "Stopping stale Functions/dotnet processes for this workspace"
Get-CimInstance Win32_Process |
    Where-Object {
        ($_.Name -eq "func.exe" -or $_.Name -eq "dotnet.exe") -and
        $_.CommandLine -match "QueryPilotAI\\backend\\src\\Functions.Api"
    } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

if (-not [string]::IsNullOrWhiteSpace($SubscriptionId) -and -not [string]::IsNullOrWhiteSpace($ResourceGroup) -and -not [string]::IsNullOrWhiteSpace($StorageAccountName)) {
    Require-Command "az"
    Write-Step "Resolving AzureWebJobsStorage key from Azure Storage account"
    $storageKey = az storage account keys list --subscription $SubscriptionId -g $ResourceGroup -n $StorageAccountName --query "[0].value" -o tsv
    if ([string]::IsNullOrWhiteSpace($storageKey)) {
        throw "Failed to resolve Storage account key for '$StorageAccountName'."
    }
    $azureWebJobsStorage = "DefaultEndpointsProtocol=https;AccountName=$StorageAccountName;AccountKey=$storageKey;EndpointSuffix=core.windows.net"
    Set-EnvIfValue -Name "AzureWebJobsStorage" -Value $azureWebJobsStorage
}

if ([string]::IsNullOrWhiteSpace($SqlConnectionString)) {
    if (
        -not [string]::IsNullOrWhiteSpace($SqlServerName) -and
        -not [string]::IsNullOrWhiteSpace($SqlDatabaseName) -and
        -not [string]::IsNullOrWhiteSpace($SqlUser) -and
        -not [string]::IsNullOrWhiteSpace($SqlPassword)
    ) {
        $SqlConnectionString = "Server=tcp:$SqlServerName.database.windows.net,1433;Initial Catalog=$SqlDatabaseName;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;User ID=$SqlUser;Password=$SqlPassword;"
    }
}

Set-EnvIfValue -Name "FUNCTIONS_WORKER_RUNTIME" -Value "dotnet-isolated"
Set-EnvIfValue -Name "SqlConnectionString" -Value $SqlConnectionString
Set-EnvIfValue -Name "AzureOpenAI__Endpoint" -Value $AzureOpenAiEndpoint
Set-EnvIfValue -Name "AzureOpenAI__Deployment" -Value $AzureOpenAiDeployment
Set-EnvIfValue -Name "ContentSafety__Endpoint" -Value $ContentSafetyEndpoint

if (-not $SkipBuild) {
    Write-Step "Building backend solution"
    Push-Location (Join-Path $repoRoot "backend/src")
    try {
        dotnet build InsightForge.slnx -v minimal -p:UseSharedCompilation=false /nodeReuse:false | Out-Host
    }
    finally {
        Pop-Location
    }
}

Push-Location $functionsPath
try {
    $args = @("start", "--script-root", "bin/Debug/net8.0", "--no-build")

    if ($Foreground) {
        Write-Step "Starting Azure Functions host in foreground"
        & func @args
        exit $LASTEXITCODE
    }

    $logsDir = Join-Path $repoRoot ".logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir | Out-Null
    }

    $stdoutLog = Join-Path $logsDir "functions.stdout.log"
    $stderrLog = Join-Path $logsDir "functions.stderr.log"

    Write-Step "Starting Azure Functions host in background"
    $proc = Start-Process -FilePath "func" -ArgumentList $args -WorkingDirectory $functionsPath -PassThru -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog

    Write-Step "Waiting for host health endpoint"
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $status = Invoke-WebRequest -UseBasicParsing -Method Get -Uri "http://localhost:7071/admin/host/status" -TimeoutSec 5
            if ($status.StatusCode -eq 200) {
                $ready = $true
                break
            }
        }
        catch {
            # Keep polling until timeout.
        }
    }

    if (-not $ready) {
        Write-Step "Host did not become healthy in time."
        if (-not $proc.HasExited) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
        throw "Azure Functions host startup timed out. Check logs at $stdoutLog and $stderrLog"
    }

    Write-Step "Host is healthy (http://localhost:7071). PID: $($proc.Id)"
    Write-Step "Logs: $stdoutLog"
}
finally {
    Pop-Location
}