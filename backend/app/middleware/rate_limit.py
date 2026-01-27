from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.security import rate_limiter
import time

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware para rate limiting mejorado
    """
    
    async def dispatch(self, request: Request, call_next):
        # Obtener IP del cliente
        client_ip = self._get_client_ip(request)
        
        # Crear key para rate limiting
        path = request.url.path
        method = request.method
        
        # Obtener límites específicos para el endpoint
        limits = rate_limiter.get_limits_for_endpoint(f"{method} {path}")
        
        # Keys específicas por tipo de endpoint
        if "/auth/" in path:
            rate_key = f"auth_{client_ip}"
        elif "/qr/" in path or "generate-auto-login" in path:
            rate_key = f"qr_{client_ip}"
        else:
            rate_key = f"general_{client_ip}"
        
        # Verificar rate limiting
        is_allowed, info = rate_limiter.is_allowed(
            key=rate_key,
            max_requests=limits["max_requests"],
            window_minutes=limits["window_minutes"]
        )
        
        if not is_allowed:
            # Retornar error 429 Too Many Requests
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests",
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Rate limit exceeded. Try again in {limits['window_minutes']} minutes.",
                    "retry_after": limits["window_minutes"] * 60,
                    "limit_info": info
                },
                headers={
                    "X-RateLimit-Limit": str(limits["max_requests"]),
                    "X-RateLimit-Remaining": str(info["remaining_requests"]),
                    "X-RateLimit-Reset": str(info["reset_time"]),
                    "Retry-After": str(limits["window_minutes"] * 60)
                }
            )
        
        # Agregar headers informativos de rate limiting
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limits["max_requests"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining_requests"])
        response.headers["X-RateLimit-Reset"] = str(info["reset_time"])
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Obtiene la IP real del cliente, considerando proxies
        """
        # Intentar obtener de headers comunes de proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        real_ip = request.headers.get("X-Real-IP")
        
        if forwarded_for:
            # X-Forwarded-For puede tener múltiples IPs, tomar la primera
            return forwarded_for.split(",")[0].strip()
        elif real_ip:
            return real_ip.strip()
        else:
            # Fallback a la conexión remota
            return request.client.host if request.client else "unknown"