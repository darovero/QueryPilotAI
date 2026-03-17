INSERT INTO dbo.analytics_requests_audit (request_id, user_id, role_name, original_question, status)
VALUES
(NEWID(), 'analyst@contoso.com', 'FraudAnalyst', '¿Qué comercios muestran incremento anómalo de chargebacks?', 'Seeded');
