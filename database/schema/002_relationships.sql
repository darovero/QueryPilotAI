ALTER TABLE dbo.accounts
ADD CONSTRAINT FK_accounts_customers
FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);

ALTER TABLE dbo.devices
ADD CONSTRAINT FK_devices_customers
FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);

ALTER TABLE dbo.transactions
ADD CONSTRAINT FK_transactions_customers
FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);

ALTER TABLE dbo.transactions
ADD CONSTRAINT FK_transactions_accounts
FOREIGN KEY (account_id) REFERENCES dbo.accounts(account_id);

ALTER TABLE dbo.transactions
ADD CONSTRAINT FK_transactions_merchants
FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(merchant_id);

ALTER TABLE dbo.transactions
ADD CONSTRAINT FK_transactions_devices
FOREIGN KEY (device_id) REFERENCES dbo.devices(device_id);

ALTER TABLE dbo.chargebacks
ADD CONSTRAINT FK_chargebacks_transactions
FOREIGN KEY (transaction_id) REFERENCES dbo.transactions(transaction_id);

ALTER TABLE dbo.fraud_alerts
ADD CONSTRAINT FK_fraud_alerts_customers
FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);

ALTER TABLE dbo.fraud_alerts
ADD CONSTRAINT FK_fraud_alerts_transactions
FOREIGN KEY (transaction_id) REFERENCES dbo.transactions(transaction_id);

ALTER TABLE dbo.risk_signals
ADD CONSTRAINT FK_risk_signals_customers
FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);

ALTER TABLE dbo.analytics_approvals
ADD CONSTRAINT FK_analytics_approvals_requests
FOREIGN KEY (request_id) REFERENCES dbo.analytics_requests_audit(request_id);
