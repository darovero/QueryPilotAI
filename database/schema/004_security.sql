-- Ejemplo básico de enmascaramiento dinámico.
ALTER TABLE dbo.customers
ALTER COLUMN full_name ADD MASKED WITH (FUNCTION = 'partial(1,"XXXX",1)');

-- Nota:
-- Row-Level Security y roles específicos pueden agregarse en una siguiente iteración
-- según el modelo de identidad de Entra ID y el contexto de sesión.
