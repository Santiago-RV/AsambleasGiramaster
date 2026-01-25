from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class RolePermissionModel(Base):
    __tablename__ = "tbl_role_permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_rol_id = Column(Integer, ForeignKey("tbl_rols.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    int_permission_id = Column(Integer, ForeignKey("tbl_permissions.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    granted_at = Column(DateTime, default=datetime.now)
    granted_by = Column(Integer, ForeignKey("tbl_users.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True)
