from fastapi import APIRouter, Depends, HTTPException, status
from requests import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any

from app.core.database import get_db
from app.auth.auth import get_current_user
from app.models.user_model import UserModel
from app.models.user_residential_unit_model import UserResidentialUnitModel
from app.schemas.user_residential_unit_schema import (
    MyResidentialUnitResponse,
    UserResidentialUnitResponse
)

from app.models.data_user_model import DataUserModel
from app.models.residential_unit_model import ResidentialUnitModel
from app.models.rol_model import RolModel
from app.schemas.responses_schema import SuccessResponse
from app.services.user_service import UserService

router = APIRouter()

@router.get(
    "/me/residential-unit",
    response_model=Dict[str, Any],
    summary="Obtener unidad residencial del usuario actual"
)
async def get_my_residential_unit(
    usuario_id_or_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la información de la unidad residencial del usuario autenticado.
    Compatible con AsyncSession.
    
    Args:
        usuario_id_or_username: Puede ser el ID o el username del usuario
        db: AsyncSession de SQLAlchemy
    
    Returns:
        - residential_unit_id: ID de la unidad residencial
        - user_id: ID del usuario
        - apartment_number: Número de apartamento
        - is_admin: Si es administrador de la unidad
        - voting_weight: Peso de votación
    """
    try:
        # Limpiar espacios
        value = usuario_id_or_username.strip() if isinstance(usuario_id_or_username, str) else usuario_id_or_username
        
        # Intentar convertir a int (si es user_id numérico)
        try:
            user_id = int(value)
            print(f"Usando user_id: {user_id}")
            
        except ValueError:
            # No es numérico, debe ser un username
            print(f"Es un username: {value}")
            
            # Buscar el usuario por username (sintaxis async)
            stmt = select(UserModel).where(UserModel.str_username == value)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario no encontrado: {value}"
                )
            
            user_id = user.id
            print(f"User_id encontrado: {user_id}")
        
        # Buscar la unidad residencial del usuario (sintaxis async)
        stmt = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_user_id == user_id
        )
        result = await db.execute(stmt)
        user_residential_unit = result.scalar_one_or_none()
        
        if not user_residential_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no asociado a ninguna unidad residencial"
            )
        
        print(f"Found residential unit: {user_residential_unit.int_residential_unit_id}")
        
        # Preparar respuesta
        response_data = MyResidentialUnitResponse(
            residential_unit_id=user_residential_unit.int_residential_unit_id,
            user_id=user_residential_unit.int_user_id,
            apartment_number=user_residential_unit.str_apartment_number,
            is_admin=user_residential_unit.bool_is_admin,
            voting_weight=float(user_residential_unit.dec_default_voting_weight or 0)
        )
        
        return {
            "success": True,
            "data": response_data.model_dump()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener unidad residencial: {str(e)}"
        )


@router.get(
    "/{user_id}/residential-unit",
    response_model=Dict[str, Any],
    summary="Obtener unidad residencial de un usuario específico"
)
async def get_user_residential_unit(
    user_id: int,
    usuario_id_or_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la información de la unidad residencial de un usuario específico.
    Compatible con AsyncSession.
    
    Args:
        user_id: ID del usuario a consultar
        usuario_id_or_username: ID o username del usuario actual
        db: AsyncSession de SQLAlchemy
    
    Returns:
        - Información completa de la unidad residencial
    """
    try:
        # Obtener el ID del usuario actual
        value = usuario_id_or_username.strip() if isinstance(usuario_id_or_username, str) else usuario_id_or_username
        
        try:
            current_user_id = int(value)
        except ValueError:
            # Es un username, buscar el ID (sintaxis async)
            stmt = select(UserModel).where(UserModel.str_username == value)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Usuario actual no encontrado: {value}"
                )
            
            current_user_id = user.id
        
        # Verificar permisos (solo puede ver su propia información)
        is_same_user = current_user_id == user_id
        
        if not is_same_user:
            # Aquí puedes agregar lógica de super admin si es necesario
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para ver esta información"
            )
        
        # Buscar la unidad residencial (sintaxis async)
        stmt = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_user_id == user_id
        )
        result = await db.execute(stmt)
        user_residential_unit = result.scalar_one_or_none()
        
        if not user_residential_unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no asociado a ninguna unidad residencial"
            )
        
        # Preparar respuesta
        response_data = UserResidentialUnitResponse(
            residential_unit_id=user_residential_unit.int_residential_unit_id,
            user_id=user_residential_unit.int_user_id,
            apartment_number=user_residential_unit.str_apartment_number,
            is_admin=user_residential_unit.bool_is_admin,
            voting_weight=float(user_residential_unit.dec_default_voting_weight or 0),
            created_at=user_residential_unit.dat_created_at,
            updated_at=user_residential_unit.dat_updated_at
        )
        
        return {
            "success": True,
            "data": response_data.model_dump()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener unidad residencial: {str(e)}"
        )

