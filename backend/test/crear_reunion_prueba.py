#!/usr/bin/env python3
"""
Script para crear una reunión de prueba con datos de una reunión de Zoom existente
Ejecutar: python crear_reunion_prueba.py
"""
import sys
import os
from datetime import datetime

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def extract_meeting_number(zoom_url):
    """Extrae el número de reunión de una URL de Zoom"""
    import re
    pattern = r'/j/(\d+)'
    match = re.search(pattern, zoom_url)
    if match:
        return match.group(1)
    return None

def extract_password(zoom_url):
    """Extrae el password de una URL de Zoom"""
    import re
    pattern = r'pwd=([^&]+)'
    match = re.search(pattern, zoom_url)
    if match:
        return match.group(1)
    return None

def main():
    print("=" * 70)
    print("🧪 CREAR REUNIÓN DE PRUEBA EN BASE DE DATOS")
    print("=" * 70)
    print()
    
    # Solicitar datos de la reunión manual de Zoom
    print("📝 Por favor, proporciona los datos de tu reunión de Zoom:")
    print()
    
    zoom_url = input("1️⃣  URL de la reunión (ej: https://zoom.us/j/1234567890?pwd=abc123): ").strip()
    
    if not zoom_url:
        print("Error: La URL es requerida")
        sys.exit(1)
    
    # Extraer número de reunión y password
    meeting_number = extract_meeting_number(zoom_url)
    password = extract_password(zoom_url)
    
    print(f"\nNúmero de reunión extraído: {meeting_number}")
    print(f"Password extraído: {password if password else '(sin password)'}")
    
    # Si no se pudo extraer, pedirlo manualmente
    if not meeting_number:
        meeting_number = input("\n2️⃣  Número de reunión (solo números): ").strip()
    
    if not password:
        password = input("3️⃣  Password de la reunión (Enter si no tiene): ").strip()
        if not password:
            password = None
    
    # Otros datos
    print("\n📋 Datos de la reunión:")
    titulo = input(" Título de la reunión: ").strip() or "Reunión de Prueba Zoom"
    descripcion = input(" Descripción (opcional): ").strip() or "Reunión de prueba para verificar integración con Zoom"
    
    # Datos fijos para prueba
    int_id_residential_unit = 4
    str_meeting_type = "ordinary"
    dat_schedule_date = datetime.now()
    int_estimated_duration = 60
    int_organizer_id = 1
    int_meeting_leader_id = 1
    str_status = "scheduled"
    int_total_invitated = 1
    int_total_confirmed = 0
    created_by = 1
    updated_by = 1
    
    # Generar código de reunión
    str_meeting_code = f"MTG-TEST-{meeting_number}"
    
    # Construir URLs
    str_zoom_join_url = zoom_url
    str_zoom_start_url = zoom_url  # En producción, esto sería diferente
    
    print("\n" + "=" * 70)
    print("📊 RESUMEN DE LA REUNIÓN:")
    print("=" * 70)
    print(f"Código: {str_meeting_code}")
    print(f"Título: {titulo}")
    print(f"Descripción: {descripcion}")
    print(f"Tipo: {str_meeting_type}")
    print(f"Fecha programada: {dat_schedule_date}")
    print(f"Duración: {int_estimated_duration} minutos")
    print(f"Estado: {str_status}")
    print(f"\n🔗 ZOOM:")
    print(f"Meeting ID: {meeting_number}")
    print(f"Join URL: {str_zoom_join_url}")
    print(f"Password: {password if password else '(sin password)'}")
    print("=" * 70)
    
    confirmar = input("\n¿Crear esta reunión? (s/n): ").strip().lower()
    
    if confirmar != 's':
        print("Operación cancelada")
        sys.exit(0)
    
    # Conectar a la base de datos
    print("\n🔄 Conectando a la base de datos...")
    engine = create_engine(settings.DATABASE_URL.replace('mysql+asyncmy', 'mysql+pymysql'))
    
    # Primero, agregar la columna si no existe
    print("🔄 Verificando estructura de la tabla...")
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                ALTER TABLE tbl_meetings 
                ADD COLUMN str_zoom_password VARCHAR(50) NULL 
                AFTER str_zoom_start_url
            """))
            conn.commit()
            print("Campo str_zoom_password agregado")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("Campo str_zoom_password ya existe")
            else:
                print(f" Error al agregar campo (puede que ya exista): {str(e)}")
    
    # Insertar la reunión
    print("\n🔄 Insertando reunión en la base de datos...")
    
    sql = text("""
        INSERT INTO tbl_meetings (
            int_id_residential_unit,
            str_meeting_code,
            str_title,
            str_description,
            str_meeting_type,
            dat_schedule_date,
            int_estimated_duration,
            int_organizer_id,
            int_meeting_leader_id,
            int_zoom_meeting_id,
            str_zoom_join_url,
            str_zoom_start_url,
            str_zoom_password,
            bln_allow_delegates,
            str_status,
            bln_quorum_reached,
            int_total_invitated,
            int_total_confirmed,
            created_at,
            updated_at,
            created_by,
            updated_by
        ) VALUES (
            :int_id_residential_unit,
            :str_meeting_code,
            :str_title,
            :str_description,
            :str_meeting_type,
            :dat_schedule_date,
            :int_estimated_duration,
            :int_organizer_id,
            :int_meeting_leader_id,
            :int_zoom_meeting_id,
            :str_zoom_join_url,
            :str_zoom_start_url,
            :str_zoom_password,
            :bln_allow_delegates,
            :str_status,
            :bln_quorum_reached,
            :int_total_invitated,
            :int_total_confirmed,
            :created_at,
            :updated_at,
            :created_by,
            :updated_by
        )
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(sql, {
                'int_id_residential_unit': int_id_residential_unit,
                'str_meeting_code': str_meeting_code,
                'str_title': titulo,
                'str_description': descripcion,
                'str_meeting_type': str_meeting_type,
                'dat_schedule_date': dat_schedule_date,
                'int_estimated_duration': int_estimated_duration,
                'int_organizer_id': int_organizer_id,
                'int_meeting_leader_id': int_meeting_leader_id,
                'int_zoom_meeting_id': int(meeting_number),
                'str_zoom_join_url': str_zoom_join_url,
                'str_zoom_start_url': str_zoom_start_url,
                'str_zoom_password': password,
                'bln_allow_delegates': False,
                'str_status': str_status,
                'bln_quorum_reached': False,
                'int_total_invitated': int_total_invitated,
                'int_total_confirmed': int_total_confirmed,
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'created_by': created_by,
                'updated_by': updated_by
            })
            conn.commit()
            
            meeting_id = result.lastrowid
            
            print("\n" + "=" * 70)
            print("¡REUNIÓN CREADA EXITOSAMENTE!")
            print("=" * 70)
            print(f"ID de la reunión: {meeting_id}")
            print(f"Código: {str_meeting_code}")
            print()
            print("🎉 Ahora puedes:")
            print("   1. Ir a la pestaña 'Reuniones' en el frontend")
            print("   2. Ver tu reunión en la lista")
            print("   3. Hacer clic en 'Iniciar Reunión'")
            print("   4. Unirte a la reunión de Zoom desde el navegador")
            print()
            print("=" * 70)
            
    except Exception as e:
        print(f"\nError al insertar reunión: {str(e)}")
        print("\n💡 Posibles causas:")
        print("   - No existe la unidad residencial con ID 1")
        print("   - No existe el usuario con ID 1")
        print("   - La tabla no tiene los campos correctos")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperación cancelada por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\nError inesperado: {str(e)}")
        sys.exit(1)

