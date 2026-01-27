#!/usr/bin/env python3
"""
Script de diagnóstico para el problema de QR en el frontend
"""
import asyncio
import json
from pathlib import Path
import sys

# Agregar el backend al path
sys.path.append(str(Path(__file__).parent / "backend"))

async def test_endpoint_response_format():
    """Probar el formato exacto de respuesta del endpoint"""
    print("🔍 Diagnosticando formato de respuesta del endpoint...")
    
    try:
        # Simular el request exacto que haría el frontend
        from app.api.v1.endpoints.simple_qr_endpoint import SimpleQRRequest, SimpleQRResponse, generate_qr_simple
        from app.schemas.responses_schema import SuccessResponse
        
        # Mock data similar a lo que vendría del frontend
        mock_request = SimpleQRRequest(userId=1)
        
        print(f"✅ Request format: {mock_request.model_dump()}")
        
        # Mock user (admin)
        class MockUser:
            def __init__(self):
                self.id = 1
                self.str_username = "admin"
                self.int_id_rol = 1  # Super Admin
        
        mock_user = MockUser()
        mock_db = None  # Esto causará error pero queremos ver el formato
        
        try:
            result = await generate_qr_simple(mock_request, mock_user, mock_db)
        except Exception as e:
            print(f"⚠️ Error esperado (sin DB): {e}")
            
        # Probar el formato de respuesta que debería devolver
        mock_response_data = SimpleQRResponse(
            auto_login_token="test_token_123",
            auto_login_url="https://test.com/auto-login/test_token_123",
            expires_in_hours=48
        )
        
        success_response = SuccessResponse[SimpleQRResponse](
            data=mock_response_data,
            message="Código QR generado exitosamente"
        )
        
        print(f"✅ Formato de respuesta correcto:")
        print(json.dumps(success_response.model_dump(), indent=2))
        
        # Verificar que el frontend pueda acceder a data.data.auto_login_token
        response_dict = success_response.model_dump()
        token = response_dict.get("data", {}).get("auto_login_token")
        url = response_dict.get("data", {}).get("auto_login_url")
        
        print(f"✅ Acceso a token: {token}")
        print(f"✅ Acceso a URL: {url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en diagnóstico: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_frontend_flow():
    """Simular el flujo completo del frontend"""
    print("\n🔄 Simulando flujo del frontend...")
    
    try:
        # Simular llamada fetch del frontend
        fetch_request = {
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer mock_token"
            },
            "body": json.dumps({
                "userId": 1
            })
        }
        
        print(f"✅ Request del frontend: {fetch_request}")
        
        # Simular respuesta esperada del backend
        backend_response = {
            "success": True,
            "data": {
                "auto_login_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInB3ZCI6InRlc3QiLCJleHAiOjE3Mzg0MDM2NjcsImlhdCI6MTczODMxNzI2NywidHlwZSI6ImF1dG9fbG9naW4ifQ.test_signature",
                "auto_login_url": "https://asambleas.giramaster.com/auto-login/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInB3ZCI6InRlc3QiLCJleHAiOjE3Mzg0MDM2NjcsImlhdCI6MTczODMxNzI2NywidHlwZSI6ImF1dG9fbG9naW4ifQ.test_signature",
                "expires_in_hours": 48
            },
            "message": "Código QR generado exitosamente"
        }
        
        print(f"✅ Respuesta esperada del backend:")
        print(json.dumps(backend_response, indent=2))
        
        # Simular procesamiento del frontend
        if backend_response.get("success"):
            data = backend_response.get("data", {})
            token = data.get("auto_login_token")
            url = data.get("auto_login_url")
            
            print(f"✅ Token extraído: {token[:50] if token else 'None'}...")
            print(f"✅ URL extraída: {url[:50] if url else 'None'}...")
            
            if token and url:
                print("✅ Flujo del frontend funcionaría correctamente")
                return True
            else:
                print("❌ Token o URL no encontrados en la respuesta")
                return False
        else:
            print(f"❌ Backend reporta error: {backend_response.get('message', 'Error desconocido')}")
            return False
            
    except Exception as e:
        print(f"❌ Error simulando flujo: {e}")
        return False

async def diagnose_common_issues():
    """Diagnosticar problemas comunes"""
    print("\n🔍 Diagnosticando problemas comunes...")
    
    issues = []
    
    # 1. Verificar formato de respuesta SuccessResponse
    try:
        from app.schemas.responses_schema import SuccessResponse
        print("✅ SuccessResponse importado correctamente")
    except Exception as e:
        issues.append(f"No se puede importar SuccessResponse: {e}")
    
    # 2. Verificar formato de SimpleQRResponse
    try:
        from app.api.v1.endpoints.simple_qr_endpoint import SimpleQRResponse
        print("✅ SimpleQRResponse importado correctamente")
    except Exception as e:
        issues.append(f"No se puede importar SimpleQRResponse: {e}")
    
    # 3. Verificar si el endpoint devuelve el formato correcto
    try:
        from app.api.v1.endpoints.simple_qr_endpoint import generate_qr_simple
        print("✅ generate_qr_simple importado correctamente")
    except Exception as e:
        issues.append(f"No se puede importar generate_qr_simple: {e}")
    
    # 4. Verificar el acceso a .data en la respuesta
    try:
        mock_success = {
            "data": {
                "auto_login_token": "test",
                "auto_login_url": "test"
            },
            "message": "success"
        }
        
        # Simular acceso del frontend
        data = mock_success.get("data", {})
        token = data.get("auto_login_token")
        
        if token:
            print("✅ Acceso a data.auto_login_token funciona")
        else:
            issues.append("No se puede acceder a data.auto_login_token")
            
    except Exception as e:
        issues.append(f"Error accediendo a data.auto_login_token: {e}")
    
    if issues:
        print(f"\n❌ Problemas identificados:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
        return False
    else:
        print(f"\n✅ No se encontraron problemas comunes")
        return True

async def main():
    print("🚀 DIAGNÓSTICO COMPLETO DEL PROBLEMA QR EN FRONTEND")
    print("=" * 60)
    
    # Pruebas
    test1 = await test_endpoint_response_format()
    test2 = await test_frontend_flow()
    test3 = await diagnose_common_issues()
    
    print("\n" + "=" * 60)
    print("📊 RESULTADO DEL DIAGNÓSTICO")
    print("=" * 60)
    
    print(f"🔍 Formato de respuesta: {'✅ OK' if test1 else '❌ ERROR'}")
    print(f"🔄 Flujo del frontend: {'✅ OK' if test2 else '❌ ERROR'}")
    print(f"🔍 Problemas comunes: {'✅ OK' if test3 else '❌ ERROR'}")
    
    if all([test1, test2, test3]):
        print("\n💡 CONCLUSIÓN:")
        print("✅ El formato de respuesta es correcto")
        print("✅ El flujo del frontend debería funcionar")
        print("🔍 El problema probablemente está en:")
        print("   1. Conexión de red/CORS")
        print("   2. Autenticación/permisos")
        print("   3. Error real del backend al ejecutar")
        print("   4. Formato de respuesta real diferente al esperado")
        
        print("\n🎯 PRÓXIMOS PASOS:")
        print("1. Revisar los logs del backend cuando se hace clic")
        print("2. Verificar la pestaña Network del navegador")
        print("3. Probar el endpoint directamente con curl/postman")
        print("4. Verificar que el token de autenticación sea válido")
    else:
        print("\n❌ HAY PROBLEMAS EN EL FORMATO")
        print("🔧 Revisar los problemas identificados arriba")

if __name__ == "__main__":
    asyncio.run(main())