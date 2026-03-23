# Mejoras y Recomendaciones para Convertir InsightForge AI en un Producto Funcional

## Objetivo
Este documento consolida las mejoras prioritarias identificadas para llevar el proyecto desde un MVP técnico o demo avanzada a un producto funcional, estable, seguro y operable.

## Estado Actual Resumido
- Existe un flujo end-to-end funcional: pregunta en lenguaje natural, generación de SQL, validación, ejecución, interpretación y auditoría.
- El backend ya implementa orquestación con Azure Functions y Durable Functions.
- El frontend ya ofrece una experiencia operativa usable con chat, sesiones, conexiones y seguimiento de estado.
- La solución todavía presenta brechas relevantes en seguridad, endurecimiento operativo, mantenibilidad, alineación de infraestructura y calidad de producto.

## Criterio de Producto Funcional
Para considerar el producto funcional, como mínimo debe cumplir lo siguiente:
- Autenticación y autorización reales, no solo extracción parcial de claims.
- Gestión de secretos fuera del repositorio.
- Validación SQL robusta con allowlists y controles auditables.
- Infraestructura desplegable y alineada con la arquitectura real.
- Persistencia consistente de sesiones, auditoría y aprobaciones.
- Experiencia de usuario estable con manejo explícito de errores y estados.
- Observabilidad suficiente para operar, diagnosticar y auditar.
- Pruebas automáticas mínimas sobre flujos críticos y escenarios de abuso.

## Prioridad 1 - Seguridad y Gobierno

### 1. Corregir exposición de secretos
- Remover credenciales, API keys y valores sensibles del repositorio, documentación y archivos de configuración local.
- Rotar inmediatamente todas las credenciales expuestas.
- Mover secretos a Azure Key Vault y variables de entorno seguras por entorno.
- Agregar validaciones para impedir que se vuelvan a commitear secretos.

### 2. Implementar validación real de JWT
- Validar firma, issuer, audience y expiración del token en backend.
- Rechazar cualquier request con token inválido o no confiable.
- Mapear roles de Entra ID a roles internos del producto.
- Auditar usuario autenticado, rol y origen de la solicitud.

### 3. Endurecer el policy engine SQL
- Implementar allowlist explícita de tablas, vistas y columnas autorizadas.
- Prohibir cualquier objeto fuera del catálogo certificado.
- Detectar consultas costosas o riesgosas por joins, scans amplios y ausencia de límites.
- Aplicar `TOP` o paginación obligatoria donde corresponda.
- Separar validaciones de seguridad, cumplimiento y performance.

### 4. Endurecer aprobación humana
- Persistir solicitudes de aprobación con estado completo y trazabilidad.
- Validar que solo roles autorizados puedan aprobar o rechazar.
- Registrar motivo, timestamp y usuario aprobador.
- Manejar expiración, reintentos y auditoría del ciclo de aprobación.

## Prioridad 2 - Estabilidad Backend

### 5. Consolidar la arquitectura de IA
- Elegir oficialmente entre Azure AI Foundry como ruta principal y los servicios heredados de Azure OpenAI.
- Eliminar o aislar código legado que ya no participa del flujo principal.
- Versionar prompts, contratos JSON y respuestas esperadas por agente.
- Definir fallback cuando un agente responda texto no estructurado o devuelva JSON inválido.

### 6. Fortalecer manejo de errores y contratos
- Normalizar respuestas de error del backend con DTOs consistentes.
- Evitar mensajes ambiguos al frontend.
- Distinguir claramente errores de autenticación, validación, conexión, policy, ejecución y orquestación.
- Registrar contexto útil sin filtrar información sensible.

### 7. Estabilizar conexiones a bases de datos del usuario
- Soportar de forma explícita los motores realmente permitidos por producto.
- Validar mejor configuración de conexión, conectividad y permisos antes de ejecutar consultas.
- Revisar la lógica de fallback de conexiones para evitar ejecuciones en una base distinta a la esperada.
- Añadir timeouts, retry policy y clasificación de errores transitorios.

### 8. Fortalecer persistencia de aplicación
- Completar el esquema de base de aplicación para sesiones, organizaciones, turnos y conexiones.
- Revisar claves foráneas, borrado lógico y consistencia transaccional.
- Asegurar integridad entre sesión, auditoría, aprobación y conversación.
- Definir política de retención para historial y auditoría.

## Prioridad 3 - Infraestructura y Despliegue

### 9. Alinear Bicep con la implementación real
- Incorporar todos los recursos y settings necesarios para la versión actual del backend.
- Incluir configuración de `AppDbConnectionString`, Foundry y cualquier dependencia obligatoria real.
- Separar claramente recursos de datos operativos y datos analíticos.
- Parametrizar adecuadamente dev, test y prod.

### 10. Preparar despliegue reproducible
- Asegurar que una persona pueda desplegar el sistema sin pasos manuales ocultos.
- Documentar prerequisitos, permisos, orden de despliegue y post-configuración.
- Añadir validaciones post-deploy para comprobar salud del sistema.
- Incluir scripts de bootstrap de base de datos y datos de prueba controlados.

