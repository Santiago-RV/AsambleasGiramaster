from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class DelegationStatusEnum(str, enum.Enum):
    """Estados posibles de una delegación"""
    ACTIVE = "active"      # Delegación activa
    REVOKED = "revoked"    # Delegación revocada


class DelegationHistoryModel(Base):
    """
    Modelo para el histórico de delegaciones de poder de votación.
    
    Registra cada vez que un copropietario cede su poder a otro durante una reunión,
    permitiendo generar reportes y mantener trazabilidad completa.
    
    Campos clave:
    - int_delegator_user_id: Usuario que CEDE su poder (origen)
    - int_delegate_user_id: Usuario que RECIBE el poder (destino)
    - dec_delegated_weight: Cantidad de quorum cedido (quorum base del delegador)
    - str_status: Estado actual (active/revoked)
    - dat_delegated_at: Momento en que se cedió el poder
    - dat_revoked_at: Momento en que se revocó (NULL si sigue activa)
    """
    
    __tablename__ = "delegation_history"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign Keys
    int_meeting_id = Column(
        Integer, 
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID de la reunión donde se realizó la delegación"
    )
    
    int_delegator_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID del usuario que CEDE su poder (origen)"
    )
    
    int_delegate_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="ID del usuario que RECIBE el poder (destino)"
    )

    # Datos de la delegación
    dec_delegated_weight = Column(
        DECIMAL(10, 6),
        nullable=False,
        comment="Cantidad de quorum cedido (quorum base del delegador en ese momento)"
    )
    
    str_status = Column(
        Enum(DelegationStatusEnum),
        nullable=False,
        default=DelegationStatusEnum.ACTIVE,
        index=True,
        comment="Estado de la delegación: active (activa) o revoked (revocada)"
    )

    # Timestamps de delegación
    dat_delegated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.now,
        comment="Fecha y hora en que se cedió el poder"
    )
    
    dat_revoked_at = Column(
        DateTime,
        nullable=True,
        comment="Fecha y hora en que se revocó la delegación (NULL si sigue activa)"
    )

    # Auditoría
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    meeting = relationship("MeetingModel", back_populates="delegation_history")
    delegator = relationship(
        "UserModel",
        foreign_keys=[int_delegator_user_id],
        backref="delegations_given"
    )
    delegate = relationship(
        "UserModel",
        foreign_keys=[int_delegate_user_id],
        backref="delegations_received"
    )

    # === ÍNDICES COMPUESTOS PARA OPTIMIZACIÓN ===
    __table_args__ = (
        # Índice para buscar delegaciones de un delegador específico en una reunión
        Index('idx_meeting_delegator', 'int_meeting_id', 'int_delegator_user_id'),
        
        # Índice para buscar delegaciones recibidas por un delegado en una reunión
        Index('idx_meeting_delegate', 'int_meeting_id', 'int_delegate_user_id'),
        
        # Índice para buscar delegaciones activas/revocadas en una reunión
        Index('idx_meeting_status', 'int_meeting_id', 'str_status'),
        
        # Índice para buscar todas las delegaciones activas de una reunión (consulta MÁS frecuente)
        Index('idx_meeting_active', 'int_meeting_id', 'str_status', 'dat_delegated_at'),
    )

    def __repr__(self):
        return (
            f"<DelegationHistory(id={self.id}, "
            f"meeting_id={self.int_meeting_id}, "
            f"delegator={self.int_delegator_user_id}, "
            f"delegate={self.int_delegate_user_id}, "
            f"weight={self.dec_delegated_weight}, "
            f"status={self.str_status})>"
        )