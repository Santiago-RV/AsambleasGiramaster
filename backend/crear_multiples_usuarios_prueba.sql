-- Script para crear múltiples usuarios de prueba para testing del sistema de correos
-- Ejecutar este script en la base de datos db_giramaster

-- INSTRUCCIONES:
-- 1. Reemplaza los emails con emails reales para testing
-- 2. Ajusta int_residential_unit_id según tu base de datos
-- 3. Ajusta int_id_rol según los roles disponibles en tu sistema

-- Usuario 1: Juan Pérez
INSERT INTO tbl_data_users (str_firstname, str_lastname, str_email, str_phone, created_at, updated_at)
VALUES ('Juan', 'Pérez García', 'juan.perez@example.com', '+57 300 111 2222', NOW(), NOW());
SET @data_user_id_1 = LAST_INSERT_ID();

INSERT INTO tbl_users (int_data_user_id, str_username, str_password_hash, int_id_rol, bln_is_external_delegate, bln_user_temporary, bln_is_active, created_at, updated_at)
VALUES (@data_user_id_1, 'juan.perez', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYfGq9vRdJa', 2, FALSE, FALSE, TRUE, NOW(), NOW());
SET @user_id_1 = LAST_INSERT_ID();

INSERT INTO tbl_user_residential_units (int_user_id, int_residential_unit_id, str_apartment_number, created_at, updated_at)
VALUES (@user_id_1, 1, 'Apto 101', NOW(), NOW());

-- Usuario 2: María González
INSERT INTO tbl_data_users (str_firstname, str_lastname, str_email, str_phone, created_at, updated_at)
VALUES ('María', 'González López', 'maria.gonzalez@example.com', '+57 300 222 3333', NOW(), NOW());
SET @data_user_id_2 = LAST_INSERT_ID();

INSERT INTO tbl_users (int_data_user_id, str_username, str_password_hash, int_id_rol, bln_is_external_delegate, bln_user_temporary, bln_is_active, created_at, updated_at)
VALUES (@data_user_id_2, 'maria.gonzalez', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYfGq9vRdJa', 2, FALSE, FALSE, TRUE, NOW(), NOW());
SET @user_id_2 = LAST_INSERT_ID();

INSERT INTO tbl_user_residential_units (int_user_id, int_residential_unit_id, str_apartment_number, created_at, updated_at)
VALUES (@user_id_2, 1, 'Apto 102', NOW(), NOW());

-- Usuario 3: Carlos Rodríguez
INSERT INTO tbl_data_users (str_firstname, str_lastname, str_email, str_phone, created_at, updated_at)
VALUES ('Carlos', 'Rodríguez Martínez', 'carlos.rodriguez@example.com', '+57 300 333 4444', NOW(), NOW());
SET @data_user_id_3 = LAST_INSERT_ID();

INSERT INTO tbl_users (int_data_user_id, str_username, str_password_hash, int_id_rol, bln_is_external_delegate, bln_user_temporary, bln_is_active, created_at, updated_at)
VALUES (@data_user_id_3, 'carlos.rodriguez', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYfGq9vRdJa', 2, FALSE, FALSE, TRUE, NOW(), NOW());
SET @user_id_3 = LAST_INSERT_ID();

INSERT INTO tbl_user_residential_units (int_user_id, int_residential_unit_id, str_apartment_number, created_at, updated_at)
VALUES (@user_id_3, 1, 'Apto 103', NOW(), NOW());

-- Usuario 4: Ana Martínez (Tu email para testing)
-- IMPORTANTE: Reemplaza 'tu-email@gmail.com' con tu email real
INSERT INTO tbl_data_users (str_firstname, str_lastname, str_email, str_phone, created_at, updated_at)
VALUES ('Ana', 'Martínez Silva', 'tu-email@gmail.com', '+57 300 444 5555', NOW(), NOW());
SET @data_user_id_4 = LAST_INSERT_ID();

INSERT INTO tbl_users (int_data_user_id, str_username, str_password_hash, int_id_rol, bln_is_external_delegate, bln_user_temporary, bln_is_active, created_at, updated_at)
VALUES (@data_user_id_4, 'ana.martinez', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYfGq9vRdJa', 2, FALSE, FALSE, TRUE, NOW(), NOW());
SET @user_id_4 = LAST_INSERT_ID();

INSERT INTO tbl_user_residential_units (int_user_id, int_residential_unit_id, str_apartment_number, created_at, updated_at)
VALUES (@user_id_4, 1, 'Apto 104', NOW(), NOW());

-- Usuario 5: Luis Hernández
INSERT INTO tbl_data_users (str_firstname, str_lastname, str_email, str_phone, created_at, updated_at)
VALUES ('Luis', 'Hernández Torres', 'luis.hernandez@example.com', '+57 300 555 6666', NOW(), NOW());
SET @data_user_id_5 = LAST_INSERT_ID();

INSERT INTO tbl_users (int_data_user_id, str_username, str_password_hash, int_id_rol, bln_is_external_delegate, bln_user_temporary, bln_is_active, created_at, updated_at)
VALUES (@data_user_id_5, 'luis.hernandez', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYfGq9vRdJa', 2, FALSE, FALSE, TRUE, NOW(), NOW());
SET @user_id_5 = LAST_INSERT_ID();

INSERT INTO tbl_user_residential_units (int_user_id, int_residential_unit_id, str_apartment_number, created_at, updated_at)
VALUES (@user_id_5, 1, 'Apto 105', NOW(), NOW());

-- Verificar usuarios creados
SELECT 
    u.id,
    u.str_username,
    CONCAT(du.str_firstname, ' ', du.str_lastname) as nombre_completo,
    du.str_email,
    uru.str_apartment_number,
    uru.int_residential_unit_id,
    u.bln_is_active
FROM tbl_users u
INNER JOIN tbl_data_users du ON u.int_data_user_id = du.id
LEFT JOIN tbl_user_residential_units uru ON u.id = uru.int_user_id
WHERE u.str_username IN ('juan.perez', 'maria.gonzalez', 'carlos.rodriguez', 'ana.martinez', 'luis.hernandez')
ORDER BY u.id;

-- Resumen
SELECT 
    COUNT(*) as total_usuarios,
    'Usuarios de prueba creados exitosamente' as mensaje,
    'Contraseña para todos: prueba123' as password_info,
    'Unidad Residencial ID: 1' as unidad_residencial
FROM tbl_users u
WHERE u.str_username IN ('juan.perez', 'maria.gonzalez', 'carlos.rodriguez', 'ana.martinez', 'luis.hernandez');

