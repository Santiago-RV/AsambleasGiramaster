from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class RolModel(Base):
    __tablename__ = "tbl_rols"

    id = Column(Integer, primary_key=True, autoincrement=True)
    str_name = Column(String, index=True, nullable=False)
    str_description = Column(String, nullable=False)
    bln_is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

    users = relationship("UserModel", back_populates="rol")