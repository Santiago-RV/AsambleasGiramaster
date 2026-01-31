from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, DECIMAL
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class MeetingInvitationModel(Base):
    """
    Modelo de invitaciones a reuniones con soporte para delegación de poderes.
    
    Campos importantes para delegación:
    - dec_quorum_base: Peso/quorum ORIGINAL del usuario (NUNCA cambia)
    - dec_voting_weight: Peso/quorum ACTUAL en la reunión (cambia con delegaciones)
    - int_delegated_id: Si tiene valor, indica que este usuario delegó su poder
    
    Lógica de delegación:
    - Al crear invitación: dec_quorum_base = dec_voting_weight (mismo valor inicial)
    - Al delegar poder: dec_voting_weight = 0, dec_quorum_base se mantiene
    - Al recibir poder: dec_voting_weight aumenta, dec_quorum_base se mantiene
    - Al revocar: dec_voting_weight vuelve a dec_quorum_base
    """
    
    __tablename__ = "tbl_meeting_invitations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(
        Integer, 
        ForeignKey("tbl_meetings.id", ondelete="CASCADE", onupdate="CASCADE"), 
        nullable=False
    )
    int_user_id = Column(
        Integer, 
        ForeignKey("tbl_users.id", ondelete="CASCADE", onupdate="CASCADE"), 
        nullable=False
    )
    
    # === CAMPOS DE PESO/QUORUM ===
    dec_voting_weight = Column(
        DECIMAL(10, 6),
        nullable=False,
        comment="Peso de votación ACTUAL (cambia con delegaciones)"
    )
    dec_quorum_base = Column(
        DECIMAL(10, 6),
        nullable=False,
        comment="Quorum base/original del usuario (NUNCA cambia, es el peso sin delegaciones)"
    )
    
    # === INFORMACIÓN DE LA INVITACIÓN ===
    str_apartment_number = Column(String(20), nullable=False)
    str_invitation_status = Column(String(50), index=True, nullable=False)
    str_response_status = Column(String(50), index=True, nullable=False)
    dat_sent_at = Column(DateTime, nullable=False)
    dat_responded_at = Column(DateTime, nullable=True)
    dat_reminder_sent_at = Column(DateTime, nullable=True)
    int_delivery_attemps = Column(Integer, nullable=False)
    str_last_delivery_error = Column(String(500), nullable=True)
    bln_will_attend = Column(Boolean, default=False)
    
    # === DELEGACIÓN ===
    int_delegated_id = Column(
        Integer, 
        ForeignKey("tbl_users.id", ondelete="SET NULL", onupdate="CASCADE"), 
        nullable=True, 
        index=True,
        comment="ID del usuario al que se delegó el poder (NULL si no delegó)"
    )
    
    # === ASISTENCIA ===
    bln_actually_attended = Column(Boolean, default=False)
    dat_joined_at = Column(DateTime, nullable=True)
    dat_left_at = Column(DateTime, nullable=True)

    # === AUDITORÍA ===
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    created_by = Column(
        Integer, 
        ForeignKey("tbl_users.id", ondelete="SET NULL", onupdate="CASCADE"), 
        nullable=True
    )
    updated_by = Column(
        Integer, 
        ForeignKey("tbl_users.id", ondelete="SET NULL", onupdate="CASCADE"), 
        nullable=True
    )

    # === RELACIONES ===
    meeting = relationship("MeetingModel", back_populates="invitations")
    user = relationship("UserModel", foreign_keys=[int_user_id], back_populates="meeting_invitations")
    delegated_user = relationship("UserModel", foreign_keys=[int_delegated_id])

    def __repr__(self):
        return (
            f"<MeetingInvitation(id={self.id}, "
            f"meeting_id={self.int_meeting_id}, "
            f"user_id={self.int_user_id}, "
            f"quorum_base={self.dec_quorum_base}, "
            f"voting_weight={self.dec_voting_weight}, "
            f"delegated_to={self.int_delegated_id})>"
        )