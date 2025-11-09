from fastapi import APIRouter

from app.api.v1.endpoints import auth_endpoint
from app.api.v1.endpoints import administrator
from app.api.v1.endpoints import poll_endpoint 

api_router = APIRouter()

api_router.include_router(
    auth_endpoint.router, 
    prefix="/auth", 
    tags=["auth"]
)

api_router.include_router(
    administrator.router,
    prefix="/meeting-invitations",
    tags=["Meeting Invitations"]
)

# ← AGREGAR ESTO
api_router.include_router(
    poll_endpoint.router,
    prefix="/polls",
    tags=["Polls"]
)