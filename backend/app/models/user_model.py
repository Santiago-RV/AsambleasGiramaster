from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class UserModel(Base):
    __tablename__ = "tbl_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_data_user_id = Column(Integer, ForeignKey("tbl_data_users.id"), nullable=False)
    str_username = Column(String, index=True, nullable=False)
    str_password_hash = Column(String, nullable=False)
    int_id_rol = Column(Integer, ForeignKey("tbl_rols.id"), nullable=False)
    bln_is_external_delegate = Column(Boolean, default=False)
    bln_user_temporary = Column(Boolean, default=False)
    dat_temporary_expiration_date = Column(DateTime, nullable=True)
    bln_is_active = Column(Boolean, default=True)           

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

    data_user = relationship("DataUserModel", back_populates="users")
    rol = relationship("RolModel", back_populates="users")
    residential_units = relationship("ResidentialUnitModel", back_populates="created_by_user")
    residential_units = relationship("ResidentialUnitModel", back_populates="updated_by_user")
    meetings = relationship("MeetingModel", back_populates="created_by_user")
    meetings = relationship("MeetingModel", back_populates="updated_by_user")
    meetings = relationship("MeetingModel", back_populates="organizer")
    polls = relationship("PollModel", back_populates="created_by_user")
    polls = relationship("PollModel", back_populates="updated_by_user")
    meeting_invitations = relationship("MeetingInvitationModel", back_populates="created_by_user")
    meeting_invitations = relationship("MeetingInvitationModel", back_populates="updated_by_user")
    email_notifications = relationship("EmailNotificationModel", back_populates="users")
    meeting_attendances = relationship("MeetingAttendanceModel", back_populates="users")
    audit_logs = relationship("AuditLogModel", back_populates="users")
    responses = relationship("PollResponseModel", back_populates="users")