"""
Script para probar las credenciales de Zoom OAuth
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.zoom_api_service import ZoomAPIService
from datetime import datetime, timedelta

def test_zoom_credentials():
    print("=" * 60)
    print("PRUEBA DE CREDENCIALES DE ZOOM OAUTH")
    print("=" * 60)

    try:
        # Crear instancia del servicio
        zoom_service = ZoomAPIService()

        print("\n1. Verificando credenciales configuradas...")
        print(f"   Account ID: {zoom_service.account_id[:20]}..." if zoom_service.account_id else "   ❌ No configurado")
        print(f"   Client ID: {zoom_service.client_id[:20]}..." if zoom_service.client_id else "   ❌ No configurado")
        print(f"   Client Secret: {'*' * 20}..." if zoom_service.client_secret else "   ❌ No configurado")

        if not all([zoom_service.account_id, zoom_service.client_id, zoom_service.client_secret]):
            print("\n❌ ERROR: Credenciales incompletas")
            return False

        print("\n2. Obteniendo access token...")
        token = zoom_service._get_access_token()
        print(f"  Token obtenido: {token[:30]}...")

        print("\n3. Intentando crear reunión de prueba...")
        start_time = datetime.now() + timedelta(days=1)
        meeting_data = zoom_service.create_meeting(
            topic="Reunión de Prueba - Test Credenciales",
            start_time=start_time,
            duration=30,
            agenda="Esta es una reunión de prueba para verificar las credenciales de Zoom"
        )

        print(f"  Reunión creada exitosamente!")
        print(f"   ID: {meeting_data.get('id')}")
        print(f"   Join URL: {meeting_data.get('join_url')}")
        print(f"   Password: {meeting_data.get('password', 'Sin contraseña')}")

        # Eliminar la reunión de prueba
        print("\n4. Eliminando reunión de prueba...")
        meeting_id = str(meeting_data.get('id'))
        if zoom_service.delete_meeting(meeting_id):
            print("  Reunión de prueba eliminada")

        print("\n" + "=" * 60)
        print("✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE")
        print("=" * 60)
        print("\nLas credenciales de Zoom están configuradas correctamente.")
        print("El sistema puede crear reuniones en Zoom sin problemas.")
        return True

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\n" + "=" * 60)
        print("❌ LAS PRUEBAS FALLARON")
        print("=" * 60)
        print("\nPosibles causas:")
        print("1. Credenciales incorrectas en el .env")
        print("2. La cuenta de Zoom no tiene permisos")
        print("3. La aplicación de Zoom no está activada")
        print("4. Problemas de conectividad con la API de Zoom")
        return False

if __name__ == "__main__":
    success = test_zoom_credentials()
    sys.exit(0 if success else 1)
