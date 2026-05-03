from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base  
from app.utils.timezone_utils import colombia_now

class SystemConfigModel(Base):
    """
    Modelo para configuración del sistema
    Almacena configuraciones sensibles de forma encriptada
    """
    __tablename__ = "tbl_system_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    str_config_key = Column(String(100), unique=True, nullable=False, index=True)
    str_config_value = Column(Text, nullable=False)
    bln_is_encrypted = Column(Boolean, default=False, nullable=False)
    str_description = Column(String(500), nullable=True)
    bln_is_active = Column(Boolean, default=True, nullable=False)

    # Auditoría
    created_at = Column(DateTime, default=colombia_now, nullable=False)
    updated_at = Column(DateTime, default=colombia_now, onupdate=colombia_now, nullable=False)
    updated_by = Column(
        Integer,
        ForeignKey("tbl_users.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True
    )

    # Relationships
    updater = relationship("UserModel", foreign_keys=[updated_by], lazy="selectin")

    def __repr__(self):
        return f"<SystemConfig(key='{self.str_config_key}', encrypted={self.bln_is_encrypted})>"
