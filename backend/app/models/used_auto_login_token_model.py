from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class UsedAutoLoginTokenModel(Base):
    __tablename__ = "tbl_used_auto_login_tokens"
    __table_args__ = (
        UniqueConstraint('user_id', name='uq_user_auto_login_token'),
    )

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String(36), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("tbl_users.id"), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    ip_address = Column(String(45), nullable=True)

    user = relationship("UserModel", backref="auto_login_token")
