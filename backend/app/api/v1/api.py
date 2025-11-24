from fastapi import APIRouter

from app.api.v1.endpoints import auth_endpoint
from app.api.v1.endpoints import administrator
from app.api.v1.endpoints import residential_enpoint
from app.api.v1.endpoints import meeting_endpoint
from app.api.v1.endpoints import zoom_endpoint
from app.api.v1.endpoints import poll_endpoint 
from app.api.v1.endpoints import super_admin 

api_router = APIRouter()

api_router.include_router(
    auth_endpoint.router, 
    prefix="/auth", 
    tags=["auth"]
)

api_router.include_router(
    administrator.router,
    prefix="/meeting-invitations",
    tags=["Meeting Invitations"],
    # dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    residential_enpoint.router,
    prefix="/residential",
    tags=["Residential"],
    # dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    meeting_endpoint.router,
    prefix="/meetings",
    tags=["meetings"],
    # dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    zoom_endpoint.router,
    prefix="/zoom",
    tags=["Zoom SDK"]
)

# ← AGREGAR ESTO
api_router.include_router(
    poll_endpoint.router,
    prefix="/polls",
    tags=["Polls"]
)

api_router.include_router(
    super_admin.router,
    prefix="/super-admin",
    tags=["Super Admin"]
)