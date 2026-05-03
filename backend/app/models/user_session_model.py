from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.utils.timezone_utils import colombia_now

from app.core.database import Base


class UserSessionModel(Base):
    __tablename__ = "tbl_user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_jti = Column(String(36), unique=True, index=True, nullable=False)
    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=colombia_now, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("UserModel", backref="sessions")
