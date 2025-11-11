-- Agregar campo str_zoom_password a la tabla tbl_meetings
-- Este campo almacenará la contraseña de las reuniones de Zoom

USE db_giramaster;

ALTER TABLE tbl_meetings 
ADD COLUMN str_zoom_password VARCHAR(50) NULL 
AFTER str_zoom_start_url;

-- Verificar que se agregó correctamente
DESCRIBE tbl_meetings;

