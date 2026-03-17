INSERT INTO dbo.transactions (transaction_id, customer_id, account_id, merchant_id, device_id, channel, amount, currency, transaction_ts, status, response_code, geo_city, geo_country)
VALUES
('T001', 'C001', 'A001', 'M101', 'D001', 'web', 120.00, 'COP', DATEADD(DAY, -5, SYSUTCDATETIME()), 'APPROVED', '00', 'Bogota', 'Colombia'),
('T002', 'C002', 'A002', 'M102', 'D002', 'mobile', 700.00, 'COP', DATEADD(DAY, -4, SYSUTCDATETIME()), 'DECLINED', '51', 'Bogota', 'Colombia'),
('T003', 'C002', 'A002', 'M102', 'D002', 'mobile', 715.00, 'COP', DATEADD(DAY, -4, SYSUTCDATETIME()), 'DECLINED', '51', 'Bogota', 'Colombia'),
('T004', 'C002', 'A002', 'M102', 'D002', 'mobile', 719.00, 'COP', DATEADD(DAY, -4, SYSUTCDATETIME()), 'APPROVED', '00', 'Bogota', 'Colombia'),
('T005', 'C003', 'A003', 'M103', 'D003', 'web', 1500.00, 'COP', DATEADD(DAY, -2, SYSUTCDATETIME()), 'APPROVED', '00', 'Medellin', 'Colombia'),
('T006', 'C002', 'A002', 'M102', 'D002', 'mobile', 680.00, 'COP', DATEADD(DAY, -1, SYSUTCDATETIME()), 'APPROVED', '00', 'Bogota', 'Colombia'),
('T007', 'C002', 'A002', 'M102', 'D002', 'web', 690.00, 'COP', DATEADD(DAY, -15, SYSUTCDATETIME()), 'APPROVED', '00', 'Bogota', 'Colombia'),
('T008', 'C001', 'A001', 'M101', 'D001', 'web', 140.00, 'COP', DATEADD(DAY, -20, SYSUTCDATETIME()), 'APPROVED', '00', 'Bogota', 'Colombia');

INSERT INTO dbo.chargebacks (chargeback_id, transaction_id, chargeback_reason, chargeback_ts, amount)
VALUES
('CB001', 'T004', 'fraud_claim', DATEADD(DAY, -2, SYSUTCDATETIME()), 719.00),
('CB002', 'T006', 'fraud_claim', DATEADD(HOUR, -12, SYSUTCDATETIME()), 680.00);

INSERT INTO dbo.fraud_alerts (alert_id, customer_id, transaction_id, alert_type, alert_score, created_at, status)
VALUES
('AL001', 'C002', 'T004', 'velocity_spike', 92.30, DATEADD(DAY, -2, SYSUTCDATETIME()), 'Open'),
('AL002', 'C002', 'T006', 'device_reputation', 88.40, DATEADD(HOUR, -10, SYSUTCDATETIME()), 'Open'),
('AL003', 'C003', 'T005', 'shared_device', 76.10, DATEADD(DAY, -1, SYSUTCDATETIME()), 'Open');

INSERT INTO dbo.risk_signals (signal_id, customer_id, signal_type, signal_value, signal_ts)
VALUES
('RS001', 'C002', 'device_reuse', 'fingerprint fp-002 shared across customers', DATEADD(HOUR, -9, SYSUTCDATETIME())),
('RS002', 'C002', 'velocity', '3 attempts within 1 hour', DATEADD(DAY, -4, SYSUTCDATETIME())),
('RS003', 'C003', 'shared_device', 'device D003 linked to fingerprint fp-002', DATEADD(DAY, -1, SYSUTCDATETIME()));
