from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.system_config_model import SystemConfigModel
from app.services.encryption_service import encryption_service
from app.core.logging_config import get_logger
from typing import Optional, Dict, List
from app.core.exceptions import ServiceException

logger = get_logger(__name__)

class SystemConfigService:
    """
    Servicio para gestionar configuraciones del sistema
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_config(
        self, 
        config_key: str, 
        decrypt: bool = True,
        silent: bool = False
    ) -> Optional[str]:
        """
        Obtiene un valor de configuración
        
        Args:
            config_key: Clave de configuración
            decrypt: Si True, desencripta valores encriptados
            
        Returns:
            Valor de configuración o None si no existe
        """
        try:
            stmt = select(SystemConfigModel).where(
                SystemConfigModel.str_config_key == config_key,
                SystemConfigModel.bln_is_active == True
            )
            result = await self.db.execute(stmt)
            config = result.scalar_one_or_none()
            
            if not config:
                if silent:
                    logger.debug(f"Configuración no encontrada: {config_key}")
                else:
                    logger.warning(f"Configuración no encontrada: {config_key}")
                return None
            
            # Si está encriptado y se solicita desencriptar
            if config.bln_is_encrypted and decrypt:
                try:
                    return encryption_service.decrypt(config.str_config_value)
                except Exception as e:
                    logger.error(f"Error al desencriptar {config_key}: {str(e)}")
                    raise ServiceException(f"Error al desencriptar configuración: {config_key}")
            
            return config.str_config_value
            
        except ServiceException:
            raise
        except Exception as e:
            logger.error(f"Error al obtener configuración {config_key}: {str(e)}")
            raise ServiceException(f"Error al obtener configuración: {str(e)}")
    
    async def set_config(
        self,
        config_key: str,
        config_value: str,
        encrypt: bool = False,
        description: Optional[str] = None,
        updated_by: Optional[int] = None
    ) -> SystemConfigModel:
        """
        Establece o actualiza un valor de configuración
        
        Args:
            config_key: Clave de configuración
            config_value: Valor a guardar
            encrypt: Si True, encripta el valor antes de guardar
            description: Descripción de la configuración
            updated_by: ID del usuario que actualiza
            
        Returns:
            Modelo de configuración actualizado
        """
        try:
            # Encriptar si se solicita
            value_to_save = config_value
            if encrypt:
                value_to_save = encryption_service.encrypt(config_value)
            
            # Buscar configuración existente
            stmt = select(SystemConfigModel).where(
                SystemConfigModel.str_config_key == config_key
            )
            result = await self.db.execute(stmt)
            config = result.scalar_one_or_none()
            
            if config:
                # Actualizar existente
                config.str_config_value = value_to_save
                config.bln_is_encrypted = encrypt
                if description:
                    config.str_description = description
                config.updated_by = updated_by
                logger.info(f"Configuración actualizada: {config_key}")
            else:
                # Crear nueva
                config = SystemConfigModel(
                    str_config_key=config_key,
                    str_config_value=value_to_save,
                    bln_is_encrypted=encrypt,
                    str_description=description,
                    updated_by=updated_by
                )
                self.db.add(config)
                logger.info(f"Configuración creada: {config_key}")
            
            await self.db.commit()
            await self.db.refresh(config)
            return config
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error al guardar configuración {config_key}: {str(e)}")
            raise ServiceException(f"Error al guardar configuración: {str(e)}")
    
    async def get_zoom_credentials(self) -> Dict[str, str]:
        """
        Obtiene todas las credenciales de Zoom desencriptadas
        
        Returns:
            Diccionario con credenciales de Zoom
        """
        keys = [
            "ZOOM_SDK_KEY",
            "ZOOM_SDK_SECRET",
            "ZOOM_ACCOUNT_ID",
            "ZOOM_CLIENT_ID",
            "ZOOM_CLIENT_SECRET"
        ]
        
        credentials = {}
        for key in keys:
            value = await self.get_config(key, decrypt=True)
            if value:
                credentials[key] = value
            else:
                logger.warning(f"Credencial de Zoom no encontrada: {key}")
        
        return credentials
    
    async def update_zoom_credentials(
        self,
        sdk_key: Optional[str] = None,
        sdk_secret: Optional[str] = None,
        account_id: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        updated_by: Optional[int] = None
    ) -> Dict[str, bool]:
        """
        Actualiza credenciales de Zoom
        
        Returns:
            Diccionario con estado de actualización de cada credencial
        """
        results = {}
        
        if sdk_key is not None:
            await self.set_config(
                "ZOOM_SDK_KEY",
                sdk_key,
                encrypt=False,  # SDK Key es público
                description="Zoom SDK Key (público para frontend)",
                updated_by=updated_by
            )
            results["ZOOM_SDK_KEY"] = True
        
        if sdk_secret is not None:
            await self.set_config(
                "ZOOM_SDK_SECRET",
                sdk_secret,
                encrypt=True,
                description="Zoom SDK Secret (privado)",
                updated_by=updated_by
            )
            results["ZOOM_SDK_SECRET"] = True
        
        if account_id is not None:
            await self.set_config(
                "ZOOM_ACCOUNT_ID",
                account_id,
                encrypt=True,
                description="Zoom Account ID para OAuth",
                updated_by=updated_by
            )
            results["ZOOM_ACCOUNT_ID"] = True
        
        if client_id is not None:
            await self.set_config(
                "ZOOM_CLIENT_ID",
                client_id,
                encrypt=True,
                description="Zoom Client ID para OAuth",
                updated_by=updated_by
            )
            results["ZOOM_CLIENT_ID"] = True
        
        if client_secret is not None:
            await self.set_config(
                "ZOOM_CLIENT_SECRET",
                client_secret,
                encrypt=True,
                description="Zoom Client Secret para OAuth",
                updated_by=updated_by
            )
            results["ZOOM_CLIENT_SECRET"] = True
        
        logger.info(f"Credenciales de Zoom actualizadas: {list(results.keys())}")
        return results
    
    # ============================================
    # Zoom Multi-Account Methods
    # ============================================

    MAX_ZOOM_ACCOUNTS = 3

    async def _migrate_legacy_zoom_keys(self, updated_by: Optional[int] = None):
        """
        Migra las keys antiguas (ZOOM_SDK_KEY, etc.) al formato multi-cuenta (ZOOM_1_SDK_KEY, etc.)
        Solo se ejecuta si existen keys antiguas y no existen las nuevas.
        """
        legacy_keys = ["ZOOM_SDK_KEY", "ZOOM_SDK_SECRET", "ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"]
        new_key_prefix = "ZOOM_1_"
        
        # Verificar si ya hay cuentas nuevas
        existing_name = await self.get_config(f"{new_key_prefix}NAME", decrypt=False)
        if existing_name:
            return  # Ya migrado
        
        # Verificar si existen keys antiguas
        legacy_credentials = await self.get_zoom_credentials()
        if not legacy_credentials:
            return  # Nada que migrar
        
        logger.info("Migrando credenciales Zoom legacy al formato multi-cuenta...")
        
        # Copiar keys antiguas al formato nuevo
        key_mapping = {
            "ZOOM_SDK_KEY": ("SDK_KEY", False),
            "ZOOM_SDK_SECRET": ("SDK_SECRET", True),
            "ZOOM_ACCOUNT_ID": ("ACCOUNT_ID", True),
            "ZOOM_CLIENT_ID": ("CLIENT_ID", True),
            "ZOOM_CLIENT_SECRET": ("CLIENT_SECRET", True),
        }
        
        for old_key, (suffix, encrypt) in key_mapping.items():
            value = legacy_credentials.get(old_key)
            if value:
                new_key = f"ZOOM_1_{suffix}"
                await self.set_config(
                    new_key, value, encrypt=encrypt,
                    description=f"Cuenta Zoom 1 - {suffix}",
                    updated_by=updated_by
                )
        
        # Crear nombre para la cuenta
        await self.set_config(
            "ZOOM_1_NAME", "Cuenta Principal", encrypt=False,
            description="Nombre de la cuenta Zoom 1",
            updated_by=updated_by
        )
        
        logger.info("Migración de credenciales Zoom completada: cuenta 1 = 'Cuenta Principal'")

    async def get_zoom_accounts(self) -> List[Dict]:
        """
        Obtiene la lista de cuentas Zoom configuradas.
        Auto-migra keys legacy si es necesario.
        
        Returns:
            Lista de diccionarios con {id, name, is_configured, last_updated}
        """
        await self._migrate_legacy_zoom_keys()
        
        accounts = []
        for account_id in range(1, self.MAX_ZOOM_ACCOUNTS + 1):
            prefix = f"ZOOM_{account_id}_"
            name = await self.get_config(f"{prefix}NAME", decrypt=False, silent=True)
            
            if not name:
                continue  # No existe esta cuenta
            
            # Verificar si tiene todas las credenciales
            required_keys = ["SDK_KEY", "SDK_SECRET", "ACCOUNT_ID", "CLIENT_ID", "CLIENT_SECRET"]
            has_all = True
            last_updated = None
            
            for key_suffix in required_keys:
                full_key = f"{prefix}{key_suffix}"
                # Buscar el registro directamente para obtener updated_at
                stmt = select(SystemConfigModel).where(
                    SystemConfigModel.str_config_key == full_key,
                    SystemConfigModel.bln_is_active == True
                )
                result = await self.db.execute(stmt)
                config = result.scalar_one_or_none()
                
                if not config:
                    has_all = False
                else:
                    if config.updated_at:
                        ts = config.updated_at.isoformat()
                        if not last_updated or ts > last_updated:
                            last_updated = ts
            
            accounts.append({
                "id": account_id,
                "name": name,
                "is_configured": has_all,
                "last_updated": last_updated
            })
        
        return accounts

    async def get_zoom_account_credentials(self, account_id: int) -> Dict[str, str]:
        """
        Obtiene credenciales desencriptadas de una cuenta Zoom específica.
        
        Args:
            account_id: ID de la cuenta (1-3)
            
        Returns:
            Diccionario con credenciales {ZOOM_SDK_KEY, ZOOM_SDK_SECRET, ...}
        """
        if account_id < 1 or account_id > self.MAX_ZOOM_ACCOUNTS:
            raise ServiceException(f"ID de cuenta Zoom inválido: {account_id}. Debe ser entre 1 y {self.MAX_ZOOM_ACCOUNTS}")
        
        prefix = f"ZOOM_{account_id}_"
        key_mapping = {
            f"ZOOM_SDK_KEY": f"{prefix}SDK_KEY",
            f"ZOOM_SDK_SECRET": f"{prefix}SDK_SECRET",
            f"ZOOM_ACCOUNT_ID": f"{prefix}ACCOUNT_ID",
            f"ZOOM_CLIENT_ID": f"{prefix}CLIENT_ID",
            f"ZOOM_CLIENT_SECRET": f"{prefix}CLIENT_SECRET",
        }
        
        credentials = {}
        for standard_key, config_key in key_mapping.items():
            value = await self.get_config(config_key, decrypt=True)
            if value:
                credentials[standard_key] = value
        
        return credentials

    async def get_zoom_account_name(self, account_id: int) -> Optional[str]:
        """Obtiene el nombre de una cuenta Zoom"""
        return await self.get_config(f"ZOOM_{account_id}_NAME", decrypt=False)

    async def get_next_zoom_account_id(self) -> Optional[int]:
        """
        Determina el próximo ID disponible para una nueva cuenta Zoom.
        
        Returns:
            ID disponible (1-3) o None si ya hay 3 cuentas
        """
        for account_id in range(1, self.MAX_ZOOM_ACCOUNTS + 1):
            name = await self.get_config(f"ZOOM_{account_id}_NAME", decrypt=False)
            if not name:
                return account_id
        return None

    async def update_zoom_account_credentials(
        self,
        account_id: int,
        name: str,
        sdk_key: Optional[str] = None,
        sdk_secret: Optional[str] = None,
        account_id_zoom: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        updated_by: Optional[int] = None
    ) -> Dict[str, bool]:
        """
        Crea o actualiza credenciales de una cuenta Zoom específica.
        
        Args:
            account_id: ID de la cuenta (1-3)
            name: Nombre amigable de la cuenta
            sdk_key, sdk_secret, etc.: Credenciales de Zoom
            updated_by: ID del usuario que actualiza
        """
        if account_id < 1 or account_id > self.MAX_ZOOM_ACCOUNTS:
            raise ServiceException(f"ID de cuenta Zoom inválido: {account_id}")
        
        prefix = f"ZOOM_{account_id}_"
        results = {}
        
        # Nombre de la cuenta (siempre requerido)
        await self.set_config(
            f"{prefix}NAME", name, encrypt=False,
            description=f"Nombre de la cuenta Zoom {account_id}",
            updated_by=updated_by
        )
        results["NAME"] = True
        
        fields = [
            ("SDK_KEY", sdk_key, False, "Zoom SDK Key"),
            ("SDK_SECRET", sdk_secret, True, "Zoom SDK Secret"),
            ("ACCOUNT_ID", account_id_zoom, True, "Zoom Account ID"),
            ("CLIENT_ID", client_id, True, "Zoom Client ID"),
            ("CLIENT_SECRET", client_secret, True, "Zoom Client Secret"),
        ]
        
        for suffix, value, encrypt, desc in fields:
            if value is not None:
                await self.set_config(
                    f"{prefix}{suffix}", value, encrypt=encrypt,
                    description=f"Cuenta Zoom {account_id} - {desc}",
                    updated_by=updated_by
                )
                results[suffix] = True
        
        # Mantener compatibilidad: si es la cuenta 1, actualizar también las keys legacy
        if account_id == 1:
            legacy_mapping = [
                ("ZOOM_SDK_KEY", sdk_key, False),
                ("ZOOM_SDK_SECRET", sdk_secret, True),
                ("ZOOM_ACCOUNT_ID", account_id_zoom, True),
                ("ZOOM_CLIENT_ID", client_id, True),
                ("ZOOM_CLIENT_SECRET", client_secret, True),
            ]
            for legacy_key, value, encrypt in legacy_mapping:
                if value is not None:
                    await self.set_config(
                        legacy_key, value, encrypt=encrypt,
                        description=f"Zoom credential (legacy, synced from account 1)",
                        updated_by=updated_by
                    )
        
        logger.info(f"Cuenta Zoom {account_id} ('{name}') actualizada: {list(results.keys())}")
        return results

    async def delete_zoom_account(self, account_id: int) -> bool:
        """
        Elimina una cuenta Zoom (desactiva todas sus keys).
        
        Args:
            account_id: ID de la cuenta (1-3)
        """
        if account_id < 1 or account_id > self.MAX_ZOOM_ACCOUNTS:
            raise ServiceException(f"ID de cuenta Zoom inválido: {account_id}")
        
        prefix = f"ZOOM_{account_id}_"
        suffixes = ["NAME", "SDK_KEY", "SDK_SECRET", "ACCOUNT_ID", "CLIENT_ID", "CLIENT_SECRET"]
        
        for suffix in suffixes:
            full_key = f"{prefix}{suffix}"
            stmt = select(SystemConfigModel).where(
                SystemConfigModel.str_config_key == full_key
            )
            result = await self.db.execute(stmt)
            config = result.scalar_one_or_none()
            if config:
                config.bln_is_active = False
                
        await self.db.commit()
        logger.info(f"Cuenta Zoom {account_id} eliminada")
        return True

    async def get_all_configs(
        self,
        include_encrypted_values: bool = False
    ) -> List[Dict]:
        """
        Obtiene todas las configuraciones del sistema
        
        Args:
            include_encrypted_values: Si False, enmascara valores encriptados
            
        Returns:
            Lista de configuraciones
        """
        try:
            stmt = select(SystemConfigModel).where(
                SystemConfigModel.bln_is_active == True
            ).order_by(SystemConfigModel.str_config_key)
            
            result = await self.db.execute(stmt)
            configs = result.scalars().all()
            
            config_list = []
            for config in configs:
                value = config.str_config_value
                
                # Si está encriptado y no se solicita ver el valor
                if config.bln_is_encrypted and not include_encrypted_values:
                    value = "***ENCRYPTED***"
                elif config.bln_is_encrypted and include_encrypted_values:
                    try:
                        value = encryption_service.decrypt(value)
                    except:
                        value = "***ERROR_DECRYPT***"
                
                config_list.append({
                    "key": config.str_config_key,
                    "value": value,
                    "is_encrypted": config.bln_is_encrypted,
                    "description": config.str_description,
                    "updated_at": config.updated_at.isoformat() if config.updated_at else None
                })
            
            return config_list
            
        except Exception as e:
            logger.error(f"Error al obtener todas las configuraciones: {str(e)}")
            raise ServiceException(f"Error al obtener configuraciones: {str(e)}")
    
    async def get_smtp_credentials(self) -> Dict[str, any]:
        """
        Obtiene todas las credenciales SMTP desencriptadas y enmascaradas
        
        Returns:
            Diccionario con credenciales SMTP (valores sensibles enmascarados)
        """
        keys = [
            "SMTP_HOST",
            "SMTP_PORT",
            "SMTP_USER",
            "SMTP_PASSWORD",
            "SMTP_FROM_EMAIL",
            "SMTP_FROM_NAME",
            "EMAIL_ENABLED"
        ]
        
        credentials = {}
        for key in keys:
            value = await self.get_config(key, decrypt=True)
            if value:
                credentials[key] = value
            else:
                logger.debug(f"Credencial SMTP no encontrada: {key}")
        
        return credentials
    
    async def update_smtp_credentials(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        smtp_from_email: Optional[str] = None,
        smtp_from_name: Optional[str] = None,
        email_enabled: bool = True,
        updated_by: Optional[int] = None
    ) -> Dict[str, bool]:
        """
        Actualiza credenciales SMTP
        
        Returns:
            Diccionario con estado de actualización de cada credencial
        """
        results = {}
        
        # SMTP Host (sin encriptar)
        await self.set_config(
            "SMTP_HOST",
            smtp_host,
            encrypt=False,
            description="Dirección del servidor SMTP",
            updated_by=updated_by
        )
        results["SMTP_HOST"] = True
        
        # SMTP Port (sin encriptar)
        await self.set_config(
            "SMTP_PORT",
            str(smtp_port),
            encrypt=False,
            description="Puerto del servidor SMTP",
            updated_by=updated_by
        )
        results["SMTP_PORT"] = True
        
        # SMTP User (encriptado)
        await self.set_config(
            "SMTP_USER",
            smtp_user,
            encrypt=True,
            description="Usuario para autenticación SMTP",
            updated_by=updated_by
        )
        results["SMTP_USER"] = True
        
        # SMTP Password (encriptado)
        await self.set_config(
            "SMTP_PASSWORD",
            smtp_password,
            encrypt=True,
            description="Contraseña para autenticación SMTP",
            updated_by=updated_by
        )
        results["SMTP_PASSWORD"] = True
        
        # SMTP From Email (sin encriptar, opcional)
        if smtp_from_email:
            await self.set_config(
                "SMTP_FROM_EMAIL",
                smtp_from_email,
                encrypt=False,
                description="Email del remitente",
                updated_by=updated_by
            )
            results["SMTP_FROM_EMAIL"] = True
        
        # SMTP From Name (sin encriptar, opcional)
        if smtp_from_name:
            await self.set_config(
                "SMTP_FROM_NAME",
                smtp_from_name,
                encrypt=False,
                description="Nombre visible del remitente",
                updated_by=updated_by
            )
            results["SMTP_FROM_NAME"] = True
        
        # Email Enabled (sin encriptar)
        await self.set_config(
            "EMAIL_ENABLED",
            str(email_enabled).lower(),
            encrypt=False,
            description="Activar/desactivar envío de correos",
            updated_by=updated_by
        )
        results["EMAIL_ENABLED"] = True
        
        logger.info(f"Credenciales SMTP actualizadas: {list(results.keys())}")
        return results
