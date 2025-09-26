from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class PollModel(Base):
    __tablename__ = "tbl_polls"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id"), nullable=False)
    str_poll_code = Column(String(50), index=True, nullable=False)
    str_title = Column(String(200), index=True, nullable=False)
    str_description = Column(String(1000), nullable=True)
    str_poll_type = Column(String(50), index=True, nullable=False)
    bln_is_anonymous = Column(Boolean, default=False)
    bln_requires_quorum = Column(Boolean, default=False)
    dec_minimum_quorum_percentage = Column(Numeric, nullable=False)
    bln_allows_abstention = Column(Boolean, default=False)
    int_max_selections = Column(Integer, nullable=False)
    dat_started_at = Column(DateTime, nullable=False)
    dat_ended_at = Column(DateTime, nullable=False)
    int_duration_minutes = Column(Integer, nullable=False)
    str_status = Column(String(50), index=True, nullable=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)
    created_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)

    meeting = relationship("MeetingModel", back_populates="polls")
    responses = relationship("PollResponseModel", back_populates="poll")
    options = relationship("PollOptionModel", back_populates="poll")