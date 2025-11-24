-- ============================================
-- MIGRACIÓN: Corrección del modelo de encuestas
-- Fecha: 2025-11-15
-- Descripción: Permite que campos de fecha sean NULL
--              para encuestas en estado 'draft'
-- ============================================

-- Modificar columnas para permitir NULL
ALTER TABLE tbl_polls
    ALTER COLUMN dat_started_at DROP NOT NULL,
    ALTER COLUMN dat_ended_at DROP NOT NULL,
    ALTER COLUMN int_duration_minutes DROP NOT NULL;

-- Establecer valores por defecto
ALTER TABLE tbl_polls
    ALTER COLUMN int_max_selections SET DEFAULT 1,
    ALTER COLUMN str_status SET DEFAULT 'draft';

-- Actualizar registros existentes si los hay
-- (esto es por si ya existen datos que causan problemas)
UPDATE tbl_polls
SET dat_started_at = NULL
WHERE str_status = 'draft' AND dat_started_at IS NOT NULL;

UPDATE tbl_polls
SET dat_ended_at = NULL
WHERE str_status IN ('draft', 'active') AND dat_ended_at IS NOT NULL;

-- Verificar la estructura
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tbl_polls'
    AND column_name IN ('dat_started_at', 'dat_ended_at', 'int_duration_minutes', 'int_max_selections', 'str_status')
ORDER BY ordinal_position;
