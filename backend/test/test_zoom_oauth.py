#!/usr/bin/env python3
"""
Script para probar las credenciales de Zoom OAuth Server-to-Server
"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.zoom_api_service import ZoomAPIService
from app.core.config import settings

def main():
    print("\n" + "🔐" * 30)
    print("  TEST DE ZOOM OAUTH SERVER-TO-SERVER")
    print("  Sistema: Asambleas Giramaster")
    print("🔐" * 30 + "\n")
    
    # Test 1: Verificar credenciales
    print("=" * 70)
    print("📋 PASO 1: VERIFICANDO CREDENCIALES")
    print("=" * 70)
    
    print(f"\n✅ ZOOM_SDK_KEY: {settings.ZOOM_SDK_KEY[:15]}... (oculto)")
    print(f"✅ ZOOM_SDK_SECRET: {settings.ZOOM_SDK_SECRET[:15]}... (oculto)")
    print(f"✅ ZOOM_ACCOUNT_ID: {settings.ZOOM_ACCOUNT_ID[:15] if settings.ZOOM_ACCOUNT_ID else 'NO CONFIGURADO'}... (oculto)")
    print(f"✅ ZOOM_CLIENT_ID: {settings.ZOOM_CLIENT_ID[:15] if settings.ZOOM_CLIENT_ID else 'NO CONFIGURADO'}... (oculto)")
    print(f"✅ ZOOM_CLIENT_SECRET: {settings.ZOOM_CLIENT_SECRET[:15] if settings.ZOOM_CLIENT_SECRET else 'NO CONFIGURADO'}... (oculto)")
    
    if not settings.ZOOM_ACCOUNT_ID or not settings.ZOOM_CLIENT_ID or not settings.ZOOM_CLIENT_SECRET:
        print("\n❌ ERROR: Credenciales OAuth no configuradas")
        print("\n💡 Ejecuta: bash configurar_zoom_oauth.sh")
        sys.exit(1)
    
    # Test 2: Obtener Access Token
    print("\n" + "=" * 70)
    print("🔑 PASO 2: OBTENIENDO ACCESS TOKEN")
    print("=" * 70)
    
    try:
        zoom_service = ZoomAPIService()
        print("\n🔄 Solicitando token de acceso...")
        token = zoom_service._get_access_token()
        
        print(f"\n✅ Token obtenido exitosamente!")
        print(f"   Token (truncado): {token[:50]}...")
        print(f"   Longitud: {len(token)} caracteres")
        
    except Exception as e:
        print(f"\n❌ Error al obtener token: {str(e)}")
        print("\n💡 Posibles causas:")
        print("   1. Las credenciales son incorrectas")
        print("   2. La app no está activa en Zoom Marketplace")
        print("   3. La app no tiene los permisos correctos (scopes)")
        print("\n🔧 Solución:")
        print("   1. Ve a https://marketplace.zoom.us/")
        print("   2. Verifica tu app Server-to-Server OAuth")
        print("   3. Verifica los scopes: meeting:write:admin, meeting:read:admin")
        sys.exit(1)
    
    # Test 3: Crear reunión de prueba
    print("\n" + "=" * 70)
    print("📅 PASO 3: CREANDO REUNIÓN DE PRUEBA")
    print("=" * 70)
    
    try:
        topic = "🧪 Test - Reunión Automática Giramaster"
        start_time = datetime.now() + timedelta(hours=1)
        duration = 60
        agenda = "Reunión de prueba para verificar integración OAuth Server-to-Server"
        
        print(f"\n📝 Datos de la reunión:")
        print(f"   Título: {topic}")
        print(f"   Inicio: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Duración: {duration} minutos")
        print(f"   Agenda: {agenda}")
        
        print(f"\n🔄 Creando reunión en Zoom...")
        
        meeting_info = zoom_service.create_meeting(
            topic=topic,
            start_time=start_time,
            duration=duration,
            timezone="America/Bogota",
            agenda=agenda
        )
        
        print(f"\n✅ ¡REUNIÓN CREADA EXITOSAMENTE!")
        print(f"\n📋 Información de la reunión:")
        print(f"   ID: {meeting_info.get('id')}")
        print(f"   URL: {meeting_info.get('join_url')}")
        print(f"   Password: {meeting_info.get('password', 'Sin contraseña')}")
        print(f"   Start URL (anfitrión): {meeting_info.get('start_url')[:50]}...")
        
        meeting_id = meeting_info.get('id')
        
        # Test 4: Eliminar reunión de prueba
        print("\n" + "=" * 70)
        print("🗑️  PASO 4: LIMPIANDO REUNIÓN DE PRUEBA")
        print("=" * 70)
        
        print(f"\n⏳ Esperando 3 segundos...")
        import time
        time.sleep(3)
        
        print(f"🔄 Eliminando reunión {meeting_id}...")
        success = zoom_service.delete_meeting(str(meeting_id))
        
        if success:
            print(f"✅ Reunión {meeting_id} eliminada exitosamente")
        else:
            print(f"⚠️  No se pudo eliminar la reunión {meeting_id}")
            print(f"   Puedes eliminarla manualmente desde https://zoom.us")
        
        # Resultado final
        print("\n" + "=" * 70)
        print("✅ ¡TODAS LAS PRUEBAS PASARON!")
        print("=" * 70)
        print("\n🎉 La integración OAuth Server-to-Server está funcionando correctamente")
        print("\n📝 Próximos pasos:")
        print("   1. Arranca el backend: python -m uvicorn app.main:app --reload")
        print("   2. Arranca el frontend: npm run dev")
        print("   3. Crea una reunión desde la interfaz")
        print("   4. ¡El sistema creará la reunión automáticamente en Zoom!")
        print("   5. Inicia la reunión y únete desde el navegador")
        sys.exit(0)
        
    except Exception as e:
        print(f"\n❌ Error al crear reunión: {str(e)}")
        print(f"\n💡 Posibles causas:")
        print(f"   1. La app no tiene permisos para crear reuniones")
        print(f"   2. Faltan los scopes: meeting:write:admin")
        print(f"   3. La cuenta de Zoom no permite crear reuniones programadas")
        print(f"\n🔧 Solución:")
        print(f"   1. Ve a https://marketplace.zoom.us/")
        print(f"   2. Selecciona tu app Server-to-Server OAuth")
        print(f"   3. Ve a 'Scopes'")
        print(f"   4. Agrega: meeting:write:admin, meeting:read:admin")
        print(f"   5. Activa la app")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Operación cancelada por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error inesperado: {str(e)}")
        sys.exit(1)

