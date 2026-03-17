# InsightForge AI

Agente de ingeniería analítica orientado a fraude que transforma preguntas en lenguaje natural en planes analíticos estructurados, genera SQL validado, ejecuta consultas seguras sobre Azure SQL y entrega explicaciones ejecutivas con trazabilidad, aprobación humana y observabilidad.

## Objetivos
- Traducir preguntas de negocio a intención analítica estructurada.
- Generar SQL gobernado y seguro.
- Aplicar reglas de validación, transparencia y aprobación.
- Explicar resultados en lenguaje empresarial.
- Demostrar IA responsable, amplitud de servicios Azure y reproducibilidad end-to-end.

## Stack objetivo
- Frontend: Next.js / React / TypeScript
- Backend: Azure Functions Isolated Worker (.NET 8)
- Orquestación: Durable Functions
- IA: Azure OpenAI
- Seguridad: Azure AI Content Safety
- Datos: Azure SQL Database
- Observabilidad: Application Insights + Azure Monitor
- Secretos: Azure Key Vault
- Identidad: Microsoft Entra ID

## Estructura
- `docs/`: arquitectura, decisiones, roadmap y demo.
- `frontend/`: UI moderna y paneles de transparencia.
- `backend/`: Functions, orquestación, dominio y reglas.
- `database/`: esquema SQL, seguridad, vistas y semillas.
- `infra/`: Bicep y scripts de despliegue.
- `test-assets/`: prompts de prueba y datasets para validación.

## Flujos demo sugeridos
1. Consulta segura y autoejecución.
2. Consulta sensible que requiere aprobación.
3. Prompt abusivo o consulta insegura bloqueada.

## Puesta en marcha rápida
1. Provisionar Azure con `infra/deploy.ps1` o `infra/deploy.sh`.
2. Ejecutar scripts SQL en `database/`.
3. Configurar variables según `.env.example`.
4. Levantar backend y frontend en local.
5. Probar prompts desde `test-assets/`.

## Estado
Este repositorio contiene un esqueleto inicial de arquitectura, seguridad, base de datos, infraestructura y lineamientos de desarrollo para comenzar en VS Code.
