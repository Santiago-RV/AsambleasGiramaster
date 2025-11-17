"""
Script de prueba para el sistema de envío de correos electrónicos.
Ejecutar desde el directorio backend: python test_email.py
"""
import asyncio
import sys
from pathlib import Path

# Agregar el directorio del proyecto al path
sys.path.insert(0, str(Path(__file__).parent))

from app.utils.email_sender import email_sender
from app.core.config import settings


async def test_simple_email():
    """Prueba de envío de un correo simple"""
    print("=" * 60)
    print("TEST 1: Envío de correo simple")
    print("=" * 60)
    
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("❌ Error: Configuración de email no encontrada")
        print("Por favor configura SMTP_USER y SMTP_PASSWORD en el archivo .env")
        return False
    
    print(f"📧 Enviando correo de prueba desde: {settings.SMTP_FROM_EMAIL}")
    print(f"📫 Para: {settings.SMTP_USER}")
    
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h1 style="color: #667eea;">✅ Test Exitoso</h1>
            <p>Si estás leyendo este mensaje, significa que el sistema de correos está configurado correctamente.</p>
            <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                Este es un correo de prueba del sistema GIRAMASTER
            </p>
        </div>
    </body>
    </html>
    """
    
    success = email_sender.send_email(
        to_emails=[settings.SMTP_USER],
        subject="🧪 Test - Sistema de Correos GIRAMASTER",
        html_content=html_content,
        text_content="Test del sistema de correos. Si ves este mensaje, la configuración es correcta."
    )
    
    if success:
        print("✅ Correo enviado exitosamente")
        print(f"📬 Revisa tu bandeja de entrada: {settings.SMTP_USER}")
        return True
    else:
        print("❌ Error al enviar el correo")
        print("Revisa los logs para más detalles")
        return False


async def test_meeting_invitation():
    """Prueba de envío de invitación a reunión usando la base de datos"""
    print("\n" + "=" * 60)
    print("TEST 2: Invitación de reunión desde base de datos")
    print("=" * 60)
    
    try:
        from app.core.database import async_session_maker
        from app.services.email_service import email_service
        
        # Obtener una reunión de ejemplo (ID 1)
        meeting_id = 9
        
        print(f"📅 Obteniendo reunión con ID: {meeting_id}")
        
        async with async_session_maker() as db:
            stats = await email_service.send_meeting_invitation(
                db=db,
                meeting_id=meeting_id,
                user_ids=None  # Enviar a todos
            )
            
            if "error" in stats:
                print(f"❌ Error: {stats['error']}")
                return False
            
            print("\n📊 Estadísticas de envío:")
            print(f"   Total: {stats.get('total', 0)}")
            print(f"   Exitosos: {stats.get('exitosos', 0)}")
            print(f"   Fallidos: {stats.get('fallidos', 0)}")
            
            if stats.get('exitosos', 0) > 0:
                print("✅ Invitaciones enviadas correctamente")
                return True
            else:
                print("⚠️  No se enviaron correos")
                return False
                
    except Exception as e:
        print(f"❌ Error en test de invitación: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_configuration():
    """Prueba de configuración del sistema"""
    print("=" * 60)
    print("VERIFICACIÓN DE CONFIGURACIÓN")
    print("=" * 60)
    
    print("\n📋 Configuración actual:")
    print(f"   SMTP Host: {settings.SMTP_HOST}")
    print(f"   SMTP Port: {settings.SMTP_PORT}")
    print(f"   SMTP User: {settings.SMTP_USER or '❌ NO CONFIGURADO'}")
    print(f"   SMTP Password: {'✅ Configurado' if settings.SMTP_PASSWORD else '❌ NO CONFIGURADO'}")
    print(f"   From Email: {settings.SMTP_FROM_EMAIL or settings.SMTP_USER}")
    print(f"   From Name: {settings.SMTP_FROM_NAME}")
    print(f"   Email Enabled: {settings.EMAIL_ENABLED}")
    
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n⚠️  CONFIGURACIÓN INCOMPLETA")
        print("\nPara configurar el sistema de correos:")
        print("1. Edita el archivo backend/.env")
        print("2. Configura las variables:")
        print("   - SMTP_USER=tu-email@gmail.com")
        print("   - SMTP_PASSWORD=tu-contraseña-de-aplicacion")
        print("3. Lee CONFIGURAR_EMAIL.md para más detalles")
        return False
    
    print("\n✅ Configuración completa")
    return True


async def main():
    """Función principal que ejecuta todos los tests"""
    print("\n" + "🚀" * 30)
    print("GIRAMASTER - Test de Sistema de Correos")
    print("🚀" * 30 + "\n")
    
    # Test de configuración
    config_ok = await test_configuration()
    
    if not config_ok:
        print("\n" + "=" * 60)
        print("⛔ Tests cancelados: Configuración incompleta")
        print("=" * 60)
        return
    
    # Test 1: Correo simple
    print("\n")
    test1_ok = await test_simple_email()
    
    # Esperar un poco entre tests
    await asyncio.sleep(2)
    
    # Test 2: Invitación de reunión (opcional)
    print("\n")
    response = input("¿Deseas probar el envío de invitación de reunión? (s/n): ")
    if response.lower() == 's':
        test2_ok = await test_meeting_invitation()
    else:
        print("⏭️  Test de invitación omitido")
        test2_ok = None
    
    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN DE TESTS")
    print("=" * 60)
    print(f"Test 1 (Correo Simple): {'✅ PASÓ' if test1_ok else '❌ FALLÓ'}")
    if test2_ok is not None:
        print(f"Test 2 (Invitación): {'✅ PASÓ' if test2_ok else '❌ FALLÓ'}")
    print("=" * 60)
    
    if test1_ok:
        print("\n🎉 ¡Sistema de correos funcionando correctamente!")
    else:
        print("\n⚠️  Revisa la configuración y los logs")


if __name__ == "__main__":
    asyncio.run(main())

