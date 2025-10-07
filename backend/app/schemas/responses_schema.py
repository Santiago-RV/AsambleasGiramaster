from typing import Optional, Any
from pydantic import BaseModel, Field

class SuccessResponse(BaseModel):
  """ Respuesta estándar para todas las APIs """

  success: bool = Field(default=True, description="Indica si la operación fue exitosa")
  status_code: int = Field(default=200, description="Código de estado HTTP")
  message: str = Field(default="Operación exitosa", description="Mensaje descriptivo de la operación")
  data: Optional[Any] = Field(default=None, description="Datos de la respuesta (especificos segun el endpoint)")
  meta: Optional[dict] = Field(default=None, description="Metadatos adicionales de la respuesta")
  
  class Config:
    json_schema_extra = {
      "example": {
        "success": True,
        "message": "Operación exitosa",
        "data": {"example": "data"},
        "meta": {
          "total": 10,
          "page": 1,
          "limit": 10
        }
      }
    }

class ErrorResponse(BaseModel):
  """ Respuesta de error para todas las APIs """

  success: bool = Field(default=False, description="Indica si la operación fue exitosa")
  message: str = Field(default="Operación fallida", description="Mensaje descriptivo de la operación")
  errors: Optional[str] = Field(default=None, description="Errores de la respuesta (si hay)")
  meta: Optional[dict] = Field(default=None, description="Metadatos adicionales de la respuesta")
  error_code: str = Field(default="OPERATION_FAILED", description="Código de error de la operación")
  
  class Config:
    json_schema_extra = {
      "example": {
        "success": False,
        "message": "Operación fallida",
        "errors": "Error de la operación",
        "meta": {},
        "error_code": "OPERATION_FAILED"
      }
    }