#Archivo para las rutas de autenticación

from fastapi import APIRouter

router = APIRouter()

@router.post("/login")
def login(request: LoginRequest):
    return {"message": "Login successful"}