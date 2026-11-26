-- Solo desarrollo: base de pruebas y permisos para la base "shadow" de prisma migrate dev.
CREATE DATABASE IF NOT EXISTS boveda_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON *.* TO 'boveda'@'%';
FLUSH PRIVILEGES;
