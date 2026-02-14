from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class MeetingModel(Base):
    """
    Modelo de reuniones/asambleas.
    
    Gestiona toda la información de las reuniones incluyendo:
    - Información básica (título, descripción, fecha)
    - Integración con Zoom
    - Control de quorum
    - Delegación de poderes (a través de delegation_history)
    """
    
    __tablename__ = "tbl_meetings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_id_residential_unit = Column(
        Integer, 
        ForeignKey("tbl_residential_units.id", ondelete="CASCADE", onupdate="CASCADE"), 
        nullable=False
    )
    str_meeting_code = Column(String(50), index=True, nullable=False)
    str_title = Column(String(200), index=True, nullable=False)
    str_description = Column(String(1000), nullable=True)
    str_meeting_type = Column(String(50), index=True, nullable=False)
    dat_schedule_date = Column(DateTime, nullable=False)
    int_estimated_duration = Column(Integer, nullable=False, default=0)  # 0 = duración indefinida
    int_organizer_id = Column(
        Integer, 
        ForeignKey("tbl_users.id", ondelete="SET NULL", onupdate="CASCADE"), 
        nullable=True
    )
    int_meeting_leader_id = Column(Integer, nullable=False)
    int_zoom_meeting_id = Column(BigInteger, nullable=True)  # Se completa al crear en Zoom
    str_zoom_join_url = Column(String(500), nullable=True)  # Se completa al crear en Zoom
    str_zoom_start_url = Column(String(500), nullable=True)  # Se completa al crear en Zoom
    str_zoom_password = Column(String(50), nullable=True)
    int_zoom_account_id = Column(Integer, nullable=True)  # ID de la cuenta Zoom usada (1-3)
    bln_allow_delegates = Column(Boolean, default=True)
    str_status = Column(String(50), index=True, nullable=False, default="Programada")
    bln_quorum_reached = Column(Boolean, default=False)
    int_total_invitated = Column(Integer, nullable=False, default=0)
    int_total_confirmed = Column(Integer, nullable=False, default=0)
    dat_actual_start_time = Column(DateTime, nullable=True)
    dat_actual_end_time = Column(DateTime, nullable=True)

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
    residential_unit = relationship("ResidentialUnitModel", back_populates="meetings")
    polls = relationship("PollModel", back_populates="meeting", cascade="all, delete-orphan")
    invitations = relationship("MeetingInvitationModel", back_populates="meeting", cascade="all, delete-orphan")
    attendances = relationship("MeetingAttendanceModel", back_populates="meeting", cascade="all, delete-orphan")
    delegation_history = relationship(
        "DelegationHistoryModel", 
        back_populates="meeting", 
        cascade="all, delete-orphan",
        doc="Histórico completo de todas las delegaciones de poder realizadas en esta reunión"
    )

    def __repr__(self):
        return (
            f"<Meeting(id={self.id}, "
            f"code={self.str_meeting_code}, "
            f"title={self.str_title}, "
            f"status={self.str_status})>"
        )