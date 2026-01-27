import re
import html
from typing import Any, Dict, List, Union
from bleach import clean
from markupsafe import escape

class InputSanitizer:
    """
    Clase para sanitizar y validar inputs del usuario
    """
    
    # Patrones de detección maliciosa
    MALICIOUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # XSS - Scripts
        r'javascript\s*:',              # XSS - Protocolos javascript
        r'on\w+\s*=',                  # XSS - Event handlers
        r'(expression|import|bind)\s*\(', # CSS Injection
        r'(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+', # SQL Injection
        r'--|#|\/\*|\*\/',             # SQL Comments
        r'(\bOR\b|\bAND\b)\s+\w+\s*=', # SQL Injection básico
        r'<iframe[^>]*>',               # Clickjacking
        r'<object[^>]*>',               # Object injection
        r'<embed[^>]*>',                # Embed injection
        r'<form[^>]*>',                 # Form injection
        r'<meta[^>]*>',                 # Meta injection
    ]
    
    # Caracteres permitidos por tipo de dato
    ALLOWED_PATTERNS = {
        'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        'phone': r'^[\+]?[0-9\s\-\(\)]{7,20}$',
        'username': r'^[a-zA-Z0-9_]{3,50}$',
        'apartment': r'^[a-zA-Z0-9\-#]{1,10}$',
        'name': r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]{1,100}$',
        'alphanumeric': r'^[a-zA-Z0-9\s]*$',
        'numeric': r'^[0-9.]*$',
        'text': r'^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.,\?!()¡¿":;]{1,500}$'
    }
    
    @classmethod
    def sanitize_string(cls, input_value: str, input_type: str = 'text') -> str:
        """
        Sanitiza un string según el tipo de input
        
        Args:
            input_value: String a sanitizar
            input_type: Tipo de dato (email, phone, username, etc.)
            
        Returns:
            String sanitizado
            
        Raises:
            ValueError: Si el input contiene contenido malicioso o no cumple el formato
        """
        if not input_value:
            return ""
        
        if not isinstance(input_value, str):
            input_value = str(input_value)
        
        # 1. Detectar patrones maliciosos
        if cls._contains_malicious_content(input_value):
            raise ValueError("Input contains potentially malicious content")
        
        # 2. Validar formato específico
        if input_type in cls.ALLOWED_PATTERNS:
            pattern = cls.ALLOWED_PATTERNS[input_type]
            if not re.match(pattern, input_value, re.IGNORECASE):
                raise ValueError(f"Input does not match required format for {input_type}")
        
        # 3. Sanitizar HTML/Scripts
        sanitized = clean(
            input_value,
            tags=[],  # No permitir ningún tag HTML
            attributes={},  # No permitir ningún atributo
            strip=True,
            strip_comments=True
        )
        
        # 4. Escape adicional
        sanitized = escape(sanitized)
        
        # 5. Validar longitud máxima
        max_lengths = {
            'email': 255,
            'phone': 20,
            'username': 50,
            'apartment': 10,
            'name': 100,
            'text': 500,
            'alphanumeric': 200,
            'numeric': 50
        }
        
        max_len = max_lengths.get(input_type, 500)
        if len(sanitized) > max_len:
            raise ValueError(f"Input exceeds maximum length of {max_len} characters")
        
        return sanitized.strip()
    
    @classmethod
    def sanitize_number(cls, input_value: Any, min_val: float = None, max_val: float = None) -> float:
        """
        Sanitiza y valida un número
        
        Args:
            input_value: Valor a sanitizar
            min_val: Valor mínimo permitido
            max_val: Valor máximo permitido
            
        Returns:
            Número validado
            
        Raises:
            ValueError: Si no es un número válido o está fuera de rango
        """
        try:
            # Intentar convertir a número
            if isinstance(input_value, str):
                # Limpiar el string
                input_value = input_value.strip()
                if not input_value:
                    raise ValueError("Empty string cannot be converted to number")
            
            num = float(input_value)
            
            # Validar rangos
            if min_val is not None and num < min_val:
                raise ValueError(f"Value {num} is below minimum {min_val}")
            
            if max_val is not None and num > max_val:
                raise ValueError(f"Value {num} is above maximum {max_val}")
            
            return num
            
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid number format: {str(e)}")
    
    @classmethod
    def sanitize_email(cls, email: str) -> str:
        """
        Sanitiza un email con validación estricta
        
        Args:
            email: Email a sanitizar
            
        Returns:
            Email sanitizado en minúsculas
            
        Raises:
            ValueError: Si el email no es válido
        """
        if not email:
            raise ValueError("Email cannot be empty")
        
        # Convertir a minúsculas y sanitizar
        sanitized = cls.sanitize_string(email.lower().strip(), 'email')
        
        # Validaciones adicionales de email
        if email.count('@') != 1:
            raise ValueError("Email must contain exactly one @ symbol")
        
        local, domain = sanitized.split('@')
        
        if len(local) == 0 or len(domain) == 0:
            raise ValueError("Email local and domain parts cannot be empty")
        
        if len(domain) > 255:
            raise ValueError("Email domain part is too long")
        
        # No permitir emails con secuencias sospechosas
        suspicious_patterns = ['..', '.@', '@.', 'test@', 'admin@', 'root@']
        for pattern in suspicious_patterns:
            if pattern in sanitized:
                raise ValueError(f"Email contains suspicious pattern: {pattern}")
        
        return sanitized
    
    @classmethod
    def sanitize_phone(cls, phone: str) -> str:
        """
        Sanitiza un número de teléfono
        
        Args:
            phone: Teléfono a sanitizar
            
        Returns:
            Teléfono sanitizado
        """
        if not phone:
            return ""
        
        # Remover caracteres no permitidos y sanitizar
        cleaned = re.sub(r'[^\+0-9\s\-\(\)]', '', str(phone))
        sanitized = cls.sanitize_string(cleaned.strip(), 'phone')
        
        return sanitized
    
    @classmethod
    def _contains_malicious_content(cls, input_value: str) -> bool:
        """
        Verifica si el input contiene contenido malicioso
        
        Args:
            input_value: String a verificar
            
        Returns:
            True si detecta contenido malicioso
        """
        # Convertir a minúsculas para detección case-insensitive
        lowered = input_value.lower()
        
        # Verificar patrones maliciosos
        for pattern in cls.MALICIOUS_PATTERNS:
            if re.search(pattern, lowered, re.IGNORECASE | re.MULTILINE | re.DOTALL):
                return True
        
        return False
    
    @classmethod
    def sanitize_dict(cls, data: Dict[str, Any], schema: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Sanitiza un diccionario completo
        
        Args:
            data: Diccionario a sanitizar
            schema: Esquema con tipos de datos para cada clave
            
        Returns:
            Diccionario sanitizado
        """
        if not isinstance(data, dict):
            raise ValueError("Input must be a dictionary")
        
        sanitized = {}
        
        for key, value in data.items():
            # Ignorar claves que empiezan con _ (sistema)
            if key.startswith('_'):
                continue
            
            # Determinar tipo de sanitización
            input_type = 'text'
            if schema and key in schema:
                input_type = schema[key]
            
            try:
                # Sanitizar según tipo
                if input_type == 'email':
                    sanitized[key] = cls.sanitize_email(str(value))
                elif input_type == 'phone':
                    sanitized[key] = cls.sanitize_phone(str(value))
                elif input_type == 'numeric':
                    sanitized[key] = cls.sanitize_number(value)
                elif input_type in ['number', 'float']:
                    sanitized[key] = cls.sanitize_number(value, 0, 999999.99)
                elif input_type == 'integer':
                    sanitized[key] = int(cls.sanitize_number(value, 0, 999999))
                else:
                    sanitized[key] = cls.sanitize_string(str(value), input_type)
                    
            except (ValueError, TypeError) as e:
                raise ValueError(f"Error sanitizing field '{key}': {str(e)}")
        
        return sanitized

# Instancia global
input_sanitizer = InputSanitizer()