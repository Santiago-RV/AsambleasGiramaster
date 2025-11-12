-- Script para crear un usuario de prueba con email para testing del sistema de correos
-- Ejecutar este script en la base de datos db_giramaster

-- IMPORTANTE: Reemplaza 'tu-email@gmail.com' con tu email real para recibir las pruebas

-- 1. Insertar datos personales del usuario de prueba
INSERT INTO tbl_data_users (
    str_firstname,
    str_lastname,
    str_email,
    str_phone,
    created_at,
    updated_at
) VALUES (
    'Usuario',
    'Prueba Email',
    'gomezjosedavid997@gmail.com',  -- ⚠️ REEMPLAZAR CON TU EMAIL REAL
    '+57 300 123 4567',
    NOW(),
    NOW()
);

-- Obtener el ID del usuario recién creado
SET @data_user_id = LAST_INSERT_ID();

-- 2. Crear el usuario en tbl_users (asumiendo que existe un rol con ID 2 - puede ser "Residente")
-- La contraseña es "prueba123" encriptada con bcrypt
INSERT INTO tbl_users (
    int_data_user_id,
    str_username,
    str_password_hash,
    int_id_rol,
    bln_is_external_delegate,
    bln_user_temporary,
    dat_temporary_expiration_date,
    bln_is_active,
    created_at,
    updated_at
) VALUES (
    @data_user_id,
    'usuario.prueba.email',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYfGq9vRdJa', -- Contraseña: prueba123
    2,  -- ID del rol (ajustar según tu base de datos)
    FALSE,
    FALSE,
    NULL,
    TRUE,
    NOW(),
    NOW()
);

-- Obtener el ID del usuario recién creado
SET @user_id = LAST_INSERT_ID();

-- 3. Asociar el usuario con una unidad residencial (ajustar el ID según tu base de datos)
-- Asumiendo que existe una unidad residencial con ID 1
INSERT INTO tbl_user_residential_units (
    int_user_id,
    int_residential_unit_id,
    str_apartment_number,
    created_at,
    updated_at
) VALUES (
    @user_id,
    1,  -- ⚠️ ID de la unidad residencial (ajustar según tu base de datos)
    'Apto 101 - Prueba',
    NOW(),
    NOW()
);

-- Verificar que se creó correctamente
SELECT 
    u.id as user_id,
    u.str_username,
    du.str_firstname,
    du.str_lastname,
    du.str_email,
    du.str_phone,
    u.bln_is_active,
    uru.str_apartment_number,
    uru.int_residential_unit_id
FROM tbl_users u
INNER JOIN tbl_data_users du ON u.int_data_user_id = du.id
LEFT JOIN tbl_user_residential_units uru ON u.id = uru.int_user_id
WHERE u.id = @user_id;

-- Información del usuario creado
SELECT 
    CONCAT('✅ Usuario creado exitosamente') as resultado,
    CONCAT('Usuario: ', u.str_username) as username,
    CONCAT('Nombre: ', du.str_firstname, ' ', du.str_lastname) as nombre_completo,
    CONCAT('Email: ', du.str_email) as email,
    CONCAT('ID Usuario: ', u.id) as user_id,
    CONCAT('Contraseña: prueba123') as password_info
FROM tbl_users u
INNER JOIN tbl_data_users du ON u.int_data_user_id = du.id
WHERE u.id = @user_id;

