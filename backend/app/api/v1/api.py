from fastapi import APIRouter, Depends

from app.api.v1.endpoints import auth_endpoint
from app.api.v1.endpoints import administrator

api_router = APIRouter()

api_router.include_router(
  auth_endpoint.router, 
  prefix="/auth", 
  tags=["auth"])

api_router.include_router(
    administrator.router,
    prefix="/meeting-invitations",
    tags=["Meeting Invitations"]
)