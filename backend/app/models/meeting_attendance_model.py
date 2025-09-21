from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Decimal
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class MeetingAttendanceModel(Base):
    __tablename__ = "tbl_meeting_attendances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id"), nullable=False)
    int_user_id = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    str_attendance_type = Column(String, index=True, nullable=False)
    dec_voting_weight = Column(Decimal, nullable=False)
    dat_joined_at = Column(DateTime, nullable=False)
    dat_left_at = Column(DateTime, nullable=False)
    int_total_duration_minutes = Column(Integer, nullable=False)
    bln_is_present = Column(Boolean, default=False)
    bln_left_early = Column(Boolean, default=False)
    int_rejoined_count = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

    meetings = relationship("MeetingModel", back_populates="meeting_attendances")
    users = relationship("UserModel", back_populates="meeting_attendances")