@router.get(
    "/me/complete-data",
    response_model=SuccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener datos completos del usuario actual",
    description="Obtiene información completa del copropietario incluyendo unidad residencial y coeficiente"
)
async def get_current_user_complete_data(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene datos completos del usuario actual incluyendo:
    - Información personal (nombre, email, teléfono)
    - Información de la unidad residencial
    - Coeficiente de propiedad
    - Rol del usuario
    """
    try:
        
        # Obtener usuario actual
        user_service = UserService(db)
        user = await user_service.get_user_by_username(current_user)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Obtener datos del usuario (DataUser)
        stmt = select(DataUserModel).where(DataUserModel.id == user.int_data_user_id)
        result = await db.execute(stmt)
        data_user = result.scalar_one_or_none()
        
        # Obtener rol del usuario
        stmt_rol = select(RolModel).where(RolModel.id == user.int_id_rol)
        result_rol = await db.execute(stmt_rol)
        rol = result_rol.scalar_one_or_none()
        
        # Obtener unidad residencial asociada
        stmt_unit = select(UserResidentialUnitModel).where(
            UserResidentialUnitModel.int_user_id == user.id
        )
        result_unit = await db.execute(stmt_unit)
        user_unit = result_unit.scalar_one_or_none()
        
        residential_unit_data = None
        coefficient = None
        apartment_number = None
        
        if user_unit:
            coefficient = float(user_unit.dec_default_voting_weight) if user_unit.dec_default_voting_weight else None
            apartment_number = user_unit.str_apartment_number
            
            # Obtener datos completos de la unidad residencial
            stmt_residential = select(ResidentialUnitModel).where(
                ResidentialUnitModel.id == user_unit.int_residential_unit_id
            )
            result_residential = await db.execute(stmt_residential)
            residential_unit = result_residential.scalar_one_or_none()
            
            if residential_unit:
                residential_unit_data = {
                    "id": residential_unit.id,
                    "str_name": residential_unit.str_name,
                    "str_address": residential_unit.str_address,
                    "str_city": residential_unit.str_city,
                    "str_state": residential_unit.str_state,
                    # ELIMINADOS str_country y str_postal_code que no existen
                }
        
        # Construir respuesta
        response_data = {
            "id": user.id,
            "username": user.str_username,
            "email": data_user.str_email if data_user else None,
            "firstname": data_user.str_firstname if data_user else None,
            "lastname": data_user.str_lastname if data_user else None,
            "phone": data_user.str_phone if data_user else None,
            "role": rol.str_name if rol else None,
            "role_id": user.int_id_rol,
            "apartment_number": apartment_number,
            "coefficient": coefficient,
            "residential_unit": residential_unit_data,
            "is_external_delegate": user.bln_is_external_delegate,
            "allow_entry": user.bln_allow_entry
        }
        
        return SuccessResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Datos del usuario obtenidos exitosamente",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener datos del usuario: {str(e)}"
        )