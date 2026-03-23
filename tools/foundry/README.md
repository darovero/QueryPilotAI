# Foundry Agent Deployment Helper

Este directorio contiene la base para automatizar el despliegue/configuracion de agentes de InsightForge en Azure Foundry.

## Estructura
- `deploy_agents.py`: comandos `plan`, `export` y placeholder `apply`.
- `config/agents.<env>.yaml`: configuracion declarativa por ambiente.
- `templates/instructions/*.md`: instrucciones versionadas por agente.
- `output/<env>/foundry-deployment.json`: salida consolidada por ambiente.

## Prerrequisitos
1. Python 3.10+
2. Instalar dependencias:

```bash
pip install -r tools/foundry/requirements.txt
```

## Uso

Desde la raiz del repo:

```bash
python tools/foundry/deploy_agents.py plan --env dev
python tools/foundry/deploy_agents.py export --env dev
```

## Variables de entorno esperadas para IDs de agentes
Si ya tienes agentes creados, exporta sus IDs para construir artefactos:

- `FOUNDRY_SQL_PLANNER_AGENT_ID`
- `FOUNDRY_RESULT_INTERPRETER_AGENT_ID`
- `FOUNDRY_CONCIERGE_AGENT_ID`
- `FOUNDRY_VISUALIZATION_PLANNER_AGENT_ID`

Alternativamente, el script intenta leer fallback con los nombres de settings del backend:

- `FoundryAgent__SqlPlannerAgentId`
- `FoundryAgent__ResultInterpreterAgentId`
- `FoundryAgent__ConciergeAgentId`
- `FoundryAgent__VisualizationPlannerAgentId`

## Compatibilidad de SDK
El helper esta alineado con `azure-ai-projects==1.0.0`, ya que el backend actual consume `AgentId` y no el modelo nuevo basado en `name/version`.

## Requisitos para `apply`
- `projectEndpoint` real en `tools/foundry/config/agents.<env>.yaml`
- Sesion autenticada o credenciales resolubles por `DefaultAzureCredential`
- Permisos para crear y actualizar agentes en el proyecto Foundry

## Artefactos generados por `export`
- `tools/foundry/output/<env>/foundry-deployment.json`
- `infra/parameters/foundry.<env>.json`
- `backend/src/Functions.Api/appsettings.foundry.<env>.json`

## Siguiente iteracion
Implementar `apply` para realizar upsert real de agentes contra Azure Foundry con `DefaultAzureCredential` y SDK oficial.
