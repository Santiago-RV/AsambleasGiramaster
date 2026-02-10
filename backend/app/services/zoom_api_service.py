import requests
import base64
import time
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ZoomAPIService:
    """
    Servicio para interactuar con la API REST de Zoom
    usando OAuth Server-to-Server authentication
    """
    
    BASE_URL = "https://api.zoom.us/v2"
    OAUTH_URL = "https://zoom.us/oauth/token"
    
    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self._access_token = None
        self._token_expiry = 0
        self._credentials_loaded = False
        self.account_id = None
        self.client_id = None
        self.client_secret = None
    
    async def _ensure_credentials_loaded(self):
        """Carga credenciales de BD si aún no están cargadas"""
        if self._credentials_loaded:
            return
        
        if self.db:
            await self._load_credentials_from_db()
        else:
            self._load_credentials_from_env()
        
        self._credentials_loaded = True
    
    def _load_credentials_from_env(self):
        """Carga credenciales desde .env (fallback)"""
        self.account_id = settings.ZOOM_ACCOUNT_ID
        self.client_id = settings.ZOOM_CLIENT_ID
        self.client_secret = settings.ZOOM_CLIENT_SECRET
        logger.warning("⚠️ Cargando credenciales de Zoom desde .env (fallback)")
    
    async def _load_credentials_from_db(self):
        """Carga credenciales desde base de datos"""
        try:
            from app.services.system_config_service import SystemConfigService
            config_service = SystemConfigService(self.db)
            
            credentials = await config_service.get_zoom_credentials()
            
            self.account_id = credentials.get("ZOOM_ACCOUNT_ID")
            self.client_id = credentials.get("ZOOM_CLIENT_ID")
            self.client_secret = credentials.get("ZOOM_CLIENT_SECRET")
            
            if not all([self.account_id, self.client_id, self.client_secret]):
                logger.warning("⚠️ Credenciales de Zoom incompletas en BD, usando fallback a .env")
                self._load_credentials_from_env()
            else:
                logger.info("✅ Credenciales de Zoom cargadas desde base de datos")
                
        except Exception as e:
            logger.error(f"❌ Error al cargar credenciales de Zoom desde BD: {str(e)}")
            logger.info("↩️ Usando fallback a .env")
            self._load_credentials_from_env()
    
    async def _get_access_token(self) -> str:
        """
        Obtiene un access token usando OAuth Server-to-Server
        Cachea el token hasta que expire
        
        Returns:
            str: Access token válido
            
        Raises:
            ValueError: Si las credenciales no están configuradas
            Exception: Si hay error al obtener el token
        """
        # Asegurar que las credenciales estén cargadas
        await self._ensure_credentials_loaded()
        
        # Si tenemos un token válido, retornarlo
        if self._access_token and time.time() < self._token_expiry:
            logger.debug("Usando token de acceso cacheado")
            return self._access_token
        
        # Verificar credenciales
        if not self.account_id or not self.client_id or not self.client_secret:
            raise ValueError(
                "Credenciales de Zoom OAuth no configuradas. "
                "Configura ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID y ZOOM_CLIENT_SECRET en el .env"
            )
        
        try:
            logger.info("Obteniendo nuevo access token de Zoom OAuth...")
            
            # Crear Authorization header (Basic Auth)
            credentials = f"{self.client_id}:{self.client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            headers = {
                "Authorization": f"Basic {encoded_credentials}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            data = {
                "grant_type": "account_credentials",
                "account_id": self.account_id
            }
            
            response = requests.post(
                self.OAUTH_URL,
                headers=headers,
                data=data,
                timeout=30
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self._access_token = token_data["access_token"]
                # Guardar tiempo de expiración (restar 5 minutos para seguridad)
                expires_in = token_data.get("expires_in", 3600)
                self._token_expiry = time.time() + expires_in - 300
                
                logger.info(f"Access token de Zoom obtenido exitosamente (expira en {expires_in}s)")
                return self._access_token
            else:
                error_msg = f"Error al obtener token de Zoom: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de conexión al obtener token: {str(e)}")
            raise Exception(f"Error de conexión con Zoom OAuth: {str(e)}")
    
    async def create_meeting(
        self,
        topic: str,
        start_time: datetime,
        duration: int,
        timezone: str = "America/Bogota",
        agenda: Optional[str] = None,
        password: Optional[str] = None,
        user_id: str = "me"  # "me" usa el usuario por defecto de la cuenta
    ) -> Dict[str, Any]:
        """
        Crea una reunión en Zoom usando la API REST con OAuth
        
        Args:
            topic: Título de la reunión
            start_time: Fecha y hora de inicio
            duration: Duración en minutos
            timezone: Zona horaria
            agenda: Agenda/descripción de la reunión
            password: Contraseña de la reunión (opcional)
            user_id: ID del usuario de Zoom que crea la reunión
            
        Returns:
            Dict con información de la reunión creada:
            {
                "id": 82045341792,
                "host_id": "...",
                "topic": "Reunión de Prueba",
                "start_time": "2025-10-25T10:00:00Z",
                "duration": 60,
                "timezone": "America/Bogota",
                "join_url": "https://zoom.us/j/82045341792?pwd=...",
                "password": "abc123",
                "start_url": "https://zoom.us/s/...",
                ...
            }
            
        Raises:
            Exception: Si hay error al crear la reunión
        """
        try:
            # Asegurar que las credenciales estén cargadas
            await self._ensure_credentials_loaded()
            
            # Obtener access token OAuth
            token = await self._get_access_token()
            
            # Headers para la petición
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Formato de fecha que espera Zoom (ISO 8601)
            formatted_start_time = start_time.strftime("%Y-%m-%dT%H:%M:%S")
            
            # Configuración de la reunión
            meeting_data = {
                "topic": topic,
                "type": 2,  # 2 = Reunión programada
                "start_time": formatted_start_time,
                "duration": duration,
                "timezone": timezone,
                "agenda": agenda or "",
                "settings": {
                    "host_video": True,
                    "participant_video": True,
                    "join_before_host": False,
                    "mute_upon_entry": False,
                    "watermark": False,
                    "audio": "both",
                    "auto_recording": "none",
                    "waiting_room": False,
                    "meeting_authentication": False,
                    "approval_type": 2  # Sin aprobación necesaria
                }
            }
            
            # Agregar contraseña si se proporciona
            if password:
                meeting_data["password"] = password
            
            # Hacer la petición a la API de Zoom
            url = f"{self.BASE_URL}/users/{user_id}/meetings"
            
            logger.info(f"Creando reunión en Zoom: '{topic}'")
            response = requests.post(url, json=meeting_data, headers=headers, timeout=30)
            
            # Verificar respuesta
            if response.status_code == 201:
                meeting_info = response.json()
                logger.info(
                    f"Reunión de Zoom creada exitosamente:\n"
                    f"   ID: {meeting_info.get('id')}\n"
                    f"   URL: {meeting_info.get('join_url')}\n"
                    f"   Password: {meeting_info.get('password', 'Sin contraseña')}"
                )
                return meeting_info
            else:
                error_msg = f"Error al crear reunión en Zoom: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de conexión con API de Zoom: {str(e)}")
            raise Exception(f"Error de conexión con Zoom: {str(e)}")
        except Exception as e:
            logger.error(f"Error al crear reunión en Zoom: {str(e)}")
            raise
    
    def get_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """
        Obtiene información de una reunión de Zoom
        
        Args:
            meeting_id: ID de la reunión de Zoom
            
        Returns:
            Dict con información de la reunión
        """
        try:
            token = self._get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.BASE_URL}/meetings/{meeting_id}"
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                logger.info(f"Información de reunión obtenida: ID {meeting_id}")
                return response.json()
            else:
                error_msg = f"Error al obtener reunión: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error al obtener reunión de Zoom: {str(e)}")
            raise
    
    def delete_meeting(self, meeting_id: str) -> bool:
        """
        Elimina una reunión de Zoom
        
        Args:
            meeting_id: ID de la reunión de Zoom
            
        Returns:
            bool: True si se eliminó exitosamente
        """
        try:
            token = self._get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            url = f"{self.BASE_URL}/meetings/{meeting_id}"
            response = requests.delete(url, headers=headers, timeout=30)
            
            if response.status_code == 204:
                logger.info(f"Reunión de Zoom eliminada: ID {meeting_id}")
                return True
            else:
                logger.error(f"Error al eliminar reunión: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error al eliminar reunión de Zoom: {str(e)}")
            return False
    
    def update_meeting(
        self,
        meeting_id: str,
        topic: Optional[str] = None,
        start_time: Optional[datetime] = None,
        duration: Optional[int] = None,
        agenda: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Actualiza una reunión de Zoom
        
        Args:
            meeting_id: ID de la reunión de Zoom
            topic: Nuevo título (opcional)
            start_time: Nueva fecha/hora de inicio (opcional)
            duration: Nueva duración en minutos (opcional)
            agenda: Nueva agenda (opcional)
            
        Returns:
            Dict con resultado de la actualización
        """
        try:
            token = self._get_access_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            update_data = {}
            if topic:
                update_data["topic"] = topic
            if start_time:
                update_data["start_time"] = start_time.strftime("%Y-%m-%dT%H:%M:%S")
            if duration:
                update_data["duration"] = duration
            if agenda:
                update_data["agenda"] = agenda
            
            url = f"{self.BASE_URL}/meetings/{meeting_id}"
            response = requests.patch(url, json=update_data, headers=headers, timeout=30)
            
            if response.status_code == 204:
                logger.info(f"Reunión de Zoom actualizada: ID {meeting_id}")
                return {"success": True}
            else:
                error_msg = f"Error al actualizar reunión: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error al actualizar reunión de Zoom: {str(e)}")
            raise
