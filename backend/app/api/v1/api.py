from fastapi import APIRouter, Depends

from app.api.v1.endpoints import auth_endpoint
from app.api.v1.endpoints import administrator
from app.api.v1.endpoints import residential_enpoint
from app.api.v1.endpoints import meeting_endpoint
from app.api.v1.endpoints import zoom_endpoint
from app.api.v1.endpoints import poll_endpoint
from app.api.v1.endpoints import super_admin
from app.api.v1.endpoints import user_endpoint
from app.api.v1.endpoints import zoom_signature_endpoint
from app.api.v1.endpoints import simple_auto_login_endpoint
from app.api.v1.endpoints import admin_coowners
from app.auth.auth import get_current_user
from app.api.v1.endpoints import guest_endpoint 
from app.api.v1.endpoints import qr_endpoint 

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
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    residential_enpoint.router,
    prefix="/residential",
    tags=["Residential"],
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    meeting_endpoint.router,
    prefix="/meetings",
    tags=["meetings"],
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    zoom_endpoint.router,
    prefix="/zoom",
    tags=["Zoom SDK"],
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    poll_endpoint.router,
    prefix="/polls",
    tags=["Polls"],
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    super_admin.router,
    prefix="/super-admin",
    tags=["Super Admin"],
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    user_endpoint.router,
    prefix="/user",
    tags=["co-propietario"],
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    zoom_signature_endpoint.router,
    tags=["zoom"]
)

api_router.include_router(
    simple_auto_login_endpoint.router,
    prefix="/auth",
    tags=["authentication"]
)

api_router.include_router(
    admin_coowners.router,
    prefix="/admin/coowners"
)

api_router.include_router(
    guest_endpoint.router,
    prefix="/guest",
    tags=["Guests"],
    dependencies=[Depends(get_current_user)]
)

api_router.include_router(
    qr_endpoint.router,
    prefix="/residents",
    tags=["QR Codes"],
    dependencies=[Depends(get_current_user)]
)