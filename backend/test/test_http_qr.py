#!/usr/bin/env python3
"""
Script para probar endpoints de QR con requests HTTP reales
"""
import requests
import json
from base64 import b64decode

# Configuración
BASE_URL = "http://localhost:8000"  # Ajustar si es necesario
API_URL = f"{BASE_URL}/api/v1"

def test_authentication():
    """Probar autenticación para obtener token"""
    print("🔐 Probando autenticación...")
    
    # Intentar login (necesitamos credenciales reales)
    login_data = {
        "username": "admin",  # Ajustar con usuario real
        "password": "admin123"   # Ajustar con password real
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                token = data["data"]["access_token"]
                print(f"✅ Autenticación exitosa")
                return token
            else:
                print(f"❌ Error en respuesta: {data}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        print("📝 Nota: El servidor debe estar corriendo en localhost:8000")
    
    return None

def test_simple_qr(token):
    """Probar endpoint simple de QR"""
    print("\n📱 Probando endpoint simple QR...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    request_data = {
        "userId": 1  # Ajustar con un ID de usuario real
    }
    
    try:
        response = requests.post(
            f"{API_URL}/residents/generate-qr-simple",
            headers=headers,
            json=request_data
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📝 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Endpoint simple funciona!")
            print(f"📎 Token: {data['data']['auto_login_token'][:50]}...")
            print(f"🌐 URL: {data['data']['auto_login_url']}")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_enhanced_qr(token):
    """Probar endpoint enhanced de QR"""
    print("\n🎨 Probando endpoint enhanced QR...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    request_data = {
        "userId": 1,
        "include_personal_info": True,
        "qr_size": 400,
        "expiration_hours": 48
    }
    
    try:
        response = requests.post(
            f"{API_URL}/residents/enhanced-qr",
            headers=headers,
            json=request_data
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Endpoint enhanced funciona!")
            print(f"📁 QR Filename: {data['data']['qr_filename']}")
            print(f"📎 Token: {data['data']['auto_login_token'][:50]}...")
            print(f"🖼️ QR Base64 length: {len(data['data']['qr_base64'])}")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_original_qr(token):
    """Probar endpoint original de QR"""
    print("\n🔧 Probando endpoint original QR...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    request_data = {
        "userId": 1
    }
    
    try:
        response = requests.post(
            f"{API_URL}/residents/generate-auto-login",
            headers=headers,
            json=request_data
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Endpoint original funciona!")
            print(f"📎 Token: {data['data']['auto_login_token'][:50]}...")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 Prueba Real de Endpoints QR con HTTP")
    print("=" * 50)
    
    # Probar autenticación
    token = test_authentication()
    
    if not token:
        print("\n⚠️ No se pudo autenticar. Intentando probar endpoints sin auth...")
        print("📝 Algunos endpoints podrían funcionar sin token para fines de prueba")
    
    print(f"\n🌐 Base URL: {BASE_URL}")
    print(f"📡 API URL: {API_URL}")
    
    # Probar endpoints
    results = {}
    
    if token:
        results["simple"] = test_simple_qr(token)
        results["enhanced"] = test_enhanced_qr(token)
        results["original"] = test_original_qr(token)
    else:
        print("\n📝 Saltando pruebas con autenticación - no hay token")
        return
    
    # Resumen
    print("\n" + "=" * 50)
    print("📊 RESUMEN DE PRUEBAS HTTP")
    print("=" * 50)
    
    for endpoint, success in results.items():
        status = "✅ FUNCIONA" if success else "❌ FALLA"
        print(f"{endpoint.upper()}: {status}")
    
    print(f"\n💡 PRÓXIMOS PASOS:")
    print("1. Probar desde el frontend del navegador")
    print("2. Verificar escaneo de QR generado")
    print("3. Probar auto-login con el token")

if __name__ == "__main__":
    main()