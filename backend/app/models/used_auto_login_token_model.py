from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.utils.timezone_utils import colombia_now

from app.core.database import Base


class UsedAutoLoginTokenModel(Base):
    __tablename__ = "tbl_used_auto_login_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String(36), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=colombia_now, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String(45), nullable=True)
    # Huella del primer dispositivo que usó el link (TOFU). NULL = aún sin usar.
    device_fingerprint = Column(String(64), nullable=True, index=True)
    first_used_at = Column(DateTime, nullable=True)
    use_count = Column(Integer, nullable=False, default=0, server_default="0")

    user = relationship("UserModel", backref="auto_login_tokens")
