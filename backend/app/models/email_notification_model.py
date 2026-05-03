from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.utils.timezone_utils import colombia_now

class EmailNotificationModel(Base):
    __tablename__ = "tbl_email_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True)  # SET NULL cuando se elimina la reunión
    int_user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    str_status = Column(String(50), index=True, nullable=False)
    str_template = Column(String(50), nullable=False)
    dat_sent_at = Column(DateTime, nullable=True)  # Permite NULL, se llena cuando status="sent"
    created_at = Column(DateTime, default=colombia_now)
    updated_at = Column(DateTime, default=colombia_now, onupdate=colombia_now)

    # Relationships
    user = relationship("UserModel", back_populates="email_notifications")
    meeting = relationship("MeetingModel", foreign_keys=[int_meeting_id])