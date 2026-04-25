CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE users
SET password_hash = crypt('Admin@12345', gen_salt('bf', 12))
WHERE email = 'sysadmin@alumex.local';

UPDATE users
SET password_hash = crypt('Export@12345', gen_salt('bf', 12))
WHERE email = 'export.coordinator@alumex.local';

UPDATE users
SET password_hash = crypt('Warehouse@12345', gen_salt('bf', 12))
WHERE email = 'warehouse.officer@alumex.local';

UPDATE users
SET password_hash = crypt('Production@12345', gen_salt('bf', 12))
WHERE email = 'production.supervisor@alumex.local';
