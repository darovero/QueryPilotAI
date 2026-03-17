INSERT INTO dbo.customers (customer_id, full_name, segment, city, country, risk_level)
VALUES
('C001', 'Ana Torres', 'Retail', 'Bogota', 'Colombia', 'Medium'),
('C002', 'Luis Perez', 'SMB', 'Medellin', 'Colombia', 'High'),
('C003', 'Maria Rojas', 'Retail', 'Cali', 'Colombia', 'Low');

INSERT INTO dbo.accounts (account_id, customer_id, account_type, status, opened_at)
VALUES
('A001', 'C001', 'Checking', 'Active', DATEADD(DAY, -420, SYSUTCDATETIME())),
('A002', 'C002', 'Checking', 'Active', DATEADD(DAY, -310, SYSUTCDATETIME())),
('A003', 'C003', 'Savings', 'Active', DATEADD(DAY, -250, SYSUTCDATETIME()));

INSERT INTO dbo.merchants (merchant_id, merchant_name, category, city, country, risk_profile)
VALUES
('M101', 'BlueMarket', 'Retail', 'Bogota', 'Colombia', 'Low'),
('M102', 'Northwind Fuel', 'Fuel', 'Bogota', 'Colombia', 'High'),
('M103', 'SkyTravel', 'Travel', 'Medellin', 'Colombia', 'Medium');

INSERT INTO dbo.devices (device_id, customer_id, fingerprint, first_seen_at, is_trusted)
VALUES
('D001', 'C001', 'fp-001', DATEADD(DAY, -180, SYSUTCDATETIME()), 1),
('D002', 'C002', 'fp-002', DATEADD(DAY, -150, SYSUTCDATETIME()), 0),
('D003', 'C003', 'fp-002', DATEADD(DAY, -20, SYSUTCDATETIME()), 0);
