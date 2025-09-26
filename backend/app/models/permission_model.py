from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class PermissionModel(Base):
    __tablename__ = "tbl_permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    str_name = Column(String(100), index=True, nullable=False)
    str_description = Column(String(500), nullable=False)
    str_module = Column(String(100), nullable=False)
    bln_is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)
