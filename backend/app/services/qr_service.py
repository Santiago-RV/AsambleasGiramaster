"""
Servicio mejorado para generación de códigos QR personalizados por usuario.
Utiliza qrcode para generación local de QR con más opciones de personalización.
"""
import qrcode
import qrcode.constants
from io import BytesIO
import base64
from typing import Optional, Dict, Tuple
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import logging
from datetime import datetime

from app.core.config import settings
from app.services.simple_auto_login_service import simple_auto_login_service

logger = logging.getLogger(__name__)


class QRCodeService:
    """
    Servicio para generar códigos QR personalizados con información del usuario
    """
    
    def __init__(self):
        self.qr_codes_dir = Path(__file__).parent.parent / "static" / "qr_codes"
        self.qr_codes_dir.mkdir(parents=True, exist_ok=True)
        self.logo_path = Path(__file__).parent.parent / "static" / "logo.png"
        
    def generate_qr_with_user_info(
        self,
        auto_login_url: str,
        user_info: Dict,
        size: int = 300,
        include_logo: bool = True,
        include_text: bool = True
    ) -> str:
        """
        Genera un código QR personalizado con información del usuario
        
        Args:
            auto_login_url: URL de auto-login para el QR
            user_info: Diccionario con información del usuario
            size: Tamaño del QR en píxeles
            include_logo: Si se debe incluir el logo
            include_text: Si se debe incluir información de texto
            
        Returns:
            str: Imagen QR en formato base64
        """
        try:
            # Configuración avanzada del QR
            qr = qrcode.QRCode(
                version=1,  # Controla el tamaño del QR (1-40)
                error_correction=qrcode.constants.ERROR_CORRECT_H,  # Alta corrección de errores
                box_size=10,  # Tamaño de cada caja
                border=4,  # Borde del QR
            )
            
            # Agregar la URL al QR
            qr.add_data(auto_login_url)
            qr.make(fit=True)
            
            # Crear imagen QR
            qr_img = qr.make_image(fill_color="#1a365d", back_color="white")
            qr_img = qr_img.convert('RGBA')
            
            # Redimensionar al tamaño solicitado
            qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)
            
            # Si se incluye logo, agregarlo en el centro
            if include_logo and self.logo_path.exists():
                try:
                    logo = Image.open(self.logo_path)
                    logo_size = size // 5  # Logo del 20% del tamaño del QR
                    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                    
                    # Calcular posición para centrar el logo
                    pos = ((size - logo_size) // 2, (size - logo_size) // 2)
                    
                    # Crear una máscara circular para el logo
                    mask = Image.new('L', (logo_size, logo_size), 0)
                    draw = ImageDraw.Draw(mask)
                    draw.ellipse([(0, 0), (logo_size, logo_size)], fill=255)
                    
                    # Pegar el logo con transparencia
                    qr_img.paste(logo, pos, mask)
                    
                except Exception as e:
                    logger.warning(f"No se pudo agregar el logo al QR: {e}")
            
            # Si se incluye texto, agregar información del usuario
            if include_text:
                # Crear imagen final con espacio para texto
                final_height = size + 80  # Espacio extra para texto
                final_img = Image.new('RGB', (size, final_height), 'white')
                final_img.paste(qr_img, (0, 0))
                
                # Agregar texto
                draw = ImageDraw.Draw(final_img)
                
                # Información del usuario
                name = user_info.get('name', 'Usuario')
                apartment = user_info.get('apartment', 'N/A')
                residential_unit = user_info.get('residential_unit', 'N/A')
                
                # Intentar usar una fuente personalizada, si no usar fuente por defecto
                try:
                    font_path = Path(__file__).parent.parent / "static" / "fonts" / "Arial.ttf"
                    if font_path.exists():
                        font = ImageFont.truetype(font_path, 14)
                        font_bold = ImageFont.truetype(font_path, 16)
                    else:
                        font = ImageFont.load_default()
                        font_bold = ImageFont.load_default()
                except:
                    font = ImageFont.load_default()
                    font_bold = ImageFont.load_default()
                
                # Texto centrado
                text_y = size + 10
                
                # Nombre
                name_text = f"{name}"
                name_bbox = draw.textbbox((0, 0), name_text, font=font_bold)
                name_width = name_bbox[2] - name_bbox[0]
                draw.text(((size - name_width) // 2, text_y), name_text, fill="#1a365d", font=font_bold)
                
                # Apartamento y unidad
                text_y += 25
                apt_text = f"Apto: {apartment} | {residential_unit}"
                apt_bbox = draw.textbbox((0, 0), apt_text, font=font)
                apt_width = apt_bbox[2] - apt_bbox[0]
                draw.text(((size - apt_width) // 2, text_y), apt_text, fill="#4a5568", font=font)
                
                # Fecha de generación
                text_y += 20
                date_text = f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
                date_bbox = draw.textbbox((0, 0), date_text, font=font)
                date_width = date_bbox[2] - date_bbox[0]
                draw.text(((size - date_width) // 2, text_y), date_text, fill="#718096", font=font)
                
                qr_img = final_img
            
            # Convertir a base64
            buffer = BytesIO()
            qr_img.save(buffer, format='PNG', optimize=True)
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            logger.info(f"✅ QR generado para usuario: {user_info.get('name', 'Unknown')}")
            
            return f"data:image/png;base64,{qr_base64}"
            
        except Exception as e:
            logger.error(f"❌ Error al generar QR personalizado: {e}")
            # Fallback a QR simple
            return self._generate_simple_qr(auto_login_url)
    
    def _generate_simple_qr(self, url: str, size: int = 300) -> str:
        """
        Genera un QR simple como fallback
        
        Args:
            url: URL para el QR
            size: Tamaño del QR
            
        Returns:
            str: Imagen QR en formato base64
        """
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=4,
            )
            
            qr.add_data(url)
            qr.make(fit=True)
            
            qr_img = qr.make_image(fill_color="#1a365d", back_color="white")
            qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)
            
            buffer = BytesIO()
            qr_img.save(buffer, format='PNG', optimize=True)
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{qr_base64}"
            
        except Exception as e:
            logger.error(f"❌ Error al generar QR simple: {e}")
            raise
    
    def generate_user_qr_data(
        self,
        user_id: int,
        username: str,
        password: str,
        user_info: Dict,
        expiration_hours: int = 48
    ) -> Dict[str, str]:
        """
        Genera todos los datos necesarios para el QR de un usuario
        
        Args:
            user_id: ID del usuario
            username: Nombre de usuario
            password: Contraseña temporal
            user_info: Información adicional del usuario
            expiration_hours: Horas de expiración
            
        Returns:
            Dict con token, URL y QR en base64
        """
        try:
            # Generar token de auto-login
            auto_login_token = simple_auto_login_service.generate_auto_login_token(
                username=username,
                password=password,
                expiration_hours=expiration_hours
            )
            
            # Construir URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://asambleas.giramaster.com')
            auto_login_url = f"{frontend_url}/auto-login/{auto_login_token}"
            
            # Generar QR con información del usuario
            qr_base64 = self.generate_qr_with_user_info(
                auto_login_url=auto_login_url,
                user_info=user_info,
                size=400,
                include_logo=True,
                include_text=True
            )
            
            # Guardar QR en archivo (opcional)
            qr_filename = f"qr_user_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            qr_filepath = self.qr_codes_dir / qr_filename
            
            # Decodificar base64 y guardar
            qr_data = base64.b64decode(qr_base64.split(',')[1])
            with open(qr_filepath, 'wb') as f:
                f.write(qr_data)
            
            logger.info(f"📱 QR guardado en: {qr_filepath}")
            
            return {
                "auto_login_token": auto_login_token,
                "auto_login_url": auto_login_url,
                "qr_base64": qr_base64,
                "qr_filename": qr_filename,
                "expires_in_hours": expiration_hours
            }
            
        except Exception as e:
            logger.error(f"❌ Error al generar datos de QR: {e}")
            raise
    
    def generate_bulk_qr_codes(
        self,
        users_data: list,
        expiration_hours: int = 48
    ) -> list:
        """
        Genera códigos QR para múltiples usuarios
        
        Args:
            users_data: Lista de diccionarios con información de usuarios
            expiration_hours: Horas de expiración
            
        Returns:
            List de diccionarios con QR data para cada usuario
        """
        qr_results = []
        
        for user_data in users_data:
            try:
                user_id = user_data.get('user_id')
                username = user_data.get('username')
                password = user_data.get('password')
                
                if not all([user_id, username, password]):
                    logger.warning(f"Datos incompletos para usuario ID {user_id}")
                    continue
                
                # Información para personalización del QR
                qr_user_info = {
                    'name': f"{user_data.get('firstname', '')} {user_data.get('lastname', '')}".strip(),
                    'apartment': user_data.get('apartment_number', 'N/A'),
                    'residential_unit': user_data.get('residential_unit_name', 'N/A'),
                    'email': user_data.get('email', ''),
                    'role': user_data.get('role', 'Resident')
                }
                
                qr_data = self.generate_user_qr_data(
                    user_id=user_id,
                    username=username,
                    password=password,
                    user_info=qr_user_info,
                    expiration_hours=expiration_hours
                )
                
                qr_results.append({
                    'user_id': user_id,
                    'user_info': qr_user_info,
                    'qr_data': qr_data
                })
                
                logger.info(f"✅ QR generado para usuario {user_id}: {qr_user_info['name']}")
                
            except Exception as e:
                logger.error(f"❌ Error generando QR para usuario {user_data.get('user_id', 'Unknown')}: {e}")
                qr_results.append({
                    'user_id': user_data.get('user_id'),
                    'error': str(e)
                })
        
        return qr_results


# Instancia global del servicio
qr_service = QRCodeService()