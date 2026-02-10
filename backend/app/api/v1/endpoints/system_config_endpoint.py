from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.auth import get_current_user
from app.schemas.responses_schema import SuccessResponse
from app.schemas.system_config_schema import (
    ZoomCredentialsResponse,
    ZoomCredentialsUpdateRequest,
    ZoomTestConnectionResponse,
    SMTPCredentialsResponse,
    SMTPCredentialsUpdateRequest,
    SMTPTestConnectionResponse,
    SystemConfigResponse
)
from app.services.system_config_service import SystemConfigService
from app.services.user_service import UserService
from app.services.zoom_api_service import ZoomAPIService
from app.core.database import get_db
from app.core.logging_config import get_logger
from typing import List

logger = get_logger(__name__)
router = APIRouter()

async def verify_super_admin(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dependency para verificar que el usuario es Super Admin"""
    user_service = UserService(db)
    user = await user_service.get_user_by_username(current_user)
    
    if not user or user.int_id_rol != 1:  # 1 = Super Admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo Super Admin puede acceder a esta configuración"
        )
    
    return user

@router.get(
    "/zoom/status",
    response_model=SuccessResponse,
    summary="Verificar si existen credenciales de Zoom",
    description="Verifica si las credenciales de Zoom están configuradas en la base de datos"
)
async def check_zoom_config_exists(
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica si existen credenciales de Zoom configuradas
    NO requiere autenticación para permitir wizard inicial
    """
    try:
        config_service = SystemConfigService(db)
        credentials = await config_service.get_zoom_credentials()
        
        has_all_credentials = all([
            credentials.get("ZOOM_SDK_KEY"),
            credentials.get("ZOOM_SDK_SECRET"),
            credentials.get("ZOOM_ACCOUNT_ID"),
            credentials.get("ZOOM_CLIENT_ID"),
            credentials.get("ZOOM_CLIENT_SECRET")
        ])
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Estado de configuración obtenido",
            data={
                "configured": has_all_credentials,
                "partial": len(credentials) > 0 and not has_all_credentials,
                "missing_fields": [
                    k for k in ["ZOOM_SDK_KEY", "ZOOM_SDK_SECRET", "ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"]
                    if k not in credentials
                ]
            }
        )
    except Exception as e:
        logger.error(f"Error al verificar configuración de Zoom: {str(e)}")
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Error al verificar configuración",
            data={"configured": False, "error": str(e)}
        )

