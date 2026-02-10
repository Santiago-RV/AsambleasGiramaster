from cryptography.fernet import Fernet
from app.core.config import settings
from app.core.logging_config import get_logger
from typing import Optional

logger = get_logger(__name__)

class EncryptionService:
    """
    Servicio para encriptar/desencriptar valores sensibles usando Fernet (AES-128)
    """
    
    def __init__(self):
        # Obtener master key desde .env
        master_key = settings.ENCRYPTION_MASTER_KEY
        
        if not master_key:
            raise ValueError(
                "ENCRYPTION_MASTER_KEY no está configurada en .env. "
                "Genera una con: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        
        try:
            # Validar que sea una clave Fernet válida
            self.fernet = Fernet(master_key.encode())
        except Exception as e:
            raise ValueError(f"ENCRYPTION_MASTER_KEY inválida: {str(e)}")
    
    def encrypt(self, plain_value: str) -> str:
        """
        Encripta un valor de texto plano
        
        Args:
            plain_value: Valor en texto plano
            
        Returns:
            Valor encriptado en base64
        """
        try:
            encrypted_bytes = self.fernet.encrypt(plain_value.encode())
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Error al encriptar valor: {str(e)}")
            raise Exception(f"Error al encriptar: {str(e)}")
    
    def decrypt(self, encrypted_value: str) -> str:
        """
        Desencripta un valor encriptado
        
        Args:
            encrypted_value: Valor encriptado en base64
            
        Returns:
            Valor desencriptado en texto plano
        """
        try:
            decrypted_bytes = self.fernet.decrypt(encrypted_value.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Error al desencriptar valor: {str(e)}")
            raise Exception(f"Error al desencriptar (clave inválida o datos corruptos): {str(e)}")
    
    def is_encrypted(self, value: str) -> bool:
        """
        Verifica si un valor está encriptado (formato Fernet válido)
        
        Args:
            value: Valor a verificar
            
        Returns:
            True si está encriptado, False en caso contrario
        """
        try:
            # Los valores Fernet siempre empiezan con "gAAAAA"
            if value.startswith("gAAAAA"):
                # Intentar desencriptar
                self.decrypt(value)
                return True
            return False
        except:
            return False
    
    @staticmethod
    def generate_master_key() -> str:
        """
        Genera una nueva master key Fernet
        
        Returns:
            Master key en formato base64
        """
        return Fernet.generate_key().decode()

# Instancia global
encryption_service = EncryptionService()