### 11. Endurecer configuración por entorno
- Separar configuración local, desarrollo, QA y producción.
- Eliminar dependencias implícitas de archivos locales no versionables.
- Definir naming conventions, tagging y convención de recursos Azure.
- Agregar smoke checks para detectar configuración incompleta al iniciar la Function App.

## Prioridad 4 - Frontend y Experiencia de Usuario

### 12. Refactorizar el componente principal de chat
- Dividir el componente grande actual en módulos de dominio: chat, approval, resultados, conexiones, sesiones y paneles.
- Separar estado de UI, lógica de negocio, polling y rendering.
- Añadir tipos más estrictos para los estados y contratos del backend.
- Reducir dependencia en `localStorage` como fuente principal de verdad.

### 13. Mejorar UX operativa
- Mostrar errores accionables al usuario final.
- Diferenciar claramente estados: procesando, esperando aprobación, bloqueado, error, completado.
- Presentar SQL, riesgo, justificación y resultados de forma consistente.
- Mejorar el flujo de reconexión, expiración de sesión y reintentos.

### 14. Consolidar autenticación cliente
- Revisar scopes, uso de tokens y compatibilidad con el backend.
- Alinear el tipo de token usado con la validación real del servidor.
- Evitar depender de tokens no pensados para autorización de APIs propias.
- Definir experiencia clara de login, logout y sesión expirada.

## Prioridad 5 - Observabilidad y Operación

### 15. Implementar telemetría útil para operación
- Medir duración por etapa del pipeline.
- Medir bloqueos por safety, rechazos por policy y aprobaciones requeridas.
- Medir fallas por tipo de error y por integración externa.
- Correlacionar frontend, backend, orquestación y ejecución SQL con un mismo identificador.

### 16. Estandarizar logs estructurados
- Registrar `requestId`, `userId`, `sessionId`, `role`, `riskLevel`, `status` y duración.
- Evitar logs con secretos, tokens o payloads sensibles completos.
- Incluir trazas suficientes para diagnosticar fallas de agentes, SQL y aprobaciones.

### 17. Crear tablero operativo mínimo
- Monitorear throughput, errores, latencia, aprobaciones pendientes y bloqueos.
- Agregar alertas para caídas de dependencias o errores repetidos.
- Definir métricas de salud de negocio y salud técnica.

## Prioridad 6 - Calidad, Testing y Release

### 18. Añadir pruebas automatizadas del backend
- Casos felices de consulta analítica.
- Casos ambiguos que requieran aclaración.
- Casos bloqueados por prompt safety.
- Casos bloqueados por policy SQL.
- Casos con aprobación requerida, aprobada y rechazada.

### 19. Añadir pruebas del frontend y contratos
- Tests de estados principales de la UI.
- Tests de integración para polling y renderizado de resultados.
- Contract tests entre frontend y backend para evitar drift de DTOs.

### 20. Preparar checklist de salida a producción
- Seguridad validada.
- Infraestructura alineada.
- Logs y métricas activas.
- Pruebas críticas pasando.
- Manual operativo disponible.
- Runbook de incidentes y fallback documentado.

## Recomendaciones Técnicas Concretas

### Backend
- Reemplazar el middleware JWT actual por validación real con librerías estándar de autenticación.
- Convertir el policy engine en un componente más rico y testeable, con reglas explícitas por tipo.
- Aislar el cliente de Foundry detrás de contratos estables y versionados.
- Revisar puntos donde hoy se atrapan excepciones silenciosamente para no perder trazabilidad.

### Frontend
- Extraer hooks especializados para sesiones, polling, approvals y conexiones.
- Crear componentes de presentación pequeños y reutilizables.
- Establecer un modelo de estado más predecible para mensajes y pipeline.
- Preparar un diseño de errores y estados vacíos consistente.

### Base de Datos
- Usar vistas certificadas como superficie principal para el generador SQL.
- Limitar exposición de columnas sensibles desde la capa analítica.
- Revisar si la auditoría debe residir en la base operativa en lugar de la base analítica.

### Infraestructura
- Versionar entornos y parámetros.
- Preparar despliegue completo de aplicación, datos, configuración y observabilidad.
- Añadir comprobaciones automatizadas tras aprovisionamiento.

## Propuesta de Roadmap Ejecutable

### Fase 1 - Bloqueadores de seguridad y despliegue
- Remediación de secretos.
- Validación JWT real.
- Alineación de Bicep y configuración obligatoria.
- Checklist mínimo de arranque reproducible.

### Fase 2 - Endurecimiento del pipeline analítico
- Policy engine robusto.
- Aprobaciones persistentes.
- Manejo de errores uniforme.
- Contratos estables con Foundry.

### Fase 3 - Calidad de producto y UX
- Refactor del frontend.
- Estados operativos claros.
- Observabilidad transversal.
- Pruebas automáticas esenciales.

### Fase 4 - Preparación productiva
- Hardening final.
- Runbooks.
- Métricas y alertas.
- Validación integral de release.

## Definición de Hecho Recomendada
Una mejora de este backlog debe considerarse terminada solo si:
- Tiene código implementado.
- Tiene validación o prueba asociada.
- Tiene impacto observable en logs, UI o comportamiento.
- Tiene documentación mínima de operación si afecta despliegue o soporte.
- No introduce secretos ni atajos incompatibles con producción.
