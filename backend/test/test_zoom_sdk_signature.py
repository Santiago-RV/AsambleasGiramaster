#!/usr/bin/env python3
"""
Script para probar si las credenciales del Meeting SDK son válidas
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.zoom_service import ZoomService
from app.core.config import settings

def main():
    print("\n" + "=" * 70)
    print("🔐 TEST DE CREDENCIALES MEETING SDK (Para Unirse a Reuniones)")
    print("=" * 70)
    
    # Verificar credenciales
    print("\n📋 Credenciales actuales:")
    print(f"   ZOOM_SDK_KEY: {settings.ZOOM_SDK_KEY[:20]}... (oculto)")
    print(f"   ZOOM_SDK_SECRET: {settings.ZOOM_SDK_SECRET[:20]}... (oculto)")
    
    if not settings.ZOOM_SDK_KEY or not settings.ZOOM_SDK_SECRET:
        print("\nERROR: Las credenciales SDK no están configuradas")
        sys.exit(1)
    
    # Meeting number de prueba (el que creamos con OAuth)
    meeting_number = "89288359745"  # Uno de tus meetings
    
    print(f"\n📝 Generando signature para reunión de prueba:")
    print(f"   Meeting Number: {meeting_number}")
    print(f"   Role: 0 (participante)")
    
    try:
        # Crear servicio de Zoom
        zoom_service = ZoomService()
        
        # Generar signature
        print("\n🔄 Generando JWT signature...")
        signature = zoom_service.generate_signature(
            meeting_number=meeting_number,
            role=0,
            expire_hours=2
        )
        
        print("\nJWT Signature generado!")
        print(f"   Signature (truncado): {signature[:60]}...")
        print(f"   Longitud: {len(signature)} caracteres")
        
        # Decodificar para ver el payload
        import jwt
        decoded = jwt.decode(signature, options={"verify_signature": False})
        
        print(f"\n📦 Payload del JWT:")
        for key, value in decoded.items():
            if key not in ['iat', 'exp', 'tokenExp']:
                print(f"   {key}: {value}")
            else:
                print(f"   {key}: {value} (timestamp)")
        
        # Verificar firma
        print("\n🔐 Verificando firma del JWT...")
        try:
            jwt.decode(
                signature,
                settings.ZOOM_SDK_SECRET,
                algorithms=["HS256"]
            )
            print("   Firma matemáticamente válida")
            print("\n" + "=" * 70)
            print("LAS CREDENCIALES SDK ESTÁN BIEN CONFIGURADAS")
            print("=" * 70)
            print("\n💡 IMPORTANTE:")
            print("   - El signature se genera correctamente")
            print("   - PERO Zoom podría rechazarlo si:")
            print("     * La app SDK fue eliminada en Zoom Marketplace")
            print("     * Las credenciales expiraron")
            print("     * La app está desactivada")
            print("\n🧪 PRÓXIMO PASO:")
            print("   1. Crea una reunión desde el frontend")
            print("   2. Intenta iniciar la reunión")
            print("   3. Si da error 3712, necesitas credenciales SDK nuevas")
            print("\n📚 Ver: CONFIGURAR_ZOOM_OAUTH_SERVER_TO_SERVER.md")
            print("   Sección: 'Obtener Credenciales Meeting SDK'")
            
        except Exception as e:
            print(f"   Firma inválida: {str(e)}")
            print("\nLAS CREDENCIALES SDK NO FUNCIONARÁN")
            sys.exit(1)
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

