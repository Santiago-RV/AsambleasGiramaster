# Modelo de respuesta para el token
from pydantic import BaseModel


class Token(BaseModel):
    """
    Esquema para el token de autenticación
        Args:
        BaseModel (_type_): _description_
        Returns:
            _type_: _description_
    """
    access_token: str
    token_type: str