@{
    SubscriptionId = ''
    ResourceGroupName = ''
    Location = 'eastus'
    CreateResourceGroupIfMissing = $true
    Prefix = 'insightforge-dev'

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