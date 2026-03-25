@{
    SubscriptionId = ''
    ResourceGroupName = 'rg-insightforge-dev'
    Location = 'eastus2'
    CreateResourceGroupIfMissing = $true
    Prefix = 'ifdev2'

    Sql = @{
        AdminLogin = 'sqladminif'
        AdminPassword = ''
        SkuName = 'Basic'
    }

    Frontend = @{
        AppServiceSkuName = 'B1'
        AppServiceSkuTier = 'Basic'
        # Si se deja vacio, el script compone la authority con Auth.AuthorityHost + Auth.TenantId.
        Authority = ''
        # Si se deja vacio, el script usa https://<web-app-hostname>.
        # Esa misma URL debe existir como Redirect URI en el App Registration configurado en Auth.ClientId.
        RedirectUri = ''
        # Si se deja vacio, el script reutiliza RedirectUri.
        PostLogoutRedirectUri = ''
    }

    Auth = @{
        ClientId = ''
        TenantId = ''
        # Debe incluir la audiencia aceptada por el backend. Normalmente coincide con ClientId.
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