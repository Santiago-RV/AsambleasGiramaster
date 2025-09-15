from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class MeetingModel(Base):
    __tablename__ = "tbl_meetings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_id_residential_unit = Column(Integer, ForeignKey("tbl_residential_units.id"), nullable=False)
    str_meeting_code = Column(String, index=True, nullable=False)
    str_title = Column(String, index=True, nullable=False)
    str_description = Column(String, nullable=True)
    str_meeting_type = Column(String, index=True, nullable=False)
    dat_schedule_date = Column(DateTime, nullable=False)
    int_estimated_duration = Column(Integer, nullable=False)
    int_organizer_id = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    int_meeting_leader_id = Column(Integer, nullable=False)
    int_zoom_meeting_id = Column(Integer, ForeignKey("tbl_zoom_sessions.id"), nullable=False)
    str_zoom_join_url = Column(String, nullable=False)
    str_zoom_start_url = Column(String, nullable=False)
    bln_allow_delegates = Column(Boolean, default=False)
    str_status = Column(String, index=True, nullable=False)
    bln_quorum_reached = Column(Boolean, default=False)
    int_total_invitated = Column(Integer, nullable=False)
    int_total_confirmed = Column(Integer, nullable=False)
    dat_actual_start_time = Column(DateTime, nullable=True)
    dat_actual_end_time = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)
    created_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)

    created_by_user = relationship("UserModel", back_populates="meetings")
    updated_by_user = relationship("UserModel", back_populates="meetings")
    residential_unit = relationship("ResidentialUnitModel", back_populates="meetings")
    zoom_session = relationship("ZoomSessionModel", back_populates="meetings")
    organizer = relationship("UserModel", back_populates="meetings")     
    polls = relationship("PollModel", back_populates="meeting")
    email_notifications = relationship("EmailNotificationModel", back_populates="meeting")
    meeting_attendances = relationship("MeetingAttendanceModel", back_populates="meeting")
    audit_logs = relationship("AuditLogModel", back_populates="meeting")