@router.get(
    "/zoom",
    response_model=SuccessResponse,
    summary="Obtener credenciales de Zoom",
    description="Obtiene las credenciales de Zoom actuales (valores sensibles enmascarados)"
)
async def get_zoom_config(
    user = Depends(verify_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la configuración actual de Zoom.
    Los valores sensibles se retornan enmascarados por seguridad.
    """
    try:
        config_service = SystemConfigService(db)
        credentials = await config_service.get_zoom_credentials()
        
        # Enmascarar valores sensibles
        response_data = {
            "sdk_key": credentials.get("ZOOM_SDK_KEY"),  # Este es público
            "sdk_secret": "***" + credentials.get("ZOOM_SDK_SECRET", "")[-4:] if credentials.get("ZOOM_SDK_SECRET") else None,
            "account_id": "***" + credentials.get("ZOOM_ACCOUNT_ID", "")[-4:] if credentials.get("ZOOM_ACCOUNT_ID") else None,
            "client_id": "***" + credentials.get("ZOOM_CLIENT_ID", "")[-4:] if credentials.get("ZOOM_CLIENT_ID") else None,
            "client_secret": "***" + credentials.get("ZOOM_CLIENT_SECRET", "")[-4:] if credentials.get("ZOOM_CLIENT_SECRET") else None,
        }
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Configuración de Zoom obtenida",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Error al obtener configuración de Zoom: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener configuración: {str(e)}"
        )

@router.put(
    "/zoom",
    response_model=SuccessResponse,
    summary="Actualizar credenciales de Zoom",
    description="Actualiza las credenciales de Zoom (solo campos proporcionados)"
)
async def update_zoom_config(
    credentials: ZoomCredentialsUpdateRequest,
    user = Depends(verify_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza las credenciales de Zoom.
    Solo se actualizan los campos que se envíen (parcial).
    """
    try:
        config_service = SystemConfigService(db)
        
        results = await config_service.update_zoom_credentials(
            sdk_key=credentials.sdk_key,
            sdk_secret=credentials.sdk_secret,
            account_id=credentials.account_id,
            client_id=credentials.client_id,
            client_secret=credentials.client_secret,
            updated_by=user.id
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Credenciales de Zoom actualizadas: {', '.join(results.keys())}",
            data={"updated_fields": list(results.keys())}
        )
        
    except Exception as e:
        logger.error(f"Error al actualizar configuración de Zoom: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar configuración: {str(e)}"
        )

@router.post(
    "/zoom/test",
    response_model=SuccessResponse,
    summary="Probar conexión con Zoom",
    description="Valida que las credenciales de Zoom sean correctas"
)
async def test_zoom_connection(
    user = Depends(verify_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Prueba la conexión con Zoom usando las credenciales actuales.
    Intenta obtener un access token OAuth.
    """
    try:
        # Crear instancia del servicio de Zoom
        # (ahora obtendrá credenciales de BD)
        zoom_service = ZoomAPIService(db)
        
        # Intentar obtener token
        token = await zoom_service._get_access_token()
        
        if token:
            return SuccessResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Conexión con Zoom exitosa",
                data={
                    "token_obtained": True,
                    "token_preview": token[:20] + "..."
                }
            )
        else:
            return SuccessResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="No se pudo obtener token de Zoom",
                data={"token_obtained": False}
            )
            
    except Exception as e:
        logger.error(f"Error al probar conexión con Zoom: {str(e)}")
        return SuccessResponse(
            success=False,
            status_code=status.HTTP_400_BAD_REQUEST,
            message=f"Error al conectar con Zoom: {str(e)}",
            data={"error": str(e)}
        )

@router.get(
    "/all",
    response_model=SuccessResponse,
    summary="Obtener todas las configuraciones",
    description="Obtiene todas las configuraciones del sistema (valores sensibles enmascarados)"
)
async def get_all_configs(
    user = Depends(verify_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene todas las configuraciones del sistema.
    Los valores encriptados se muestran enmascarados.
    """
    try:
        config_service = SystemConfigService(db)
        configs = await config_service.get_all_configs(include_encrypted_values=False)
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Se encontraron {len(configs)} configuraciones",
            data={"configs": configs}
        )
        
    except Exception as e:
        logger.error(f"Error al obtener configuraciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener configuraciones: {str(e)}"
        )

# ============================================
# SMTP Configuration Endpoints
# ============================================

@router.get(
    "/smtp/status",
    response_model=SuccessResponse,
    summary="Verificar si existen credenciales SMTP",
    description="Verifica si las credenciales SMTP están configuradas en la base de datos"
)
async def check_smtp_config_exists(
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica si existen credenciales SMTP configuradas
    NO requiere autenticación para permitir wizard inicial
    """
    try:
        config_service = SystemConfigService(db)
        credentials = await config_service.get_smtp_credentials()
        
        has_all_credentials = all([
            credentials.get("SMTP_HOST"),
            credentials.get("SMTP_PORT"),
            credentials.get("SMTP_USER"),
            credentials.get("SMTP_PASSWORD")
        ])
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Estado de configuración SMTP obtenido",
            data={
                "configured": has_all_credentials,
                "partial": len(credentials) > 0 and not has_all_credentials,
                "missing_fields": [
                    k for k in ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"]
                    if k not in credentials
                ]
            }
        )
    except Exception as e:
        logger.error(f"Error al verificar configuración SMTP: {str(e)}")
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Error al verificar configuración",
            data={"configured": False, "error": str(e)}
        )

@router.get(
    "/smtp",
    response_model=SuccessResponse,
    summary="Obtener credenciales SMTP",
    description="Obtiene las credenciales SMTP actuales (valores sensibles enmascarados)"
)
async def get_smtp_config(
    user = Depends(verify_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la configuración actual de SMTP.
    Los valores sensibles se retornan enmascarados por seguridad.
    """
    try:
        config_service = SystemConfigService(db)
        credentials = await config_service.get_smtp_credentials()
        
        # Enmascarar valores sensibles
        smtp_user = credentials.get("SMTP_USER", "")
        smtp_password = credentials.get("SMTP_PASSWORD", "")
        
        response_data = {
            "smtp_host": credentials.get("SMTP_HOST"),
            "smtp_port": int(credentials.get("SMTP_PORT", 587)) if credentials.get("SMTP_PORT") else None,
            "smtp_user": "***" + smtp_user[-8:] if len(smtp_user) > 8 else "***" if smtp_user else None,
            "smtp_password": "***••••" if smtp_password else None,
            "smtp_from_email": credentials.get("SMTP_FROM_EMAIL"),
            "smtp_from_name": credentials.get("SMTP_FROM_NAME"),
            "email_enabled": credentials.get("EMAIL_ENABLED", "true").lower() == "true" if credentials.get("EMAIL_ENABLED") else None,
        }
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Configuración SMTP obtenida",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Error al obtener configuración SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener configuración: {str(e)}"
        )

@router.put(
    "/smtp",
    response_model=SuccessResponse,
    summary="Actualizar credenciales SMTP",
    description="Actualiza las credenciales SMTP en la base de datos"
)
async def update_smtp_config(
    credentials: SMTPCredentialsUpdateRequest,
    user = Depends(verify_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza las credenciales SMTP.
    Todos los campos son requeridos para asegurar configuración completa.
    """
    try:
        config_service = SystemConfigService(db)
        
        results = await config_service.update_smtp_credentials(
            smtp_host=credentials.smtp_host,
            smtp_port=credentials.smtp_port,
            smtp_user=credentials.smtp_user,
            smtp_password=credentials.smtp_password,
            smtp_from_email=credentials.smtp_from_email,
            smtp_from_name=credentials.smtp_from_name,
            email_enabled=credentials.email_enabled,
            updated_by=user.id
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message=f"Credenciales SMTP actualizadas exitosamente",
            data={"updated_fields": list(results.keys())}
        )
        
    except Exception as e:
        logger.error(f"Error al actualizar configuración SMTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar configuración: {str(e)}"
        )

@router.post(
    "/smtp/test",
    response_model=SuccessResponse,
    summary="Probar conexión SMTP",
    description="Envía un correo de prueba para validar la configuración SMTP"
)
async def test_smtp_connection(
    user = Depends(verify_super_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Prueba la conexión SMTP enviando un correo de prueba.
    El correo se envía al smtp_user configurado.
    """
    try:
        from app.utils.email_sender import EmailSender
        from datetime import datetime
        
        # Crear EmailSender con DB para cargar credenciales
        email_sender = EmailSender(db)
        
        # Obtener credenciales para saber el destinatario
        config_service = SystemConfigService(db)
        credentials = await config_service.get_smtp_credentials()
        recipient_email = credentials.get("SMTP_USER")
        
        if not recipient_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró email configurado"
            )
        
        # Preparar email de prueba
        smtp_host = credentials.get("SMTP_HOST", "N/A")
        smtp_port = credentials.get("SMTP_PORT", "N/A")
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .success-icon {{ font-size: 48px; margin-bottom: 20px; }}
                .info-box {{ background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="success-icon">✅</div>
                    <h1 style="margin: 0;">Configuración SMTP Exitosa</h1>
                </div>
                <div class="content">
                    <p>Este es un correo de prueba para verificar que la configuración SMTP está funcionando correctamente.</p>
                    
                    <div class="info-box">
                        <p><strong>Sistema:</strong> GIRAMASTER - Sistema de Gestión de Asambleas</p>
                        <p><strong>Servidor SMTP:</strong> {smtp_host}:{smtp_port}</p>
                        <p><strong>Fecha de prueba:</strong> {timestamp}</p>
                    </div>
                    
                    <p>Si recibiste este correo, tu configuración SMTP está lista para enviar notificaciones del sistema.</p>
                    
                    <p style="margin-top: 30px; color: #28a745; font-weight: bold;">
                        🎉 ¡Todo está funcionando correctamente!
                    </p>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático generado por GIRAMASTER</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Enviar email de prueba
        success = await email_sender.send_email_async(
            to_emails=[recipient_email],
            subject="✅ Prueba de Configuración SMTP - GIRAMASTER",
            html_content=html_content,
            attach_logo=False
        )
        
        if success:
            return SuccessResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Email de prueba enviado exitosamente",
                data={
                    "email_sent": True,
                    "recipient_email": recipient_email,
                    "timestamp": timestamp
                }
            )
        else:
            return SuccessResponse(
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
                message="No se pudo enviar el email de prueba. Verifica las credenciales.",
                data={
                    "email_sent": False,
                    "recipient_email": recipient_email
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al probar conexión SMTP: {str(e)}")
        return SuccessResponse(
            success=False,
            status_code=status.HTTP_400_BAD_REQUEST,
            message=f"Error al enviar email de prueba: {str(e)}",
            data={"error": str(e)}
        )
