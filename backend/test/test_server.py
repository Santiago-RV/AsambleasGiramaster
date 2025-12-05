#!/usr/bin/env python3
"""
Script rápido para verificar que el servidor esté funcionando
y que los endpoints de encuestas estén disponibles
"""

import requests
import json
from typing import Optional

# Configuración
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

def test_health_check():
    """Verifica que el servidor esté corriendo"""
    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/health", timeout=5)
        if response.status_code == 200:
            print("Servidor corriendo correctamente")
            return True
        else:
            print(f"Servidor respondió con código: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("No se puede conectar al servidor")
        print(f"   Asegúrate de que el servidor esté corriendo en {BASE_URL}")
        return False
    except Exception as e:
        print(f"Error al conectar: {str(e)}")
        return False

def test_login(username: str = "admin", password: str = "admin123") -> Optional[str]:
    """Prueba el login y retorna el token"""
    print(f"\n🔐 Probando login con usuario: {username}")
    try:
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/auth/login",
            json={"username": username, "password": password},
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("access_token"):
                token = data["data"]["access_token"]
                print("Login exitoso")
                print(f"   Token: {token[:50]}...")
                return token
            else:
                print("Login exitoso pero sin token en respuesta")
                print(f"   Response: {json.dumps(data, indent=2)}")
                return None
        else:
            print(f"Login falló con código: {response.status_code}")
            try:
                print(f"   Response: {response.json()}")
            except:
                print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"Error en login: {str(e)}")
        return None

def test_create_poll(token: str, meeting_id: int = 1):
    """Prueba crear una encuesta"""
    print(f"\n📝 Probando crear encuesta para meeting_id: {meeting_id}")

    poll_data = {
        "int_meeting_id": meeting_id,
        "str_title": "Encuesta de Prueba - Test Script",
        "str_description": "Encuesta creada automáticamente por script de prueba",
        "str_poll_type": "single",
        "bln_is_anonymous": False,
        "bln_requires_quorum": False,
        "dec_minimum_quorum_percentage": 0.0,
        "bln_allows_abstention": True,
        "int_max_selections": 1,
        "int_duration_minutes": 30,
        "options": [
            {"str_option_text": "Opción 1", "int_option_order": 1},
            {"str_option_text": "Opción 2", "int_option_order": 2}
        ]
    }

    try:
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/polls/",
            headers={"Authorization": f"Bearer {token}"},
            json=poll_data,
            timeout=5
        )

        if response.status_code == 201:
            data = response.json()
            print("Encuesta creada exitosamente")
            poll_code = data.get("data", {}).get("poll_code")
            poll_id = data.get("data", {}).get("id")
            print(f"   Poll ID: {poll_id}")
            print(f"   Poll Code: {poll_code}")
            return poll_id, poll_code
        else:
            print(f"Error al crear encuesta: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', 'Sin mensaje')}")
                print(f"   Detalles: {error_data.get('details', {})}")
            except:
                print(f"   Response: {response.text}")
            return None, None
    except Exception as e:
        print(f"Error al crear encuesta: {str(e)}")
        return None, None

def test_get_poll_by_code(poll_code: str):
    """Prueba obtener encuesta por código (sin auth)"""
    print(f"\n🔍 Probando obtener encuesta por código: {poll_code}")

    try:
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/polls/code/{poll_code}",
            timeout=5
        )

        if response.status_code == 200:
            print("Encuesta obtenida exitosamente (sin autenticación)")
            data = response.json()
            poll_data = data.get("data", {})
            print(f"   Título: {poll_data.get('str_title')}")
            print(f"   Estado: {poll_data.get('str_status')}")
            print(f"   Opciones: {len(poll_data.get('options', []))}")
            return True
        else:
            print(f"Error al obtener encuesta: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    """Ejecuta todas las pruebas"""
    print("=" * 60)
    print("🧪 SCRIPT DE PRUEBA - SISTEMA DE ENCUESTAS")
    print("=" * 60)

    # 1. Verificar servidor
    if not test_health_check():
        print("\nEl servidor no está disponible. Asegúrate de iniciarlo:")
        print("   cd backend")
        print("   uvicorn app.main:app --reload")
        return

    # 2. Login
    print("\n" + "=" * 60)
    print("NOTA: Cambia las credenciales si 'admin/admin123' no funciona")
    print("=" * 60)
    token = test_login("admin", "admin123")

    if not token:
        print("\nNo se pudo obtener el token de autenticación")
        print("   Verifica las credenciales en la función test_login()")
        return

    # 3. Crear encuesta
    print("\n" + "=" * 60)
    print("NOTA: Cambia meeting_id si el ID 1 no existe en tu BD")
    print("=" * 60)
    poll_id, poll_code = test_create_poll(token, meeting_id=1)

    if not poll_id or not poll_code:
        print("\nNo se pudo crear la encuesta")
        print("   Posibles causas:")
        print("   - El meeting_id no existe en la BD")
        print("   - El usuario no tiene permisos de admin en esa reunión")
        print("   - La migración SQL no se ejecutó")
        return

    # 4. Obtener encuesta por código
    test_get_poll_by_code(poll_code)

    # Resumen
    print("\n" + "=" * 60)
    print("PRUEBAS COMPLETADAS EXITOSAMENTE")
    print("=" * 60)
    print(f"\n📋 Datos para usar en Postman:")
    print(f"   - poll_id: {poll_id}")
    print(f"   - poll_code: {poll_code}")
    print(f"   - admin_token: {token[:50]}...")
    print(f"\n💡 Siguiente paso:")
    print(f"   1. Importa la colección: Postman_Collection_Encuestas.json")
    print(f"   2. Configura las variables con los datos de arriba")
    print(f"   3. Sigue la guía: GUIA_POSTMAN_ENCUESTAS.md")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nPrueba cancelada por el usuario")
    except Exception as e:
        print(f"\n\nError inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
