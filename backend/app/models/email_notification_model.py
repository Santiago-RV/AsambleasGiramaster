from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class EmailNotificationModel(Base):
    __tablename__ = "tbl_email_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id"), nullable=False)
    int_user_id = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    str_status = Column(String, index=True, nullable=False)
    str_template = Column(String, nullable=False)
    dat_sent_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

    meetings = relationship("MeetingModel", back_populates="email_notifications")
    users = relationship("UserModel", back_populates="email_notifications") 