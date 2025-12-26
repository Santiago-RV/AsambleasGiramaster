from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class UserModel(Base):
    __tablename__ = "tbl_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_data_user_id = Column(Integer, ForeignKey("tbl_data_users.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False)
    str_username = Column(String(50), index=True, nullable=False)
    str_password_hash = Column(String(255), nullable=False)
    int_id_rol = Column(Integer, ForeignKey("tbl_rols.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False)
    bln_is_external_delegate = Column(Boolean, default=False)
    bln_user_temporary = Column(Boolean, default=False)
    dat_temporary_expiration_date = Column(DateTime, nullable=True)
    bln_allow_entry = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    data_user = relationship("DataUserModel", back_populates="users")
    rol = relationship("RolModel", back_populates="users")