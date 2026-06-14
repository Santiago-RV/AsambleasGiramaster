from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.system_config_model import SystemConfigModel
from app.services.encryption_service import encryption_service
from app.core.logging_config import get_logger
from typing import Optional, Dict, List
from app.core.exceptions import ServiceException
from datetime import date

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
    
    async def get_smtp_credentials(
        self,
        decrypt: bool = True,
        check_active: bool = True
    ) -> Dict[str, any]:
        """
        Obtiene todas las credenciales SMTP
        
        Args:
            decrypt: Si True, desencripta valores encriptados
            check_active: Si True, solo retorna configuraciones activas
            
        Returns:
            Diccionario con credenciales SMTP
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
            value = await self.get_config(key, decrypt=decrypt, silent=True)
            if value:
                credentials[key] = value
            elif not check_active:
                # Si no está activo, intentar obtener sin verificar activo
                stmt = select(SystemConfigModel.str_config_value, SystemConfigModel.bln_is_encrypted).where(
                    SystemConfigModel.str_config_key == key
                )
                result = await self.db.execute(stmt)
                config = result.scalar_one_or_none()
                
                if config:
                    if config.bln_is_encrypted and decrypt:
                        try:
                            value = encryption_service.decrypt(config.str_config_value)
                        except:
                            value = None
                    else:
                        value = config.str_config_value
                    
                    if value:
                        credentials[key] = value
        
        return credentials
    
    async def update_smtp_credentials(
        self,
        smtp_host: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None,
        smtp_from_email: Optional[str] = None,
        smtp_from_name: Optional[str] = None,
        email_enabled: Optional[bool] = None,
        updated_by: Optional[int] = None
    ) -> Dict[str, bool]:
        """
        Actualiza credenciales SMTP. Solo actualiza los campos proporcionados.
        
        Returns:
            Diccionario con estado de actualización de cada credencial
        """
        results = {}
        
        # SMTP Host (sin encriptar)
        if smtp_host is not None:
            await self.set_config(
                "SMTP_HOST",
                smtp_host,
                encrypt=False,
                description="Dirección del servidor SMTP",
                updated_by=updated_by
            )
            results["SMTP_HOST"] = True
        
        # SMTP Port (sin encriptar)
        if smtp_port is not None:
            await self.set_config(
                "SMTP_PORT",
                str(smtp_port),
                encrypt=False,
                description="Puerto del servidor SMTP",
                updated_by=updated_by
            )
            results["SMTP_PORT"] = True
        
        # SMTP User (encriptado)
        if smtp_user is not None:
            await self.set_config(
                "SMTP_USER",
                smtp_user,
                encrypt=True,
                description="Usuario para autenticación SMTP",
                updated_by=updated_by
            )
            results["SMTP_USER"] = True
        
        # SMTP Password (encriptado)
        if smtp_password is not None:
            await self.set_config(
                "SMTP_PASSWORD",
                smtp_password,
                encrypt=True,
                description="Contraseña para autenticación SMTP",
                updated_by=updated_by
            )
            results["SMTP_PASSWORD"] = True
        
        # SMTP From Email (sin encriptar, opcional)
        if smtp_from_email is not None:
            await self.set_config(
                "SMTP_FROM_EMAIL",
                smtp_from_email,
                encrypt=False,
                description="Email del remitente",
                updated_by=updated_by
            )
            results["SMTP_FROM_EMAIL"] = True
        
        # SMTP From Name (sin encriptar, opcional)
        if smtp_from_name is not None:
            await self.set_config(
                "SMTP_FROM_NAME",
                smtp_from_name,
                encrypt=False,
                description="Nombre visible del remitente",
                updated_by=updated_by
            )
            results["SMTP_FROM_NAME"] = True
        
        # Email Enabled (sin encriptar)
        if email_enabled is not None:
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

    # ============================================
    # SMTP Multi-Account Methods
    # ============================================

    MAX_SMTP_ACCOUNTS = 10

    async def _get_legacy_smtp_as_account(self) -> Optional[Dict]:
        """
        Lee las credenciales SMTP legacy (SMTP_HOST/USER/etc.) y las
        devuelve con forma de cuenta multi-cuenta (id=1).
        Retorna None si no hay credenciales legacy.
        """
        legacy = await self.get_smtp_credentials()
        if not legacy.get("SMTP_USER"):
            return None

        raw_user = legacy["SMTP_USER"]
        return {
            "_is_legacy": True,
            "HOST": legacy.get("SMTP_HOST", "smtp.gmail.com"),
            "PORT": legacy.get("SMTP_PORT", "587"),
            "USER": raw_user,
            "PASSWORD": legacy.get("SMTP_PASSWORD", ""),
            "FROM_EMAIL": legacy.get("SMTP_FROM_EMAIL", ""),
            "FROM_NAME": legacy.get("SMTP_FROM_NAME", "GIRAMASTER - Sistema de Asambleas"),
            "DAILY_LIMIT": "500",
            "NAME": "Cuenta Principal",
        }

    async def _migrate_legacy_smtp_keys(self, updated_by: Optional[int] = None):
        """
        Migra las keys antiguas (SMTP_HOST, etc.) al formato multi-cuenta (SMTP_1_HOST, etc.).
        Idempotente y tolerante a fallos parciales: verifica campo a campo si ya fue migrado.
        """
        # Verificar si la migración completa ya ocurrió (usuario y contraseña presentes)
        existing_user = await self.get_config("SMTP_1_USER", decrypt=False, silent=True)
        if existing_user:
            return  # Ya migrado con datos completos

        legacy = await self.get_smtp_credentials()
        if not legacy.get("SMTP_USER"):
            return  # Nada que migrar

        logger.info("Migrando credenciales SMTP legacy al formato multi-cuenta...")

        mapping = [
            ("SMTP_1_NAME", "Cuenta Principal", False, "Nombre de la cuenta SMTP 1"),
            ("SMTP_1_HOST", legacy.get("SMTP_HOST", "smtp.gmail.com"), False, "Host SMTP cuenta 1"),
            ("SMTP_1_PORT", legacy.get("SMTP_PORT", "587"), False, "Puerto SMTP cuenta 1"),
            ("SMTP_1_USER", legacy.get("SMTP_USER"), True, "Usuario SMTP cuenta 1"),
            ("SMTP_1_PASSWORD", legacy.get("SMTP_PASSWORD", ""), True, "Contraseña SMTP cuenta 1"),
            ("SMTP_1_FROM_EMAIL", legacy.get("SMTP_FROM_EMAIL", ""), False, "From email cuenta 1"),
            ("SMTP_1_FROM_NAME", legacy.get("SMTP_FROM_NAME", "GIRAMASTER"), False, "From name cuenta 1"),
            ("SMTP_1_DAILY_LIMIT", "500", False, "Límite diario cuenta 1"),
        ]

        for key, value, encrypt, desc in mapping:
            if value:
                try:
                    await self.set_config(key, value, encrypt=encrypt,
                                         description=desc, updated_by=updated_by)
                except Exception as e:
                    logger.warning(f"No se pudo migrar {key}: {e}")

        logger.info("Migración SMTP completada: cuenta 1 = 'Cuenta Principal'")

    async def get_smtp_accounts(self) -> List[Dict]:
        """
        Retorna lista de cuentas SMTP configuradas con información de estado.
        Incluye fallback a credenciales legacy si no hay cuentas multi-cuenta.
        """
        try:
            await self._migrate_legacy_smtp_keys()
        except Exception as e:
            logger.warning(f"Migración SMTP falló (no crítico): {e}")

        today = date.today().isoformat()
        accounts = []

        for i in range(1, self.MAX_SMTP_ACCOUNTS + 1):
            name = await self.get_config(f"SMTP_{i}_NAME", decrypt=False, silent=True)
            if not name:
                break

            user_raw = await self.get_config(f"SMTP_{i}_USER", decrypt=True, silent=True)
            exceeded_date = await self.get_config(f"SMTP_{i}_EXCEEDED_DATE", decrypt=False, silent=True)
            daily_limit_raw = await self.get_config(f"SMTP_{i}_DAILY_LIMIT", decrypt=False, silent=True)
            host = await self.get_config(f"SMTP_{i}_HOST", decrypt=False, silent=True) or "smtp.gmail.com"
            port_raw = await self.get_config(f"SMTP_{i}_PORT", decrypt=False, silent=True)

            masked_user = ("***" + user_raw[-8:]) if user_raw and len(user_raw) > 8 else ("***" if user_raw else None)

            accounts.append({
                "id": i,
                "name": name,
                "email": masked_user,
                "host": host,
                "port": int(port_raw or 587),
                "daily_limit": int(daily_limit_raw or 500),
                "is_exceeded_today": exceeded_date == today,
                "last_exceeded_date": exceeded_date,
            })

        # Fallback: si no hay cuentas multi-cuenta pero sí hay credenciales legacy,
        # mostramos la cuenta legacy como cuenta #1 para que no quede invisible.
        if not accounts:
            legacy_account = await self._get_legacy_smtp_as_account()
            if legacy_account:
                raw_user = legacy_account["USER"]
                masked = ("***" + raw_user[-8:]) if len(raw_user) > 8 else "***"
                accounts.append({
                    "id": 1,
                    "name": legacy_account["NAME"],
                    "email": masked,
                    "host": legacy_account["HOST"],
                    "port": int(legacy_account["PORT"]),
                    "daily_limit": int(legacy_account["DAILY_LIMIT"]),
                    "is_exceeded_today": False,
                    "last_exceeded_date": None,
                })

        return accounts

    async def get_smtp_account_credentials(self, account_id: int) -> Dict[str, str]:
        """
        Retorna credenciales desencriptadas de una cuenta SMTP específica.
        Para cuenta 1: si no existen claves SMTP_1_*, usa credenciales legacy como fallback.
        """
        prefix = f"SMTP_{account_id}_"
        creds = {}
        for key in ["HOST", "PORT", "USER", "PASSWORD", "FROM_EMAIL", "FROM_NAME", "DAILY_LIMIT", "NAME"]:
            value = await self.get_config(f"{prefix}{key}", decrypt=True, silent=True)
            if value:
                creds[key] = value

        # Fallback para cuenta 1: si no tiene USER (credenciales incompletas), usar legacy
        if account_id == 1 and not creds.get("USER"):
            legacy_account = await self._get_legacy_smtp_as_account()
            if legacy_account:
                for k, v in legacy_account.items():
                    if k != "_is_legacy" and not creds.get(k):
                        creds[k] = v

        return creds

    async def get_smtp_account_name(self, account_id: int) -> Optional[str]:
        """
        Retorna el nombre de una cuenta SMTP.
        Para cuenta 1: fallback a 'Cuenta Principal' si no existe clave multi-cuenta pero sí hay legacy.
        """
        name = await self.get_config(f"SMTP_{account_id}_NAME", decrypt=False, silent=True)
        if not name and account_id == 1:
            # Verificar si existe cuenta legacy
            legacy_user = await self.get_config("SMTP_USER", decrypt=False, silent=True)
            if legacy_user:
                return "Cuenta Principal"
        return name

    async def get_next_smtp_account_id(self) -> Optional[int]:
        """Retorna el siguiente ID disponible para una nueva cuenta SMTP."""
        try:
            await self._migrate_legacy_smtp_keys()
        except Exception:
            pass
        for i in range(1, self.MAX_SMTP_ACCOUNTS + 1):
            name = await self.get_config(f"SMTP_{i}_NAME", decrypt=False, silent=True)
            if not name:
                # Verificar también si es la cuenta 1 con datos legacy
                if i == 1:
                    legacy_user = await self.get_config("SMTP_USER", decrypt=False, silent=True)
                    if legacy_user:
                        continue  # La cuenta 1 "existe" como legacy
                return i
        return None  # Límite alcanzado

    async def get_available_smtp_account(self) -> Optional[Dict]:
        """
        Retorna la primera cuenta SMTP disponible (no excedida hoy) con credenciales completas.
        Con fallback a credenciales legacy si no hay cuentas multi-cuenta configuradas.
        """
        try:
            await self._migrate_legacy_smtp_keys()
        except Exception:
            pass

        today = date.today().isoformat()

        for i in range(1, self.MAX_SMTP_ACCOUNTS + 1):
            name = await self.get_config(f"SMTP_{i}_NAME", decrypt=False, silent=True)
            if not name:
                break

            exceeded_date = await self.get_config(f"SMTP_{i}_EXCEEDED_DATE", decrypt=False, silent=True)
            if exceeded_date == today:
                logger.info(f"Cuenta SMTP {i} ('{name}') excedida hoy, saltando...")
                continue

            user = await self.get_config(f"SMTP_{i}_USER", decrypt=True, silent=True)
            password = await self.get_config(f"SMTP_{i}_PASSWORD", decrypt=True, silent=True)

            if not user or not password:
                continue

            host = await self.get_config(f"SMTP_{i}_HOST", decrypt=False, silent=True) or "smtp.gmail.com"
            port_raw = await self.get_config(f"SMTP_{i}_PORT", decrypt=False, silent=True)
            from_email = await self.get_config(f"SMTP_{i}_FROM_EMAIL", decrypt=False, silent=True) or user
            from_name = await self.get_config(f"SMTP_{i}_FROM_NAME", decrypt=False, silent=True) or "GIRAMASTER"
            daily_limit = int(await self.get_config(f"SMTP_{i}_DAILY_LIMIT", decrypt=False, silent=True) or 500)

            return {
                "id": i,
                "name": name,
                "host": host,
                "port": int(port_raw or 587),
                "user": user,
                "password": password,
                "from_email": from_email,
                "from_name": from_name,
                "daily_limit": daily_limit,
                "email_enabled": True,
            }

        # Fallback final: usar credenciales legacy directamente
        legacy_account = await self._get_legacy_smtp_as_account()
        if legacy_account and legacy_account.get("PASSWORD"):
            user = legacy_account["USER"]
            return {
                "id": 1,
                "name": legacy_account["NAME"],
                "host": legacy_account["HOST"],
                "port": int(legacy_account["PORT"]),
                "user": user,
                "password": legacy_account["PASSWORD"],
                "from_email": legacy_account.get("FROM_EMAIL") or user,
                "from_name": legacy_account.get("FROM_NAME", "GIRAMASTER"),
                "daily_limit": int(legacy_account["DAILY_LIMIT"]),
                "email_enabled": True,
            }

        return None

    async def mark_smtp_account_exceeded(self, account_id: int) -> None:
        """Marca una cuenta SMTP como excedida para el día de hoy."""
        today = date.today().isoformat()
        await self.set_config(
            f"SMTP_{account_id}_EXCEEDED_DATE", today, encrypt=False,
            description=f"Fecha en que la cuenta SMTP {account_id} excedió su límite diario"
        )
        logger.warning(f"Cuenta SMTP {account_id} marcada como excedida para hoy ({today})")

    async def create_or_update_smtp_account(
        self,
        account_id: int,
        name: str,
        user: Optional[str] = None,
        password: Optional[str] = None,
        host: Optional[str] = None,
        port: Optional[int] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        daily_limit: Optional[int] = None,
        updated_by: Optional[int] = None
    ) -> Dict[str, bool]:
        """Crea o actualiza una cuenta SMTP."""
        prefix = f"SMTP_{account_id}_"
        results = {}

        await self.set_config(f"{prefix}NAME", name, encrypt=False,
                              description=f"Nombre de la cuenta SMTP {account_id}", updated_by=updated_by)
        results["NAME"] = True

        fields = [
            ("HOST", host, False, "Host SMTP"),
            ("PORT", str(port) if port else None, False, "Puerto SMTP"),
            ("USER", user, True, "Usuario SMTP"),
            ("PASSWORD", password, True, "Contraseña SMTP"),
            ("FROM_EMAIL", from_email, False, "Email remitente"),
            ("FROM_NAME", from_name, False, "Nombre remitente"),
            ("DAILY_LIMIT", str(daily_limit) if daily_limit else None, False, "Límite diario de envío"),
        ]

        for suffix, value, encrypt, desc in fields:
            if value is not None:
                await self.set_config(
                    f"{prefix}{suffix}", value, encrypt=encrypt,
                    description=f"Cuenta SMTP {account_id} - {desc}", updated_by=updated_by
                )
                results[suffix] = True

        logger.info(f"Cuenta SMTP {account_id} ('{name}') actualizada: {list(results.keys())}")
        return results

    async def delete_smtp_account(self, account_id: int) -> bool:
        """Elimina (desactiva) todas las keys de una cuenta SMTP."""
        prefix = f"SMTP_{account_id}_"
        suffixes = ["NAME", "HOST", "PORT", "USER", "PASSWORD", "FROM_EMAIL", "FROM_NAME",
                    "DAILY_LIMIT", "EXCEEDED_DATE"]

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
        logger.info(f"Cuenta SMTP {account_id} eliminada")
        return True

    async def reset_smtp_account_exceeded(self, account_id: int) -> bool:
        """Restablece manualmente el límite excedido de una cuenta SMTP."""
        stmt = select(SystemConfigModel).where(
            SystemConfigModel.str_config_key == f"SMTP_{account_id}_EXCEEDED_DATE"
        )
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()
        if config:
            config.bln_is_active = False
            await self.db.commit()
        logger.info(f"Límite de cuenta SMTP {account_id} restablecido manualmente")
        return True
