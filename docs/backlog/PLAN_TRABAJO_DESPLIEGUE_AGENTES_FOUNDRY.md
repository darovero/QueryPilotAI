# Plan de Trabajo: Despliegue Funcional de Agentes en Azure Foundry

## Objetivo
Diseñar e implementar en el proyecto un programa automatizado que:
- Cree y actualice agentes en Azure Foundry con instrucciones versionadas.
- Configure memoria de agente (conversación y memory store cuando aplique).
- Genere artefactos de salida consumibles por Infra y Backend.
- Permita despliegue reproducible por ambiente (`dev`, `qa`, `prod`).

## Contexto Actual
- El backend depende de estas variables para operar:
  - `FoundryAgent__ProjectEndpoint`
  - `FoundryAgent__SqlPlannerAgentId`
  - `FoundryAgent__ResultInterpreterAgentId`
  - `FoundryAgent__ConciergeAgentId`
- Existen scripts Python de creación de agentes, pero actualmente:
  - incluyen valores hardcodeados,
  - no administran memoria,
  - no generan salidas estandarizadas para `infra` y `backend`,
  - no tienen un flujo idempotente por ambiente.

## Resultado Esperado
Un flujo de despliegue end-to-end donde un solo comando:
1. Valida prerrequisitos.
2. Crea/actualiza agentes en Foundry.
3. Registra instrucciones por agente.
4. Configura memoria y políticas de retención (si está habilitada en el entorno).
5. Emite un paquete de configuración para Bicep y Backend.
6. Permite verificación post-despliegue.

## Arquitectura Propuesta del Programa

### Ubicación sugerida
- `tools/foundry/deploy_agents.py`
- `tools/foundry/config/agents.<env>.yaml`
- `tools/foundry/templates/instructions/*.md`
- `tools/foundry/output/<env>/foundry-deployment.json`

### Configuración declarativa de entrada
Archivo por ambiente: `tools/foundry/config/agents.<env>.yaml`

Campos mínimos:
- `environment`: `dev|qa|prod`
- `projectEndpoint`: endpoint de proyecto Foundry (no endpoint de Azure OpenAI)
- `modelDeployment`: nombre del deployment del modelo
- `agents`: lista de agentes con:
  - `key`: `sqlPlanner|resultInterpreter|concierge`
  - `name`
  - `instructionsFile`
  - `temperature`, `top_p`, `max_tokens` (si aplica)
  - `memory.enabled`
  - `memory.storeName` (si aplica)
  - `tags`

### Salidas obligatorias del programa
1. `tools/foundry/output/<env>/foundry-deployment.json`
2. `infra/parameters/foundry.<env>.json`
3. `backend/src/Functions.Api/appsettings.foundry.<env>.json`

Contrato mínimo de salida:
- `projectEndpoint`
- `agentIds` o identificadores de versión según SDK activo
- `agentNames`
- `agentVersions` (si aplica)
- `memoryStores`
- `generatedAtUtc`

## Integración con Infra y Backend

### Infra (Bicep/Parámetros)
Agregar consumo de parámetros generados por Foundry para publicar configuración de aplicación:
- `FoundryAgent__ProjectEndpoint`
- `FoundryAgent__SqlPlannerAgentId`
- `FoundryAgent__ResultInterpreterAgentId`
- `FoundryAgent__ConciergeAgentId`

Recomendación:
- no inyectar secretos en texto plano,
- resolver secretos desde Key Vault o referencias seguras.

### Backend
Mantener el contrato actual de variables de entorno en la Function App y agregar validaciones de arranque:
- validar presencia de endpoint y agentes requeridos,
- fail fast con mensajes claros de configuración faltante,
- log estructurado de versión de configuración cargada (sin secretos).

## Plan por Fases

## Fase 1 - Fundaciones y Seguridad
Entregables:
- estructura base `tools/foundry/`.
- archivo de configuración declarativa por ambiente.
- carga de credenciales via `DefaultAzureCredential`.
- eliminación de hardcodeo de claves y endpoints.

Criterios de aceptación:
- el programa falla si faltan datos críticos.
- ningún secreto queda en código fuente.

## Fase 2 - Creación/Actualización de Agentes
Entregables:
- lógica idempotente `upsert` de agentes.
- lectura de instrucciones desde archivos Markdown versionados.
- mapeo estable `key -> agentId/version`.

Criterios de aceptación:
- ejecutar dos veces no duplica agentes.
- el cambio de instrucciones actualiza el agente objetivo.

## Fase 3 - Memoria y Estado Conversacional
Entregables:
- configuración de conversación persistente por agente.
- soporte para memory store administrado (si está habilitado en entorno Foundry).
- fallback seguro si memory store no está disponible.

