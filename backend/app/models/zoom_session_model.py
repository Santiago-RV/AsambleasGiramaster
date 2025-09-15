from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class ZoomSessionModel(Base):
    __tablename__ = "tbl_zoom_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(Integer, nullable=False)
    str_zoom_meeting_id = Column(String, index=True, nullable=False)
    str_zoom_uuid = Column(String, index=True, nullable=False)
    str_zoom_session_key = Column(String, nullable=False)
    int_host_user_id = Column(Integer, nullable=False)
    bln_recording_enabled = Column(Boolean, default=False)
    bln_recording_consent_required = Column(Boolean, default=False)               
    int_max_participants = Column(Integer, nullable=False)
    int_total_unique_participants = Column(Integer, nullable=False)
    int_session_duration_minutes = Column(Integer, nullable=False)
    dat_session_started_at = Column(DateTime, nullable=False)
    dat_session_ended_at = Column(DateTime, nullable=False)
    dat_recording_started_at = Column(DateTime, nullable=False)
    dat_recording_ended_at = Column(DateTime, nullable=False)
    json_recording_files = Column(JSON, nullable=False)
    str_recording_password = Column(String, nullable=False)
    str_recording_download_url = Column(String, nullable=False)
    json_zoom_report_data = Column(JSON, nullable=False)
    json_participants_report = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

    meetings = relationship("MeetingModel", back_populates="zoom_session")