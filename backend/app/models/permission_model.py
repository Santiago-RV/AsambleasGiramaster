from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.core.database import Base
from app.utils.timezone_utils import colombia_now

class PermissionModel(Base):
    __tablename__ = "tbl_permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    str_name = Column(String(100), index=True, nullable=False)
    str_description = Column(String(500), nullable=False)
    str_module = Column(String(100), nullable=False)
    bln_is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=colombia_now)
    updated_at = Column(DateTime, default=colombia_now)