Criterios de aceptación:
- agentes mantienen contexto multi-turno.
- memoria explícitamente habilitada o deshabilitada por ambiente.

## Fase 4 - Generación de Artefactos para Infra/Backend
Entregables:
- generación de `foundry-deployment.json`.
- export de parámetros para `infra/parameters`.
- export de configuración para backend.

Criterios de aceptación:
- infraestructura consume parámetros sin edición manual.
- backend arranca con configuración generada automáticamente.

## Fase 5 - Pipeline CI/CD y Verificación
Entregables:
- job de pipeline para ejecutar `deploy_agents.py` por ambiente.
- validaciones post-deploy:
  - existencia de agentes,
  - prueba simple de invocación,
  - consistencia con backend config.

Criterios de aceptación:
- despliegue repetible desde CI.
- rollback documentado ante falla.

## Diseño Funcional del CLI (Programa)

Comandos sugeridos:
- `python tools/foundry/deploy_agents.py plan --env dev`
- `python tools/foundry/deploy_agents.py apply --env dev`
- `python tools/foundry/deploy_agents.py export --env dev`
- `python tools/foundry/deploy_agents.py verify --env dev`

Comportamiento:
- `plan`: muestra cambios previstos (crear/actualizar/sin cambios).
- `apply`: ejecuta cambios y publica agentes.
- `export`: genera artefactos para infra/backend.
- `verify`: prueba invocación mínima y valida configuración final.

## Estructura de Instrucciones de Agente

Archivos sugeridos:
- `tools/foundry/templates/instructions/sql-planner.md`
- `tools/foundry/templates/instructions/result-interpreter.md`
- `tools/foundry/templates/instructions/concierge.md`
- `tools/foundry/templates/instructions/visualization-planner.md`

Estado actual:
- Se definio la instruccion oficial de SQL Planner en `tools/foundry/templates/instructions/sql-planner.md`.
- Se definio la instruccion oficial de Result Interpreter en `tools/foundry/templates/instructions/result-interpreter.md`.
- Se definio la instruccion oficial de Visualization Planner en `tools/foundry/templates/instructions/visualization-planner.md`.
- Se definio la instruccion oficial de Concierge en `tools/foundry/templates/instructions/concierge.md`.
- Se creo configuracion inicial de ambiente en `tools/foundry/config/agents.dev.yaml`.
- Se creo helper base de automatizacion en `tools/foundry/deploy_agents.py` con comandos `plan` y `export`.
- El programa de despliegue debe leer este archivo y publicarlo al agente mapeado por la clave `sqlPlanner`.
- La variable `FoundryAgent__SqlPlannerAgentId` debe almacenar el identificador/version del agente desplegado, no el texto de instrucciones.

Buenas prácticas:
- instrucciones por responsabilidad única.
- salida estructurada JSON cuando aplique.
- versión de prompt con changelog breve.
- pruebas de regresión por instrucción.

## Riesgos y Mitigaciones
- Cambio de SDK de Foundry (IDs vs nombre/versión de agente):
  - Mitigar con capa adaptadora y contrato de salida estable.
- Diferencias de capacidades por región/modelo:
  - Validación previa de modelo y región en `plan`.
- Falla de permisos RBAC:
  - precheck de permisos al inicio del `apply`.
- Drift entre agentes desplegados y backend config:
  - `verify` obligatorio y hash de configuración.

## Historias Técnicas Iniciales (Backlog)
1. Crear módulo de configuración declarativa de agentes por ambiente.
2. Implementar cliente Foundry idempotente para `upsert` de agentes.
3. Implementar carga de instrucciones desde Markdown.
4. Implementar módulo de memoria por agente con fallback.
5. Implementar export de artefactos para `infra` y `backend`.
6. Integrar despliegue en pipeline CI/CD.
7. Agregar pruebas de smoke y contract tests del output.

## Definición de Hecho
Se considera completo cuando:
- el programa despliega agentes por ambiente sin hardcodeo,
- genera configuración utilizable por infra y backend,
- backend puede arrancar y responder con agentes recién desplegados,
- existe verificación automatizada post-despliegue,
- se documenta operación y rollback.

## Dependencias Externas
- Azure AI Foundry Project habilitado.
- Modelo desplegado y disponible en la región.
- Identidad con permisos para administrar agentes.
- Azure Key Vault para secretos.

## Siguiente Paso Recomendado
Implementar Fase 1 y Fase 2 en un primer PR para reemplazar scripts actuales inseguros, dejando habilitada la exportación de parámetros hacia `infra` y `backend`.
