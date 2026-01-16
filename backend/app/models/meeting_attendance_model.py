from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class MeetingAttendanceModel(Base):
    __tablename__ = "tbl_meeting_attendances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    int_user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    str_attendance_type = Column(String(50), index=True, nullable=False)
    dec_voting_weight = Column(Numeric, nullable=False)
    dat_joined_at = Column(DateTime, nullable=False)
    dat_left_at = Column(DateTime, nullable=False)
    int_total_duration_minutes = Column(Integer, nullable=False)
    bln_is_present = Column(Boolean, default=False)
    bln_left_early = Column(Boolean, default=False)
    int_rejoined_count = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    meeting = relationship("MeetingModel", back_populates="attendances")
