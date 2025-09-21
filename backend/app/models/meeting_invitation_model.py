from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Decimal
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class MeetingInvitationModel(Base):
    __tablename__ = "tbl_meeting_invitations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id"), nullable=False)
    int_user_id = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    dec_voting_weight = Column(Decimal, nullable=False)
    str_apartment_number = Column(String, nullable=False)
    str_invitation_status = Column(String, index=True, nullable=False)
    str_response_status = Column(String, index=True, nullable=False)
    dat_sent_at = Column(DateTime, nullable=False)
    dat_responded_at = Column(DateTime, nullable=True)
    dat_reminder_sent_at = Column(DateTime, nullable=True)
    int_delivery_attemps = Column(Integer, nullable=False)
    str_last_delivery_error = Column(String, nullable=True)
    bln_will_attend = Column(Boolean, default=False)
    int_delegated_id = Column(Integer, nullable=True)
    bln_actually_attended = Column(Boolean, default=False)
    dat_joined_at = Column(DateTime, nullable=True)
    dat_left_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)
    created_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)

    created_by_user = relationship("UserModel", back_populates="meeting_invitations")
    updated_by_user = relationship("UserModel", back_populates="meeting_invitations")