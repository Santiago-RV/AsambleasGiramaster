from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.responses_schema import SuccessResponse
from app.schemas.zoom_schema import (
    ZoomSignatureRequest,
    ZoomSignatureResponse,
    ZoomMeetingInfoRequest,
    ZoomMeetingInfoResponse
)
from app.services.zoom_service import ZoomService
from app.services.system_config_service import SystemConfigService
from app.core.config import settings
from app.core.database import get_db
from app.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


async def _get_sdk_key_from_db(db: AsyncSession) -> str | None:
    """
    Intenta obtener ZOOM_SDK_KEY desde la BD (multi-cuenta o legacy).
    Retorna None si no se encuentra.
    """
    try:
        config_service = SystemConfigService(db)
        # Intentar multi-cuenta primero (ZOOM_1_SDK_KEY)
        accounts = await config_service.get_zoom_accounts()
        if accounts:
            creds = await config_service.get_zoom_account_credentials(accounts[0]["id"])
            if creds and creds.get("ZOOM_SDK_KEY"):
                return creds["ZOOM_SDK_KEY"]
        # Intentar keys legacy (ZOOM_SDK_KEY)
        credentials = await config_service.get_zoom_credentials()
        if credentials.get("ZOOM_SDK_KEY"):
            return credentials["ZOOM_SDK_KEY"]
    except Exception as e:
        logger.warning(f"No se pudo obtener SDK Key desde BD: {str(e)}")
    return None


@router.post(
    "/generate-signature",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Generar signature de Zoom",
    description="Genera un JWT signature para autenticarse en una reunión de Zoom usando el Meeting SDK"
)
async def generate_zoom_signature(
    request: ZoomSignatureRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Genera un JWT signature para el Zoom Meeting SDK
    
    - **meeting_number**: Número de la reunión de Zoom (puede contener espacios o guiones)
    - **role**: Rol del usuario (0 = participante, 1 = anfitrión)
    
    Retorna el signature JWT necesario para unirse a la reunión desde el frontend
    """
    try:
        zoom_service = ZoomService(db)
        
        # Validar y limpiar el número de reunión
        clean_meeting_number = zoom_service.validate_meeting_number(request.meeting_number)
        
        # Generar el signature
        signature = await zoom_service.generate_signature(
            meeting_number=clean_meeting_number,
            role=request.role,
            expire_hours=2
        )
        
        # Obtener sdk_key desde el servicio (BD con fallback a .env)
        sdk_key = await _get_sdk_key_from_db(db) or settings.ZOOM_SDK_KEY
        
        # Preparar la respuesta
        response_data = ZoomSignatureResponse(
            signature=signature,
            meeting_number=clean_meeting_number,
            role=request.role,
            expires_in=7200,  # 2 horas en segundos
            sdk_key=sdk_key
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Signature generado exitosamente",
            data=response_data.dict()
        )
        
    except ValueError as e:
        logger.error(f"Error de validación al generar signature: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error inesperado al generar signature: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al generar el signature de Zoom"
        )


@router.post(
    "/extract-meeting-info",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Extraer información de una URL de Zoom",
    description="Extrae el número de reunión y contraseña de una URL de Zoom"
)
async def extract_meeting_info(request: ZoomMeetingInfoRequest):
    """
    Extrae información de una URL de Zoom
    
    - **zoom_url**: URL completa de la reunión de Zoom
    
    Retorna el número de reunión y contraseña extraídos de la URL
    """
    try:
        zoom_service = ZoomService()
        
        # Extraer información de la URL
        meeting_number = zoom_service.extract_meeting_number_from_url(request.zoom_url)
        password = zoom_service.extract_password_from_url(request.zoom_url)
        
        is_valid = meeting_number is not None
        
        response_data = ZoomMeetingInfoResponse(
            meeting_number=meeting_number,
            password=password,
            is_valid=is_valid
        )
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Información extraída exitosamente" if is_valid else "No se pudo extraer información de la URL",
            data=response_data.dict()
        )
        
    except Exception as e:
        logger.error(f"Error al extraer información de la URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar la URL de Zoom"
        )


@router.get(
    "/config",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener configuración de Zoom SDK",
    description="Obtiene la configuración pública necesaria para inicializar el Zoom SDK en el frontend"
)
async def get_zoom_config(db: AsyncSession = Depends(get_db)):
    """
    Obtiene la configuración pública de Zoom SDK
    
    Retorna únicamente el SDK Key (información pública) necesaria para el frontend.
    El SDK Secret NUNCA debe exponerse al frontend.
    Busca primero en base de datos, luego en variables de entorno como fallback.
    """
    # Intentar obtener desde BD (fuente principal)
    sdk_key = await _get_sdk_key_from_db(db)
    
    # Fallback a .env
    if not sdk_key:
        sdk_key = settings.ZOOM_SDK_KEY
    
    if not sdk_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuración de Zoom SDK no disponible. Configure las credenciales desde el panel de Super Admin."
        )
    
    return SuccessResponse(
        success=True,
        status_code=status.HTTP_200_OK,
        message="Configuración obtenida exitosamente",
        data={
            "sdk_key": sdk_key,
            "language": "es-ES"
        }
    )

