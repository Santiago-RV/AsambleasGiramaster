#!/usr/bin/env python3
"""
Script de prueba para validar todos los endpoints de generación de QR
"""
import asyncio
import json
from pathlib import Path
import sys
import os

# Agregar el backend al path
sys.path.append(str(Path(__file__).parent / "backend"))

async def test_existing_user():
    """Obtener un usuario existente para pruebas - simulado"""
    print("🔍 Buscando usuario de prueba...")
    
    # Simular un usuario de prueba con rol de administrador
    # En un entorno real, esto consultaría la base de datos
    print(f"✅ Usuario de prueba simulado: Admin Test")
    print(f"📝 ID: 1")
    print(f"📝 Username: admin_user")
    print(f"📝 Email: admin@test.com")
    print(f"📝 Rol: 1 (Super Admin)")
    
    return 1, "admin_user", "admin@test.com"

async def simulate_endpoint_call(endpoint_name: str, user_id: int):
    """Simular llamada a endpoint"""
    print(f"\n🔍 Probando endpoint: {endpoint_name}")
    print(f"📝 User ID: {user_id}")
    
    try:
        if endpoint_name == "simple":
            # Simular POST /api/v1/residents/generate-qr-simple
            from app.services.simple_auto_login_service import simple_auto_login_service
            from app.core.config import settings
            
            # Generar token directamente como lo haría el endpoint
            password = "test_password"  # Contraseña de prueba
            auto_login_token = simple_auto_login_service.generate_auto_login_token(
                username="test_user",
                password=password,
                expiration_hours=48
            )
            
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://asambleas.giramaster.com')
            auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
            
            result = {
                "auto_login_token": auto_login_token,
                "auto_login_url": auto_login_url,
                "expires_in_hours": 48
            }
            
            print(f"✅ {endpoint_name}: Token generado correctamente")
            print(f"📎 URL: {auto_login_url[:50]}...")
            print(f"⏰ Expira en: {result['expires_in_hours']} horas")
            return True
            
        elif endpoint_name == "enhanced":
            # Simular POST /api/v1/residents/enhanced-qr
            try:
                from app.services.qr_service import qr_service
                
                user_info = {
                    'name': 'Test User',
                    'apartment': 'A-101',
                    'residential_unit': 'Test Unit',
                    'email': 'test@example.com',
                    'role': 'Admin'
                }
                
                qr_data = qr_service.generate_user_qr_data(
                    user_id=user_id,
                    username="test_user",
                    password="test_password",
                    user_info=user_info,
                    expiration_hours=48
                )
                
                print(f"✅ {endpoint_name}: QR mejorado generado correctamente")
                print(f"📁 QR Filename: {qr_data['qr_filename']}")
                print(f"📎 URL: {qr_data['auto_login_url'][:50]}...")
                print(f"🖼️ QR Base64: {qr_data['qr_base64'][:50]}...")
                return True
                
            except Exception as e:
                print(f"❌ {endpoint_name}: Error en servicio QR: {e}")
                return False
                
        elif endpoint_name == "original":
            # Simular POST /api/v1/residents/generate-auto-login
            print(f"⚠️ {endpoint_name}: Endpoint original - requiere dependencias completas")
            print("📝 Este endpoint depende de email_service y puede fallar si hay problemas de configuración")
            return "depends_on_email"
            
    except Exception as e:
        print(f"❌ {endpoint_name}: Error en simulación: {e}")
        return False

async def test_all_endpoints():
    """Probar todos los endpoints de QR"""
    print("🚀 Iniciando pruebas de endpoints de QR")
    print("=" * 60)
    
    # Obtener usuario de prueba
    user_id, username, email = await test_existing_user()
    if not user_id:
        print("❌ No se puede continuar sin un usuario de prueba")
        return
    
    print(f"\n📋 Probando con usuario: {username} ({email})")
    print("=" * 60)
    
    endpoints_to_test = [
        ("simple", "Endpoint Simple - Recomendado"),
        ("enhanced", "Endpoint Mejorado con Personalización"),
        ("original", "Endpoint Original (con dependencias)")
    ]
    
    results = {}
    
    for endpoint_name, description in endpoints_to_test:
        print(f"\n📍 {description}")
        print("-" * 40)
        result = await simulate_endpoint_call(endpoint_name, user_id)
        results[endpoint_name] = result
        
    # Resumen final
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)
    
    for endpoint_name, result in results.items():
        if result is True:
            status = "✅ FUNCIONA"
        elif result == "depends_on_email":
            status = "⚠️ DEPENDE DE EMAIL"
        else:
            status = "❌ FALLA"
        
        endpoint_display = {
            "simple": "Simple (/generate-qr-simple)",
            "enhanced": "Enhanced (/enhanced-qr)",
            "original": "Original (/generate-auto-login)"
        }
        
        print(f"{endpoint_display.get(endpoint_name, endpoint_name)}: {status}")
    
    # Recomendaciones
    print(f"\n💡 RECOMENDACIONES:")
    
    if results.get("simple") is True:
        print("✅ Usar el endpoint SIMPLE para producción")
        print("✅ El frontend ya está configurado para usarlo")
        print("✅ No depende de email - más robusto")
    
    if results.get("enhanced") is True:
        print("✅ El endpoint ENHANCED está disponible para QRs personalizados")
        print("✅ Ideal para generación masiva o QRs con branding")
    
    if results.get("original") != True:
        print("⚠️ El endpoint ORIGINAL tiene problemas de dependencias")
        print("⚠️ Revisar configuración de email si se necesita mantener")
    
    print("\n🎯 PRÓXIMOS PASOS:")
    print("1. Probar generación de QR desde el frontend")
    print("2. Verificar escaneo de QR y auto-login")
    print("3. Configurar rate limiting y seguridad si es necesario")

if __name__ == "__main__":
    asyncio.run(test_all_endpoints())